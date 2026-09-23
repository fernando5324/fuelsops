import React, { useEffect, useState } from 'react';
import { usePage, router, Link } from '@inertiajs/react';
import { App, Button, Card, Input, Select, Space, Tag, Timeline, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import PanelLayout from '../../../Layouts/PanelLayout';
import PageHeader from '@/Components/PageHeader';
import Orders from '@/Services/Orders';
import useTranslations from '@/hooks/useTranslations';
import SubmitButton from '@/Components/SubmitButton';
import OrderInspection from '@/Components/OrderInspection';
import formatDate from '@/lib/dates';
import statusColor from '@/lib/status';

export default function OrdersShow({ order, totals, statuses }) {
    const { message } = App.useApp();
    const { flash } = usePage().props;
    const { t } = useTranslations();
    const [statusId, setStatusId] = useState(order?.status_id);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (flash?.success) {
            message.success(flash.success);
        }
    }, [flash]);

    const history = order?.status_history || [];

    return (
        <PanelLayout>
            <PageHeader
                title={`${t('order.order_detail')} #${order?.id}`}
                extra={
                    <Link href={Orders.routes.index}>
                        <Button icon={<ArrowLeftOutlined />}>{t('common.back')}</Button>
                    </Link>
                }
            />

            <Card
                title={
                    <Space>
                        <Typography.Text strong>{`${t('order.order_number')} #${order?.id}`}</Typography.Text>
                        <Tag color={statusColor(order?.status)} style={{ marginLeft: 8 }}>
                            {order?.status?.name}
                        </Tag>
                    </Space>
                }
            >
                {order?.notes && (
                    <Typography.Paragraph type="secondary">{order.notes}</Typography.Paragraph>
                )}

                <Space wrap style={{ marginBottom: 16, width: '100%' }}>
                    <Select
                        style={{ width: 'min(100%, 160px)' }}
                        value={statusId}
                        onChange={(v) => setStatusId(v)}
                        options={(statuses || []).map((s) => ({ value: s.id, label: s.name }))}
                    />
                    <SubmitButton
                        disabled={!statusId}
                        onClick={() =>
                            router.post(
                                Orders.routes.changeStatus(order.id),
                                { status_id: statusId, notes },
                                { preserveScroll: true },
                            )
                        }
                    >
                        {t('order.change_status')}
                    </SubmitButton>
                </Space>

                <OrderInspection order={order} totals={totals} />
            </Card>

            {history.length > 0 && (
                <Card title={t('order.status_history')} style={{ marginTop: 16 }}>
                    <Timeline
                        items={history.map((h) => ({
                            color: statusColor(h.status),
                            children: (
                                <div>
                                    <Space>
                                        <Tag color={statusColor(h.status)}>
                                            {h.status?.name}
                                        </Tag>
                                        {h.previous_status && (
                                            <Typography.Text type="secondary">
                                                {t('order.previous_status')}: {h.previous_status.name}
                                            </Typography.Text>
                                        )}
                                    </Space>
                                    <div>
                                        <Typography.Text type="secondary">
                                            {formatDate(h.created_at, { withTime: true })}
                                        </Typography.Text>
                                    </div>
                                    {h.notes && <div>{h.notes}</div>}
                                </div>
                            ),
                        }))}
                    />
                </Card>
            )}
        </PanelLayout>
    );
}