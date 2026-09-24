import { Table, Typography } from 'antd';
import SectionCard from '@/Components/SectionCard';
import useTranslations from '@/hooks/useTranslations';
import formatMoney from '@/lib/money';

export default function OrderItems({ order, totals }) {
    const { t } = useTranslations();
    const details = order?.details || [];

    const columns = [
        { title: 'SCOP', dataIndex: 'scop', width: 90, render: (v) => v || '-' },
        { title: t('order.plant'), render: (_, r) => r.plant?.name || '-' },
        { title: t('order.wholesaler'), render: (_, r) => r.wholesaler?.name || '-' },
        { title: t('order.product'), render: (_, r) => r.product?.name || '-' },
        {
            title: t('order.invoice'),
            width: 110,
            render: () => <span className="ui-order-empty">—</span>,
        },
        {
            title: t('order.gallons'),
            dataIndex: 'gallons',
            align: 'right',
            render: (v) => Number(v || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 }),
        },
        {
            title: t('order.sale_price'),
            dataIndex: 'sale_price',
            align: 'right',
            render: (v) => Number(v || 0).toLocaleString('es-ES', { minimumFractionDigits: 4 }),
        },
        {
            title: t('order.purchase_price'),
            width: 130,
            align: 'right',
            render: () => <span className="ui-order-empty">—</span>,
        },
        {
            title: t('order.compartments'),
            dataIndex: 'compartments',
            align: 'center',
            render: (v) => v ?? '-',
        },
        {
            title: t('order.detail_total'),
            align: 'right',
            render: (_, r) =>
                formatMoney(Number(r.gallons || 0) * Number(r.sale_price || 0)),
        },
    ];

    return (
        <SectionCard title={t('order.order_detail')}>
            <Table
                rowKey="id"
                dataSource={details}
                columns={columns}
                pagination={false}
                size="middle"
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
                            <Table.Summary.Cell index={0} colSpan={5} align="right">
                                <Typography.Text strong>{t('order.total_gallons')}</Typography.Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right">
                                <Typography.Text strong>
                                    {g.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                </Typography.Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} colSpan={3} />
                            <Table.Summary.Cell index={5} align="right">
                                <Typography.Text strong>
                                    {`${t('order.total_sale')}: `}
                                    {formatMoney(s)}
                                </Typography.Text>
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                    );
                }}
            />
        </SectionCard>
    );
}