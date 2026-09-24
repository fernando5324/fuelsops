import { router } from '@inertiajs/react';
import { Alert, App, Button, Card, Form, Input, Typography } from 'antd';
import { usePage } from '@inertiajs/react';
import useTranslations from '@/hooks/useTranslations';
import SubmitButton from '@/Components/SubmitButton';

export default function UpdateProfileInformation({ mustVerifyEmail, status }) {
    const { message } = App.useApp();
    const { t } = useTranslations();
    const user = usePage().props.auth.user;

    const onFinish = (values) => {
        router.patch(route('profile.update'), values, {
            preserveScroll: true,
            onSuccess: () => message.success(t('common.saved')),
            onError: (errs) => {
                Object.values(errs).forEach((m) => message.error(m));
            },
        });
    };

    return (
        <Card
            title={t('profile.profile_information')}
            style={{ borderRadius: 10 }}
            extra={<Typography.Text type="secondary">{t('profile.profile_update_hint')}</Typography.Text>}
        >
            {mustVerifyEmail && user.email_verified_at === null && (
                <Alert
                    type="info"
                    style={{ marginBottom: 16 }}
                    message={t('profile.email_unverified')}
                    action={
                        <Button
                            type="link"
                            size="small"
                            onClick={() =>
                                router.post(route('verification.send'), {}, {
                                    preserveScroll: true,
                                })
                            }
                        >
                            {t('profile.resend_verification')}
                        </Button>
                    }
                />
            )}
            {status === 'verification-link-sent' && (
                <Alert
                    style={{ marginBottom: 16 }}
                    type="success"
                    message={t('profile.verification_sent')}
                    showIcon
                />
            )}

            <Form
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                    name: user.name,
                    first_name: user.first_name,
                    last_name: user.last_name || '',
                    email: user.email,
                }}
                autoComplete="off"
            >
                <Form.Item
                    name="name"
                    label={t('profile.username')}
                    rules={[{ required: true, message: t('common.required') }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    name="first_name"
                    label={t('profile.first_names')}
                    rules={[{ required: true, message: t('common.required') }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    name="last_name"
                    label={t('profile.last_names')}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    name="email"
                    label={t('auth.email')}
                    rules={[{ required: true, type: 'email', message: t('common.required') }]}
                >
                    <Input type="email" />
                </Form.Item>

                <Form.Item>
                    <SubmitButton>{t('common.save')}</SubmitButton>
                </Form.Item>
            </Form>
        </Card>
    );
}