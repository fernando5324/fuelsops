import React, { useEffect } from 'react';
import { usePage, router, Head } from '@inertiajs/react';
import { App, Form, Input, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';
import SubmitButton from '@/Components/SubmitButton';
import AuthLayout from '@/Layouts/AuthLayout';

export default function ConfirmPassword() {
    const { message } = App.useApp();
    const { errors } = usePage().props;
    const { t } = useTranslations();

    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            message.error(Object.values(errors)[0]);
        }
    }, [errors, message]);

    const onFinish = (values) => {
        router.post(route('password.confirm'), values, {
            onError: () => {},
        });
    };

    return (
        <AuthLayout subtitle={t('auth.confirm_password')}>
            <Head title={t('auth.confirm_password')} />
            <Typography.Paragraph type="secondary">
                {t('auth.confirm_password_hint')}
            </Typography.Paragraph>

            <Form layout="vertical" onFinish={onFinish} autoComplete="off">
                <Form.Item
                    name="password"
                    label={t('auth.password_label')}
                    rules={[{ required: true, message: t('common.required') }]}
                >
                    <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
                </Form.Item>

                <Form.Item>
                    <SubmitButton block>{t('common.confirm')}</SubmitButton>
                </Form.Item>
            </Form>
        </AuthLayout>
    );
}