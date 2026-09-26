import { Card, Typography } from 'antd';
import { usePage } from '@inertiajs/react';

export default function AuthLayout({
    heading,
    subtitle,
    width = 400,
    children,
}) {
    const { tenant } = usePage().props;
    const brand = heading ?? tenant?.name ?? 'Sertoco';

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1f3a47 0%, #2c5f73 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
            }}
        >
            <Card style={{ width, borderRadius: 12 }}>
                <Typography.Title level={3} style={{ textAlign: 'center' }}>
                    {brand}
                </Typography.Title>
                {subtitle && (
                    <Typography.Paragraph
                        type="secondary"
                        style={{ textAlign: 'center' }}
                    >
                        {subtitle}
                    </Typography.Paragraph>
                )}
                {children}
            </Card>
        </div>
    );
}