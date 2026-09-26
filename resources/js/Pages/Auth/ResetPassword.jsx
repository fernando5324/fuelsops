import React, { useEffect } from 'react';
import { usePage, router, Head } from '@inertiajs/react';
import { App, Form, Input, Typography } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';
import SubmitButton from '@/Components/SubmitButton';
import AuthLayout from '@/Layouts/AuthLayout';

export default function ResetPassword({ token, email }) {
    const { message } = App.useApp();
    const { errors } = usePage().props;
    const { t } = useTranslations();

    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            message.error(Object.values(errors)[0]);
        }
    }, [errors, message]);

    const onFinish = (values) => {
        router.post(route('password.store'), { token, ...values }, {
            onError: () => {},
        });
    };

    return (
        <AuthLayout subtitle={t('auth.reset_password')}>
            <Head title={t('auth.reset_password')} />
            <Typography.Paragraph type="secondary">
                {t('auth.forgot_password_hint')}
            </Typography.Paragraph>

            <Form
                layout="vertical"
                onFinish={onFinish}
                autoComplete="off"
                initialValues={{ email }}
            >
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
                    rules={[{ required: true, min: 8, message: t('common.password_min') }]}
                >
                    <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
                </Form.Item>

                <Form.Item
                    name="password_confirmation"
                    label={t('auth.confirm_password')}
                    dependencies={['password']}
                    rules={[
                        { required: true, message: t('common.required') },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error(t('common.password_mismatch')));
                            },
                        }),
                    ]}
                >
                    <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
                </Form.Item>

                <Form.Item>
                    <SubmitButton block>{t('auth.reset_password')}</SubmitButton>
                </Form.Item>
            </Form>
        </AuthLayout>
    );
}