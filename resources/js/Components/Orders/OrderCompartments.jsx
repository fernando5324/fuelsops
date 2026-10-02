import { Table, Typography } from 'antd';
import SectionCard from '@/Components/SectionCard';
import useTranslations from '@/hooks/useTranslations';
import { formatNumber } from '@/lib/format';

/**
 * Distribución por compartimentos en solo lectura (ADR-015). La edición vive en
 * la página de edición del pedido; aquí solo se muestra lo registrado, también
 * cuando el pedido está en la papelera (los compartimentos son dato histórico
 * y la papelera no los toca, ADR-011).
 */
export default function OrderCompartments({ order, readOnly = false }) {
    const { t } = useTranslations();
    const rows = order?.compartments || [];

    // Suma en unidades de 0.0001 (enteros) para que el total mostrado sea
    // exactamente la suma de las filas, con 2 decimales de captura.
    const total = rows.reduce((acc, r) => acc + Math.round(Number(r.volume || 0) * 100), 0) / 100;

    const columns = [
        {
            title: t('order.comp_short'),
            dataIndex: 'compartment_number',
            width: 80,
            align: 'center',
        },
        {
            title: t('order.product'),
            render: (_, r) => r.product?.name || '-',
        },
        {
            title: t('order.scop_number'),
            dataIndex: 'scop',
            width: 130,
            render: (v) => v || '-',
        },
        {
            title: t('order.volume_gal'),
            dataIndex: 'volume',
            width: 150,
            align: 'right',
            render: (v) => (
                <span style={{ fontWeight: 600 }}>
                    {formatNumber(v || 0, 2)}
                </span>
            ),
        },
    ];

    return (
        <SectionCard title={t('order.section_compartments')} description={t('order.compartments_hint')}>
            {readOnly ? <p className="ui-order-readonly-note">{t('order.compartments_read_only')}</p> : null}

            <Table
                rowKey="id"
                size="small"
                dataSource={rows}
                columns={columns}
                pagination={false}
                scroll={{ x: 'max-content' }}
                locale={{ emptyText: t('order.no_compartments') }}
                summary={
                    rows.length
                        ? () => (
                              <Table.Summary.Row>
                                  <Table.Summary.Cell index={0} colSpan={3} align="right">
                                      <Typography.Text strong>
                                          {t('order.compartments_total')}
                                      </Typography.Text>
                                  </Table.Summary.Cell>
                                  <Table.Summary.Cell index={1} align="right">
                                      <Typography.Text strong>
                                          {formatNumber(total, 2)}
                                      </Typography.Text>
                                  </Table.Summary.Cell>
                              </Table.Summary.Row>
                          )
                        : null
                }
            />
        </SectionCard>
    );
}
