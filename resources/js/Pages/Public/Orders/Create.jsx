import React, { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    Alert,
    App,
    Button,
    Card,
    Col,
    DatePicker,
    Divider,
    Form,
    Input,
    InputNumber,
    Row,
    Select,
    Space,
    Typography,
    Upload,
} from 'antd';
import { DeleteOutlined, PlusOutlined, InboxOutlined } from '@ant-design/icons';

import dayjs from 'dayjs';
import useTranslations from '@/hooks/useTranslations';
import SubmitButton from '@/Components/SubmitButton';

const { Dragger } = Upload;
const { Text } = Typography;

export default function PublicOrderCreate({ advisors, plants, wholesalers, products, drivers, vehicles }) {
    const [form] = Form.useForm();
    const [totals, setTotals] = useState({ gallons: 0, sale: 0 });
    const { message } = App.useApp();
    const { errors } = usePage().props;
    const { t } = useTranslations();

    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            message.error(Object.values(errors)[0]);
        }
    }, [errors, message]);

    const updates = form.useWatch('details', form) || [];

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

    const driverOptions = (drivers || []).map((d) => ({
        value: d.id,
        label: `${d.name} — ${d.license_number}`,
    }));

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
        <div
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1f3a47 0%, #2c5f73 100%)',
                padding: '32px 16px',
            }}
        >
            <Card style={{ maxWidth: 980, margin: '0 auto', borderRadius: 12 }}>
                <Typography.Title level={3} style={{ marginTop: 0, textAlign: 'center' }}>
                    {t('order.public_form_title')}
                </Typography.Title>
                <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
                    {t('order.public_form_subtitle')}
                </Typography.Paragraph>

                <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
                    <Row gutter={16}>
                        <Col xs={24} sm={8}>
                            <Form.Item
                                name="order_date"
                                label={t('order.order_date')}
                                initialValue={dayjs()}
                            >
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item
                                name="advisor_id"
                                label={t('order.advisor')}
                                rules={[{ required: true, message: `${t('order.advisor')} ${t('common.required')}` }]}
                            >
                                <Select
                                    showSearch
                                    optionFilterProp="label"
                                    options={(advisors || []).map((a) => ({ value: a.id, label: a.name }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item
                                name="driver_id"
                                label={`${t('order.driver')} (${t('catalogs.license_number')})`}
                                rules={[{ required: true, message: `${t('order.driver')} ${t('common.required')}` }]}
                            >
                                <Select showSearch optionFilterProp="label" options={driverOptions} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left">{t('order.customer')}</Divider>

                    <Row gutter={16}>
                        <Col xs={24} sm={8}>
                            <Form.Item
                                name={['customer', 'tax_id']}
                                label={t('catalogs.tax_id')}
                                rules={[{ required: true, message: t('common.required') }]}
                            >
                                <Input maxLength={20} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={16}>
                            <Form.Item
                                name={['customer', 'name']}
                                label={t('common.full_name')}
                                rules={[{ required: true, message: `${t('common.full_name')} ${t('common.required')}` }]}
                            >
                                <Input maxLength={200} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left">{t('order.details')}</Divider>

                    <Form.List name="details" initialValue={[{}]}>
                        {(detailFields, { add, remove }) => (
                            <>
                                {detailFields.map((field) => (
                                    <Row gutter={12} key={field.key} align="top">
                                        <Col xs={24} sm={4}>
                                            <Form.Item
                                                name={[field.name, 'scop']}
                                                label={t('order.scop')}
                                                rules={[{ required: true, message: t('common.required') }]}
                                            >
                                                <Input placeholder="SCOP" maxLength={50} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={4}>
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
                                        </Col>
                                        <Col xs={24} sm={4}>
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
                                        </Col>
                                        <Col xs={24} sm={4}>
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
                                        </Col>
                                        <Col xs={8} sm={2}>
                                            <Form.Item
                                                name={[field.name, 'gallons']}
                                                label={t('order.gallons')}
                                                rules={[{ required: true, message: '' }]}
                                            >
                                                <InputNumber min={0.01} style={{ width: '100%' }} step={0.01} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={8} sm={2}>
                                            <Form.Item
                                                name={[field.name, 'sale_price']}
                                                label={t('order.sale_price')}
                                            >
                                                <InputNumber min={0} style={{ width: '100%' }} step={0.0001} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={8} sm={2}>
                                            <Form.Item
                                                name={[field.name, 'compartments']}
                                                label={t('order.compartments')}
                                            >
                                                <InputNumber min={1} style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={2}>
                                            <Button
                                                danger
                                                icon={<DeleteOutlined />}
                                                onClick={() => remove(field.name)}
                                                style={{ marginTop: 32 }}
                                            />
                                        </Col>
                                    </Row>
                                ))}

                                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({})}>
                                    {t('order.add_detail')}
                                </Button>
                            </>
                        )}
                    </Form.List>

                    <Row gutter={16} style={{ marginTop: 8 }}>
                        <Col xs={24} sm={6}>
                            <Form.Item
                                name="tanker_id"
                                label={`${t('catalogs.type_tanker')}`}
                                rules={[{ required: true, message: t('common.required') }]}
                            >
                                <Select
                                    showSearch
                                    optionFilterProp="label"
                                    options={tankers.map((v) => ({ value: v.id, label: v.license_plate }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={6}>
                            <Form.Item
                                name="tractor_id"
                                label={`${t('catalogs.type_tractor')}`}
                                rules={[{ required: true, message: t('common.required') }]}
                            >
                                <Select
                                    showSearch
                                    optionFilterProp="label"
                                    options={tractors.map((v) => ({ value: v.id, label: v.license_plate }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="notes" label={t('order.notes')}>
                                <Input.TextArea rows={1} maxLength={2000} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left">{t('order.attachments')}</Divider>

                    <Form.Item name="files" valuePropName="fileList">
                        <Dragger beforeUpload={() => false} multiple maxCount={5}>
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">{t('order.attachments')}</p>
                            <p className="ant-upload-hint">{t('order.attach_hint')}</p>
                        </Dragger>
                    </Form.Item>

                    <Divider />

                    <Row justify="space-between" align="middle">
                        <Col>
                            <Space>
                                <Text strong>{t('order.total_gallons')}: </Text>
                                <Text>{totals.gallons.toFixed(2)}</Text>
                                <Text strong style={{ marginLeft: 16 }}>
                                    {t('order.total_sale')}:{' '}
                                </Text>
                                <Text>
                                    {totals.sale.toLocaleString('es-ES', {
                                        style: 'currency',
                                        currency: 'USD',
                                        minimumFractionDigits: 2,
                                    })}
                                </Text>
                            </Space>
                        </Col>
                        <Col>
                            <Space>
                                <Button onClick={() => form.resetFields()}>{t('common.reset')}</Button>
                                <SubmitButton>{t('order.public_form_submit')}</SubmitButton>
                            </Space>
                        </Col>
                    </Row>
                </Form>
            </Card>
        </div>
    );
}