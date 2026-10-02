import { Card, Typography } from 'antd';
import { useBrand } from '@/lib/brand';

export default function AuthLayout({
    heading,
    subtitle,
    width = 400,
    children,
}) {
    const brandConfig = useBrand();

    // `heading` (p. ej. "Iniciar sesión") manda; si no, el nombre del cliente.
    const brand = heading ?? brandConfig.client;

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