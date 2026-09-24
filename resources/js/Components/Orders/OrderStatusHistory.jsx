import { Space, Tag, Timeline, Typography } from 'antd';
import SectionCard from '@/Components/SectionCard';
import useTranslations from '@/hooks/useTranslations';
import formatDate from '@/lib/dates';
import statusColor from '@/lib/status';

export default function OrderStatusHistory({ history = [] }) {
    const { t } = useTranslations();

    if (!history || history.length === 0) {
        return null;
    }

    return (
        <SectionCard title={t('order.status_history')}>
            <Timeline
                items={history.map((h) => ({
                    color: statusColor(h.status),
                    content: (
                        <div>
                            <Space wrap>
                                <Tag color={statusColor(h.status)}>{h.status?.name || '-'}</Tag>
                                {h.previous_status ? (
                                    <Typography.Text type="secondary">
                                        {`${t('order.previous_status')}: `}
                                        {h.previous_status.name}
                                    </Typography.Text>
                                ) : null}
                            </Space>
                            <div className="ui-order-history-meta">
                                <Typography.Text type="secondary">
                                    {formatDate(h.created_at, { withTime: true })}
                                </Typography.Text>
                                {h.created_by?.name ? (
                                    <Typography.Text type="secondary">
                                        {` ${t('order.by')}: ${h.created_by.name}`}
                                    </Typography.Text>
                                ) : null}
                            </div>
                            {h.notes ? <div className="ui-order-history-notes">{h.notes}</div> : null}
                        </div>
                    ),
                }))}
            />
        </SectionCard>
    );
}