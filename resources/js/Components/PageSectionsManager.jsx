import { Link, router, usePage } from '@inertiajs/react';
import {
    Empty,
    Form,
    Modal,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Button,
    Typography,
    App,
    Alert,
} from 'antd';
import {
    ArrowRightOutlined,
    DeleteOutlined,
    DragOutlined,
    EditOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef, useState } from 'react';
import useTranslations from '@/hooks/useTranslations';
import usePermissions from '@/hooks/usePermissions';

const { Text } = Typography;

const tPrefix = 'pages';

function DraggableRow(props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props['data-row-key'] });

    const style = {
        ...props.style,
        transform: CSS.Translate.toString(transform),
        transition,
        ...(isDragging ? { position: 'relative', zIndex: 999 } : {}),
    };

    return (
        <tr {...props} ref={setNodeRef} style={style} {...attributes}>
            {props.children?.map?.((child, index) =>
                index === 0 ? (
                    <td ref={setActivatorNodeRef} {...listeners}>
                        {child}
                    </td>
                ) : (
                    child
                ),
            )}
        </tr>
    );
}

/**
 * Gestor de secciones de una página estructurada (ADR-082/088): las secciones
 * son COLOCACIONES que REFERENCIAN ítems del módulo Contenido. La tabla ofrece
 * reorder drag & drop, toggle de activación, edición de la presentación
 * (override, `component_variant`) y borrado de la colocación. El contenido en
 * sí se edita SIEMPRE en el módulo Contenido (ADR-088 §13): este gestor solo
 * selecciona el ítem de Contenido a colocar.
 */
