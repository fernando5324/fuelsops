import React, { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    App,
    Button,
    Card,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Typography,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import PanelLayout from '../../../Layouts/PanelLayout';
import useTranslations from '@/hooks/useTranslations';
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
    const fields = config?.fields || [];
    const options = config?.options || {};

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
            return value || '-';
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
                      render: (v) => v || '-',
                  },
              ]
            : []),
        {
            title: t('common.actions'),
            width: 140,
            render: (_, row) => (
                <Space>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(row)}
                    >
                        {t('common.edit')}
                    </Button>
                    <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => confirmDelete(row)}
                    >
                        {t('common.delete')}
                    </Button>
                </Space>
            ),
        },
    ];

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        setOpen(true);
    };

    const openEdit = (row) => {
        setEditing(row);
        const values = {};
        fields.forEach((f) => {
            values[f.key] = row[f.key];
        });
        form.setFieldsValue(values);
        setOpen(true);
    };

    const onFinish = (values) => {
        const url = editing
            ? `/catalogos/${resource}/${editing.id}`
            : `/catalogos/${resource}`;

        const submit = editing ? router.put : router.post;

        submit(url, values, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => setOpen(false),
        });
    };

    const confirmDelete = (row) => {
        modal.confirm({
            title: t('common.confirm_delete'),
            content: `${t('common.edit_record')} #${row.id}`,
            okText: t('common.delete'),
            okType: 'danger',
            cancelText: t('common.cancel'),
            onOk: () => {
                router.delete(`/catalogos/${resource}/${row.id}`, { preserveScroll: true });
            },
        });
    };

    return (
        <PanelLayout title={config?.title || t('menus.catalogs')}>
            <Card
                title={config?.title || t('menus.catalogs')}
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        {t('common.create_record')}
                    </Button>
                }
            >
                <Space style={{ marginBottom: 16 }}>
                    <Input.Search
                        allowClear
                        placeholder={t('common.search')}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onSearch={(v) => {
                            router.get(`/catalogos/${resource}`, { q: v || undefined }, { preserveState: true, replace: true });
                        }}
                        enterButton={<SearchOutlined />}
                        style={{ width: 280 }}
                    />
                </Space>

                <Table
                    rowKey="id"
                    dataSource={rows?.data || []}
                    columns={columns}
                    size="middle"
                    locale={{ emptyText: t('common.no_data') }}
                    pagination={{
                        current: rows?.current_page || 1,
                        pageSize: rows?.per_page || 15,
                        total: rows?.total || 0,
                        showTotal: (total) => `${total} ${t('common.records_found')}`,
                        onChange: (page) => {
                            router.get(
                                `/catalogos/${resource}`,
                                { ...filter, page },
                                { preserveState: true },
                            );
                        },
                    }}
                />
            </Card>

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
                destroyOnClose
                maskClosable={false}
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