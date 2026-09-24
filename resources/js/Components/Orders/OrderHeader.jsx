import { Tag, Typography } from 'antd';
import useTranslations from '@/hooks/useTranslations';
import formatDate from '@/lib/dates';
import statusColor from '@/lib/status';

export default function OrderHeader({ order, extra }) {
    const { t } = useTranslations();

    return (
        <div className="ui-order-header">
            <div className="ui-order-header-main">
                <div className="ui-order-header-title">
                    <Typography.Title level={3} className="ui-order-header-number">
                        {`${t('order.order_number')} #${order?.id}`}
                    </Typography.Title>
                    <Tag className="ui-order-status-tag" color={statusColor(order?.status)}>
                        {order?.status?.name || '-'}
                    </Tag>
                </div>
                <Typography.Text className="ui-order-header-customer">
                    {order?.customer?.name || '-'}
                </Typography.Text>
                <div className="ui-order-header-meta">
                    <span>{formatDate(order?.order_date, { withTime: true })}</span>
                    <span className="ui-order-header-sep">·</span>
                    <span>{`${t('order.advisor')}: ${order?.advisor?.name || '-'}`}</span>
                    <span className="ui-order-header-sep">·</span>
                    <span>{`${t('common.created_by')}: ${order?.created_by?.name || '-'}`}</span>
                </div>
            </div>
            {extra ? <div className="ui-order-header-extra">{extra}</div> : null}
        </div>
    );
}