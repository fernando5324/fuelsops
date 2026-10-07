import React, { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Alert, App, Button, Drawer, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, PartitionOutlined } from '@ant-design/icons';
import PanelLayout from '../../../Layouts/PanelLayout';
import PageHeader from '@/Components/PageHeader';
import SubmitButton from '@/Components/SubmitButton';
import { Vehicles } from '@/Services';
import useTranslations from '@/hooks/useTranslations';
import formatDate from '@/lib/dates';

/**
 * Página dedicada de vehículos (cisternas con sus dos placas, ADR-023).
 *
 * Una fila es una cisterna (`license_plate`) con el tracto asignado
 * (`tractor_plate`). El tipo de vehículo ya no existe como selector: la
 * búsqueda cubre ambas placas.
 */
export default function VehiclesIndex({ config, rows, filter }) {
    const { message, modal } = App.useApp();
    const { flash, errors } = usePage().props;
    const { t } = useTranslations();
    const [form] = Form.useForm();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [q, setQ] = useState(filter?.q || '');
    const [compartmentForm] = Form.useForm();
    const [compartmentVehicle, setCompartmentVehicle] = useState(null);
    const [compartmentsOpen, setCompartmentsOpen] = useState(false);
    const [compartmentsLoading, setCompartmentsLoading] = useState(false);
    const [compartmentsSaving, setCompartmentsSaving] = useState(false);

    const baseUrl = config?.url || '/catalogos/vehiculos';
    const searchTimer = useRef(null);

    const applied = {};
    const filterDefs = config?.filters || [];
    filterDefs.forEach((f) => {
        const v = filter?.[f.key];
        if (v !== undefined && v !== null && v !== '') {
            applied[f.key] = String(v);
        }
    });

    useEffect(() => () => clearTimeout(searchTimer.current), []);

    useEffect(() => {
        if (flash?.success) {
            message.success(flash.success);
        }
    }, [flash, message]);

    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            message.error(Object.values(errors)[0]);
        }
    }, [errors, message]);

    const navigate = (params) => {
        router.get(baseUrl, params, { preserveState: true, replace: true });
    };

    const onSearchChange = (e) => {
        const value = e.target.value ?? '';
        setQ(value);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            navigate({ q: value.trim() || undefined, ...applied });
        }, 350);
    };

    const onFilterChange = (key, value) => {
        const next = { ...applied };
        if (value === undefined || value === '') {
            delete next[key];
        } else {
            next[key] = String(value);
        }
        navigate({ q: q.trim() || undefined, ...next });
    };

    const handleModalOpenChange = (opened) => {
        if (!opened) return;
        if (editing) {
            form.setFieldsValue({
                license_plate: editing.license_plate ?? '',
                tractor_plate: editing.tractor_plate ?? '',
                is_active: Boolean(editing.is_active),
            });
        } else {
            form.resetFields();
            form.setFieldsValue({ is_active: true });
        }
    };

    const openCreate = () => {
        setEditing(null);
        setOpen(true);
    };

    const openEdit = (row) => {
        setEditing(row);
        setOpen(true);
    };

    const onFinish = (values) => {
        const url = editing ? Vehicles.routes.update(editing.id) : Vehicles.routes.store;
        const options = { preserveScroll: true, forceFormData: true, onSuccess: () => setOpen(false) };

        if (editing) {
            // POST multipart + _method=PUT: PHP no lee cuerpos multipart en PUT
            router.post(url, { ...values, _method: 'PUT' }, options);
        } else {
            router.post(url, values, options);
        }
    };

    const confirmDelete = (row) => {
        modal.confirm({
            title: t('common.confirm_delete'),
            content: `${t('common.edit_record')} #${row.id}`,
            okText: t('common.delete'),
            okType: 'danger',
            cancelText: t('common.cancel'),
            onOk: () => {
                router.delete(Vehicles.routes.destroy(row.id), { preserveScroll: true });
            },
        });
    };

    const loadCompartments = async () => {
        if (!compartmentVehicle) return;
        setCompartmentsLoading(true);
        try {
            const { data } = await Vehicles.getCompartments(compartmentVehicle.id);
            compartmentForm.setFieldsValue({
                compartments: (data.compartments || []).map((c) => ({
                    scop: c.scop ?? '',
                    volume: c.volume,
                })),
            });
        } catch (e) {
            message.error(e?.response?.data?.message || t('catalogs.compartments_load_error'));
        } finally {
            setCompartmentsLoading(false);
        }
    };

    const openCompartments = (row) => {
        setCompartmentVehicle(row);
        setCompartmentsOpen(true);
    };

    const closeCompartments = () => {
        setCompartmentsOpen(false);
    };

    const saveCompartments = async (values) => {
        if (!compartmentVehicle) return;
        setCompartmentsSaving(true);
        try {
            const rows = (values.compartments || []).map((row) => ({
                scop: row.scop ?? '',
                volume: String(row.volume),
            }));
            const { data } = await Vehicles.saveCompartments(compartmentVehicle.id, { compartments: rows });
            message.success(data.message || t('catalogs.compartments_saved'));
            closeCompartments();
        } catch (e) {
            const errors = e?.response?.data?.errors;
            const first = errors && Object.keys(errors).length > 0 ? errors[Object.keys(errors)[0]][0] : null;
            message.error(first || e?.response?.data?.message || t('catalogs.operation_error'));
        } finally {
            setCompartmentsSaving(false);
        }
    };

    const removeCompartment = (remove) => {
        modal.confirm({
            title: t('catalogs.remove_compartment'),
            content: t('catalogs.compartment_delete_confirm'),
            okText: t('common.delete'),
            okType: 'danger',
            cancelText: t('common.cancel'),
            onOk: () => remove(),
        });
    };

    const columns = [
        {
            title: t('catalogs.license_plate'),
            dataIndex: 'license_plate',
            key: 'license_plate',
            render: (value) => value ?? '-',
        },
        {
            title: t('catalogs.tractor_plate'),
            dataIndex: 'tractor_plate',
            key: 'tractor_plate',
            render: (value) => value ?? '-',
        },
        {
            title: t('common.status'),
            dataIndex: 'is_active',
            key: 'is_active',
            width: 120,
            render: (value) =>
                value ? <Tag color="green">{t('common.active')}</Tag> : <Tag>{t('common.inactive')}</Tag>,
        },
        {
            title: t('common.created_at'),
            dataIndex: 'created_at',
            width: 160,
            render: (value) => formatDate(value),
        },
        {
            title: t('common.actions'),
            width: 132,
            align: 'center',
            render: (_, row) => (
                <Space size={0}>
                    <Tooltip title={t('catalogs.compartments')}>
                        <Button
                            type="text"
                            icon={<PartitionOutlined />}
                            aria-label={t('catalogs.compartments')}
                            onClick={() => openCompartments(row)}
                        />
                    </Tooltip>
                    <Tooltip title={t('common.edit')}>
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            aria-label={t('common.edit')}
                            onClick={() => openEdit(row)}
                        />
                    </Tooltip>
                    <Tooltip title={t('common.delete')}>
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            aria-label={t('common.delete')}
                            onClick={() => confirmDelete(row)}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <PanelLayout>
            <PageHeader
                title={config?.title || t('menus.vehicles')}
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        {t('common.create_record')}
                    </Button>
                }
            />
            <div className="ui-list-section">
                <Space wrap style={{ marginBottom: 16, width: '100%' }}>
                    <Input
                        allowClear
                        placeholder={t('common.search')}
                        value={q}
                        onChange={onSearchChange}
                        prefix={<SearchOutlined />}
                        className="ui-filter-search"
                    />
                    {filterDefs.map((f) => (
                        <Select
                            key={f.key}
                            allowClear
                            placeholder={f.type === 'boolean' ? t('common.all_statuses') : t(f.label)}
                            value={applied[f.key]}
                            onChange={(v) => onFilterChange(f.key, v)}
                            className="ui-filter-status"
                            options={[
                                { value: '1', label: t('common.active') },
                                { value: '0', label: t('common.inactive') },
                            ]}
                        />
                    ))}
                </Space>

                <Table
                    rowKey="id"
                    dataSource={rows?.data || []}
                    columns={columns}
                    size="middle"
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: t('common.no_data') }}
                    pagination={{
                        current: rows?.current_page || 1,
                        pageSize: rows?.per_page || 15,
                        total: rows?.total || 0,
                        showTotal: (total) => `${total} ${t('common.records_found')}`,
                        onChange: (page) => {
                            router.get(baseUrl, { ...filter, page }, { preserveState: true });
                        },
                    }}
                />
            </div>

            <Modal
                title={editing ? t('common.edit_record') : t('common.create_record')}
                open={open}
                onCancel={() => setOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setOpen(false)}>
                        {t('common.cancel')}
                    </Button>,
                    <SubmitButton key="submit" onClick={() => form.submit()}>
                        {t('common.save')}
                    </SubmitButton>,
                ]}
                destroyOnHidden
                mask={{ closable: false }}
                afterOpenChange={handleModalOpenChange}
            >
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        name="license_plate"
                        label={t('catalogs.license_plate')}
                        rules={[{ required: true, message: `${t('catalogs.license_plate')} ${t('common.required')}` }]}
                    >
                        <Input maxLength={20} />
                    </Form.Item>
                    <Form.Item name="tractor_plate" label={t('catalogs.tractor_plate')}>
                        <Input maxLength={20} />
                    </Form.Item>
                    <Form.Item name="is_active" label={t('common.status')} valuePropName="checked">
                        <Switch checkedChildren={t('common.yes')} unCheckedChildren={t('common.no')} />
                    </Form.Item>
                </Form>
            </Modal>

            <Drawer
                title={
                    compartmentVehicle
                        ? `${t('catalogs.compartments_title')}: ${compartmentVehicle.license_plate}`
                        : t('catalogs.compartments')
                }
                open={compartmentsOpen}
                onClose={closeCompartments}
                size={480}
                destroyOnHidden
                afterOpenChange={(opened) => {
                    if (opened) loadCompartments();
                }}
                footer={
                    <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={closeCompartments} disabled={compartmentsSaving}>
                            {t('common.cancel')}
                        </Button>
                        <SubmitButton loading={compartmentsSaving} onClick={() => compartmentForm.submit()}>
                            {t('common.save')}
                        </SubmitButton>
                    </Space>
                }
            >
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    title={t('catalogs.compartments_hint')}
                />
                <Form form={compartmentForm} layout="vertical" onFinish={saveCompartments}>
                    <Form.List name="compartments">
                        {(fields, { add, remove }) => (
                            <div className="ui-compartments-list">
                                {fields.map((field, index) => (
                                    <div
                                        key={field.key}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '32px 1fr 150px 40px',
                                            gap: 8,
                                            alignItems: 'baseline',
                                            marginBottom: 8,
                                        }}
                                    >
                                        <span className="ui-compartment-num">{index + 1}</span>
                                        <Form.Item
                                            name={[field.name, 'scop']}
                                            label={index === 0 ? t('catalogs.scop') : null}
                                            style={{ marginBottom: 0 }}
                                        >
                                            <Input maxLength={50} placeholder={t('catalogs.scop')} />
                                        </Form.Item>
                                        <Form.Item
                                            name={[field.name, 'volume']}
                                            label={index === 0 ? t('catalogs.volume_gal') : null}
                                            style={{ marginBottom: 0 }}
                                            rules={[
                                                {
                                                    required: true,
                                                    message: `${t('catalogs.volume_gal')} ${t('common.required')}`,
                                                },
                                            ]}
                                        >
                                            <InputNumber min={0.01} precision={2} style={{ width: '100%' }} />
                                        </Form.Item>
                                        <Tooltip title={t('catalogs.remove_compartment')}>
                                            <Button
                                                type="text"
                                                danger
                                                aria-label={t('catalogs.remove_compartment')}
                                                icon={<DeleteOutlined />}
                                                onClick={() => removeCompartment(() => remove(field.name))}
                                            />
                                        </Tooltip>
                                    </div>
                                ))}
                                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ scop: '', volume: null })}>
                                    {t('catalogs.add_compartment')}
                                </Button>
                            </div>
                        )}
                    </Form.List>
                </Form>
            </Drawer>
        </PanelLayout>
    );
}
