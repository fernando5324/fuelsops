import React, { useEffect } from 'react';
import { usePage, router, Link, Head } from '@inertiajs/react';
import { Alert, App, Form, Typography } from 'antd';
import useTranslations from '@/hooks/useTranslations';
import SubmitButton from '@/Components/SubmitButton';
import AuthLayout from '@/Layouts/AuthLayout';

export default function VerifyEmail({ status }) {
    const { message } = App.useApp();
    const { errors } = usePage().props;
    const { t } = useTranslations();

    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            message.error(Object.values(errors)[0]);
        }
    }, [errors, message]);

    const onFinish = () => {
        router.post(route('verification.send'), {}, {
            onError: () => {},
        });
    };

    return (
        <AuthLayout subtitle={t('auth.verify_email')}>
            <Head title={t('auth.verify_email')} />
            <Typography.Paragraph type="secondary">
                {t('auth.verify_email_hint')}
            </Typography.Paragraph>

            {status === 'verification-link-sent' && (
                <Alert
                    type="success"
                    showIcon
                    message={t('profile.verification_sent')}
                    style={{ marginBottom: 16 }}
                />
            )}

            <Form onFinish={onFinish}>
                <Form.Item>
                    <SubmitButton block>{t('profile.resend_verification')}</SubmitButton>
                </Form.Item>
            </Form>

            <div style={{ textAlign: 'center' }}>
                <Link href={route('logout')} method="post" as="button">
                    {t('auth.logout')}
                </Link>
            </div>
        </AuthLayout>
    );
}