import { Tooltip } from 'antd';
import SectionCard from '@/Components/SectionCard';
import useTranslations from '@/hooks/useTranslations';
import formatMoney from '@/lib/money';
import { formatNumber, gallonUnit } from '@/lib/format';

export default function OrderSummary({ totals, compact = false }) {
    const { t } = useTranslations();

    const totalGallons = Number(totals?.total_gallons ?? 0);
    const totalSale = Number(totals?.total_sale ?? 0);
    const totalPurchase = totals?.total_purchase ?? null;
    const gain = totals?.gain ?? null;

    return (
        <SectionCard title={t('order.financial')}>
            <div className={compact ? 'ui-summary ui-summary--compact' : 'ui-summary'}>
                <div className="ui-summary-item">
                    <span className="ui-summary-label">{t('order.total_gallons')}</span>
                    <span className="ui-summary-value ui-summary-value--info">
                        {formatNumber(totalGallons, 2)}
                        <span className="ui-summary-unit">{gallonUnit()}</span>
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
                    <Tooltip title={t('order.gain_hint')} placement="top">
                        <span className="ui-summary-label">{t('order.gain')}</span>
                    </Tooltip>
                    {gain === null ? (
                        <span className="ui-summary-value ui-order-empty">—</span>
                    ) : (
                        <span className="ui-summary-value ui-summary-value--gain">
                            {formatMoney(gain)}
                        </span>
                    )}
                </div>
            </div>
        </SectionCard>
    );
}
