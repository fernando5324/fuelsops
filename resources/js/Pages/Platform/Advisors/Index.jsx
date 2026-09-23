import React, { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { App, Button, Form, Input, Modal, Select, Space, Switch, Table, Tag, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import PanelLayout from '../../../Layouts/PanelLayout';
import PageHeader from '@/Components/PageHeader';
import SubmitButton from '@/Components/SubmitButton';
import { Advisors } from '@/Services';
import useTranslations from '@/hooks/useTranslations';
import formatDate from '@/lib/dates';

export default function AdvisorsIndex({ config, rows, filter }) {
    const { message, modal } = App.useApp();
    const { flash, errors } = usePage().props;
    const { t } = useTranslations();
    const [form] = Form.useForm();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [q, setQ] = useState(filter?.q || '');

    const baseUrl = config?.url || '/catalogos/asesores';
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
                name: editing.name,
                is_active: Boolean(editing.is_active),
            });
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
        const url = editing ? Advisors.routes.update(editing.id) : Advisors.routes.store;
        const options = { preserveScroll: true, forceFormData: true, onSuccess: () => setOpen(false) };

        if (editing) {
            router.put(url, values, options);
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
                router.delete(Advisors.routes.destroy(row.id), { preserveScroll: true });
            },
        });
    };

    const columns = [
        {
            title: t('common.name'),
            dataIndex: 'name',
            key: 'name',
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

    return (
        <PanelLayout>
            <PageHeader
                title={config?.title || t('menus.advisors')}
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
                        name="name"
                        label={t('common.name')}
                        rules={[{ required: true, message: `${t('common.name')} ${t('common.required')}` }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="is_active"
                        label={t('common.status')}
                        valuePropName="checked"
                        initialValue
                    >
                        <Switch checkedChildren={t('common.yes')} unCheckedChildren={t('common.no')} />
                    </Form.Item>
                </Form>
            </Modal>
        </PanelLayout>
    );
}