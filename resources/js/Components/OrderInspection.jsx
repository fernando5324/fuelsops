import React from 'react';
import { Button, Descriptions, Space, Table, Tag, Typography } from 'antd';
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import Media from '@/Services/Media';
import useTranslations from '@/hooks/useTranslations';
import formatDate from '@/lib/dates';
import formatMoney from '@/lib/money';
import statusColor from '@/lib/status';

export default function OrderInspection({ order, totals, showFiles = true }) {
    const { t } = useTranslations();
    const details = order?.details || [];
    const files = order?.files || [];

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
            render: (v) => formatMoney(v),
        },
    ];

    return (
        <>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 3 }}>
                <Descriptions.Item label={t('order.order_date')}>
                    {formatDate(order?.order_date, { withTime: true })}
                </Descriptions.Item>
                <Descriptions.Item label={t('order.status')}>
                    <Tag color={statusColor(order?.status)}>{order?.status?.name || '-'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label={t('order.customer')}>
                    {order?.customer?.name}
                    <div>
                        <Typography.Text type="secondary">{order?.customer?.tax_id}</Typography.Text>
                    </div>
                </Descriptions.Item>
                <Descriptions.Item label={t('order.advisor')}>
                    {order?.advisor?.name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={t('order.driver')}>
                    {order?.driver?.name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={`${t('catalogs.vehicle_type')} ${t('catalogs.type_tanker')}`}>
                    {order?.tanker?.license_plate || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={`${t('catalogs.vehicle_type')} ${t('catalogs.type_tractor')}`}>
                    {order?.tractor?.license_plate || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={t('common.created_at')}>
                    {formatDate(order?.created_at, { withTime: true })}
                </Descriptions.Item>
                <Descriptions.Item label={t('common.created_by')}>
                    {order?.created_by_name || '-'}
                </Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5} style={{ marginTop: 20 }}>
                {t('order.details')}
            </Typography.Title>

            <Table
                rowKey="id"
                dataSource={details}
                columns={detailColumns}
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
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
                                    {formatMoney(s)}
                                </Typography.Text>
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                    );
                }}
            />

            {showFiles && (
                <>
                    <Typography.Title level={5} style={{ marginTop: 20 }}>
                        {t('common.files')}
                    </Typography.Title>

                    {files.length === 0 ? (
                        <Typography.Text type="secondary">{t('common.no_data')}</Typography.Text>
                    ) : (
                        <Table
                            rowKey="id"
                            dataSource={files}
                            pagination={false}
                            size="small"
                            scroll={{ x: 'max-content' }}
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
                                            href={Media.routes.download(f.id)}
                                        >
                                            {t('common.download')}
                                        </Button>
                                    ),
                                },
                            ]}
                        />
                    )}
                </>
            )}
        </>
    );
}