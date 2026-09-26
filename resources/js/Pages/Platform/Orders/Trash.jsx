import React, { useEffect, useRef, useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import { App, Button, Input, Modal, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, EyeOutlined, RestOutlined, SearchOutlined } from '@ant-design/icons';
import PanelLayout from '../../../Layouts/PanelLayout';
import PageHeader from '@/Components/PageHeader';
import SubmitButton from '@/Components/SubmitButton';
import Orders from '@/Services/Orders';
import useTranslations from '@/hooks/useTranslations';
import formatDate from '@/lib/dates';
import formatMoney from '@/lib/money';
import statusColor from '@/lib/status';

export default function OrdersTrash({ orders, filter }) {
    const { message } = App.useApp();
    const { flash, auth } = usePage().props;
    const { t } = useTranslations();
    const isOwner = auth?.user?.is_owner;

    const [q, setQ] = useState(filter?.q || '');
    const [restoring, setRestoring] = useState(null);
    const searchTimer = useRef(null);

    useEffect(() => () => clearTimeout(searchTimer.current), []);

    useEffect(() => {
        if (flash?.success) {
            message.success(flash.success);
        }
    }, [flash]);

    const applyFilters = (overrides = {}) => {
        const params = { q: overrides.q !== undefined ? overrides.q : q || undefined };
        if (!params.q) {
            delete params.q;
        }
        router.get(Orders.routes.trashIndex, params, { preserveState: true, replace: true });
    };

    const restoreOrder = () => {
        if (!restoring) return;
        router.post(Orders.routes.restore(restoring.id), {}, { preserveScroll: true });
    };

    const columns = [
        {
            title: t('order.order_number'),
            dataIndex: 'id',
            width: 120,
            render: (id) => (
                <Link href={Orders.routes.trashShow(id)} className="ui-trash-link">{`#${id}`}</Link>
            ),
        },
        {
            title: t('order.customer'),
            render: (_, row) => (
                <div>
                    <Typography.Text strong>{row.customer?.name || '-'}</Typography.Text>
                    <div>
                        <Typography.Text type="secondary">{row.customer?.tax_id || ''}</Typography.Text>
                    </div>
                </div>
            ),
        },
        {
            title: t('order.order_date'),
            dataIndex: 'order_date',
            width: 160,
            render: (v) => formatDate(v, { withTime: true }),
        },
        {
            title: t('order.status'),
            dataIndex: 'status',
            width: 120,
            render: (status) => (
                <Tag color={statusColor(status)}>{status?.name || '-'}</Tag>
            ),
        },
        {
            title: t('order.trashed_by'),
            dataIndex: ['deletions'],
            width: 160,
            render: (deletions) => deletions?.[0]?.deleted_by?.name || '-',
        },
        {
            title: t('order.trashed_at'),
            dataIndex: ['deletions'],
            width: 160,
            render: (deletions) => formatDate(deletions?.[0]?.deleted_at, { withTime: true }),
        },
        {
            title: t('order.trash_reason'),
            dataIndex: ['deletions'],
            width: 220,
            ellipsis: true,
            render: (deletions) => deletions?.[0]?.reason || '-',
        },
        {
            title: t('order.total_sale'),
            dataIndex: 'total_sale',
            align: 'right',
            width: 140,
            render: (v) => (v === null || v === undefined ? '-' : formatMoney(v)),
        },
        {
            title: t('common.actions'),
            width: 120,
            align: 'center',
            render: (_, row) => (
                <Space size={4}>
                    <Tooltip title={t('common.view')}>
                        <Link
                            href={Orders.routes.trashShow(row.id)}
                            className="ui-icon-link"
                            aria-label={t('common.view')}
                        >
                            <EyeOutlined />
                        </Link>
                    </Tooltip>
                    {isOwner ? (
                        <Tooltip title={t('order.restore')}>
                            <Button
                                type="text"
                                className="ui-icon-link"
                                icon={<RestOutlined />}
                                aria-label={t('order.restore')}
                                onClick={() => setRestoring(row)}
                            />
                        </Tooltip>
                    ) : null}
                </Space>
            ),
        },
    ];

    return (
        <PanelLayout>
            <PageHeader
                title={t('order.trash_title')}
                extra={
                    <Link href={Orders.routes.index}>
                        <Button icon={<DeleteOutlined />}>{t('order.orders')}</Button>
                    </Link>
                }
            />

            <div className="ui-list-section">
                <Space wrap style={{ marginBottom: 16, width: '100%' }}>
                    <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        placeholder={t('order.trash_search_placeholder')}
                        value={q}
                        onChange={(e) => {
                            const value = e.target.value ?? '';
                            setQ(value);
                            clearTimeout(searchTimer.current);
                            searchTimer.current = setTimeout(() => {
                                applyFilters({ q: value.trim() || undefined });
                            }, 350);
                        }}
                        className="ui-filter-search"
                    />
                </Space>

                <Table
                    rowKey="id"
                    dataSource={orders?.data || []}
                    columns={columns}
                    size="middle"
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: t('order.trash_empty') }}
                    pagination={{
                        current: orders?.current_page || 1,
                        pageSize: orders?.per_page || 15,
                        total: orders?.total || 0,
                        showTotal: (total) => `${total} ${t('common.records_found')}`,
                        onChange: (page) => {
                            router.get(Orders.routes.trashIndex, { ...filter, page }, { preserveState: true });
                        },
                    }}
                />
            </div>

            <Modal
                open={!!restoring}
                title={t('order.confirm_restore_title')}
                onCancel={() => setRestoring(null)}
                destroyOnHidden
                footer={[
                    <Button key="cancel" onClick={() => setRestoring(null)}>
                        {t('common.cancel')}
                    </Button>,
                    <SubmitButton key="restore" danger onClick={restoreOrder}>
                        {t('order.restore_order')}
                    </SubmitButton>,
                ]}
            >
                <p>
                    {t('order.confirm_restore_lead', { id: restoring?.id || '' })}
                </p>
                <p>{t('order.confirm_restore_body')}</p>
            </Modal>
        </PanelLayout>
    );
}