import React, { useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import { App, Checkbox, Form, Input } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';
import SubmitButton from '@/Components/SubmitButton';
import AuthLayout from '@/Layouts/AuthLayout';

export default function Login() {
    const { message } = App.useApp();
    const { errors } = usePage().props;
    const { t } = useTranslations();

    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            message.error(Object.values(errors)[0]);
        }
    }, [errors, message]);

    const onFinish = (values) => {
        router.post('/login', values, {
            onError: () => {},
        });
    };

    return (
        <AuthLayout subtitle={t('auth.login')}>
            <Form layout="vertical" onFinish={onFinish} autoComplete="off">
                <Form.Item
                    name="email"
                    label={t('auth.email')}
                    rules={[{ required: true, type: 'email', message: t('common.required') }]}
                >
                    <Input prefix={<MailOutlined />} placeholder={t('common.email_placeholder')} />
                </Form.Item>

                <Form.Item
                    name="password"
                    label={t('auth.password_label')}
                    rules={[{ required: true, message: t('common.required') }]}
                >
                    <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
                </Form.Item>

                <Form.Item name="remember" valuePropName="checked">
                    <Checkbox>{t('auth.remember_me')}</Checkbox>
                </Form.Item>

                <Form.Item>
                    <SubmitButton block>{t('auth.login')}</SubmitButton>
                </Form.Item>
            </Form>
        </AuthLayout>
    );
}