import { useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { App, Col, Form, Input, Row } from 'antd';
import PanelLayout from '@/Layouts/PanelLayout';
import PageHeader from '@/Components/PageHeader';
import SectionCard from '@/Components/SectionCard';
import SubmitButton from '@/Components/SubmitButton';
import MediaImageField from '@/Components/MediaImageField';
import SocialLinksEditor from '@/Components/SocialLinksEditor';
import useTranslations from '@/hooks/useTranslations';

const SCALAR_FIELDS = [
    'name',
    'legal_name',
    'tax_id',
    'email',
    'phone',
    'website',
    'organization_description',
    'address',
    'business_hours',
];

/** Props del servidor → valores del formulario (incluye el contrato del logo). */
const toValues = (company) => ({
    name: company?.name ?? '',
    legal_name: company?.legal_name ?? '',
    tax_id: company?.tax_id ?? '',
    email: company?.email ?? '',
    phone: company?.phone ?? '',
    website: company?.website ?? '',
    organization_description: company?.organization_description ?? '',
    address: company?.address ?? '',
    business_hours: company?.business_hours ?? '',
    social_links: company?.social_links || {},
    logo: { file: null, previewUrl: null, url: company?.has_logo ? company?.logo_url : null },
});

/**
 * Configuración → Empresa (ADR-026).
 *
 * Identidad de `tenants` + datos para documentos de `tenant_settings` + logo,
 * todo en UNA petición de guardado (multipart con `_method=PUT`): el logo solo
 * se previsualiza en el cliente hasta pulsar Guardar.
 */
export default function Company({ company }) {
    const { t } = useTranslations();
    const { message } = App.useApp();
    const { flash } = usePage().props;
    const [form] = Form.useForm();

    useEffect(() => {
        if (flash?.success) {
            message.success(flash.success);
        }
    }, [flash, message]);

    // Tras un guardado Inertia re-renderiza con props nuevas (logo_url,
    // nombre, etc.): el Form se resincroniza aquí (initialValues solo vale
    // en el primer montaje).
    useEffect(() => {
        form.setFieldsValue(toValues(company));
    }, [company, form]);

    const onFinish = (values) => {
        const data = new FormData();

        SCALAR_FIELDS.forEach((key) => {
            const value = values[key];
            if (value !== undefined && value !== null) {
                data.append(key, value);
            }
        });

        Object.entries(values.social_links || {}).forEach(([platform, url]) => {
            if (url) {
                data.append(`social_links[${platform}]`, url);
            }
        });

        const logo = values.logo;
        if (logo?.file) {
            data.append('logo', logo.file);
        } else if (logo?.removed) {
            data.append('remove_logo', '1');
        }

        // PHP no puebla $_POST/$_FILES en PUT multipart: se envía POST con
        // _method=PUT (Laravel lo enruta al Route::put).
        data.append('_method', 'PUT');

        router.post(route('api.settings.company'), data, {
            forceFormData: true,
            preserveScroll: true,
            onError: (errs) => {
                Object.values(errs).forEach((m) => message.error(m));
            },
        });
    };

    return (
        <PanelLayout>
            <PageHeader
                title={t('settings.company_title')}
                description={t('settings.company_description')}
                headTitle={t('settings.company_title')}
            />

            <Form
                form={form}
                layout="vertical"
                initialValues={toValues(company)}
                onFinish={onFinish}
                autoComplete="off"
            >
                <SectionCard
                    index={1}
                    title={t('settings.section_company_info')}
                    description={t('settings.section_company_info_desc')}
                >
                    <Row gutter={[16, 0]}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="name"
                                label={t('settings.field_name')}
                                extra={t('settings.field_name_hint')}
                                rules={[{ required: true, message: t('common.required') }]}
                            >
                                <Input maxLength={150} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="legal_name" label={t('settings.field_legal_name')}>
                                <Input maxLength={200} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="tax_id"
                                label={t('settings.field_tax_id')}
                                extra={t('settings.field_tax_id_hint')}
                                rules={[
                                    {
                                        pattern: /^[0-9]{11}$/,
                                        message: t('settings.field_tax_id_hint'),
                                    },
                                ]}
                            >
                                <Input maxLength={11} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="email"
                                label={t('settings.field_email')}
                                rules={[{ type: 'email', message: t('settings.invalid_email') }]}
                            >
                                <Input type="email" maxLength={150} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="phone" label={t('settings.field_phone')}>
                                <Input maxLength={30} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="website"
                                label={t('settings.field_website')}
                                extra={t('settings.field_website_hint')}
                                rules={[{ type: 'url', message: t('settings.field_website_hint') }]}
                            >
                                <Input placeholder="https://" maxLength={255} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="address"
                                label={t('settings.field_address')}
                            >
                                <Input maxLength={1000} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="business_hours"
                                label={t('settings.field_business_hours')}
                                extra={t('settings.field_business_hours_hint')}
                            >
                                <Input maxLength={200} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="organization_description"
                        label={t('settings.field_description')}
                        extra={t('settings.field_description_hint')}
                    >
                        <Input.TextArea rows={3} maxLength={500} showCount />
                    </Form.Item>
                </SectionCard>

                <SectionCard
                    index={2}
                    title={t('settings.section_logo')}
                    description={t('settings.section_logo_desc')}
                >
                    <Form.Item name="logo" label={t('settings.section_logo')}>
                        <MediaImageField
                            uploadText={t('settings.logo_upload')}
                            replaceText={t('settings.logo_replace')}
                            removeText={t('settings.logo_remove')}
                            viewText={t('settings.logo_view')}
                            previewAlt={t('settings.logo_alt')}
                            saveOnSubmit={t('settings.logo_hint')}
                            errorType={t('settings.logo_error_type')}
                            errorSize={t('settings.logo_error_size')}
                        />
                    </Form.Item>
                </SectionCard>

                <SectionCard index={3} title={t('settings.section_social')}>
                    <Form.Item name="social_links" label={t('settings.section_social')}>
                        <SocialLinksEditor namespace="settings" />
                    </Form.Item>
                </SectionCard>

                <Form.Item>
                    <SubmitButton>{t('settings.save_company')}</SubmitButton>
                </Form.Item>
            </Form>
        </PanelLayout>
    );
}
