import React, { useEffect, useRef, useState } from 'react';
import { router, usePage, Head } from '@inertiajs/react';
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
import Orders from '@/Services/Orders';
import useTranslations from '@/hooks/useTranslations';
import SubmitButton from '@/Components/SubmitButton';
import SectionCard from '@/Components/SectionCard';
import PublicHeader from '@/Components/PublicHeader';
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

export default function PublicOrderCreate({ advisors, plants, wholesalers, products }) {
    const [form] = Form.useForm();
    const [totals, setTotals] = useState({ gallons: 0, sale: 0 });
    const [customerStatus, setCustomerStatus] = useState('idle');
    const [driverStatus, setDriverStatus] = useState('idle');
    const [tankerStatus, setTankerStatus] = useState('idle');
    // Detalle de lo que el autocompletado trayó (placa del tracto, cantidad de
    // compartimentos) para poder decirlo en el aviso de "cisterna encontrada".
    const [tankerHint, setTankerHint] = useState('');
    const customerTimer = useRef(null);
    const driverTimer = useRef(null);
    const tankerTimer = useRef(null);
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

    useEffect(
        () => () => {
            clearTimeout(customerTimer.current);
            clearTimeout(driverTimer.current);
            clearTimeout(tankerTimer.current);
        },
        [],
    );

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
    // conservan las filas que ya estaban completas y se completan las nuevas.
    useEffect(() => {
        // Con `min={1}` una cantidad de 0 solo puede significar "aún no declarada"
        // (el campo vacío, o `useWatch` sin valor en el primer render): no se
        // toca la lista, así limpiar el campo no descarta lo ya capturado.
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
    // esa línea (no se pueden inventar) y el volumen se precarga con sus galones
    // para que el usuario solo lo ajuste si reparte la carga en varios
    // compartimentos.
    const onCompartmentDetailChange = (index, detailKey) => {
        const detail = updates[detailKey];

        form.setFields([
            { name: ['compartments', index, 'detail_key'], value: detailKey },
            { name: ['compartments', index, 'product_id'], value: detail?.product_id ?? null },
            { name: ['compartments', index, 'scop'], value: detail?.scop ?? '' },
            { name: ['compartments', index, 'volume'], value: Number(detail?.gallons) || null },
        ]);
    };

    // Opciones de la tarjeta de compartimentos: solo las líneas del detalle que
    // ya tienen SCOP y producto ("No se puede agregar otro que no esté en este
    // listado"). El backend lo vuelve a validar.
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

    // El desajuste entre la suma de compartimentos y el total del detalle NO
    // bloquea el registro (ADR-015): se avisa en pantalla.
    const compartmentMismatch =
        compartmentCount > 0 && Math.abs(compartmentTotal - totals.gallons) > 0.005;

    const runLookup = async (rawTaxId) => {
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
        clearTimeout(customerTimer.current);
        customerTimer.current = setTimeout(() => runLookup(value), 500);
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
                setDriverStatus('found');
            } else {
                setDriverStatus('not_found');
            }
        } catch (e) {
            setDriverStatus('idle');
        }
    };

    const onDriverLicenseChange = (e) => {
        const value = e.target.value;
        setDriverStatus('idle');
        clearTimeout(driverTimer.current);
        driverTimer.current = setTimeout(() => runDriverLookup(value), 500);
    };

    // ADR-023: la cisterna es la única entidad de vehículos. Al escribir su placa
// el servidor devuelve la placa del tracto que tiene hoy y la plantilla de sus
// compartimentos, así que aquí se completan solos (ambos campos siguen siendo
// editables: es una ayuda, no un imposedor).
const runVehicleLookup = async (rawPlate) => {
        const plate = (rawPlate || '').trim().toUpperCase();
        if (plate.length < 3) {
            setTankerStatus('idle');
            setTankerHint('');
            return;
        }

        try {
            const { data } = await Orders.lookupVehicle(plate);
            setTankerStatus(data.found ? 'found' : 'not_found');

            if (!data.found) {
                setTankerHint('');
                return;
            }

            const patches = {};
            const hints = [];

            if (data.tractor_plate) {
                patches.tractor_plate = data.tractor_plate;
                hints.push(t('order.vehicle_found_tractor'));
            }

            if (Array.isArray(data.compartments) && data.compartments.length > 0) {
                const template = data.compartments;

                patches.compartment_count = template.length;
                hints.push(t('order.vehicle_found_compartments', { count: template.length }));

            const current = form.getFieldValue('compartments');
            const rows = Array.isArray(current) ? current : [];

            patches.compartments = template.map((compartment, index) => {
                const volume = Number(compartment.volume);
                const existing = rows[index];

                // La plantilla solo trae volumen y SCOP; el producto y el SCOP
                // de la fila los fija la línea del detalle que elija el usuario.
                // Se respetan los valores ya capturados en la fila.
                const match = updates.findIndex(
                    (detail) => compartment.scop && detail?.scop === compartment.scop,
                );

                return {
                    detail_key: existing?.detail_key ?? (match >= 0 ? match : null),
                    product_id:
                        existing?.product_id ?? (match >= 0 ? updates[match]?.product_id ?? null : null),
                    scop: existing?.scop ?? (match >= 0 ? updates[match]?.scop ?? '' : ''),
                    volume: existing?.volume ?? (volume > 0 ? volume : null),
                };
            });
        }

        if (Object.keys(patches).length > 0) {
            form.setFieldsValue(patches);
        }

        setTankerHint(hints.join(' · '));
    } catch (e) {
        setTankerStatus('idle');
        setTankerHint('');
    }
};

const onTankerChange = (e) => {
    const value = e.target.value;
    setTankerStatus('idle');
    setTankerHint('');
    clearTimeout(tankerTimer.current);
    tankerTimer.current = setTimeout(() => runVehicleLookup(value), 500);
};

    const hasErrors = errors && Object.keys(errors).length > 0;

    const onFinish = (values) => {
        const data = new FormData();
        data.append('order_date', values.order_date ? values.order_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
        data.append('advisor_id', values.advisor_id);
        data.append('customer[tax_id]', values.customer?.tax_id ?? '');
        data.append('customer[name]', values.customer?.name ?? '');
        data.append('driver[license_number]', values.driver?.license_number ?? '');
        data.append('driver[name]', values.driver?.name ?? '');
        data.append('tanker[license_plate]', values.tanker?.license_plate ?? '');
        data.append('tractor_plate', values.tractor_plate ?? '');

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
            data.append(`files[${i}]`, f.originFileObj || f);
        });

        router.post('/pedidos/registro', data, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <div className="ui-page-bg">
            <Head title={t('order.public_form_title')} />
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
                                    {/* No se puede registrar un pedido con fecha pasada: es la misma regla que valida el backend (`after_or_equal:today` en PublicOrderStoreRequest). */}
                                    <DatePicker
                                        style={{ width: '100%' }}
                                        format={dateFormat()}
                                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                                    />
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
                                    <Input
                                        maxLength={50}
                                        onChange={onDriverLicenseChange}
                                        onBlur={(e) => runDriverLookup(e.target.value)}
                                    />
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
                                                {tankerHint ? ` · ${tankerHint}` : ''}
                                            </Text>
                                        ) : null
                                    }
                                >
                                    <Input
                                        maxLength={20}
                                        placeholder={t('order.tanker_plate')}
                                        onChange={onTankerChange}
                                        onBlur={(e) => runVehicleLookup(e.target.value)}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    name="tractor_plate"
                                    label={t('order.tractor_plate')}
                                    rules={[{ required: true, message: `${t('order.tractor_plate')} ${t('common.required')}` }]}
                                    extra={
                                        <Text type="secondary" className="ui-hint">
                                            {t('order.tractor_plate_hint')}
                                        </Text>
                                    }
                                >
                                    <Input maxLength={20} placeholder={t('order.tractor_plate')} />
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
                                    <span className="ui-products-foot-label">
                                        {t('order.compartments_total')}
                                    </span>
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
                                <Text className="ui-summary-label">⛽ {t('order.total_gallons')}</Text>
                                <div className="ui-summary-value ui-summary-value--info">
                                    {`${formatGallons(totals.gallons)} gal`}
                                </div>
                                <Text className="ui-summary-hint">{t('order.summary_gallons_hint')}</Text>
                            </div>
                            <div className="ui-summary-item">
                                <Text className="ui-summary-label">💵 {t('order.total_sale')}</Text>
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