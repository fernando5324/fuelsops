import React, { useEffect } from 'react';
import { usePage, Link } from '@inertiajs/react';
import { App, Button, Col, Row } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import PanelLayout from '../../../Layouts/PanelLayout';
import PageHeader from '@/Components/PageHeader';
import Orders from '@/Services/Orders';
import useTranslations from '@/hooks/useTranslations';
import formatDate from '@/lib/dates';
import OrderHeader from '@/Components/Orders/OrderHeader';
import OrderSummary from '@/Components/Orders/OrderSummary';
import OrderInfo from '@/Components/Orders/OrderInfo';
import OrderItems from '@/Components/Orders/OrderItems';
import OrderDeposits from '@/Components/Orders/OrderDeposits';
import OrderDocuments from '@/Components/Orders/OrderDocuments';
import OrderObservations from '@/Components/Orders/OrderObservations';
import OrderStatusHistory from '@/Components/Orders/OrderStatusHistory';
import OrderStatusChanger from '@/Components/Orders/OrderStatusChanger';

export default function OrdersShow({ order, totals, statuses }) {
    const { message } = App.useApp();
    const { flash } = usePage().props;
    const { t } = useTranslations();

    useEffect(() => {
        if (flash?.success) {
            message.success(flash.success);
        }
    }, [flash]);

    return (
        <PanelLayout>
            <PageHeader
                title={`${t('order.order_detail')} #${order?.id}`}
                extra={
                    <>
                        <Link href={Orders.routes.edit(order.id)}>
                            <Button type="primary" icon={<EditOutlined />}>
                                {t('order.edit_order')}
                            </Button>
                        </Link>
                        <Link href={Orders.routes.index}>
                            <Button icon={<ArrowLeftOutlined />}>{t('common.back')}</Button>
                        </Link>
                    </>
                }
            />

            <OrderHeader order={order} />

            <OrderSummary totals={totals} />

            <Row gutter={[16, 0]}>
                <Col xs={24} lg={12}>
                    <OrderInfo
                        title={t('order.customer_block')}
                        index={1}
                        items={[
                            { label: 'RUC', value: order?.customer?.tax_id || '-' },
                            { label: t('common.name'), value: order?.customer?.name || '-' },
                        ]}
                    />
                </Col>
                <Col xs={24} lg={12}>
                    <OrderInfo
                        title={t('order.order_block')}
                        index={2}
                        items={[
                            {
                                label: t('order.order_date'),
                                value: formatDate(order?.order_date, { withTime: true }),
                            },
                            { label: t('order.advisor'), value: order?.advisor?.name || '-' },
                            { label: t('order.status'), value: order?.status?.name || '-' },
                        ]}
                    />
                </Col>
                <Col xs={24} lg={12}>
                    <OrderInfo
                        title={t('order.driver_block')}
                        index={3}
                        items={[
                            { label: t('common.name'), value: order?.driver?.name || '-' },
                            {
                                label: t('order.license'),
                                value: order?.driver?.license_number || '-',
                            },
                        ]}
                    />
                </Col>
                <Col xs={24} lg={12}>
                    <OrderInfo
                        title={t('order.vehicle_block')}
                        index={4}
                        items={[
                            { label: t('order.tanker'), value: order?.tanker?.license_plate || '-' },
                            { label: t('order.tractor'), value: order?.tractor?.license_plate || '-' },
                        ]}
                    />
                </Col>
            </Row>

            <OrderStatusChanger order={order} statuses={statuses} />

            <OrderItems order={order} totals={totals} />

            <OrderDeposits />

            <OrderDocuments files={order?.files || []} />

            <OrderObservations notes={order?.notes} />

            <OrderStatusHistory history={order?.status_history || []} />
        </PanelLayout>
    );
}