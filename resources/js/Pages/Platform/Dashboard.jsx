import React, { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { App, Card, Col, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { Link } from '@inertiajs/react';
import {
    AppstoreOutlined,
    FileTextOutlined,
    TeamOutlined,
    UserOutlined,
} from '@ant-design/icons';
import PanelLayout from '../../Layouts/PanelLayout';
import PageHeader from '@/Components/PageHeader';
import useTranslations from '@/hooks/useTranslations';
import formatDate from '@/lib/dates';

export default function Dashboard({ statuses, counts, total_orders, recent }) {
    const { message } = App.useApp();
    const { flash } = usePage().props;
    const { t } = useTranslations();

    useEffect(() => {
        if (flash?.success) {
            message.success(flash.success);
        }
    }, [flash]);

    const quickLinks = [
        { key: 'orders', href: '/pedidos', icon: <FileTextOutlined />, label: t('menus.orders') },
        { key: 'catalogs', href: '/catalogos/asesores', icon: <AppstoreOutlined />, label: t('menus.catalogs') },
        { key: 'users', href: '/usuarios', icon: <TeamOutlined />, label: t('menus.users') },
        { key: 'profile', href: '/profile', icon: <UserOutlined />, label: t('menus.profile') },
    ];

    const columns = [
        {
            // Código operativo del pedido (ADR-020); el enlace va por id.
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
            render: (_, row) => row.customer?.name || '-',
        },
        {
            title: t('order.advisor'),
            render: (_, row) => row.advisor?.name || '-',
        },
        {
            title: t('order.status'),
            dataIndex: 'status',
            render: (status) => (
                <Tag color={status?.color || 'default'}>{status?.name || '-'}</Tag>
            ),
        },
    ];

    return (
        <PanelLayout>
            <PageHeader title={t('menus.dashboard')} />
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title={t('order.total_orders')}
                            value={total_orders || 0}
                            prefix={<FileTextOutlined />}
                        />
                    </Card>
                </Col>
                {(statuses || []).map((status) => (
                    <Col xs={24} sm={12} lg={6} key={status.id}>
                        <Card>
                            <Statistic
                                title={
                                    <Tag color={status.color || 'default'} style={{ margin: 0 }}>
                                        {status.name}
                                    </Tag>
                                }
                                value={counts?.[status.id] || 0}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Card title={t('menus.quick_access')} style={{ marginTop: 16 }}>
                <Row gutter={[16, 16]}>
                    {quickLinks.map((link) => (
                        <Col xs={24} sm={12} lg={6} key={link.key}>
                            <Link href={link.href}>
                                <Card hoverable size="small">
                                    <Space>
                                        {link.icon}
                                        <Typography.Text strong>{link.label}</Typography.Text>
                                    </Space>
                                </Card>
                            </Link>
                        </Col>
                    ))}
                </Row>
            </Card>

            <div className="ui-list-section" style={{ marginTop: 16 }}>
                <Typography.Title level={5} style={{ marginTop: 0 }}>
                    {t('order.recent_orders')}
                </Typography.Title>
                <Table
                    rowKey="id"
                    dataSource={recent || []}
                    columns={columns}
                    pagination={false}
                    size="middle"
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: t('common.no_data') }}
                />
            </div>
        </PanelLayout>
    );
}