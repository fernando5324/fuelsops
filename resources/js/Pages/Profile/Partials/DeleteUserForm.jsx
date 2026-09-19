import { useForm } from '@inertiajs/react';
import { Alert, App, Button, Card, Form, Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import useTranslations from '@/hooks/useTranslations';

export default function DeleteUserForm() {
    const { message } = App.useApp();
    const { t } = useTranslations();
    const [open, setOpen] = useState(false);

    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm({
        password: '',
    });

    const closeModal = () => {
        setOpen(false);
        clearErrors();
        reset();
    };

    const confirmDelete = () => {
        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: (errs) => {
                Object.values(errs).forEach((m) => message.error(m));
            },
            onFinish: () => reset(),
        });
    };

    return (
        <Card
            title={
                <Typography.Text type="danger">
                    {t('profile.delete_account')}
                </Typography.Text>
            }
            style={{ borderRadius: 10 }}
        >
            <Alert
                type="warning"
                showIcon
                message={t('profile.delete_account_hint')}
                style={{ marginBottom: 16 }}
            />
            <Button danger type="primary" onClick={() => setOpen(true)}>
                {t('profile.delete_account')}
            </Button>

            <Modal
                open={open}
                onCancel={closeModal}
                onOk={confirmDelete}
                okText={t('profile.delete_account')}
                okButtonProps={{ danger: true, loading: processing }}
                cancelText={t('common.cancel')}
                title={t('profile.delete_account_confirm')}
            >
                <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
                    {t('profile.delete_account_password_hint')}
                </Typography.Paragraph>
                <Form layout="vertical">
                    <Form.Item
                        label={t('auth.password_label')}
                        validateStatus={errors.password ? 'error' : undefined}
                        help={errors.password || undefined}
                    >
                        <Input.Password
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="••••••••"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
}