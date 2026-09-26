import SectionCard from '@/Components/SectionCard';
import useTranslations from '@/hooks/useTranslations';
import formatMoney from '@/lib/money';

export default function OrderSummary({ totals, compact = false }) {
    const { t } = useTranslations();

    const totalGallons = Number(totals?.total_gallons ?? 0);
    const totalSale = Number(totals?.total_sale ?? 0);
    const totalPurchase = totals?.total_purchase ?? null;
    const gain = totals?.gain ?? null;
    const margin = totals?.margin ?? null;

    return (
        <SectionCard title={t('order.financial')}>
            <div className={compact ? 'ui-summary ui-summary--compact' : 'ui-summary'}>
                <div className="ui-summary-item">
                    <span className="ui-summary-label">{t('order.total_gallons')}</span>
                    <span className="ui-summary-value ui-summary-value--info">
                        {totalGallons.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        <span className="ui-summary-unit"> gal</span>
                    </span>
                </div>
                <div className="ui-summary-item">
                    <span className="ui-summary-label">{t('order.total_sale')}</span>
                    <span className="ui-summary-value ui-summary-value--money">
                        {formatMoney(totalSale)}
                    </span>
                </div>
                <div className="ui-summary-item">
                    <span className="ui-summary-label">{t('order.purchase')}</span>
                    {totalPurchase === null ? (
                        <span className="ui-summary-value ui-order-empty">—</span>
                    ) : (
                        <span className="ui-summary-value">{formatMoney(totalPurchase)}</span>
                    )}
                </div>
                <div className="ui-summary-item">
                    <span className="ui-summary-label">{t('order.gain')}</span>
                    {gain === null ? (
                        <span className="ui-summary-value ui-order-empty">—</span>
                    ) : (
                        <span className="ui-summary-value ui-summary-value--gain">
                            {formatMoney(gain)}
                        </span>
                    )}
                </div>
                {!compact ? (
                    <div className="ui-summary-item">
                        <span className="ui-summary-label">{t('order.margin')}</span>
                        {margin === null ? (
                            <span className="ui-summary-value ui-order-empty">—</span>
                        ) : (
                            <span className="ui-summary-value ui-summary-value--gain">
                                {Number(margin).toLocaleString('es-ES', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                                <span className="ui-summary-unit"> %</span>
                            </span>
                        )}
                    </div>
                ) : null}
            </div>
        </SectionCard>
    );
}