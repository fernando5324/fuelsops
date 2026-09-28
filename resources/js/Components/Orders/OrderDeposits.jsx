import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { App, AutoComplete, Button, Col, DatePicker, Form, Input, Modal, Row, Space, Table, Tooltip, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import SectionCard from '@/Components/SectionCard';
import SubmitButton from '@/Components/SubmitButton';
import Orders from '@/Services/Orders';
import useTranslations from '@/hooks/useTranslations';
import formatDate from '@/lib/dates';
import formatMoney from '@/lib/money';

const BANKS = [
    'BCP',
    'BBVA',
    'Interbank',
    'Scotiabank',
    'Bancoficial',
    'Bancesud',
    'Citibank',
    'Credibank',
    'Mibanco',
    'Banco de la Nación',
    'Caja Arequipa',
    'Caja Piura',
    'Cajamars',
    'Other',
];

export default function OrderDeposits({ order, supplierPayables, readOnly = false }) {
    const { modal } = App.useApp();
    const { t } = useTranslations();
    const [form] = Form.useForm();
    const [open, setOpen] = useState(false);

    const deposits = order?.deposits || [];
    // Se suma en unidades de 0.0001 (enteros) para que la suma de los montos
    // mostrados sea exactamente el total que se ve: con float, 4 decimales
    // acumulan error y el total dejaría de cuadrar con las filas.
    const total = deposits.reduce((acc, d) => acc + Math.round(Number(d.amount || 0) * 10000), 0) / 10000;

    // Cuenta por pagar a los mayoristas: llega calculada por el backend
    // (OrderService::supplierPayables, ADR-013) y es dato DERIVADO, por eso no
    // tiene alta ni edición ni columna de acciones, ni siquiera en la papelera.
    const payables = supplierPayables?.items || [];
    const payableTotal = supplierPayables?.total ?? null;
    const linesWithoutPrice = supplierPayables?.lines_without_price || 0;

    const onFinish = (values) => {
        router.post(
            Orders.routes.storeDeposit(order.id),
            { ...values, deposit_date: values.deposit_date.format('YYYY-MM-DD') },
            { preserveScroll: true, onSuccess: () => setOpen(false) },
        );
    };

    const confirmDelete = (row) => {
        modal.confirm({
            title: t('order.deposit_delete_title'),
            content: (
                <Space direction="vertical" size={2}>
                    <span>
                        {`${t('order.bank')}: ${row.bank} — ${t('order.operation_number')}: ${row.operation_number} (${formatMoney(row.amount, { digits: 4 })})`}
                    </span>
                    <span>{t('order.deposit_delete_warning')}</span>
                </Space>
            ),
            okText: t('common.delete'),
            okType: 'danger',
            cancelText: t('common.cancel'),
            onOk: () => {
                router.delete(Orders.routes.destroyDeposit(order.id, row.id), { preserveScroll: true });
            },
        });
    };

    const columns = [
        {
            title: t('order.deposit_date'),
            dataIndex: 'deposit_date',
            width: 130,
            render: (v) => formatDate(v),
        },
        { title: t('order.bank'), dataIndex: 'bank', render: (v) => v || '-' },
        { title: t('order.operation_number'), dataIndex: 'operation_number', render: (v) => v || '-' },
        {
            title: t('order.amount'),
            dataIndex: 'amount',
            width: 160,
            align: 'right',
            // 4 decimales: es la precisión con la que se capturó y se guarda
            // (DECIMAL(12,4)); con 2 decimales el monto visible no cuadraría
            // con el total de la tabla.
            render: (v) => <span style={{ fontWeight: 600 }}>{formatMoney(v, { digits: 4 })}</span>,
        },
        {
            title: t('order.registered_by'),
            width: 160,
            render: (_, r) => r.created_by?.name || '-',
        },
        ...(readOnly
            ? []
            : [
                  {
                      title: t('common.actions'),
                      width: 70,
                      align: 'center',
                      render: (_, r) => (
                          <Tooltip title={t('order.delete_deposit')}>
                              <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  aria-label={t('order.delete_deposit')}
                                  onClick={() => confirmDelete(r)}
                              />
                          </Tooltip>
                      ),
                  },
              ]),
    ];

    const supplierColumns = [
        {
            title: t('order.wholesaler'),
            dataIndex: 'wholesaler_name',
            render: (v) => v || '-',
        },
        {
            title: t('order.amount'),
            dataIndex: 'amount',
            width: 150,
            align: 'right',
            render: (v) => <span style={{ fontWeight: 600 }}>{formatMoney(v, { digits: 2 })}</span>,
        },
    ];

    return (
        <SectionCard
            title={t('order.deposits')}
            extra={
                readOnly ? null : (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setOpen(true)}
                        style={{ width: 'min(100%, 200px)' }}
                    >
                        {t('order.deposits_add')}
                    </Button>
                )
            }
        >
            <Row gutter={[16, 16]}>
                <Col xs={24} md={readOnly ? 24 : 15}>
                    <div className="ui-order-deposit-block">
                        <Typography.Text strong>{t('order.customer_deposits')}</Typography.Text>
                        {readOnly ? (
                            <Typography.Paragraph type="secondary" className="ui-deposits-readonly">
                                {t('order.deposits_read_only')}
                            </Typography.Paragraph>
                        ) : null}
                        <Table
                            rowKey="id"
                            dataSource={deposits}
                            columns={columns}
                            pagination={false}
                            size="small"
                            scroll={{ x: 'max-content' }}
                            locale={{ emptyText: t('order.no_deposits') }}
                            summary={
                                deposits.length
                                    ? () => (
                                          <Table.Summary.Row>
                                              <Table.Summary.Cell index={0} colSpan={3} align="right">
                                                  <Typography.Text strong>
                                                      {t('order.deposits_total')}
                                              </Typography.Text>
                                          </Table.Summary.Cell>
                                              <Table.Summary.Cell index={1} align="right">
                                                  <Typography.Text strong className="ui-summary-value--money">
                                                      {formatMoney(total, { digits: 4 })}
                                                  </Typography.Text>
                                              </Table.Summary.Cell>
                                              <Table.Summary.Cell index={2} colSpan={readOnly ? 2 : 3} />
                                          </Table.Summary.Row>
                                      )
                                    : null
                            }
                        />
                    </div>
                </Col>
                <Col xs={24} md={readOnly ? 24 : 9}>
                    <div className="ui-order-deposit-block">
                        <Space size={4} style={{ marginBottom: 8 }}>
                            <Typography.Text strong>{t('order.supplier_deposits')}</Typography.Text>
                            <Tooltip title={t('order.supplier_payable_hint')}>
                                <QuestionCircleOutlined style={{ color: '#94A3B8' }} aria-label={t('order.supplier_payable_hint')} />
                            </Tooltip>
                        </Space>
                        <Table
                            rowKey="wholesaler_id"
                            size="small"
                            columns={supplierColumns}
                            dataSource={payables}
                            pagination={false}
                            scroll={{ x: 'max-content' }}
                            locale={{ emptyText: t('order.supplier_none') }}
                            summary={
                                // El total que se muestra es el que devuelve el
                                // backend (mismo acumulador que total_purchase), no
                                // la suma de las filas: así cuadra exacto con el
                                // cuadro "Compra" aun con redondeos intermedios.
                                payableTotal !== null
                                    ? () => (
                                          <Table.Summary.Row>
                                              <Table.Summary.Cell index={0} align="right">
                                                  <Typography.Text strong>{t('order.supplier_total')}</Typography.Text>
                                              </Table.Summary.Cell>
                                              <Table.Summary.Cell index={1} align="right">
                                                  <Typography.Text strong className="ui-summary-value--money">
                                                      {formatMoney(payableTotal, { digits: 2 })}
                                                  </Typography.Text>
                                              </Table.Summary.Cell>
                                          </Table.Summary.Row>
                                      )
                                    : null
                            }
                        />
                        {linesWithoutPrice > 0 ? (
                            <p className="ui-empty-note">
                                {t('order.supplier_no_price_lines', { count: linesWithoutPrice })}
                            </p>
                        ) : null}
                    </div>
                </Col>
            </Row>

            <Modal
                open={open && !readOnly}
                title={t('order.deposits_add_title')}
                onCancel={() => setOpen(false)}
                destroyOnHidden
                footer={[
                    <Button key="cancel" onClick={() => setOpen(false)}>
                        {t('common.cancel')}
                    </Button>,
                    <SubmitButton key="save" onClick={() => form.submit()}>
                        {t('common.save')}
                    </SubmitButton>,
                ]}
            >
                <p className="ui-deposits-hint">{t('order.deposits_hint')}</p>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ bank: 'BCP' }}
                    afterOpenChange={(opened) => {
                        if (opened) form.resetFields();
                    }}
                >
                    <Form.Item
                        name="deposit_date"
                        label={t('order.deposit_date')}
                        rules={[{ required: true, message: t('order.deposit_date_required') }]}
                    >
                        <DatePicker
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                            placeholder={t('order.deposit_date')}
                            disabledDate={(d) => d && d.isAfter(new Date(), 'day')}
                        />
                    </Form.Item>
                    <Form.Item
                        name="bank"
                        label={t('order.bank')}
                        rules={[{ required: true, message: t('order.bank') }]}
                    >
                        <AutoComplete
                            options={BANKS.map((b) => ({ value: b }))}
                            placeholder={t('order.bank')}
                            filterOption={(input, option) =>
                                String(option?.value || '')
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>
                    <Form.Item
                        name="operation_number"
                        label={t('order.operation_number')}
                        rules={[{ required: true, message: t('order.operation_number') }]}
                    >
                        <Input placeholder={t('order.operation_number')} maxLength={50} />
                    </Form.Item>
                    <Form.Item
                        name="amount"
                        label={t('order.amount')}
                        rules={[
                            { required: true, message: t('order.deposit_amount_invalid') },
                            {
                                validator: (_, value) =>
                                    /^\d{1,10}(\.\d{1,4})?$/.test(String(value ?? '')) &&
                                    Number(value) > 0
                                        ? Promise.resolve()
                                        : Promise.reject(new Error(t('order.deposit_amount_invalid'))),
                            },
                        ]}
                    >
                        <Input
                            placeholder="0.00"
                            inputMode="decimal"
                            prefix="S/"
                            maxLength={15}
                            onChange={(e) => {
                                const cleaned = e.target.value.replace(/[^\d.]/g, '');
                                form.setFieldsValue({ amount: cleaned });
                            }}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </SectionCard>
    );
}
