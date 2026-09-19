import PanelLayout from '@/Layouts/PanelLayout';
import { Head } from '@inertiajs/react';
import { Space } from 'antd';
import useTranslations from '@/hooks/useTranslations';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status }) {
    const { t } = useTranslations();

    return (
        <PanelLayout>
            <Head title={t('menus.profile')} />
            <Space direction="vertical" size={20} style={{ width: '100%', maxWidth: 640 }}>
                <UpdateProfileInformationForm
                    mustVerifyEmail={mustVerifyEmail}
                    status={status}
                />
                <UpdatePasswordForm />
                <DeleteUserForm />
            </Space>
        </PanelLayout>
    );
}