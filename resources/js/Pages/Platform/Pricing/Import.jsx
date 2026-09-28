import React, { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    Alert,
    App,
    Button,
    Card,
    Checkbox,
    Col,
    Form,
    Row,
    Space,
    Table,
    Tag,
    Typography,
    Upload,
} from 'antd';
import { CloudUploadOutlined, FileExcelOutlined, InboxOutlined } from '@ant-design/icons';
import PanelLayout from '../../../Layouts/PanelLayout';
import PageHeader from '@/Components/PageHeader';
import SubmitButton from '@/Components/SubmitButton';
import { useProcessing } from '@/hooks/useProcessing';
import PriceImports from '@/Services/PriceImports';
import useTranslations from '@/hooks/useTranslations';
import formatMoney from '@/lib/money';

const { Dragger } = Upload;
const { Text, Title } = Typography;

const statusMeta = {
    new: { color: 'blue', key: 'status_new' },
    updated: { color: 'gold', key: 'status_updated' },
    unchanged: { color: 'default', key: 'status_unchanged' },
    error: { color: 'red', key: 'status_error' },
};

const batchStatusMeta = {
    pending: { color: 'blue', key: 'batch_pending' },
    cancelled: { color: 'default', key: 'batch_cancelled' },
    completed: { color: 'green', key: 'batch_completed' },
};

function catalogGroups(batch) {
    return [
        { key: 'plants', titleKey: 'pricing.plants', items: batch?.new_catalogs?.plants || [] },
        { key: 'products', titleKey: 'pricing.products', items: batch?.new_catalogs?.products || [] },
        { key: 'wholesalers', titleKey: 'pricing.wholesalers', items: batch?.new_catalogs?.wholesalers || [] },
    ];
}

