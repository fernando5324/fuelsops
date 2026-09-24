import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Select, Space, Typography } from 'antd';
import SectionCard from '@/Components/SectionCard';
import SubmitButton from '@/Components/SubmitButton';
import Orders from '@/Services/Orders';
import useTranslations from '@/hooks/useTranslations';

export default function OrderStatusChanger({ order, statuses = [] }) {
    const { t } = useTranslations();
    const [statusId, setStatusId] = useState(order?.status_id);

    return (
        <SectionCard title={t('order.status')}>
            <Space wrap>
                <Select
                    style={{ width: 'min(100%, 200px)' }}
                    value={statusId}
                    onChange={(v) => setStatusId(v)}
                    options={statuses.map((s) => ({ value: s.id, label: s.name }))}
                />
                <SubmitButton
                    disabled={!statusId}
                    onClick={() =>
                        router.post(
                            Orders.routes.changeStatus(order.id),
                            { status_id: statusId, notes: '' },
                            { preserveScroll: true },
                        )
                    }
                >
                    {t('order.change_status')}
                </SubmitButton>
            </Space>
        </SectionCard>
    );
}