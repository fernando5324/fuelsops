import React, { useEffect, useRef, useState } from 'react';
import { usePage, router, Link } from '@inertiajs/react';
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
    RedoOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PanelLayout from '../../../Layouts/PanelLayout';
import PageHeader from '@/Components/PageHeader';
import SectionCard from '@/Components/SectionCard';
import SubmitButton from '@/Components/SubmitButton';
import Orders from '@/Services/Orders';
import useTranslations from '@/hooks/useTranslations';
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

function DocumentRow({ file, removed, onToggle }) {
    const { t } = useTranslations();

    return (
        <div className={`ui-order-doc${removed ? ' ui-order-doc--removed' : ''}`}>
            <span className="ui-order-doc-icon">{file.extension === 'pdf' ? 'PDF' : file.extension?.toUpperCase() || 'DOC'}</span>
            <div className="ui-order-doc-main">
                <div className="ui-order-doc-name">{file.original_name || file.file_name}</div>
                <div className="ui-order-doc-meta">
                    {removed ? t('order.will_be_removed') : `${file.extension?.toUpperCase()} ${file.mime_type || ''}`}
                </div>
            </div>
            <Tooltip title={removed ? t('common.undo') : t('order.remove_document')}>
                <Button
                    type="text"
                    icon={removed ? <RedoOutlined /> : <DeleteOutlined />}
                    aria-label={removed ? t('common.undo') : t('order.remove_document')}
                    onClick={onToggle}
                    className="ui-remove-btn"
                />
            </Tooltip>
        </div>
    );
}

