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
import { dateFormat, formatNumber, symbol } from '@/lib/format';

const { Dragger } = Upload;
const { Text } = Typography;

const fieldFromError = (key) => {
    if (!key) return undefined;
    if (key.startsWith('details.') || key.startsWith('compartments.')) {
        const parts = key.split('.');
        return [parts[0], Number(parts[1]), parts.slice(2).join('.')];
    }
    return key.split('.');
};

const normFile = (e) => (Array.isArray(e) ? e : e?.fileList || []);

const formatGallons = (value) => formatNumber(value, 2);

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

    // Las líneas del detalle se reconstruyen tal cual venían del pedido; cada
    // compartimento guardado se enlaza con la línea de la que vino (mismo
    // producto + SCOP) para que la fila muestre desde el inicio su producto,
    // su N° SCOP y el volumen registrado.
    const initialDetails = (order?.details || []).map((d) => ({
        scop: d.scop,
        plant_id: d.plant_id,
        wholesaler_id: d.wholesaler_id,
        product_id: d.product_id,
        gallons: Number(d.gallons),
        sale_price: Number(d.sale_price || 0),
    }));

    const initialCompartments = [...(order?.compartments || [])]
        .sort((a, b) => (a.compartment_number || 0) - (b.compartment_number || 0))
        .map((c) => ({
            detail_key: initialDetails.findIndex(
                (d) =>
                    Number(d.product_id) === Number(c.product_id) &&
                    (d.scop || '').trim() === (c.scop || '').trim(),
            ),
            product_id: c.product_id,
            scop: c.scop,
            volume: Number(c.volume),
        }));

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
        details: initialDetails,
        compartment_count: initialCompartments.length,
        compartments: initialCompartments,
        notes: order?.notes || '',
    };

    const updates = Form.useWatch('details', form) || [];
    const compartmentCount = Number(Form.useWatch('compartment_count', form)) || 0;
    const compartmentRows = Form.useWatch('compartments', form) || [];

    useEffect(() => {
        const gallons = updates.reduce((a, d) => a + (Number(d?.gallons) || 0), 0);
        const sale = updates.reduce(
            (a, d) => a + (Number(d?.gallons) || 0) * (Number(d?.sale_price) || 0),
            0,
        );
        setTotals({ gallons, sale });
    }, [updates]);

    // ADR-015: la cantidad declarada de compartimentos gobierna la cantidad de
    // filas de la tarjeta "Distribución por compartimentos". Al cambiar se
    // conservan las filas ya capturadas y se completan las nuevas.
    useEffect(() => {
        // `useWatch` todavía no devolvió nada en el primer render (0), y los
        // initialValues del pedido se aplican en ese mismo montaje: sin esta
        // guarda el efecto corría con 0 y `slice(0, 0)` vaciaba la
        // distribución que venía cargada. Con `min={1}` una cantidad de 0 solo
        // puede significar "aún no declarada".
        if (compartmentCount === 0) {
            return;
        }

        const current = form.getFieldValue('compartments');
        const rows = Array.isArray(current) ? current : [];

        if (rows.length === compartmentCount) {
            return;
        }

        const next = rows.slice(0, compartmentCount);

        while (next.length < compartmentCount) {
            next.push({ detail_key: null, product_id: null, scop: '', volume: null });
        }

        form.setFieldValue('compartments', next);
    }, [compartmentCount, form]);

    // Al elegir la línea del detalle, el producto y el SCOP quedan fijados por
    // esa línea y el volumen se precarga con sus galones.
    const onCompartmentDetailChange = (index, detailKey) => {
        const detail = updates[detailKey];

        form.setFields([
            { name: ['compartments', index, 'detail_key'], value: detailKey },
            { name: ['compartments', index, 'product_id'], value: detail?.product_id ?? null },
            { name: ['compartments', index, 'scop'], value: detail?.scop ?? '' },
            { name: ['compartments', index, 'volume'], value: Number(detail?.gallons) || null },
        ]);
    };

    // Solo se ofrecen las líneas del detalle que ya tienen SCOP y producto.
    const detailLineOptions = updates
        .map((detail, index) => ({ detail, index }))
        .filter(({ detail }) => detail?.product_id && detail?.scop)
        .map(({ detail, index }) => ({
            value: index,
            label: t('order.compartment_detail_option', {
                index: index + 1,
                scop: detail.scop,
                product: (products || []).find((p) => p.id === detail.product_id)?.name || '-',
            }),
        }));

    const compartmentTotal = compartmentRows.reduce((a, c) => a + (Number(c?.volume) || 0), 0);

    // Aviso (no bloquea) si la suma de compartimentos no cuadra con el total del
    // detalle (ADR-015).
    const compartmentMismatch =
        compartmentCount > 0 && Math.abs(compartmentTotal - totals.gallons) > 0.005;

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

        data.append('compartment_count', values.compartment_count);

        (values.details || []).forEach((d, i) => {
            data.append(`details[${i}][scop]`, d.scop);
            data.append(`details[${i}][plant_id]`, d.plant_id);
            data.append(`details[${i}][wholesaler_id]`, d.wholesaler_id);
            data.append(`details[${i}][product_id]`, d.product_id);
            data.append(`details[${i}][gallons]`, d.gallons);
            data.append(`details[${i}][sale_price]`, d.sale_price ?? 0);
        });

        (values.compartments || []).forEach((c, i) => {
            data.append(`compartments[${i}][product_id]`, c.product_id);
            data.append(`compartments[${i}][scop]`, c.scop);
            data.append(`compartments[${i}][volume]`, c.volume);
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
                                <DatePicker style={{ width: '100%' }} format={dateFormat()} />
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
                    <Form.Item
                        name="compartment_count"
                        label={t('order.compartment_count')}
                        extra={t('order.compartment_count_hint')}
                        rules={[{ required: true, message: `${t('order.compartment_count')} ${t('common.required')}` }]}
                    >
                        <InputNumber
                            min={1}
                            max={50}
                            precision={0}
                            style={{ width: 'min(100%, 220px)' }}
                        />
                    </Form.Item>

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
                                        <span>{`${t('order.sale_price_short')} ${symbol()}`}</span>
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
                                                label={`${t('order.sale_price_short')} ${symbol()}`}
                                            >
                                                <InputNumber min={0} prefix={symbol()} style={{ width: '100%' }} step={0.0001} />
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

                {compartmentCount > 0 && (
                    <SectionCard
                        title={t('order.section_compartments')}
                        description={t('order.section_compartments_help')}
                    >
                        <div className="ui-products ui-products--compartments">
                            <div className="ui-products-head">
                                <span>{t('order.product')}</span>
                                <span>{t('order.volume_gal')}</span>
                                <span>{t('order.scop_number')}</span>
                                <span>{t('order.comp_short')}</span>
                            </div>

                            {Array.from({ length: compartmentCount }, (_, index) => (
                                <div className="ui-product-row" key={index}>
                                    <Form.Item
                                        name={['compartments', index, 'detail_key']}
                                        label={t('order.product')}
                                        rules={[{ required: true, message: t('order.compartment_detail_required') }]}
                                    >
                                        <Select
                                            showSearch
                                            optionFilterProp="label"
                                            placeholder={t('order.compartment_detail_placeholder')}
                                            options={detailLineOptions}
                                            onChange={(value) => onCompartmentDetailChange(index, value)}
                                        />
                                    </Form.Item>

                                    {/* Producto y SCOP los fija la línea del detalle elegida. */}
                                    <Form.Item name={['compartments', index, 'product_id']} hidden>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item name={['compartments', index, 'scop']} hidden>
                                        <Input />
                                    </Form.Item>

                                    <Form.Item
                                        name={['compartments', index, 'volume']}
                                        label={t('order.volume_gal')}
                                        rules={[{ required: true, message: t('common.required') }]}
                                    >
                                        <InputNumber min={0.01} style={{ width: '100%' }} step={0.01} />
                                    </Form.Item>

                                    <div className="ui-product-scop">
                                        <span className="ui-product-scop-label">
                                            {`${t('order.scop_number')}:`}
                                        </span>
                                        {compartmentRows[index]?.scop || '-'}
                                    </div>

                                    <div className="ui-product-index">{index + 1}</div>
                                </div>
                            ))}

                            <div className="ui-products-foot">
                                <span className="ui-products-foot-label">{t('order.compartments_total')}</span>
                                <span className="ui-products-foot-value">
                                    {`${formatGallons(compartmentTotal)} gal`}
                                </span>
                            </div>
                        </div>

                        {compartmentMismatch && (
                            <Alert
                                type="warning"
                                showIcon
                                className="ui-compartments-warning"
                                message={t('order.compartments_mismatch_warning', {
                                    sum: formatGallons(compartmentTotal),
                                    total: formatGallons(totals.gallons),
                                })}
                            />
                        )}
                    </SectionCard>
                )}

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
                                {`${formatGallons(totals.gallons)} gal`}
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