export default function PageSectionsManager({
    page,
    sections = [],
    presentations = {},
    content_options: contentOptions = [],
}) {
    const { message, modal } = App.useApp();
    const { flash } = usePage().props;
    const { t } = useTranslations();
    const { can } = usePermissions();
    const notified = useRef(false);

    const canCreate = can('pages.create');
    const canUpdate = can('pages.update');
    const canDelete = can('pages.delete');
    const canReorder = canUpdate;

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { delay: 150, distance: 5 },
        }),
    );

    const [rows, setRows] = useState(sections);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();
    const selectedContentId = Form.useWatch('content_id', form);
    const effectiveType =
        editing?.type ||
        contentOptions.find((option) => option.id === selectedContentId)?.type;

    useEffect(() => {
        if (flash?.success && !notified.current) {
            notified.current = true;
            message.success(flash.success);
        }
        if (flash?.error && !notified.current) {
            notified.current = true;
            message.error(flash.error);
        }
    }, [flash, message]);

    useEffect(() => {
        setRows(sections);
    }, [sections]);

    useEffect(() => {
        if (!modalOpen) {
            return;
        }
        if (editing) {
            form.setFieldsValue({
                content_id: editing.content_id,
                presentation: editing.presentation || '',
                is_active: editing.is_active,
            });
        } else {
            form.resetFields();
            form.setFieldsValue({ is_active: true, presentation: '' });
        }
    }, [modalOpen, editing, form]);

    const openCreate = () => {
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (record) => {
        setEditing(record);
        setModalOpen(true);
    };

    const handleSectionFinish = (values) => {
        setSubmitting(true);
        const options = {
            preserveScroll: true,
            onFinish: () => setSubmitting(false),
            onSuccess: () => setModalOpen(false),
        };

        if (editing) {
            router.post(
                route('pages.sections.update', [page.id, editing.id]),
                {
                    presentation: values.presentation || '',
                    is_active: values.is_active ? 1 : 0,
                },
                options,
            );
        } else {
            router.post(
                route('pages.sections.store', page.id),
                {
                    content_id: values.content_id,
                    presentation: values.presentation || '',
                    is_active: values.is_active ? 1 : 0,
                },
                options,
            );
        }
    };

    const handleToggleActive = (record, checked) => {
        router.post(
            route('pages.sections.update', [page.id, record.id]),
            {
                presentation: record.presentation || '',
                is_active: checked ? 1 : 0,
            },
            { preserveScroll: true },
        );
    };

    const handleDelete = (record) => {
        modal.confirm({
            title: t(`${tPrefix}.delete_section_confirm`),
            content: t(`${tPrefix}.delete_section_confirm_desc`, { title: record.title }),
            okText: t('common.delete'),
            okButtonProps: { danger: true },
            cancelText: t('common.cancel'),
            onOk: () => {
                router.delete(route('pages.sections.destroy', [page.id, record.id]));
            },
        });
    };

    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) {
            return;
        }
        setRows((prev) => {
            const activeIndex = prev.findIndex((r) => r.id === active.id);
            const overIndex = prev.findIndex((r) => r.id === over.id);
            if (activeIndex < 0 || overIndex < 0) {
                return prev;
            }
            const next = arrayMove(prev, activeIndex, overIndex);
            router.post(
                route('pages.sections.reorder', page.id),
                { ids: next.map((r) => r.id) },
                { preserveScroll: true },
            );
            return next;
        });
    };

    const contentSelectOptions = (contentOptions || [])
        .slice()
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
        .map((option) => ({
            value: option.id,
            label: `${option.title || t('common.dash')} · ${t(`${tPrefix}.type_${option.type}`)}`,
            type: option.type,
        }));

    const presentationOptions = (presentations?.[effectiveType] || []).map((slug) => ({
        value: slug,
        label: t(`${tPrefix}.pres_${slug}`),
    }));

    const presentationSelect = effectiveType ? (
        <Select
            allowClear
            placeholder={t(`${tPrefix}.presentation_placeholder`)}
            options={[
                { value: '', label: t(`${tPrefix}.presentation_default`) },
                ...presentationOptions,
            ]}
        />
    ) : null;

    const dragColumn = canReorder
        ? [
              {
                  key: 'sort',
                  align: 'center',
                  width: 60,
                  render: () => (
                      <DragOutlined
                          style={{ cursor: 'grab', color: 'rgba(0,0,0,0.45)' }}
                      />
                  ),
              },
          ]
        : [];

    const columns = [
        {
            title: t('common.number'),
            dataIndex: 'rowNum',
            width: 70,
            align: 'center',
        },
        {
            title: t(`${tPrefix}.section_title_field`),
            dataIndex: 'title',
            render: (title) => title || t('common.dash'),
        },
        {
            title: t(`${tPrefix}.type`),
            dataIndex: 'type',
            width: 180,
            render: (type) => <Tag>{t(`${tPrefix}.type_${type}`)}</Tag>,
        },
        {
            title: t(`${tPrefix}.presentation`),
            dataIndex: 'presentation',
            width: 200,
            render: (presentation) =>
                presentation
                    ? t(`${tPrefix}.pres_${presentation}`)
                    : t(`${tPrefix}.presentation_default`),
        },
        {
            title: t(`${tPrefix}.active_label`),
            key: 'is_active',
            width: 100,
            align: 'center',
            render: (_, record) => (
                <Switch
                    size="small"
                    checked={Boolean(record.is_active)}
                    disabled={!canUpdate}
                    onChange={(checked) => handleToggleActive(record, checked)}
                />
            ),
        },
        {
            title: t('common.actions'),
            key: 'actions',
            width: 160,
            render: (_, record) => {
                const actions = [];
                if (canUpdate) {
                    actions.push(
                        <Button
                            key="edit"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => openEdit(record)}
                        />,
                    );
                }
                if (canDelete) {
                    actions.push(
                        <Button
                            key="delete"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDelete(record)}
                        />,
                    );
                }
                return <Space size="small">{actions}</Space>;
            },
        },
    ];

    const numberedRows = rows.map((row, index) => ({
        ...row,
        rowNum: rows.length - index,
    }));

    const tableConfig = {
        rowKey: 'id',
        columns: [...dragColumn, ...columns],
        dataSource: numberedRows,
        pagination: { pageSize: 10, showSizeChanger: true },
    };

    if (canReorder) {
        tableConfig.components = { body: { row: DraggableRow } };
        tableConfig.onRow = (record) => ({ 'data-row-key': record.id });
    }

    const table = canReorder ? (
        <DndContext sensors={sensors} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
            <SortableContext
                items={rows.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
            >
                <Table {...tableConfig} />
            </SortableContext>
        </DndContext>
    ) : (
        <Table {...tableConfig} />
    );

    return (
        <div>
            <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
                <Text type="secondary">{t(`${tPrefix}.sections_subtitle_adr88`)}</Text>
                {canCreate && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        {t(`${tPrefix}.add_section`)}
                    </Button>
                )}
            </Space>

            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message={t(`${tPrefix}.content_reference_hint`)}
                action={
                    <Link href={route('content.index')}>
                        <Button
                            size="small"
                            icon={<ArrowRightOutlined />}
                            style={{ marginRight: 8 }}
                        >
                            {t(`${tPrefix}.open_content_module`)}
                        </Button>
                    </Link>
                }
            />

            {canReorder && rows.length > 1 && (
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    {t(`${tPrefix}.drag_hint`)}
                </Text>
            )}

            {rows.length === 0 ? (
                <Empty description={t(`${tPrefix}.sections_empty`)} />
            ) : (
                table
            )}

            <Modal
                title={editing ? t(`${tPrefix}.edit_section`) : t(`${tPrefix}.add_section`)}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={submitting}
                okText={editing ? t('common.save_changes') : t('common.create')}
                cancelText={t('common.cancel')}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" onFinish={handleSectionFinish}>
                    {editing ? (
                        <Form.Item label={t(`${tPrefix}.section_title_field`)}>
                            <Text strong>{editing.title || t('common.dash')}</Text>
                            <Text
                                type="secondary"
                                style={{ display: 'block', marginTop: 4 }}
                            >
                                {t(`${tPrefix}.referenced_content_note`, {
                                    type: t(`${tPrefix}.type_${editing.type}`),
                                })}
                            </Text>
                        </Form.Item>
                    ) : (
                        <Form.Item
                            name="content_id"
                            label={t(`${tPrefix}.select_content`)}
                            rules={[{ required: true }]}
                        >
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder={t(`${tPrefix}.select_content_placeholder`)}
                                options={contentSelectOptions}
                            />
                        </Form.Item>
                    )}
                    <Form.Item
                        name="presentation"
                        label={t(`${tPrefix}.presentation`)}
                    >
                        {presentationSelect}
                    </Form.Item>
                    <Form.Item
                        name="is_active"
                        label={t('common.status')}
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}