export default function OrderEdit({ order, advisors, plants, wholesalers, products }) {
    const [form] = Form.useForm();
    const [totals, setTotals] = useState({ gallons: 0, sale: 0 });
    const [removedIds, setRemovedIds] = useState(() => []);
    const [customerStatus, setCustomerStatus] = useState('idle');
    const [driverStatus, setDriverStatus] = useState('idle');
    const [tankerStatus, setTankerStatus] = useState('idle');
    const [tractorStatus, setTractorStatus] = useState('idle');
    const { message } = App.useApp();
    const { errors } = usePage().props;
    const { t } = useTranslations();

    const customerTimer = useRef(null);
    const driverTimer = useRef(null);
    const tankerTimer = useRef(null);
    const tractorTimer = useRef(null);

    useEffect(() => () => {
        clearTimeout(customerTimer.current);
        clearTimeout(driverTimer.current);
        clearTimeout(tankerTimer.current);
        clearTimeout(tractorTimer.current);
    }, []);

    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            message.error(Object.values(errors)[0]);
            const field = fieldFromError(Object.keys(errors)[0]);
            if (field) {
                form.scrollToField(field, { block: 'center' });
            }
        }
    }, [errors, form, message]);

    const initialValues = {
        order_date: dayjs(order?.order_date),
        advisor_id: order?.advisor_id,
        customer: {
            tax_id: order?.customer?.tax_id || '',
            name: order?.customer?.name || '',
        },
        driver: {
            license_number: order?.driver?.license_number || '',
            name: order?.driver?.name || '',
        },
        tanker: { license_plate: order?.tanker?.license_plate || '' },
        tractor: { license_plate: order?.tractor?.license_plate || '' },
        details: (order?.details || []).map((d) => ({
            scop: d.scop,
            plant_id: d.plant_id,
            wholesaler_id: d.wholesaler_id,
            product_id: d.product_id,
            gallons: Number(d.gallons),
            sale_price: Number(d.sale_price || 0),
            compartments: d.compartments ?? 1,
        })),
        notes: order?.notes || '',
    };

    const updates = Form.useWatch('details', form) || [];

    useEffect(() => {
        const gallons = updates.reduce((a, d) => a + (Number(d?.gallons) || 0), 0);
        const sale = updates.reduce(
            (a, d) => a + (Number(d?.gallons) || 0) * (Number(d?.sale_price) || 0),
            0,
        );
        setTotals({ gallons, sale });
    }, [updates]);

    const runCustomerLookup = async (rawTaxId) => {
        const taxId = (rawTaxId || '').trim();
        if (taxId.length < 6) {
            setCustomerStatus('idle');
            return;
        }
        try {
            const { data } = await Orders.lookupCustomer(taxId);
            if (data.found) {
                const current = form.getFieldValue('customer') || {};
                form.setFieldsValue({ customer: { ...current, name: data.name } });
            }
            setCustomerStatus(data.found ? 'found' : 'not_found');
        } catch (e) {
            setCustomerStatus('idle');
        }
    };

    const onTaxIdChange = (e) => {
        setCustomerStatus('idle');
        clearTimeout(customerTimer.current);
        customerTimer.current = setTimeout(() => runCustomerLookup(e.target.value), 500);
    };

    const runDriverLookup = async (rawLicense) => {
        const license = (rawLicense || '').trim();
        if (license.length < 4) {
            setDriverStatus('idle');
            return;
        }
        try {
            const { data } = await Orders.lookupDriver(license);
            if (data.found) {
                const current = form.getFieldValue('driver') || {};
                form.setFieldsValue({ driver: { ...current, name: data.name } });
            }
            setDriverStatus(data.found ? 'found' : 'not_found');
        } catch (e) {
            setDriverStatus('idle');
        }
    };

    const onDriverLicenseChange = (e) => {
        setDriverStatus('idle');
        clearTimeout(driverTimer.current);
        driverTimer.current = setTimeout(() => runDriverLookup(e.target.value), 500);
    };

    const runVehicleLookup = async (rawPlate, type) => {
        const plate = (rawPlate || '').trim().toUpperCase();
        const setStatus = type === 'TANKER' ? setTankerStatus : setTractorStatus;
        if (plate.length < 3) {
            setStatus('idle');
            return;
        }
        try {
            const { data } = await Orders.lookupVehicle(plate, type);
            setStatus(data.found ? 'found' : 'not_found');
        } catch (e) {
            setStatus('idle');
        }
    };

    const onTankerChange = (e) => {
        setTankerStatus('idle');
        clearTimeout(tankerTimer.current);
        tankerTimer.current = setTimeout(() => runVehicleLookup(e.target.value, 'TANKER'), 500);
    };

    const onTractorChange = (e) => {
        setTractorStatus('idle');
        clearTimeout(tractorTimer.current);
        tractorTimer.current = setTimeout(() => runVehicleLookup(e.target.value, 'TRACTOR'), 500);
    };

    const hasErrors = errors && Object.keys(errors).length > 0;

    const onFinish = (values) => {
        const data = new FormData();
        data.append('order_date', values.order_date ? values.order_date.format('YYYY-MM-DD') : dayjs(order?.order_date).format('YYYY-MM-DD'));
        data.append('advisor_id', values.advisor_id);
        data.append('customer[tax_id]', values.customer?.tax_id ?? '');
        data.append('customer[name]', values.customer?.name ?? '');
        data.append('driver[license_number]', values.driver?.license_number ?? '');
        data.append('driver[name]', values.driver?.name ?? '');
        data.append('tanker[license_plate]', values.tanker?.license_plate ?? '');
        data.append('tractor[license_plate]', values.tractor?.license_plate ?? '');

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
            if (f.originFileObj) {
                data.append(`files[${i}]`, f.originFileObj);
            }
        });

        removedIds.forEach((id, i) => {
            data.append(`remove_files[${i}]`, id);
        });

        // POST multipart + _method=PUT: PHP no puebla $_POST/$_FILES en
        // PUT multipart, pero Laravel interpreta _method y enruta al Route::put.
        data.append('_method', 'PUT');

        router.post(Orders.routes.update(order.id), data, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <PanelLayout>
            <PageHeader
                title={`${t('order.edit_order')} #${order?.id}`}
                extra={
                    <Link href={Orders.routes.show(order.id)}>
                        <Button>{t('common.cancel')}</Button>
                    </Link>
                }
            />

            <Form form={form} layout="vertical" onFinish={onFinish} initialValues={initialValues} autoComplete="off">
                <SectionCard
                    title={t('order.section_general')}
                    description={t('order.section_general_help')}
                >
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="order_date"
                                label={t('order.order_date')}
                                rules={[{ required: true, message: `${t('order.order_date')} ${t('common.required')}` }]}
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
                                extra={
                                    customerStatus === 'found' ? (
                                        <Text className="ui-ok">
                                            <CheckCircleOutlined /> {t('order.customer_found')}
                                        </Text>
                                    ) : null
                                }
                            >
                                <Input maxLength={20} onChange={onTaxIdChange} onBlur={(e) => runCustomerLookup(e.target.value)} />
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
                    title={t('order.section_driver')}
                    description={t('order.section_driver_help')}
                >
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name={['driver', 'license_number']}
                                label={t('order.license_number')}
                                rules={[{ required: true, message: `${t('order.license_number')} ${t('common.required')}` }]}
                                extra={
                                    driverStatus === 'found' ? (
                                        <Text className="ui-ok">
                                            <CheckCircleOutlined /> {t('order.driver_found')}
                                        </Text>
                                    ) : null
                                }
                            >
                                <Input maxLength={50} onChange={onDriverLicenseChange} onBlur={(e) => runDriverLookup(e.target.value)} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name={['driver', 'name']}
                                label={
                                    <Space size={6}>
                                        <Text>{t('order.driver_name')}</Text>
                                        {driverStatus === 'found' && (
                                            <Tag className="ui-autocomplete-tag" color="success">{t('order.driver_found')}</Tag>
                                        )}
                                    </Space>
                                }
                                rules={[{ required: true, message: `${t('order.driver_name')} ${t('common.required')}` }]}
                            >
                                <Input maxLength={200} placeholder={t('order.driver_name')} />
                            </Form.Item>
                        </Col>
                    </Row>
                </SectionCard>

                <SectionCard
                    title={t('order.section_vehicle')}
                    description={t('order.section_vehicle_help')}
                >
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name={['tanker', 'license_plate']}
                                label={t('order.tanker_plate')}
                                rules={[{ required: true, message: `${t('order.tanker_plate')} ${t('common.required')}` }]}
                                extra={
                                    tankerStatus === 'found' ? (
                                        <Text className="ui-ok">
                                            <CheckCircleOutlined /> {t('order.vehicle_found')}
                                        </Text>
                                    ) : null
                                }
                            >
                                <Input maxLength={20} onChange={onTankerChange} onBlur={(e) => runVehicleLookup(e.target.value, 'TANKER')} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name={['tractor', 'license_plate']}
                                label={t('order.tractor_plate')}
                                rules={[{ required: true, message: `${t('order.tractor_plate')} ${t('common.required')}` }]}
                                extra={
                                    tractorStatus === 'found' ? (
                                        <Text className="ui-ok">
                                            <CheckCircleOutlined /> {t('order.vehicle_found')}
                                        </Text>
                                    ) : null
                                }
                            >
                                <Input maxLength={20} onChange={onTractorChange} onBlur={(e) => runVehicleLookup(e.target.value, 'TRACTOR')} />
                            </Form.Item>
                        </Col>
                    </Row>
                </SectionCard>

                <SectionCard
                    title={t('order.section_detail')}
                    description={t('order.section_detail_help')}
                >
                    <Form.List name="details">
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
                    title={t('order.section_observations')}
                    description={t('order.section_observations_help')}
                >
                    <Form.Item name="notes" label={t('order.notes')}>
                        <Input.TextArea rows={4} maxLength={2000} />
                    </Form.Item>

                    {(order?.files || []).length > 0 && (
                        <div className="ui-attachments">
                            <Text strong>{t('order.existing_documents')}</Text>
                            <div className="ui-order-docs ui-order-docs--edit">
                                {(order.files || []).map((f) => {
                                    const removed = removedIds.includes(f.id);
                                    return (
                                        <DocumentRow
                                            key={f.id}
                                            file={f}
                                            removed={removed}
                                            onToggle={() =>
                                                setRemovedIds((prev) =>
                                                    removed
                                                        ? prev.filter((id) => id !== f.id)
                                                        : [...prev, f.id],
                                                )
                                            }
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="ui-attachments">
                        <Form.Item
                            name="files"
                            valuePropName="fileList"
                            getValueFromEvent={normFile}
                            initialValue={[]}
                            label={t('order.attachments')}
                            extra={t('order.attach_hint')}
                        >
                            <Dragger
                                beforeUpload={() => false}
                                multiple
                                maxCount={5}
                                accept=".pdf,.jpg,.jpeg"
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
                            title={t('order.validation_summary')}
                        />
                    )}

                    <div className="ui-cta-row">
                        <Link href={Orders.routes.show(order.id)}>
                            <Button>{t('common.cancel')}</Button>
                        </Link>
                        <SubmitButton loadingText={t('common.loading')}>
                            {t('common.save_changes')}
                        </SubmitButton>
                    </div>
                </SectionCard>
            </Form>
        </PanelLayout>
    );
}