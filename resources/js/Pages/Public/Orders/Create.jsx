import React, { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    Alert,
    App,
    Button,
    Col,
    DatePicker,
    Form,
    Input,
    InputNumber,
    Row,
    Select,
    Space,
    Tag,
    Tooltip,
    Typography,
    Upload,
} from 'antd';
import {
    CheckCircleOutlined,
    DeleteOutlined,
    PlusOutlined,
    InboxOutlined,
} from '@ant-design/icons';

import dayjs from 'dayjs';
import useTranslations from '@/hooks/useTranslations';
import SubmitButton from '@/Components/SubmitButton';
import SectionCard from '@/Components/SectionCard';
import PublicHeader from '@/Components/PublicHeader';
import formatMoney from '@/lib/money';

const { Dragger } = Upload;
const { Text } = Typography;

const fieldFromError = (key) => {
    if (!key) return undefined;
    if (key.startsWith('details.')) {
        const parts = key.split('.');
        return ['details', Number(parts[1]), parts.slice(2).join('.')];
    }
    return key.split('.');
};

const normFile = (e) => (Array.isArray(e) ? e : e?.fileList || []);

export default function PublicOrderCreate({
    advisors,
    plants,
    wholesalers,
    products,
    drivers,
    vehicles,
}) {
    const [form] = Form.useForm();
    const [totals, setTotals] = useState({ gallons: 0, sale: 0 });
    const [customerStatus, setCustomerStatus] = useState('idle');
    const lookupTimer = useRef(null);
    const { message } = App.useApp();
    const { errors } = usePage().props;
    const { t } = useTranslations();

    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            message.error(Object.values(errors)[0]);
            const field = fieldFromError(Object.keys(errors)[0]);
            if (field) {
                form.scrollToField(field, { block: 'center' });
            }
        }
    }, [errors, form, message]);

    useEffect(() => () => clearTimeout(lookupTimer.current), []);

    const updates = Form.useWatch('details', form) || [];
    const driverId = Form.useWatch('driver_id', form);
    const tankerId = Form.useWatch('tanker_id', form);
    const tractorId = Form.useWatch('tractor_id', form);

    useEffect(() => {
        const gallons = updates.reduce((a, d) => a + (Number(d?.gallons) || 0), 0);
        const sale = updates.reduce(
            (a, d) => a + (Number(d?.gallons) || 0) * (Number(d?.sale_price) || 0),
            0,
        );
        setTotals({ gallons, sale });
    }, [updates]);

    const tankers = (vehicles || []).filter((v) => v.type === 'TANKER');
    const tractors = (vehicles || []).filter((v) => v.type === 'TRACTOR');

    const selectedDriver = (drivers || []).find((d) => d.id === driverId);
    const selectedTanker = tankers.find((v) => v.id === tankerId);
    const selectedTractor = tractors.find((v) => v.id === tractorId);

    const runLookup = async (rawTaxId) => {
        const taxId = (rawTaxId || '').trim();
        if (taxId.length < 6) {
            setCustomerStatus('idle');
            return;
        }

        try {
            const { data } = await window.axios.post('/pedidos/consulta-cliente', {
                tax_id: taxId,
            });

            if (data.found) {
                const current = form.getFieldValue('customer') || {};
                form.setFieldsValue({ customer: { ...current, name: data.name } });
                setCustomerStatus('found');
            } else {
                setCustomerStatus('not_found');
            }
        } catch (e) {
            setCustomerStatus('idle');
        }
    };

    const onTaxIdChange = (e) => {
        const value = e.target.value;
        setCustomerStatus('idle');
        clearTimeout(lookupTimer.current);
        lookupTimer.current = setTimeout(() => runLookup(value), 500);
    };

    const hasErrors = errors && Object.keys(errors).length > 0;

    const onFinish = (values) => {
        const data = new FormData();
        data.append('order_date', values.order_date ? values.order_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
        data.append('advisor_id', values.advisor_id);
        data.append('customer[tax_id]', values.customer?.tax_id ?? '');
        data.append('customer[name]', values.customer?.name ?? '');
        data.append('driver_id', values.driver_id);
        data.append('tanker_id', values.tanker_id);
        data.append('tractor_id', values.tractor_id);

        if (values.notes) {
            data.append('notes', values.notes);
        }

        (values.details || []).forEach((d, i) => {
            data.append(`details[${i}][scop]`, d.scop);
            data.append(`details[${i}][plant_id]`, d.plant_id);
            data.append(`details[${i}][wholesaler_id]`, d.wholesaler_id);
            data.append(`details[${i}][product_id]`, d.product_id);
            data.append(`details[${i}][gallons]`, d.gallons);
            data.append(`details[${i}][sale_price]`, d.sale_price ?? 0);
            data.append(`details[${i}][compartments]`, d.compartments ?? 1);
        });

        (values.files || []).forEach((f, i) => {
            data.append(`files[${i}]`, f.originFileObj || f);
        });

        router.post('/pedidos/registro', data, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <div className="ui-page-bg">
            <PublicHeader />

            <div className="ui-page">
                <div className="ui-page-head">
                    <Typography.Title level={3} className="ui-page-title">
                        {t('order.public_form_title')}
                    </Typography.Title>
                    <Typography.Paragraph type="secondary">
                        {t('order.public_form_subtitle')}
                    </Typography.Paragraph>
                </div>

                <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
                    <SectionCard
                        index={1}
                        title={t('order.section_general')}
                        description={t('order.section_general_help')}
                    >
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    name="order_date"
                                    label={t('order.order_date')}
                                    initialValue={dayjs()}
                                >
                                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    name="advisor_id"
                                    label={t('order.advisor')}
                                    rules={[{ required: true, message: `${t('order.advisor')} ${t('common.required')}` }]}
                                >
                                    <Select
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder={t('order.advisor')}
                                        options={(advisors || []).map((a) => ({ value: a.id, label: a.name }))}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    name={['customer', 'tax_id']}
                                    label={t('order.customer_tax_id')}
                                    rules={[{ required: true, message: `${t('order.customer_tax_id')} ${t('common.required')}` }]}
                                    validateStatus={customerStatus === 'not_found' ? 'warning' : undefined}
                                    extra={
                                        customerStatus === 'found' ? (
                                            <Text className="ui-ok">
                                                <CheckCircleOutlined /> {t('order.customer_found')}
                                            </Text>
                                        ) : customerStatus === 'not_found' ? (
                                            <Text type="secondary">{t('order.customer_not_found')}</Text>
                                        ) : null
                                    }
                                >
                                    <Input maxLength={20} onChange={onTaxIdChange} onBlur={(e) => runLookup(e.target.value)} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    name={['customer', 'name']}
                                    label={
                                        <Space size={6}>
                                            <Text>{t('order.customer_name')}</Text>
                                            {customerStatus === 'found' && (
                                                <Tag className="ui-autocomplete-tag" color="success">{t('order.customer_found')}</Tag>
                                            )}
                                        </Space>
                                    }
                                    rules={[{ required: true, message: `${t('order.customer_name')} ${t('common.required')}` }]}
                                >
                                    <Input maxLength={200} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </SectionCard>

                    <SectionCard
                        index={2}
                        title={t('order.section_driver')}
                        description={t('order.section_driver_help')}
                    >
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    name="driver_id"
                                    label={t('order.license_number')}
                                    rules={[{ required: true, message: `${t('order.license_number')} ${t('common.required')}` }]}
                                >
                                    <Select
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder={t('order.license_number')}
                                        options={(drivers || []).map((d) => ({
                                            value: d.id,
                                            label: d.license_number,
                                        }))}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    label={t('order.driver_name')}
                                    extra={
                                        selectedDriver ? (
                                            <Text className="ui-ok">
                                                <CheckCircleOutlined /> {t('order.driver_found')}
                                            </Text>
                                        ) : null
                                    }
                                >
                                    <Input
                                        value={selectedDriver?.name || ''}
                                        readOnly
                                        placeholder={t('order.driver_name')}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </SectionCard>

                    <SectionCard
                        index={3}
                        title={t('order.section_vehicle')}
                        description={t('order.section_vehicle_help')}
                    >
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    name="tanker_id"
                                    label={t('order.tanker_plate')}
                                    rules={[{ required: true, message: `${t('order.tanker_plate')} ${t('common.required')}` }]}
                                    extra={
                                        selectedTanker ? (
                                            <Text className="ui-ok">
                                                <CheckCircleOutlined /> {t('order.vehicle_found')}
                                            </Text>
                                        ) : null
                                    }
                                >
                                    <Select
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder={t('order.tanker_plate')}
                                        options={tankers.map((v) => ({ value: v.id, label: v.license_plate }))}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    name="tractor_id"
                                    label={t('order.tractor_plate')}
                                    rules={[{ required: true, message: `${t('order.tractor_plate')} ${t('common.required')}` }]}
                                    extra={
                                        selectedTractor ? (
                                            <Text className="ui-ok">
                                                <CheckCircleOutlined /> {t('order.vehicle_found')}
                                            </Text>
                                        ) : null
                                    }
                                >
                                    <Select
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder={t('order.tractor_plate')}
                                        options={tractors.map((v) => ({ value: v.id, label: v.license_plate }))}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </SectionCard>

                    <SectionCard
                        index={4}
                        title={t('order.section_detail')}
                        description={t('order.section_detail_help')}
                    >
                        <Form.List name="details" initialValue={[{}]}>
                            {(detailFields, { add, remove }) => (
                                <>
                                    <div className="ui-products">
                                        <div className="ui-products-head">
                                            <span>{t('order.row_number')}</span>
                                            <span>{t('order.scop')}</span>
                                            <span>{t('order.plant')}</span>
                                            <span>{t('order.wholesaler')}</span>
                                            <span>{t('order.product')}</span>
                                            <span>{t('order.gallons')}</span>
                                            <span>{`${t('order.sale_price_short')} S/`}</span>
                                            <span>{t('order.compartments')}</span>
                                            <span />
                                        </div>

                                        {detailFields.map((field) => (
                                            <div className="ui-product-row" key={field.key}>
                                                <div className="ui-product-index">{field.name + 1}</div>

                                                <Form.Item
                                                    name={[field.name, 'scop']}
                                                    label={t('order.scop')}
                                                    rules={[{ required: true, message: t('common.required') }]}
                                                >
                                                    <Input maxLength={50} />
                                                </Form.Item>

                                                <Form.Item
                                                    name={[field.name, 'plant_id']}
                                                    label={t('order.plant')}
                                                    rules={[{ required: true, message: t('common.required') }]}
                                                >
                                                    <Select
                                                        showSearch
                                                        optionFilterProp="label"
                                                        options={(plants || []).map((p) => ({ value: p.id, label: p.name }))}
                                                    />
                                                </Form.Item>

                                                <Form.Item
                                                    name={[field.name, 'wholesaler_id']}
                                                    label={t('order.wholesaler')}
                                                    rules={[{ required: true, message: t('common.required') }]}
                                                >
                                                    <Select
                                                        showSearch
                                                        optionFilterProp="label"
                                                        options={(wholesalers || []).map((w) => ({ value: w.id, label: w.name }))}
                                                    />
                                                </Form.Item>

                                                <Form.Item
                                                    name={[field.name, 'product_id']}
                                                    label={t('order.product')}
                                                    rules={[{ required: true, message: t('common.required') }]}
                                                >
                                                    <Select
                                                        showSearch
                                                        optionFilterProp="label"
                                                        options={(products || []).map((p) => ({ value: p.id, label: p.name }))}
                                                    />
                                                </Form.Item>

                                                <Form.Item
                                                    name={[field.name, 'gallons']}
                                                    label={t('order.gallons')}
                                                    rules={[{ required: true, message: `${t('order.gallons')} ${t('common.required')}` }]}
                                                >
                                                    <InputNumber min={0.01} style={{ width: '100%' }} step={0.01} />
                                                </Form.Item>

                                                <Form.Item
                                                    name={[field.name, 'sale_price']}
                                                    label={`${t('order.sale_price_short')} S/`}
                                                >
                                                    <InputNumber min={0} prefix="S/" style={{ width: '100%' }} step={0.0001} />
                                                </Form.Item>

                                                <Form.Item
                                                    name={[field.name, 'compartments']}
                                                    label={t('order.compartments')}
                                                >
                                                    <InputNumber min={1} style={{ width: '100%' }} />
                                                </Form.Item>

                                                <div className="ui-products-actions">
                                                    {detailFields.length > 1 && (
                                                        <Tooltip title={t('order.remove_product')}>
                                                            <Button
                                                                danger
                                                                type="text"
                                                                icon={<DeleteOutlined />}
                                                                aria-label={t('order.remove_product')}
                                                                onClick={() => remove(field.name)}
                                                                className="ui-remove-btn"
                                                            />
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <Button
                                        block
                                        icon={<PlusOutlined />}
                                        onClick={() => add({})}
                                        className="ui-add-btn"
                                        style={{ marginTop: 12 }}
                                    >
                                        {t('order.add_product')}
                                    </Button>
                                </>
                            )}
                        </Form.List>
                    </SectionCard>

                    <SectionCard
                        index={5}
                        title={t('order.section_observations')}
                        description={t('order.section_observations_help')}
                    >
                        <Form.Item name="notes" label={t('order.notes')}>
                            <Input.TextArea rows={4} maxLength={2000} />
                        </Form.Item>

                        <div className="ui-attachments">
                            <Form.Item
                                name="files"
                                valuePropName="fileList"
                                getValueFromEvent={normFile}
                                initialValue={[]}
                            >
                                <Dragger
                                    beforeUpload={() => false}
                                    multiple
                                    maxCount={5}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                >
                                    <p className="ant-upload-drag-icon">
                                        <InboxOutlined />
                                    </p>
                                    <p className="ant-upload-text">{t('order.attachments')}</p>
                                    <p className="ant-upload-hint">{t('order.attach_hint')}</p>
                                </Dragger>
                            </Form.Item>
                        </div>
                    </SectionCard>

                    <SectionCard title={t('order.summary')} description={t('order.summary_help')}>
                        <div className="ui-summary">
                            <div className="ui-summary-item">
                                <Text className="ui-summary-label">{t('order.total_gallons')}</Text>
                                <div className="ui-summary-value ui-summary-value--info">
                                    {`${totals.gallons.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gal`}
                                </div>
                                <Text className="ui-summary-hint">{t('order.summary_gallons_hint')}</Text>
                            </div>
                            <div className="ui-summary-item">
                                <Text className="ui-summary-label">{t('order.total_sale')}</Text>
                                <div className="ui-summary-value ui-summary-value--money">
                                    {formatMoney(totals.sale)}
                                </div>
                                <Text className="ui-summary-hint">{t('order.summary_sale_hint')}</Text>
                            </div>
                        </div>

                        {hasErrors && (
                            <Alert
                                className="ui-validation-banner"
                                type="warning"
                                showIcon
                                message={t('order.validation_summary')}
                            />
                        )}

                        <div className="ui-cta-row">
                            <Button onClick={() => form.resetFields()}>{t('common.reset')}</Button>
                            <SubmitButton
                                className="ui-accent-btn ui-cta"
                                loadingText={t('order.public_form_loading')}
                            >
                                {t('order.public_form_submit')}
                            </SubmitButton>
                        </div>
                    </SectionCard>
                </Form>
            </div>
        </div>
    );
}
