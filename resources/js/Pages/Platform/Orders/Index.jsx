import React, { useEffect, useRef, useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import {
    Alert,
    App,
    Button,
    DatePicker,
    Drawer,
    Input,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PanelLayout from '../../../Layouts/PanelLayout';
import PageHeader from '@/Components/PageHeader';
import Orders from '@/Services/Orders';
import useTranslations from '@/hooks/useTranslations';
import formatDate from '@/lib/dates';
import formatMoney from '@/lib/money';
import { dateFormat, formatNumber } from '@/lib/format';
import statusColor from '@/lib/status';
import OrderPreview from '@/Components/Orders/OrderPreview';

const { RangePicker } = DatePicker;

export default function OrdersIndex({ orders, filter, statuses, advisors }) {
    const { message } = App.useApp();
    const { flash } = usePage().props;
    const { t } = useTranslations();

    const [q, setQ] = useState(filter?.q || '');
    const [statusId, setStatusId] = useState(filter?.status_id || undefined);
    const [advisorId, setAdvisorId] = useState(filter?.advisor_id || undefined);
    const [range, setRange] = useState([
        filter?.date_from ? dayjs(filter.date_from) : null,
        filter?.date_to ? dayjs(filter.date_to) : null,
    ]);
    const [selectedId, setSelectedId] = useState(null);
    const [inspection, setInspection] = useState(null);
    const [failed, setFailed] = useState(false);

    const searchTimer = useRef(null);

    useEffect(() => () => clearTimeout(searchTimer.current), []);

    useEffect(() => {
        if (flash?.success) {
            message.success(flash.success);
        }
    }, [flash]);

    const applyFilters = (overrides = {}) => {
        const params = {
            q: overrides.q !== undefined ? overrides.q : q || undefined,
            status_id: overrides.status_id !== undefined ? overrides.status_id : statusId,
            advisor_id: overrides.advisor_id !== undefined ? overrides.advisor_id : advisorId,
            date_from: overrides.date_from,
            date_to: overrides.date_to,
        };

        if (params.status_id === undefined || params.status_id === '') {
            delete params.status_id;
        }
        if (params.advisor_id === undefined || params.advisor_id === '') {
            delete params.advisor_id;
        }
        if (!params.date_from) {
            delete params.date_from;
        }
        if (!params.date_to) {
            delete params.date_to;
        }

        router.get(Orders.routes.index, params, { preserveState: true, replace: true });
    };

    const loadInspection = async (id) => {
        setSelectedId(id);
        setInspection(null);
        setFailed(false);
        try {
            const res = await Orders.detail(id);
            setInspection(res.data);
        } catch (e) {
            setFailed(true);
        }
    };

    const columns = [
        {
            // El código es el identificador visible (ADR-020); el enlace sigue
            // yendo por id, que es la clave técnica (ADR-020 §18).
            title: t('order.order_number'),
            dataIndex: 'code',
            width: 140,
            render: (code, row) => <Link href={`/pedidos/${row.id}`}>{code || '-'}</Link>,
        },
        {
            title: t('order.order_date'),
            dataIndex: 'order_date',
            width: 160,
            render: (v) => formatDate(v, { withTime: true }),
        },
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
            render: (_, row) => (
                <div>
                    {row.driver?.name || '-'}
                    <div>
                        <Typography.Text type="secondary">
                            {`T: ${row.tanker?.license_plate || '-'} · Tr: ${row.tractor_plate || '-'}`}
                        </Typography.Text>
                    </div>
                </div>
            ),
        },
        {
            title: t('order.gallons'),
            dataIndex: 'total_gallons',
            align: 'right',
            width: 120,
            render: (v) =>
                v === null || v === undefined ? '-' : formatNumber(v, 2),
        },
        {
            title: t('order.total_sale'),
            dataIndex: 'total_sale',
            align: 'right',
            width: 140,
            render: (v) => (v === null || v === undefined ? '-' : formatMoney(v)),
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
            title: t('common.actions'),
            width: 110,
            align: 'center',
            render: (_, row) => (
                <Space size={4}>
                    <Tooltip title={t('common.view')}>
                        <Button
                            type="text"
                            className="ui-icon-link"
                            aria-label={t('common.view')}
                            onClick={(e) => {
                                e.stopPropagation();
                                loadInspection(row.id);
                            }}
                        >
                            <EyeOutlined />
                        </Button>
                    </Tooltip>
                    <Tooltip title={t('common.edit')}>
                        <Link
                            href={Orders.routes.edit(row.id)}
                            className="ui-icon-link"
                            aria-label={t('common.edit')}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <EditOutlined />
                        </Link>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <PanelLayout>
            <PageHeader
                title={t('menus.orders')}
                extra={
                    // Alta manual (ADR-025): el pedido queda con origen `panel`
                    // y con `created_by` = este usuario.
                    <Link href={Orders.routes.create}>
                        <Button type="primary" icon={<PlusOutlined />}>
                            {t('order.new_order')}
                        </Button>
                    </Link>
                }
            />
            <div className="ui-list-section">
                <Space wrap style={{ marginBottom: 16, width: '100%' }}>
                    <Input
                        allowClear
                        placeholder={t('order.search_placeholder')}
                        value={q}
                        onChange={(e) => {
                            const value = e.target.value ?? '';
                            setQ(value);
                            clearTimeout(searchTimer.current);
                            searchTimer.current = setTimeout(() => {
                                applyFilters({ q: value.trim() || undefined });
                            }, 350);
                        }}
                        prefix={<SearchOutlined />}
                        className="ui-filter-search"
                    />
                    <Select
                        allowClear
                        placeholder={t('order.status')}
                        value={statusId}
                        onChange={(v) => {
                            setStatusId(v);
                            applyFilters({ status_id: v });
                        }}
                        className="ui-filter-status"
                        options={(statuses || []).map((s) => ({ value: s.id, label: s.name }))}
                    />
                    <Select
                        allowClear
                        placeholder={t('order.advisor')}
                        value={advisorId}
                        onChange={(v) => {
                            setAdvisorId(v);
                            applyFilters({ advisor_id: v });
                        }}
                        className="ui-filter-advisor"
                        options={(advisors || []).map((a) => ({ value: a.id, label: a.name }))}
                    />
                    <RangePicker
                        format={dateFormat()}
                        className="ui-filter-range"
                        value={[range[0] ?? null, range[1] ?? null]}
                        onChange={(dates) => {
                            setRange(dates || [null, null]);
                            applyFilters({
                                date_from: dates && dates[0] ? dates[0].format('YYYY-MM-DD') : undefined,
                                date_to: dates && dates[1] ? dates[1].format('YYYY-MM-DD') : undefined,
                            });
                        }}
                    />
                </Space>

                <Table
                    rowKey="id"
                    dataSource={orders?.data || []}
                    columns={columns}
                    size="middle"
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: t('common.no_data') }}
                    onRow={(row) => ({ onClick: () => loadInspection(row.id) })}
                    pagination={{
                        current: orders?.current_page || 1,
                        pageSize: orders?.per_page || 15,
                        total: orders?.total || 0,
                        showTotal: (total) => `${total} ${t('common.records_found')}`,
                        onChange: (page) => {
                            router.get(Orders.routes.index, { ...filter, page }, { preserveState: true });
                        },
                    }}
                />
            </div>

            <Drawer
                title={
                    selectedId
                        ? `${t('order.order')} ${inspection?.order?.code || selectedId}`
                        : t('order.order_detail')
                }
                size="min(100%, 560px)"
                open={!!selectedId}
                onClose={() => {
                    setSelectedId(null);
                    setInspection(null);
                    setFailed(false);
                }}
                extra={
                    selectedId ? (
                        <Space>
                            <Link href={`/pedidos/${selectedId}`}>
                                <Button type="primary">{t('order.view_order')}</Button>
                            </Link>
                            <Link href={Orders.routes.edit(selectedId)}>
                                <Button>{t('order.edit_order')}</Button>
                            </Link>
                        </Space>
                    ) : null
                }
            >
                {failed ? (
                    <Alert
                        type="error"
                        message={t('common.try_again')}
                        action={
                            <Button size="small" onClick={() => loadInspection(selectedId)}>
                                {t('common.try_again')}
                            </Button>
                        }
                    />
                ) : inspection && inspection.order ? (
                    <OrderPreview order={inspection.order} totals={inspection.totals} />
                ) : (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                        <Spin />
                    </div>
                )}
            </Drawer>
        </PanelLayout>
    );
}