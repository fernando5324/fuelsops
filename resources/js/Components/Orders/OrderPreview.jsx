import { Tag, Typography } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';
import formatDate from '@/lib/dates';
import formatMoney from '@/lib/money';
import statusColor from '@/lib/status';

export default function OrderPreview({ order, totals }) {
    const { t } = useTranslations();
    const details = order?.details || [];
    const files = order?.files || [];

    const totalGallons = Number(totals?.total_gallons ?? 0);
    const totalSale = Number(totals?.total_sale ?? 0);

    return (
        <div className="ui-order-preview">
            <div className="ui-order-preview-head">
                <Typography.Title level={4} className="ui-order-preview-number">
                    {`${t('order.order_number')} #${order?.id}`}
                </Typography.Title>
                <Typography.Text className="ui-order-preview-customer">
                    {order?.customer?.name || '-'}
                </Typography.Text>
                <div className="ui-order-preview-meta">
                    <Tag color={statusColor(order?.status)}>{order?.status?.name || '-'}</Tag>
                    <Typography.Text type="secondary">
                        {formatDate(order?.order_date, { withTime: true })}
                    </Typography.Text>
                </div>
            </div>

            <div className="ui-summary ui-summary--compact">
                <div className="ui-summary-item">
                    <span className="ui-summary-label">{t('order.total_gallons')}</span>
                    <span className="ui-summary-value ui-summary-value--info">
                        {totalGallons.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                </div>
                <div className="ui-summary-item">
                    <span className="ui-summary-label">{t('order.total_sale')}</span>
                    <span className="ui-summary-value ui-summary-value--money">
                        {formatMoney(totalSale)}
                    </span>
                </div>
            </div>

            <div className="ui-order-preview-section">{t('order.summary')}</div>
            <div className="ui-order-preview-grid">
                <span className="ui-order-preview-label">{t('order.advisor')}</span>
                <span className="ui-order-preview-value">{order?.advisor?.name || '—'}</span>
                <span className="ui-order-preview-label">{t('order.driver')}</span>
                <span className="ui-order-preview-value">{order?.driver?.name || '—'}</span>
                <span className="ui-order-preview-label">{t('order.license')}</span>
                <span className="ui-order-preview-value">
                    {order?.driver?.license_number || '—'}
                </span>
                <span className="ui-order-preview-label">{t('order.tanker')}</span>
                <span className="ui-order-preview-value">
                    {order?.tanker?.license_plate || '—'}
                </span>
                <span className="ui-order-preview-label">{t('order.tractor')}</span>
                <span className="ui-order-preview-value">
                    {order?.tractor?.license_plate || '—'}
                </span>
            </div>

            {details.length > 0 ? (
                <>
                    <div className="ui-order-preview-section">{t('order.details')}</div>
                    <div className="ui-order-preview-products">
                        {details.map((d) => (
                            <div className="ui-order-preview-product" key={d.id}>
                                <div className="ui-order-preview-product-name">
                                    {d.product?.name || '-'}
                                    <Typography.Text className="ui-order-preview-product-qty">
                                        {` · ${Number(d.gallons || 0).toLocaleString('es-ES', {
                                            minimumFractionDigits: 2,
                                        })} gal`}
                                    </Typography.Text>
                                </div>
                                <Typography.Text type="secondary" className="ui-order-preview-product-meta">
                                    {`${t('order.plant')}: ${d.plant?.name || '-'} · ${t('order.wholesaler')}: ${d.wholesaler?.name || '-'}`}
                                </Typography.Text>
                            </div>
                        ))}
                    </div>
                </>
            ) : null}

            {order?.notes ? (
                <>
                    <div className="ui-order-preview-section">{t('order.observations')}</div>
                    <Typography.Paragraph type="secondary" className="ui-order-preview-notes">
                        {order.notes}
                    </Typography.Paragraph>
                </>
            ) : null}

            {files.length > 0 ? (
                <>
                    <div className="ui-order-preview-section">{t('order.documents')}</div>
                    <div className="ui-order-preview-files">
                        {files.map((f) => (
                            <div className="ui-order-preview-file" key={f.id}>
                                <FileTextOutlined style={{ color: 'var(--color-muted)' }} />
                                <span className="ui-order-preview-file-name">
                                    {f.original_name || f.file_name}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    );
}