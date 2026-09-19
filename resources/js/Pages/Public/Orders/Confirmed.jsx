import React from 'react';
import { Link } from '@inertiajs/react';
import { Alert, Button, Card, Descriptions, Space, Table, Tag, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';

export default function PublicOrderConfirmed({ order, totals }) {
    const { t } = useTranslations();
    const details = order?.details || [];

    const columns = [
        { title: 'SCOP', dataIndex: 'scop' },
        { title: t('order.plant'), render: (_, r) => r.plant?.name || '-' },
        { title: t('order.wholesaler'), render: (_, r) => r.wholesaler?.name || '-' },
        { title: t('order.product'), render: (_, r) => r.product?.name || '-' },
        { title: t('order.gallons'), dataIndex: 'gallons', align: 'right' },
        { title: t('order.sale_price'), dataIndex: 'sale_price', align: 'right' },
        {
            title: t('order.detail_total'),
            align: 'right',
            render: (_, r) =>
                (Number(r.gallons) * Number(r.sale_price)).toLocaleString('es-ES', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                }),
        },
    ];

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1f3a47 0%, #2c5f73 100%)',
                padding: '32px 16px',
            }}
        >
            <Card style={{ maxWidth: 980, margin: '0 auto', borderRadius: 12 }}>
                <Alert
                    banner
                    icon={<CheckCircleOutlined />}
                    type="success"
                    message={t('order.registered_ok')}
                    description={`${t('order.order_number')} #${order?.id}`}
                    style={{ marginBottom: 16 }}
                />

                <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                    <Descriptions.Item label={t('order.order_date')}>
                        {order?.order_date}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('order.status')}>
                        <Tag color={order?.status?.color || 'default'}>
                            {order?.status?.name}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={t('order.customer')}>
                        {order?.customer?.name}
                        <div>
                            <Typography.Text type="secondary">{order?.customer?.tax_id}</Typography.Text>
                        </div>
                    </Descriptions.Item>
                    <Descriptions.Item label={t('order.advisor')}>
                        {order?.advisor?.name}
                    </Descriptions.Item>
                </Descriptions>

                <Table
                    rowKey="id"
                    dataSource={details}
                    columns={columns}
                    pagination={false}
                    size="small"
                    style={{ marginTop: 16 }}
                    summary={(rows) => (
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={4} align="right">
                                <Typography.Text strong>{t('order.total_gallons')}</Typography.Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right">
                                {totals?.total_gallons}
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} colSpan={2} align="right">
                                <Typography.Text strong>
                                    {`${t('order.total_sale')}: `}
                                    {(totals?.total_sale || 0).toLocaleString('es-ES', {
                                        style: 'currency',
                                        currency: 'USD',
                                        minimumFractionDigits: 2,
                                    })}
                                </Typography.Text>
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                    )}
                />

                <Space style={{ marginTop: 16 }} wrap>
                    <Link href="/pedidos/registro">
                        <Button type="primary">{t('order.register_another')}</Button>
                    </Link>
                    <Link href="/">
                        <Button>{t('order.back_home')}</Button>
                    </Link>
                </Space>
            </Card>
        </div>
    );
}