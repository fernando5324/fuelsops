import React, { useEffect } from 'react';
import { usePage, router, Link, Head } from '@inertiajs/react';
import { App, Form, Input } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import useTranslations from '@/hooks/useTranslations';
import SubmitButton from '@/Components/SubmitButton';
import AuthLayout from '@/Layouts/AuthLayout';

export default function Register() {
    const { message } = App.useApp();
    const { errors } = usePage().props;
    const { t } = useTranslations();

    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            message.error(Object.values(errors)[0]);
        }
    }, [errors, message]);

    const onFinish = (values) => {
        router.post('/register', values);
    };

    return (
        <AuthLayout subtitle={t('auth.register')} width={420}>
            <Head title={t('auth.register')} />
            <Form layout="vertical" onFinish={onFinish} autoComplete="off">
                <Form.Item
                    name="first_name"
                    label={t('common.first_name')}
                    rules={[{ required: true, message: t('common.required') }]}
                >
                    <Input prefix={<UserOutlined />} placeholder={t('common.first_name')} />
                </Form.Item>

                <Form.Item name="last_name" label={t('common.last_name')}>
                    <Input placeholder={t('common.last_name')} />
                </Form.Item>

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
                    <SubmitButton block>{t('auth.register')}</SubmitButton>
                </Form.Item>
            </Form>

            <div style={{ textAlign: 'center' }}>
                <Link href="/login">{t('auth.login')}</Link>
            </div>
        </AuthLayout>
    );
}