import { Col, Row, Typography } from 'antd';
import SectionCard from '@/Components/SectionCard';
import useTranslations from '@/hooks/useTranslations';

export default function OrderDeposits() {
    const { t } = useTranslations();

    return (
        <SectionCard title={t('order.deposits')}>
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <div className="ui-order-deposit-block">
                        <Typography.Text strong>{t('order.customer_deposits')}</Typography.Text>
                        <p className="ui-empty-note">{t('order.no_deposits')}</p>
                    </div>
                </Col>
                <Col xs={24} md={12}>
                    <div className="ui-order-deposit-block">
                        <Typography.Text strong>{t('order.supplier_deposits')}</Typography.Text>
                        <p className="ui-empty-note">{t('order.no_deposits')}</p>
                    </div>
                </Col>
            </Row>
        </SectionCard>
    );
}