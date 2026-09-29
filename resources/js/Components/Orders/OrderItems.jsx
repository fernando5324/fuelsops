import { Table, Tooltip, Typography } from 'antd';
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
            render: (_, r) =>
                r.purchase_price == null ? (
                    <span className="ui-order-empty">—</span>
                ) : (
                    formatMoney(r.purchase_price, { digits: 4 })
                ),
        },
        {
            // Margen de la relación planta+producto (plant_products.margin,
            // columna R del Excel). Viene del backend como atributo del detalle.
            title: (
                <Tooltip title={t('order.margin_col_hint')}>
                    <span>{t('order.margin_col')}</span>
                </Tooltip>
            ),
            dataIndex: 'margin',
            width: 130,
            align: 'right',
            render: (v) =>
                v == null ? <span className="ui-order-empty">—</span> : formatMoney(v, { digits: 4 }),
        },
        {
            // Margen × galones: es la línea que suma el pie y alimenta el cuadro
            // de ganancia del resumen financiero. El importe lo calcula el
            // backend con bcmath (margin_amount) para que ambos coincidan.
            title: (
                <Tooltip title={t('order.margin_amount_hint')}>
                    <span>{t('order.margin_amount_col')}</span>
                </Tooltip>
            ),
            dataIndex: 'margin_amount',
            width: 180,
            align: 'right',
            render: (v) =>
                v == null ? (
                    <span className="ui-order-empty">—</span>
                ) : (
                    <span style={{ fontWeight: 600, color: '#10B981' }}>{formatMoney(v)}</span>
                ),
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
                    // El total de la ganancia se toma de totals.gain (bcmath) para
                    // que el pie de la tabla y el cuadro Ganancia nunca difieran.
                    const gain = totals?.gain ?? null;

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
                            <Table.Summary.Cell index={2} colSpan={2} />
                            {/* Precio de compra */}
                            <Table.Summary.Cell index={3} />
                            {/* Margen por galón: es una tasa, no se suma */}
                            <Table.Summary.Cell index={4} align="right">
                                {gain === null ? (
                                    <span className="ui-order-empty">—</span>
                                ) : (
                                    <Typography.Text strong className="ui-summary-value--gain">
                                        {`${t('order.gain')}: ${formatMoney(gain)}`}
                                    </Typography.Text>
                                )}
                            </Table.Summary.Cell>
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
