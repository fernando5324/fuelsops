import { Head, Link } from '@inertiajs/react';
import { Button, Typography, Space, Card, Layout } from 'antd';
import {
    ApartmentOutlined,
    DashboardOutlined,
    LoginOutlined,
    SafetyCertificateOutlined,
} from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';

const { Title, Paragraph, Text } = Typography;

export default function Welcome({ auth, laravelVersion, phpVersion }) {
    const { t } = useTranslations();
    return (
        <Layout
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #eef2f7 100%)',
                padding: 24,
            }}
        >
            <Head title={t('pages.welcome')} />

            <Card style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <ApartmentOutlined
                        style={{ fontSize: 64, color: '#1B3A6B' }}
                    />
                    <Title level={2} style={{ margin: 0 }}>
                        {t('common.brand')}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: 0 }}>
                        {t('pages.hero_slogan')}
                    </Paragraph>

                    <div>
                        {auth.user ? (
                            <Link href={route('dashboard')}>
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<DashboardOutlined />}
                                >
                                    {t('pages.go_to_panel')}
                                </Button>
                            </Link>
                        ) : (
                            <Space size="middle" wrap>
                                <Link href={route('login')}>
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<LoginOutlined />}
                                    >
                                        {t('auth.login')}
                                    </Button>
                                </Link>
                            </Space>
                        )}
                    </div>

                    <div>
                        <Text type="secondary">
                            Laravel v{laravelVersion} · PHP v{phpVersion}
                        </Text>
                    </div>
                </Space>
            </Card>
        </Layout>
    );
}
