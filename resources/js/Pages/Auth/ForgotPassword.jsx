import React, { useEffect } from 'react';
import { usePage, router, Head } from '@inertiajs/react';
import { Alert, App, Form, Input, Typography } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';
import SubmitButton from '@/Components/SubmitButton';
import AuthLayout from '@/Layouts/AuthLayout';

export default function ForgotPassword({ status }) {
    const { message } = App.useApp();
    const { errors } = usePage().props;
    const { t } = useTranslations();

    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            message.error(Object.values(errors)[0]);
        }
    }, [errors, message]);

    const onFinish = (values) => {
        router.post(route('password.email'), values, {
            onError: () => {},
        });
    };

    return (
        <AuthLayout subtitle={t('auth.forgot_password')}>
            <Head title={t('auth.forgot_password')} />
            <Typography.Paragraph type="secondary">
                {t('auth.forgot_password_hint')}
            </Typography.Paragraph>

            {status && (
                <Alert
                    type="success"
                    showIcon
                    message={status}
                    style={{ marginBottom: 16 }}
                />
            )}

            <Form layout="vertical" onFinish={onFinish} autoComplete="off">
                <Form.Item
                    name="email"
                    label={t('auth.email')}
                    rules={[{ required: true, type: 'email', message: t('common.required') }]}
                >
                    <Input prefix={<MailOutlined />} placeholder={t('common.email_placeholder')} />
                </Form.Item>

                <Form.Item>
                    <SubmitButton block>{t('auth.send_reset_link')}</SubmitButton>
                </Form.Item>
            </Form>
        </AuthLayout>
    );
}