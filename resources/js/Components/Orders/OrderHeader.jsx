import { Tag, Typography } from 'antd';
import useTranslations from '@/hooks/useTranslations';
import formatDate from '@/lib/dates';
import statusColor from '@/lib/status';

export default function OrderHeader({ order, extra }) {
    const { t } = useTranslations();

    // Origen del registro (ADR-025). `source` es independiente de `created_by`:
    // un pedido que mandó el cliente desde el formulario web se acredita al
    // cliente aunque lo haya enviado un usuario del panel con sesión abierta.
    const fromCustomer = order?.source === 'public';

    return (
        <div className="ui-order-header">
            <div className="ui-order-header-main">
                <div className="ui-order-header-title">
                    <Typography.Title level={3} className="ui-order-header-number">
                        {`${t('order.order')} ${order?.code || '-'}`}
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
                    <span>
                        {fromCustomer
                            ? t('order.source_customer')
                            : `${t('common.created_by')}: ${order?.created_by?.name || '-'}`}
                    </span>
                    {/* `updated_by` es NULL mientras nadie haya modificado el
                        pedido: en ese caso no se muestra la línea. */}
                    {order?.updated_by?.name ? (
                        <>
                            <span className="ui-order-header-sep">·</span>
                            <span>
                                {`${t('common.updated_by')}: ${order.updated_by.name} · ${formatDate(order?.updated_at, { withTime: true })}`}
                            </span>
                        </>
                    ) : null}
                </div>
            </div>
            {extra ? <div className="ui-order-header-extra">{extra}</div> : null}
        </div>
    );
}