export default function PricingImport({ batch, recentBatches }) {
    const { message, modal } = App.useApp();
    const { flash, errors } = usePage().props;
    const { t } = useTranslations();
    const { processing } = useProcessing();

    const [file, setFile] = useState(null);

    useEffect(() => {
        if (flash?.success) {
            message.success(flash.success);
        }
        if (flash?.error) {
            message.error(flash.error);
        }
    }, [flash, message]);

    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            message.error(Object.values(errors)[0]);
        }
    }, [errors, message]);

    const draggerProps = {
        accept: '.xlsx,.xls',
        maxCount: 1,
        beforeUpload: () => false,
        onRemove: () => setFile(null),
        onChange: (info) => {
            const next = info.fileList && info.fileList.length > 0 ? [info.fileList[info.fileList.length - 1]] : [];
            setFile(next);
        },
    };

    const onUpload = () => {
        if (!file || processing) return;
        router.post(PriceImports.routes.upload, { file: file[0].originFileObj || file[0] }, { forceFormData: true });
    };

    const onConfirm = (values) => {
        router.post(
            PriceImports.routes.confirm(batch.id),
            {
                plants: values.plants || [],
                products: values.products || [],
                wholesalers: values.wholesalers || [],
            },
            { preserveScroll: true },
        );
    };

    const onCancel = () => {
        modal.confirm({
            title: t('pricing.cancel_button'),
            content: t('common.confirm_delete'),
            okText: t('common.cancel'),
            cancelText: t('common.back'),
            okButtonProps: { danger: true },
            onOk: () => router.post(PriceImports.routes.cancel(batch.id), {}, { preserveScroll: true }),
        });
    };

    const itemColumns = [
        { title: t('pricing.col_row'), dataIndex: 'row_number', width: 70 },
        { title: t('pricing.col_plant'), dataIndex: 'plant_name' },
        { title: t('pricing.col_product'), dataIndex: 'product_name' },
        { title: t('pricing.col_wholesaler'), dataIndex: 'wholesaler_name' },
        {
            title: t('pricing.col_previous'),
            dataIndex: 'previous_price',
            width: 130,
            align: 'right',
            render: (v) => (v === null || v === undefined ? '—' : formatMoney(v, { digits: 4 })),
        },
        {
            title: t('pricing.col_new'),
            dataIndex: 'new_price',
            width: 130,
            align: 'right',
            render: (v) => (v === null || v === undefined ? '—' : formatMoney(v, { digits: 4 })),
        },
        {
            title: t('pricing.margin_col_import'),
            dataIndex: 'margin',
            width: 120,
            align: 'right',
            render: (v) => (v === null || v === undefined ? '—' : formatMoney(v, { digits: 4 })),
        },
        {
            title: t('pricing.col_status'),
            dataIndex: 'status',
            width: 130,
            render: (s) => {
                const meta = statusMeta[s] || { color: 'default', key: s };
                return <Tag color={meta.color}>{t(`pricing.${meta.key}`)}</Tag>;
            },
        },
        {
            title: t('pricing.col_error'),
            dataIndex: 'error_message',
            render: (e) => (e ? <Text type="danger">{t(`pricing.errors.${e}`)}</Text> : null),
        },
    ];
    const calcColumns = [
        { title: t('pricing.col_row'), dataIndex: 'row_number', width: 70 },
        { title: t('pricing.col_plant'), dataIndex: 'plant' },
        { title: t('pricing.col_product'), dataIndex: 'product' },
        {
            title: t('pricing.margin_col_import'),
            dataIndex: 'margin',
            width: 120,
            align: 'right',
            render: (v) => (v === null || v === undefined ? t('pricing.calc_na') : formatMoney(v, { digits: 4 })),
        },
        {
            title: t('pricing.col_excel_final'),
            dataIndex: 'excel_final',
            align: 'right',
            render: (v) => (v === null ? t('pricing.calc_na') : formatMoney(v, { digits: 4 })),
        },
        {
            title: t('pricing.col_system_final'),
            dataIndex: 'system_final',
            align: 'right',
            render: (v) => (v === null ? t('pricing.calc_na') : formatMoney(v, { digits: 4 })),
        },
        {
            title: t('pricing.col_status'),
            dataIndex: 'match',
            width: 130,
            render: (m) =>
                m === null ? (
                    <Tag>{t('pricing.calc_na')}</Tag>
                ) : m ? (
                    <Tag color="green">{t('pricing.calc_match')}</Tag>
                ) : (
                    <Tag color="orange">{t('pricing.calc_diff')}</Tag>
                ),
        },
    ];

    return (
        <PanelLayout>
            <PageHeader title={t('pricing.title')} description={t('pricing.subtitle')} />

            {batch ? (
                <>
                    <Card
                        title={
                            <Space>
                                <FileExcelOutlined />
                                <span>{batch.file_name}</span>
                            </Space>
                        }
                        extra={<Tag color={batchStatusMeta[batch.status]?.color}>{t(`pricing.${batchStatusMeta[batch.status]?.key}`)}</Tag>}
                    >
                        <Row gutter={[16, 16]} className="ui-list-section">
                            {[
                                { key: 'total', value: batch.summary.total },
                                { key: 'new', value: batch.summary.new, color: 'blue' },
                                { key: 'updated', value: batch.summary.updated, color: 'gold' },
                                { key: 'unchanged', value: batch.summary.unchanged },
                                { key: 'error', value: batch.summary.error, color: 'red' },
                            ].map((s) => (
                                <Col key={s.key} xs={12} sm={8} md={4}>
                                    <Card size="small">
                                        <Text type="secondary">{t(`pricing.${s.key}_rows`)}</Text>
                                        <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                        <Text type="secondary">
                            {t('pricing.uploaded_at')}: {batch.created_at}
                        </Text>
                    </Card>

                    <Card title={<Title level={5} style={{ margin: 0 }}>{t('pricing.new_catalogs_title')}</Title>}>
                        {catalogGroups(batch).some((g) => g.items.length > 0) ? (
                            <Form
                                onFinish={onConfirm}
                                layout="vertical"
                                autoComplete="off"
                                initialValues={{
                                    plants: batch.new_catalogs.plants,
                                    products: batch.new_catalogs.products,
                                    wholesalers: batch.new_catalogs.wholesalers,
                                }}
                            >
                                <Alert type="info" showIcon message={t('pricing.new_catalogs_hint')} style={{ marginBottom: 16 }} />
                                <Row gutter={[24, 8]}>
                                    {catalogGroups(batch)
                                        .filter((g) => g.items.length > 0)
                                        .map((g) => (
                                            <Col key={g.key} xs={24} sm={8}>
                                                <Text strong>{t(g.titleKey)}</Text>
                                                <Form.Item name={g.key} style={{ marginTop: 8, marginBottom: 0 }}>
                                                    <Checkbox.Group options={g.items.map((name) => ({ label: name, value: name }))} />
                                                </Form.Item>
                                            </Col>
                                        ))}
                                </Row>
                                <Space style={{ marginTop: 24 }}>
                                    <SubmitButton type="primary" className="ui-accent-btn" loadingText={t('pricing.confirming')}>
                                        {t('pricing.confirm_button')}
                                    </SubmitButton>
                                    <Button danger onClick={onCancel}>
                                        {t('pricing.cancel_button')}
                                    </Button>
                                </Space>
                            </Form>
                        ) : (
                            <>
                                <Alert type="success" showIcon message={t('pricing.no_new_catalogs')} style={{ marginBottom: 16 }} />
                                <Space style={{ marginTop: 8 }}>
                                    <SubmitButton
                                        type="primary"
                                        className="ui-accent-btn"
                                        loadingText={t('pricing.confirming')}
                                        onClick={() => router.post(PriceImports.routes.confirm(batch.id), {}, { preserveScroll: true })}
                                    >
                                        {t('pricing.confirm_button')}
                                    </SubmitButton>
                                    <Button danger onClick={onCancel}>
                                        {t('pricing.cancel_button')}
                                    </Button>
                                </Space>
                            </>
                        )}
                    </Card>

                    <Card title={<Title level={5} style={{ margin: 0 }}>{t('pricing.calc_title')}</Title>}>
                        {batch.calc.active ? (
                            <>
                                <Text type="secondary">{t('pricing.calc_active')}</Text>
                                {batch.calc.mismatches > 0 ? (
                                    <Alert
                                        type="warning"
                                        showIcon
                                        message={t('pricing.calc_mismatches', { count: batch.calc.mismatches })}
                                        style={{ margin: '12px 0' }}
                                    />
                                ) : null}
                                {batch.calc.rows.length > 0 ? (
                                    <Table
                                        rowKey="row_number"
                                        size="small"
                                        columns={calcColumns}
                                        dataSource={batch.calc.rows}
                                        pagination={false}
                                        scroll={{ x: 'max-content' }}
                                    />
                                ) : null}
                            </>
                        ) : (
                            <Text type="secondary">{t('pricing.calc_inactive')}</Text>
                        )}
                    </Card>

                    <Card
                        title={<Title level={5} style={{ margin: 0 }}>{t('pricing.items_title')}</Title>}
                        extra={<Text type="secondary">{t('pricing.total_rows')}: {batch.items.length}</Text>}
                    >
                        <Table
                            rowKey="id"
                            size="small"
                            columns={itemColumns}
                            dataSource={batch.items}
                            pagination={{ pageSize: 10, hideOnSinglePage: true }}
                            scroll={{ x: 'max-content' }}
                        />
                    </Card>
                </>
            ) : (
                <>
                    <Card title={<Title level={5} style={{ margin: 0 }}>{t('pricing.upload_title')}</Title>}>
                        <Dragger {...draggerProps}>
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">{t('pricing.upload_hint')}</p>
                        </Dragger>
                        <Space style={{ marginTop: 16 }}>
                            <Button
                                type="primary"
                                icon={<CloudUploadOutlined />}
                                loading={processing}
                                disabled={!file || processing}
                                onClick={onUpload}
                            >
                                {processing ? t('pricing.uploading') : t('pricing.upload_button')}
                            </Button>
                        </Space>
                    </Card>

                    <Card title={<Title level={5} style={{ margin: 0 }}>{t('pricing.recent_title')}</Title>}>
                        {recentBatches.length === 0 ? (
                            <Text type="secondary">{t('pricing.empty_batches')}</Text>
                        ) : (
                            <Table
                                rowKey="id"
                                size="small"
                                pagination={false}
                                scroll={{ x: 'max-content' }}
                                dataSource={recentBatches}
                                columns={[
                                    { title: '#', dataIndex: 'id', width: 60 },
                                    { title: t('pricing.file'), dataIndex: 'file_name' },
                                    {
                                        title: t('pricing.batch_status'),
                                        dataIndex: 'status',
                                        width: 130,
                                        render: (s) => <Tag color={batchStatusMeta[s]?.color}>{t(`pricing.${batchStatusMeta[s]?.key}`)}</Tag>,
                                    },
                                    { title: t('pricing.total_rows'), dataIndex: 'total_rows', width: 90, align: 'right' },
                                    { title: t('pricing.new_rows'), dataIndex: 'new_rows', width: 90, align: 'right' },
                                    { title: t('pricing.updated_rows'), dataIndex: 'updated_rows', width: 110, align: 'right' },
                                    { title: t('pricing.unchanged_rows'), dataIndex: 'unchanged_rows', width: 110, align: 'right' },
                                    { title: t('pricing.error_rows'), dataIndex: 'error_rows', width: 90, align: 'right' },
                                    { title: t('pricing.uploaded_at'), dataIndex: 'created_at', width: 150 },
                                ]}
                            />
                        )}
                    </Card>
                </>
            )}
        </PanelLayout>
    );
}