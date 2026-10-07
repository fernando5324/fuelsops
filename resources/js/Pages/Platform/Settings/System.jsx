import { useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { App, Col, Form, Input, InputNumber, Row, Select } from 'antd';
import PanelLayout from '@/Layouts/PanelLayout';
import PageHeader from '@/Components/PageHeader';
import SectionCard from '@/Components/SectionCard';
import SubmitButton from '@/Components/SubmitButton';
import useTranslations from '@/hooks/useTranslations';

const toValues = (settings) => ({
    default_language: settings?.default_language ?? 'es',
    timezone: settings?.timezone ?? 'America/Lima',
    order_code_prefix: settings?.order_code_prefix ?? 'PED',
    order_code_start: settings?.order_code_start ?? 1,
    order_code_padding: settings?.order_code_padding ?? 6,
});

/**
 * Configuración → Sistema (ADR-026).
 *
 * Preferencias (idioma/zona horaria) y formato del código de pedido
 * (prefijo/número inicial/dígitos con vista previa en vivo). El prefijo, el
 * inicio y el relleno se aplican a los pedidos NUEVOS: los códigos ya
 * emitidos y el contador no cambian.
 *
 * Sin archivos: el guardado es un PUT JSON normal (no multipart).
 */
export default function System({ settings, timezones }) {
    const { t } = useTranslations();
    const { message } = App.useApp();
    const { flash } = usePage().props;
    const [form] = Form.useForm();

    useEffect(() => {
        if (flash?.success) {
            message.success(flash.success);
        }
    }, [flash, message]);

    useEffect(() => {
        form.setFieldsValue(toValues(settings));
    }, [settings, form]);

    const prefix = Form.useWatch('order_code_prefix', form) ?? '';
    const start = Form.useWatch('order_code_start', form) ?? 1;
    const padding = Form.useWatch('order_code_padding', form) ?? 0;
    const preview = `${prefix}-${String(start).padStart(Number(padding) || 0, '0')}`;

    const onFinish = (values) => {
        router.put(route('api.settings.system'), values, {
            preserveScroll: true,
            onError: (errs) => {
                Object.values(errs).forEach((m) => message.error(m));
            },
        });
    };

    return (
        <PanelLayout>
            <PageHeader
                title={t('settings.system_title')}
                description={t('settings.system_description')}
                headTitle={t('settings.system_title')}
            />

            <Form
                form={form}
                layout="vertical"
                initialValues={toValues(settings)}
                onFinish={onFinish}
                autoComplete="off"
            >
                <SectionCard
                    index={1}
                    title={t('settings.section_preferences')}
                    description={t('settings.section_preferences_desc')}
                >
                    <Row gutter={[16, 0]}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="default_language"
                                label={t('settings.field_language')}
                                rules={[{ required: true, message: t('common.required') }]}
                            >
                                <Select
                                    options={[{ value: 'es', label: 'Español' }]}
                                    disabled
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="timezone"
                                label={t('settings.field_timezone')}
                                rules={[{ required: true, message: t('common.required') }]}
                            >
                                <Select
                                    showSearch
                                    options={(timezones || []).map((tz) => ({ value: tz, label: tz }))}
                                    optionFilterProp="label"
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </SectionCard>

                <SectionCard
                    index={2}
                    title={t('settings.section_orders')}
                    description={t('settings.section_orders_desc')}
                >
                    <Row gutter={[16, 0]}>
                        <Col xs={24} md={8}>
                            <Form.Item
                                name="order_code_prefix"
                                label={t('settings.field_prefix')}
                                extra={t('settings.field_prefix_hint')}
                                rules={[
                                    { required: true, message: t('common.required') },
                                    {
                                        pattern: /^[A-Z0-9][A-Z0-9.-]*$/,
                                        message: t('settings.field_prefix_hint'),
                                    },
                                ]}
                            >
                                <Input maxLength={20} style={{ textTransform: 'uppercase' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item
                                name="order_code_start"
                                label={t('settings.field_start')}
                                rules={[{ required: true, message: t('common.required') }]}
                            >
                                <InputNumber min={1} max={999999999} precision={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item
                                name="order_code_padding"
                                label={t('settings.field_padding')}
                                rules={[{ required: true, message: t('common.required') }]}
                            >
                                <InputNumber min={1} max={10} precision={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item label={t('settings.preview')}>
                        <Input value={preview} readOnly style={{ fontWeight: 600, width: 'min(100%, 280px)' }} />
                    </Form.Item>
                </SectionCard>

                <Form.Item>
                    <SubmitButton>{t('settings.save_system')}</SubmitButton>
                </Form.Item>
            </Form>
        </PanelLayout>
    );
}
