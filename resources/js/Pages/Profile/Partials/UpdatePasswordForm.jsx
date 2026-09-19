import { router } from '@inertiajs/react';
import { App, Card, Form, Input, Typography } from 'antd';
import useTranslations from '@/hooks/useTranslations';
import SubmitButton from '@/Components/SubmitButton';

export default function UpdatePasswordForm() {
    const { message } = App.useApp();
    const { t } = useTranslations();
    const [form] = Form.useForm();

    const onFinish = (values) => {
        router.put(route('password.update'), values, {
            preserveScroll: true,
            onSuccess: () => {
                form.resetFields();
                message.success(t('common.saved'));
            },
            onError: (errs) => {
                Object.values(errs).forEach((m) => message.error(m));
            },
        });
    };

    return (
        <Card title={t('profile.update_password')} style={{ borderRadius: 10 }}>
            <Typography.Paragraph type="secondary">
                {t('profile.update_password_hint')}
            </Typography.Paragraph>

            <Form layout="vertical" onFinish={onFinish} autoComplete="off">
                <Form.Item
                    name="current_password"
                    label={t('profile.current_password')}
                    rules={[{ required: true, message: t('common.required') }]}
                >
                    <Input.Password autoComplete="current-password" />
                </Form.Item>

                <Form.Item
                    name="password"
                    label={t('profile.new_password')}
                    rules={[
                        { required: true, message: t('common.required') },
                        { min: 8, message: t('common.password_min') },
                    ]}
                >
                    <Input.Password autoComplete="new-password" />
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
                    <Input.Password autoComplete="new-password" />
                </Form.Item>

                <Form.Item>
                    <SubmitButton>{t('common.save')}</SubmitButton>
                </Form.Item>
            </Form>
        </Card>
    );
}