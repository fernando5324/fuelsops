import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Checkbox, Form, Input, InputNumber, List, Modal, Space, Typography } from 'antd';
import {
    ArrowDownOutlined,
    ArrowUpOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';

const { Text } = Typography;

function moveItem(list, index, dir) {
    const target = index + dir;
    if (target < 0 || target >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    return next;
}

/**
 * Editor de la Estructura de un servicio (ADR-076): árbol jerárquico de 2
 * niveles (secciones → ítems) con título, descripción, estado y orden.
 *
 * - Solo edición: lo monta ServiceForm en el tab "Estructura".
 * - Trabaja sobre un estado local (structure) y persiste vía onSave(structure).
 */
export default function StructureEditor({ initialStructure = [], onSave, saving = false }) {
    const { t } = useTranslations();
    const [structure, setStructure] = useState(initialStructure);

    // Mantener sincronizado el estado si la prop inicial cambia (p. ej. al
    // reabrir tras guardar).
    useEffect(() => {
        setStructure(initialStructure);
    }, [initialStructure]);

    // Modal de edición: { level: 'section'|'item', sectionIndex, itemIndex, data }
    const [modal, setModal] = useState(null);
    const [form] = Form.useForm();

    const openCreate = (level, sectionIndex = null) => {
        setModal({ level, sectionIndex, itemIndex: null, data: { title: '', description: '', is_active: true } });
    };

    const openEdit = (level, sectionIndex, itemIndex, data) => {
        setModal({ level, sectionIndex, itemIndex, data });
    };

    const closeModal = () => {
        setModal(null);
        form.resetFields();
    };

    const handleModalOk = async () => {
        if (!modal) return;
        const values = await form.validateFields();
        const data = {
            title: values.title?.trim() ?? '',
            description: values.description ?? '',
            is_active: values.is_active ?? true,
        };

        if (modal.level === 'section') {
            setStructure((prev) => {
                const next = [...prev];
                if (modal.sectionIndex === null) {
                    next.push({ ...data, items: [] });
                } else {
                    next[modal.sectionIndex] = { ...next[modal.sectionIndex], ...data };
                }
                return next;
            });
        } else {
            setStructure((prev) => {
                const next = [...prev];
                const section = { ...next[modal.sectionIndex] };
                const items = Array.isArray(section.items) ? section.items : [];
                if (modal.itemIndex === null) {
                    section.items = [...items, data];
                } else {
                    section.items = items.map((item, i) =>
                        i === modal.itemIndex ? { ...item, ...data } : item,
                    );
                }
                next[modal.sectionIndex] = section;
                return next;
            });
        }

        setModal(null);
        form.resetFields();
    };

    // En antd v6 `destroyOnClose` no limpia el Form entre aperturas (deprecado);
    // se puebla explícitamente al abrir y se resetea al cerrar para evitar
    // datos fantasma (editar un ítem mostraba el título de la sección, etc.).
    const handleModalOpenChange = (open) => {
        if (open && modal) {
            const { data } = modal;
            form.setFieldsValue({
                title: data.title ?? '',
                description: data.description ?? '',
                is_active: data.is_active ?? true,
            });
        } else if (!open) {
            form.resetFields();
        }
    };

    const handleSectionEdit = (index, data) => openEdit('section', index, null, data);
    const handleSectionRemove = (index) => {
        setStructure((prev) => prev.filter((_, i) => i !== index));
    };
    const handleSectionMove = (index, dir) => {
        setStructure((prev) => moveItem(prev, index, dir));
    };

    const handleItemEdit = (sectionIndex, itemIndex, data) =>
        openEdit('item', sectionIndex, itemIndex, data);
    const handleItemRemove = (sectionIndex, itemIndex) => {
        setStructure((prev) =>
            prev.map((section, i) =>
                i === sectionIndex
                    ? { ...section, items: (section.items ?? []).filter((_, j) => j !== itemIndex) }
                    : section,
            ),
        );
    };
    const handleItemMove = (sectionIndex, itemIndex, dir) => {
        setStructure((prev) =>
            prev.map((section, i) =>
                i === sectionIndex
                    ? { ...section, items: moveItem(section.items ?? [], itemIndex, dir) }
                    : section,
            ),
        );
    };

    const moveButtons = (canUp, canDown, onUp, onDown) => (
        <Space.Compact size="small">
            <Button size="small" icon={<ArrowUpOutlined />} disabled={!canUp} onClick={onUp} />
            <Button size="small" icon={<ArrowDownOutlined />} disabled={!canDown} onClick={onDown} />
        </Space.Compact>
    );

    const hasContent = useMemo(() => structure.length > 0, [structure]);

    return (
        <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                {t('services.structure_hint')}
            </Text>

            {!hasContent && (
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    {t('services.structure_no_sections')}
                </Text>
            )}

            <List
                dataSource={structure}
                renderItem={(section, sectionIndex) => {
                    const items = Array.isArray(section.items) ? section.items : [];
                    return (
                    <List.Item
                        actions={[
                            ...(
                                sectionIndex > 0 || sectionIndex < structure.length - 1
                                    ? moveButtons(
                                          sectionIndex > 0,
                                          sectionIndex < structure.length - 1,
                                          () => handleSectionMove(sectionIndex, -1),
                                          () => handleSectionMove(sectionIndex, 1),
                                      )
                                    : []
                            ),
                            <Button
                                key="edit"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleSectionEdit(sectionIndex, section)}
                            />,
                            <Button
                                key="add"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => openCreate('item', sectionIndex)}
                            />,
                            <Button
                                key="del"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleSectionRemove(sectionIndex)}
                            />,
                        ]}
                    >
                        <div style={{ width: '100%' }}>
                            <Space wrap>
                                <b>{section.title}</b>
                                {!section.is_active && (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        ({t('services.structure_active').toLowerCase()})
                                    </Text>
                                )}
                            </Space>

                            {section.description && (
                                <div>
                                    <Text type="secondary">{section.description}</Text>
                                </div>
                            )}

                            {items.length > 0 && (
                                <List
                                    size="small"
                                    style={{ marginTop: 8 }}
                                    dataSource={items}
                                    renderItem={(item, itemIndex) => (
                                        <List.Item
                                            actions={[
                                                ...(
                                                    itemIndex > 0 || itemIndex < items.length - 1
                                                        ? moveButtons(
                                                              itemIndex > 0,
                                                              itemIndex < items.length - 1,
                                                              () => handleItemMove(sectionIndex, itemIndex, -1),
                                                              () => handleItemMove(sectionIndex, itemIndex, 1),
                                                          )
                                                        : []
                                                ),
                                                <Button
                                                    key="edit"
                                                    size="small"
                                                    icon={<EditOutlined />}
                                                    onClick={() => handleItemEdit(sectionIndex, itemIndex, item)}
                                                />,
                                                <Button
                                                    key="del"
                                                    size="small"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => handleItemRemove(sectionIndex, itemIndex)}
                                                />,
                                            ]}
                                        >
                                            <div>
                                                <Space wrap>
                                                    {item.title}
                                                    {!item.is_active && (
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            ({t('services.structure_active').toLowerCase()})
                                                        </Text>
                                                    )}
                                                </Space>
                                                {item.description && (
                                                    <div>
                                                        <Text type="secondary">{item.description}</Text>
                                                    </div>
                                                )}
                                            </div>
                                        </List.Item>
                                    )}
                                />
                            )}
                        </div>
                    </List.Item>
                    );
                }}
            />

            <Space style={{ marginTop: 12 }} wrap>
                <Button icon={<PlusOutlined />} onClick={() => openCreate('section')}>
                    {t('services.structure_add_section')}
                </Button>
                <Button
                    type="primary"
                    icon={saving ? undefined : undefined}
                    loading={saving}
                    disabled={!hasContent}
                    onClick={() => onSave(structure)}
                >
                    {t('services.structure_save')}
                </Button>
            </Space>

            <Modal
                title={
                    modal && modal.level === 'section'
                        ? t('services.structure_section_title')
                        : t('services.structure_item_title')
                }
                open={Boolean(modal)}
                afterOpenChange={handleModalOpenChange}
                onOk={handleModalOk}
                onCancel={closeModal}
                okText={modal?.itemIndex === null && modal?.sectionIndex === null ? t('common.add') : t('common.save_changes')}
                cancelText={t('common.cancel')}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" preserve={false}>
                    <Form.Item
                        label={modal?.level === 'section' ? t('services.structure_section_title') : t('services.structure_item_title')}
                        name="title"
                        rules={[{ required: true }]}
                    >
                        <Input maxLength={255} />
                    </Form.Item>
                    <Form.Item label={t('services.structure_description')} name="description" style={{ marginBottom: 12 }}>
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="is_active" valuePropName="checked" style={{ marginBottom: 0 }}>
                        <Checkbox>{t('services.structure_active')}</Checkbox>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}