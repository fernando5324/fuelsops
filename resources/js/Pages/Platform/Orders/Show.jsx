import React, { useEffect, useState } from 'react';
import { usePage, Link } from '@inertiajs/react';
import { Alert, App, Button, Col, Input, Modal, Row, Select, Space, Typography } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, RestOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import PanelLayout from '../../../Layouts/PanelLayout';
import PageHeader from '@/Components/PageHeader';
import SubmitButton from '@/Components/SubmitButton';
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

const reasons = [
    'reason_error',
    'reason_duplicate',
    'reason_client_request',
    'reason_wrong_info',
    'reason_replaced',
    'reason_other',
];

export default function OrdersShow({ order, totals, statuses, trash }) {
    const { message } = App.useApp();
    const { flash, auth } = usePage().props;
    const { t } = useTranslations();
    const isOwner = auth?.user?.is_owner;
    const isTrashed = !!order?.is_deleted || !!trash?.deletion;

    const [trashOpen, setTrashOpen] = useState(false);
    const [reasonKey, setReasonKey] = useState();
    const [description, setDescription] = useState('');
    const [reasonError, setReasonError] = useState(false);

    useEffect(() => {
        if (flash?.success) {
            message.success(flash.success);
        }
    }, [flash]);

    const submitToTrash = () => {
        if (!reasonKey) {
            setReasonError(true);
            return;
        }
        const motivo = t(`order.${reasonKey}`);
        const reason = description?.trim() ? `${motivo} — ${description.trim()}` : motivo;
        router.post(Orders.routes.trash(order.id), { reason }, { preserveScroll: true });
    };

    const submitRestore = () => {
        router.post(Orders.routes.restore(order.id), {}, { preserveScroll: true });
    };

    const headerExtra = isTrashed ? (
        <Space wrap>
            {isOwner ? (
                <Button type="primary" icon={<RestOutlined />} onClick={submitRestore}>
                    {t('order.restore_order')}
                </Button>
            ) : null}
            <Link href={Orders.routes.trashIndex}>
                <Button icon={<ArrowLeftOutlined />}>{t('order.trash')}</Button>
            </Link>
        </Space>
    ) : (
        <Space wrap>
            {isOwner ? (
                <Button danger icon={<DeleteOutlined />} onClick={() => setTrashOpen(true)}>
                    {t('order.send_to_trash')}
                </Button>
            ) : null}
            <Link href={Orders.routes.edit(order.id)}>
                <Button type="primary" icon={<EditOutlined />}>
                    {t('order.edit_order')}
                </Button>
            </Link>
            <Link href={Orders.routes.index}>
                <Button icon={<ArrowLeftOutlined />}>{t('common.back')}</Button>
            </Link>
        </Space>
    );

    return (
        <PanelLayout>
            <PageHeader
                title={`${t('order.order_detail')} #${order?.id}`}
                headTitle={
                    isTrashed
                        ? `${t('menus.trash')} #${order?.id}`
                        : `${t('menus.orders')} #${order?.id}`
                }
                extra={headerExtra}
            />

            {isTrashed ? (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message={t('order.in_trash_banner_title')}
                    description={
                        <Space direction="vertical" size={2}>
                            <Typography.Text>
                                {t('order.in_trash_banner_body', {
                                    date: formatDate(trash.deletion.deleted_at, { withTime: true }),
                                    by: trash.deletion.deleted_by?.name || '-',
                                })}
                            </Typography.Text>
                            <Typography.Text strong>
                                {`${t('order.in_trash_banner_reason')} ${trash.deletion.reason || '-'}`}
                            </Typography.Text>
                            <Typography.Text>{t('order.in_trash_restore_hint')}</Typography.Text>
                        </Space>
                    }
                />
            ) : null}

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

            {!isTrashed ? <OrderStatusChanger order={order} statuses={statuses} /> : null}

            <OrderItems order={order} totals={totals} />

            <OrderDeposits />

            <OrderDocuments files={order?.files || []} />

            <OrderObservations notes={order?.notes} />

            <OrderStatusHistory history={order?.status_history || []} />

            <Modal
                open={trashOpen && !isTrashed}
                title={t('order.confirm_trash_title')}
                onCancel={() => setTrashOpen(false)}
                destroyOnHidden
                footer={[
                    <Button key="cancel" onClick={() => setTrashOpen(false)}>
                        {t('common.cancel')}
                    </Button>,
                    <SubmitButton key="trash" danger onClick={submitToTrash}>
                        {t('order.send_to_trash')}
                    </SubmitButton>,
                ]}
            >
                <p>{t('order.confirm_trash_lead', { id: order?.id || '' })}</p>
                <p>{t('order.trash_away_from_list')}</p>
                <p>{t('order.trash_keeps_payments_docs')}</p>
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    <Select
                        status={reasonError ? 'error' : undefined}
                        placeholder={t('order.trash_reason')}
                        value={reasonKey}
                        onChange={(v) => {
                            setReasonKey(v);
                            setReasonError(false);
                        }}
                        style={{ width: '100%' }}
                        options={reasons.map((key) => ({ value: key, label: t(`order.${key}`) }))}
                    />
                    <Input.TextArea
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        maxLength={400}
                        placeholder={t('order.trash_description_placeholder')}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </Space>
            </Modal>
        </PanelLayout>
    );
}