import React from 'react';
import { Link, Head } from '@inertiajs/react';
import {
    Button,
    Card,
    Descriptions,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';
import PublicHeader from '@/Components/PublicHeader';
import formatDate from '@/lib/dates';
import formatMoney from '@/lib/money';
import statusColor from '@/lib/status';

export default function PublicOrderConfirmed({ order, totals }) {
    const { t } = useTranslations();
    const details = order?.details || [];

    const columns = [
        { title: t('order.scop'), dataIndex: 'scop' },
        { title: t('order.plant'), render: (_, r) => r.plant?.name || '-' },
        { title: t('order.wholesaler'), render: (_, r) => r.wholesaler?.name || '-' },
        { title: t('order.product'), render: (_, r) => r.product?.name || '-' },
        { title: t('order.gallons'), dataIndex: 'gallons', align: 'right' },
        { title: t('order.sale_price'), dataIndex: 'sale_price', align: 'right' },
        {
            title: t('order.detail_total'),
            align: 'right',
            render: (_, r) => formatMoney(Number(r.gallons) * Number(r.sale_price)),
        },
    ];

    return (
        <div className="ui-page-bg">
            <Head title={t('order.confirmed_title')} />
            <PublicHeader />

            <div className="ui-page ui-page--confirmed">
                <div className="ui-confirm-hero">
                    <CheckCircleFilled className="ui-confirm-icon" />
                    <Typography.Title level={3} className="ui-confirm-title">
                        {t('order.confirmed_title')}
                    </Typography.Title>
                    <Typography.Paragraph type="secondary">
                        {t('order.confirmed_subtitle')}
                    </Typography.Paragraph>
                    <Tag color="blue">{`${t('order.order_number')} #${order?.id}`}</Tag>
                </div>

                <Card className="ui-confirm-card">
                    <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                        <Descriptions.Item label={t('order.order_date')}>
                            {formatDate(order?.order_date, { withTime: true })}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('order.status')}>
                            <Tag color={statusColor(order?.status)}>{order?.status?.name}</Tag>
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
                        scroll={{ x: 'max-content' }}
                        style={{ marginTop: 16 }}
                    />

                    <div className="ui-summary" style={{ marginTop: 16 }}>
                        <div className="ui-summary-item">
                            <Typography.Text className="ui-summary-label">
                                {t('order.total_gallons')}
                            </Typography.Text>
                            <div className="ui-summary-value ui-summary-value--info">
                                {`${Number(totals?.total_gallons || 0).toLocaleString('es-ES', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })} gal`}
                            </div>
                        </div>
                        <div className="ui-summary-item">
                            <Typography.Text className="ui-summary-label">
                                {t('order.total_sale')}
                            </Typography.Text>
                            <div className="ui-summary-value ui-summary-value--money">
                                {formatMoney(totals?.total_sale)}
                            </div>
                        </div>
                    </div>

                    <Space style={{ marginTop: 24 }} wrap>
                        <Link href="/pedidos/registro">
                            <Button type="primary" className="ui-accent-btn">
                                {t('order.register_another')}
                            </Button>
                        </Link>
                        <Link href="/">
                            <Button>{t('order.back_home')}</Button>
                        </Link>
                    </Space>
                </Card>
            </div>
        </div>
    );
}
