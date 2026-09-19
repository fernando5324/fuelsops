import React, { useEffect, useState } from 'react';
import { usePage, router, Link } from '@inertiajs/react';
import {
    App,
    Button,
    Card,
    Descriptions,
    Input,
    Select,
    Space,
    Table,
    Tag,
    Timeline,
    Typography,
} from 'antd';
import { DownloadOutlined, FileTextOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import PanelLayout from '../../../Layouts/PanelLayout';
import useTranslations from '@/hooks/useTranslations';
import SubmitButton from '@/Components/SubmitButton';

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

    const details = order?.details || [];
    const files = order?.files || [];
    const history = order?.status_history || [];

    const detailColumns = [
        { title: 'SCOP', dataIndex: 'scop', width: 90 },
        { title: t('order.plant'), render: (_, r) => r.plant?.name || '-' },
        { title: t('order.wholesaler'), render: (_, r) => r.wholesaler?.name || '-' },
        { title: t('order.product'), render: (_, r) => r.product?.name || '-' },
        {
            title: t('order.gallons'),
            dataIndex: 'gallons',
            align: 'right',
            render: (v) => Number(v).toLocaleString('es-ES', { minimumFractionDigits: 2 }),
        },
        {
            title: t('order.sale_price'),
            dataIndex: 'sale_price',
            align: 'right',
            render: (v) => Number(v).toLocaleString('es-ES', { minimumFractionDigits: 4 }),
        },
        {
            title: t('order.compartments'),
            dataIndex: 'compartments',
            align: 'center',
        },
        {
            title: t('order.detail_total'),
            dataIndex: 'detail_total',
            align: 'right',
            render: (v) => Number(v).toLocaleString('es-ES', { minimumFractionDigits: 2 }),
        },
    ];

    return (
        <PanelLayout title={`${t('order.order_detail')} #${order?.id}`}>
            <Space style={{ marginBottom: 16 }}>
                <Link href="/pedidos">
                    <Button icon={<ArrowLeftOutlined />}>{t('common.back')}</Button>
                </Link>
            </Space>

            <Card
                title={
                    <Space>
                        <Typography.Text strong>{`${t('order.order_number')} #${order?.id}`}</Typography.Text>
                        <Tag color={order?.status?.color || 'default'} style={{ marginLeft: 8 }}>
                            {order?.status?.name}
                        </Tag>
                    </Space>
                }
                extra={
                    <Space>
                        <Select
                            style={{ width: 160 }}
                            value={statusId}
                            onChange={(v) => setStatusId(v)}
                            options={(statuses || []).map((s) => ({ value: s.id, label: s.name }))}
                        />
                        <SubmitButton
                            disabled={!statusId}
                            onClick={() =>
                                router.post(
                                    `/pedidos/${order.id}/estado`,
                                    { status_id: statusId, notes },
                                    { preserveScroll: true },
                                )
                            }
                        >
                            {t('order.change_status')}
                        </SubmitButton>
                    </Space>
                }
            >
                {order?.notes && (
                    <Typography.Paragraph type="secondary">{order.notes}</Typography.Paragraph>
                )}

                <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 3 }}>
                    <Descriptions.Item label={t('order.order_date')}>
                        {order?.order_date}
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
                    <Descriptions.Item label={t('order.driver')}>
                        {order?.driver?.name}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('catalogs.vehicle_type') + ' ' + t('catalogs.type_tanker')}>
                        {order?.tanker?.license_plate}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('catalogs.vehicle_type') + ' ' + t('catalogs.type_tractor')}>
                        {order?.tractor?.license_plate}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('common.created_at')}>
                        {order?.created_at}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('common.created_by')}>
                        {order?.created_by_name || '-'}
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            <Card title={t('order.details')} style={{ marginTop: 16 }}>
                <Table
                    rowKey="id"
                    dataSource={details}
                    columns={detailColumns}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: t('common.no_data') }}
                    summary={(rows) => {
                        const g = rows.reduce((a, r) => a + Number(r.gallons || 0), 0);
                        const s = rows.reduce(
                            (a, r) => a + Number(r.gallons || 0) * Number(r.sale_price || 0),
                            0,
                        );
                        return (
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={3} align="right">
                                    <Typography.Text strong>{t('order.total_gallons')}</Typography.Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1} align="right">
                                    <Typography.Text strong>
                                        {g.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                    </Typography.Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={2} colSpan={2} />
                                <Table.Summary.Cell index={4} align="right" colSpan={2}>
                                    <Typography.Text strong>
                                        {`${t('order.total_sale')}: `}
                                        {s.toLocaleString('es-ES', {
                                            style: 'currency',
                                            currency: 'USD',
                                            minimumFractionDigits: 2,
                                        })}
                                    </Typography.Text>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        );
                    }}
                />
            </Card>

            <Card title={t('common.files')} style={{ marginTop: 16 }}>
                {files.length === 0 ? (
                    <Typography.Text type="secondary">{t('common.no_data')}</Typography.Text>
                ) : (
                    <Table
                        rowKey="id"
                        dataSource={files}
                        pagination={false}
                        size="small"
                        columns={[
                            {
                                title: t('common.files'),
                                render: (_, f) => (
                                    <Space>
                                        <FileTextOutlined />
                                        {f.original_name || f.file_name}
                                    </Space>
                                ),
                            },
                            {
                                title: t('common.actions'),
                                width: 120,
                                render: (_, f) => (
                                    <Button
                                        type="link"
                                        icon={<DownloadOutlined />}
                                        href={`/archivos/${f.id}/descargar`}
                                    >
                                        {t('common.download')}
                                    </Button>
                                ),
                            },
                        ]}
                    />
                )}
            </Card>

            {history.length > 0 && (
                <Card title={t('order.status_history')} style={{ marginTop: 16 }}>
                    <Timeline
                        items={history.map((h) => ({
                            color: h.status?.color || 'blue',
                            children: (
                                <div>
                                    <Space>
                                        <Tag color={h.status?.color || 'default'}>
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
                                            {h.created_at}
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