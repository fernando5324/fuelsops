import React, { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    App,
    Button,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import PanelLayout from '../../../Layouts/PanelLayout';
import PageHeader from '@/Components/PageHeader';
import { catalogServices } from '@/Services';
import useTranslations from '@/hooks/useTranslations';
import formatDate from '@/lib/dates';
import SubmitButton from '@/Components/SubmitButton';

export default function CatalogsIndex({ config, rows, filter }) {
    const { message, modal } = App.useApp();
    const { flash, errors } = usePage().props;
    const { t } = useTranslations();
    const [form] = Form.useForm();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [q, setQ] = useState(filter?.q || '');

    const resource = config?.resource;
    const service = catalogServices[resource] || null;
    const baseUrl = config?.url || service?.routes?.index || `/catalogos/${resource}`;
    const storeUrl = service?.routes?.store || `/api/${resource}`;
    const fields = config?.fields || [];
    const options = config?.options || {};
    const filterDefs = config?.filters || [];

    const searchTimer = useRef(null);

    const applied = {};
    (filterDefs || []).forEach((f) => {
        const v = filter?.[f.key];
        if (v !== undefined && v !== null && v !== '') {
            applied[f.key] = String(v);
        }
    });

    useEffect(() => () => clearTimeout(searchTimer.current), []);

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

    const labelFor = (field) => t(field.label);

    const controlFor = (field) => {
        switch (field.type) {
            case 'textarea':
                return <Input.TextArea rows={2} />;
            case 'number':
                return <InputNumber style={{ width: '100%' }} min={0} />;
            case 'boolean':
                return <Switch checkedChildren={t('common.yes')} unCheckedChildren={t('common.no')} />;
            case 'select':
                return (
                    <Select
                        showSearch
                        optionFilterProp="label"
                        allowClear
                        options={options[field.options] || []}
                    />
                );
            case 'password':
                return <Input.Password autoComplete="new-password" />;
            default:
                return <Input />;
        }
    };

    const formatValue = (field, value) => {
        if (field.type === 'boolean') {
            return value ? <Tag color="green">{t('common.yes')}</Tag> : <Tag>{t('common.no')}</Tag>;
        }
        if (field.type === 'select') {
            const found = (options[field.options] || []).find((o) => o.value === value);
            return found ? found.label : (value ?? '-');
        }
        if (field.type === 'date') {
            return formatDate(value);
        }
        return value ?? '-';
    };

    const columns = [
        ...fields.map((field) => ({
            title: labelFor(field),
            dataIndex: field.key,
            key: field.key,
            render: (value, row) => formatValue(field, row[field.key]),
        })),
        ...(config?.showAudit
            ? [
                  {
                      title: t('common.created_at'),
                      dataIndex: 'created_at',
                      width: 160,
                      render: (v) => formatDate(v),
                  },
              ]
            : []),
        {
            title: t('common.actions'),
            width: 96,
            align: 'center',
            render: (_, row) => (
                <Space size={0}>
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

    const handleModalOpenChange = (opened) => {
        if (!opened) return;
        if (editing) {
            const values = {};
            fields.forEach((f) => {
                values[f.key] = f.type === 'boolean' ? Boolean(editing[f.key]) : editing[f.key];
            });
            form.setFieldsValue(values);
        } else {
            form.resetFields();
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
        const url = editing ? `${storeUrl}/${editing.id}` : storeUrl;
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
                router.delete(`${storeUrl}/${row.id}`, { preserveScroll: true });
            },
        });
    };

    return (
        <PanelLayout>
            <PageHeader
                title={config?.title || t('menus.catalogs')}
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
                    {(filterDefs || []).map((f) => (
                        <Select
                            key={f.key}
                            allowClear
                            placeholder={f.type === 'boolean' ? t('common.all_statuses') : t(f.label)}
                            value={applied[f.key]}
                            onChange={(v) => onFilterChange(f.key, v)}
                            className={f.type === 'select' ? 'ui-filter-advisor' : 'ui-filter-status'}
                            options={
                                f.type === 'boolean'
                                    ? [
                                          { value: '1', label: t('common.active') },
                                          { value: '0', label: t('common.inactive') },
                                      ]
                                    : options[f.options] || []
                            }
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
                            router.get(
                                baseUrl,
                                { ...filter, page },
                                { preserveState: true },
                            );
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
                    {fields
                        .filter((f) => !(f.create_only && editing))
                        .map((field) => {
                            const rules = [];
                            if (field.required && field.type !== 'boolean') {
                                rules.push({ required: true, message: `${labelFor(field)} ${t('common.required')}` });
                            }
                            if (field.type === 'password' && !editing) {
                                rules.push({ min: 8, message: t('common.password_min') });
                            }

                            return (
                                <Form.Item
                                    key={field.key}
                                    name={field.key}
                                    label={labelFor(field)}
                                    valuePropName={field.type === 'boolean' ? 'checked' : 'value'}
                                    initialValue={field.type === 'boolean' ? false : undefined}
                                    rules={rules}
                                >
                                    {controlFor(field)}
                                </Form.Item>
                            );
                        })}
                </Form>
            </Modal>
        </PanelLayout>
    );
}