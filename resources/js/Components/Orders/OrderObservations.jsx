import { Typography } from 'antd';
import SectionCard from '@/Components/SectionCard';
import useTranslations from '@/hooks/useTranslations';

export default function OrderObservations({ notes }) {
    const { t } = useTranslations();

    return (
        <SectionCard title={t('order.observations')}>
            {notes ? (
                <Typography.Paragraph className="ui-order-notes">{notes}</Typography.Paragraph>
            ) : (
                <p className="ui-empty-note">{t('order.no_observations')}</p>
            )}
        </SectionCard>
    );
}