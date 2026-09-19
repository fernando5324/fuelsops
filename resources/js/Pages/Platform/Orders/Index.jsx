import React, { useEffect, useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import { App, Button, Card, DatePicker, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PanelLayout from '../../../Layouts/PanelLayout';
import useTranslations from '@/hooks/useTranslations';

export default function OrdersIndex({ orders, filter, statuses }) {
    const { message } = App.useApp();
    const { flash } = usePage().props;
    const { t } = useTranslations();
    const [q, setQ] = useState(filter?.q || '');
    const [statusId, setStatusId] = useState(filter?.status_id || undefined);
    const [date, setDate] = useState(filter?.order_date || undefined);

    useEffect(() => {
        if (flash?.success) {
            message.success(flash.success);
        }
    }, [flash]);

    const applyFilters = (overrides = {}) => {
        const params = {
            q: q || undefined,
            status_id: overrides.status_id !== undefined ? overrides.status_id : statusId,
            order_date: overrides.date !== undefined ? overrides.date : date,
        };

        router.get('/pedidos', params, { preserveState: true, replace: true });
    };

    const columns = [
        {
            title: t('order.order_number'),
            dataIndex: 'id',
            width: 90,
            render: (id) => <Link href={`/pedidos/${id}`}>{`#${id}`}</Link>,
        },
        { title: t('order.order_date'), dataIndex: 'order_date', width: 110 },
        {
            title: t('order.customer'),
            render: (_, row) => (
                <div>
                    <Typography.Text strong>{row.customer?.name || '-'}</Typography.Text>
                    <div>
                        <Typography.Text type="secondary">
                            {row.customer?.tax_id || ''}
                        </Typography.Text>
                    </div>
                </div>
            ),
        },
        {
            title: t('order.advisor'),
            render: (_, row) => row.advisor?.name || '-',
        },
        {
            title: t('order.driver'),
            render: (_, row) => row.driver?.name || '-',
        },
        {
            title: t('order.status'),
            dataIndex: 'status',
            width: 120,
            render: (status) => (
                <Tag color={status?.color || 'default'}>{status?.name || '-'}</Tag>
            ),
        },
        {
            title: t('common.actions'),
            width: 90,
            render: (_, row) => (
                <Button type="link" size="small" href={`/pedidos/${row.id}`}>
                    {t('common.view')}
                </Button>
            ),
        },
    ];

    return (
        <Card title={t('menus.orders')}>
            <Space wrap style={{ marginBottom: 16 }}>
                <Input.Search
                    allowClear
                    placeholder={t('common.search')}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onSearch={() => applyFilters()}
                    enterButton={<SearchOutlined />}
                    style={{ width: 280 }}
                />
                <Select
                    allowClear
                    placeholder={t('order.status')}
                    value={statusId}
                    onChange={(v) => {
                        setStatusId(v);
                        applyFilters({ status_id: v });
                    }}
                    style={{ width: 180 }}
                    options={(statuses || []).map((s) => ({ value: s.id, label: s.name }))}
                />
                <DatePicker
                    placeholder={t('order.order_date')}
                    value={date ? dayjs(date) : null}
                    onChange={(v) => {
                        setDate(v ? v.format('YYYY-MM-DD') : undefined);
                        applyFilters({ date: v ? v.format('YYYY-MM-DD') : undefined });
                    }}
                />
            </Space>

            <Table
                rowKey="id"
                dataSource={orders?.data || []}
                columns={columns}
                size="middle"
                locale={{ emptyText: t('common.no_data') }}
                pagination={{
                    current: orders?.current_page || 1,
                    pageSize: orders?.per_page || 15,
                    total: orders?.total || 0,
                    showTotal: (total) => `${total} ${t('common.records_found')}`,
                    onChange: (page) => {
                        router.get(`/pedidos`, { ...filter, page }, { preserveState: true });
                    },
                }}
            />
        </Card>
    );
}