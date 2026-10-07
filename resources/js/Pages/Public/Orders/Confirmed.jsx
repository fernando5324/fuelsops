import React from 'react';
import { Link, Head } from '@inertiajs/react';
import { Button, Descriptions, Space, Table, Tag, Typography } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';
import PublicHeader from '@/Components/PublicHeader';
import SectionCard from '@/Components/SectionCard';
import formatDate from '@/lib/dates';
import formatMoney from '@/lib/money';
import formatFileSize from '@/lib/files';
import statusColor from '@/lib/status';
import { formatGallons } from '@/lib/format';

export default function PublicOrderConfirmed({ order, totals }) {
    const { t } = useTranslations();
    const details = order?.details || [];
    const compartments = order?.compartments || [];
    const files = order?.files || [];

    const columns = [
        { title: '#', dataIndex: 'id', width: 60, align: 'right' },
        { title: t('order.scop'), dataIndex: 'scop', render: (v) => v || '-' },
        { title: t('order.plant'), render: (_, r) => r.plant?.name || '-' },
        { title: t('order.wholesaler'), render: (_, r) => r.wholesaler?.name || '-' },
        { title: t('order.product'), render: (_, r) => r.product?.name || '-' },
        {
            title: t('order.gallons'),
            dataIndex: 'gallons',
            align: 'right',
            render: (v) => formatGallons(v, 2),
        },
        {
            title: t('order.sale_price'),
            dataIndex: 'sale_price',
            align: 'right',
            render: (v) => formatMoney(v),
        },
        {
            title: t('order.detail_total'),
            align: 'right',
            render: (_, r) => formatMoney(Number(r.gallons) * Number(r.sale_price)),
        },
    ];

    const compartmentColumns = [
        {
            title: t('order.comp_short'),
            dataIndex: 'compartment_number',
            width: 80,
            align: 'center',
        },
        { title: t('order.product'), render: (_, r) => r.product?.name || '-' },
        { title: t('order.scop_number'), dataIndex: 'scop', width: 150, render: (v) => v || '-' },
        {
            title: t('order.volume_gal'),
            dataIndex: 'volume',
            align: 'right',
            width: 150,
            render: (v) => formatGallons(v, 2),
        },
    ];

    const compartmentTotal = compartments.reduce(
        (acc, c) => acc + Math.round(Number(c.volume || 0) * 100),
        0,
    ) / 100;

    const fileColumns = [
        { title: t('order.attachment_name'), render: (_, f) => f.original_name || f.file_name },
        {
            title: t('order.attachment_type'),
            dataIndex: 'extension',
            width: 110,
            render: (v) => (v ? String(v).toUpperCase() : '-'),
        },
        {
            title: t('order.attachment_size'),
            dataIndex: 'file_size',
            width: 120,
            align: 'right',
            render: (v) => formatFileSize(v),
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
                    <Tag color="blue">{`${t('order.order_number')}: ${order?.code || '-'}`}</Tag>
                </div>

                <SectionCard
                    index={1}
                    title={t('order.section_general')}
                    description={t('order.section_general_help')}
                >
                    <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
                        <Descriptions.Item label={t('order.order_date')}>
                            {formatDate(order?.order_date, { withTime: true })}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('order.status')}>
                            <Tag color={statusColor(order?.status)}>{order?.status?.name}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label={t('order.advisor')}>
                            {order?.advisor?.name || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('order.customer')}>
                            {order?.customer?.name || '-'}
                            <div>
                                <Typography.Text type="secondary">
                                    {order?.customer?.tax_id}
                                </Typography.Text>
                            </div>
                        </Descriptions.Item>
                    </Descriptions>
                </SectionCard>

                <SectionCard
                    index={2}
                    title={t('order.section_driver')}
                    description={t('order.section_driver_help')}
                >
                    <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
                        <Descriptions.Item label={t('order.license_number')}>
                            {order?.driver?.license_number || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('order.driver_name')}>
                            {order?.driver?.name || '-'}
                        </Descriptions.Item>
                    </Descriptions>
                </SectionCard>

                <SectionCard
                    index={3}
                    title={t('order.section_vehicle')}
                    description={t('order.section_vehicle_help')}
                >
                    <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
                        <Descriptions.Item label={t('order.tanker_plate')}>
                            {order?.tanker?.license_plate || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('order.tractor_plate')}>
                            {order?.tractor_plate || '-'}
                        </Descriptions.Item>
                    </Descriptions>
                </SectionCard>

                <SectionCard
                    index={4}
                    title={t('order.section_detail')}
                    description={t('order.section_detail_help')}
                >
                    <Table
                        rowKey="id"
                        dataSource={details}
                        columns={columns}
                        pagination={false}
                        size="small"
                        scroll={{ x: 'max-content' }}
                    />
                </SectionCard>

                <SectionCard
                    index={5}
                    title={t('order.section_compartments')}
                    description={t('order.section_compartments_help')}
                >
                    <Table
                        rowKey="id"
                        dataSource={compartments}
                        columns={compartmentColumns}
                        pagination={false}
                        size="small"
                        locale={{ emptyText: t('order.no_compartments') }}
                        scroll={{ x: 'max-content' }}
                        summary={
                            compartments.length
                                ? () => (
                                      <Table.Summary.Row>
                                          <Table.Summary.Cell index={0} colSpan={3} align="right">
                                              <Typography.Text strong>
                                                  {t('order.compartments_total')}
                                              </Typography.Text>
                                          </Table.Summary.Cell>
                                          <Table.Summary.Cell index={1} align="right">
                                              <Typography.Text strong>
                                                  {formatGallons(compartmentTotal, 2)}
                                              </Typography.Text>
                                          </Table.Summary.Cell>
                                      </Table.Summary.Row>
                                  )
                                : null
                        }
                    />
                </SectionCard>

                <SectionCard
                    index={6}
                    title={t('order.section_observations')}
                    description={t('order.section_observations_help')}
                >
                    <Typography.Paragraph style={{ marginBottom: 0 }}>
                        {order?.notes || t('order.no_observations')}
                    </Typography.Paragraph>

                    <div style={{ marginTop: 16 }}>
                        <Typography.Text strong>{t('order.documents')}</Typography.Text>
                        <Table
                            style={{ marginTop: 8 }}
                            rowKey="id"
                            dataSource={files}
                            columns={fileColumns}
                            pagination={false}
                            size="small"
                            locale={{ emptyText: t('order.no_documents') }}
                            scroll={{ x: 'max-content' }}
                        />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {t('order.confirmed_files_hint')}
                        </Typography.Text>
                    </div>
                </SectionCard>

                <div className="ui-summary">
                    <div className="ui-summary-item">
                        <Typography.Text className="ui-summary-label">
                            {t('order.total_gallons')}
                        </Typography.Text>
                        <div className="ui-summary-value ui-summary-value--info">
                            {formatGallons(totals?.total_gallons || 0, 2)}
                        </div>
                        <Typography.Text className="ui-summary-hint">
                            {t('order.summary_gallons_hint')}
                        </Typography.Text>
                    </div>
                    <div className="ui-summary-item">
                        <Typography.Text className="ui-summary-label">
                            {t('order.total_sale')}
                        </Typography.Text>
                        <div className="ui-summary-value ui-summary-value--money">
                            {formatMoney(totals?.total_sale)}
                        </div>
                        <Typography.Text className="ui-summary-hint">
                            {t('order.summary_sale_hint')}
                        </Typography.Text>
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
            </div>
        </div>
    );
}