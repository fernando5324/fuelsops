import React, { useEffect, useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    App,
    Alert,
    Button,
    Drawer,
    Dropdown,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import {
    EditOutlined,
    HistoryOutlined,
    PlusOutlined,
    FileExcelOutlined,
    SearchOutlined,
    ExportOutlined,
    CalculatorOutlined,
    UnorderedListOutlined,
    DeleteOutlined,
    MoreOutlined,
} from '@ant-design/icons';
import PanelLayout from '../../../Layouts/PanelLayout';
import PageHeader from '@/Components/PageHeader';
import SubmitButton from '@/Components/SubmitButton';
import CalculationBreakdown from '@/Components/Pricing/CalculationBreakdown';
import PricesAdmin from '@/Services/PricesAdmin';
import useTranslations from '@/hooks/useTranslations';
import formatMoney from '@/lib/money';
import formatDate from '@/lib/dates';

const { Text, Title } = Typography;

/**
 * Calcula el rowSpan de la columna de planta para cada fila de la página.
 * Las filas llegan ordenadas por plant_id (PriceController::index), por lo que
 * los productos de una misma planta son contiguos: la primera fila del bloque
 * fusiona su celda sobre las N siguientes (rowSpan), el resto queda oculto.
 * Las claves son índices de la posición en rows.data (se usa la fila anterior
 * como marker para que con datos incompletos/missing no colisionen).
 */
const computePlantSpans = (rows) => {
    const spans = {};
    const list = rows || [];
    for (let i = 0; i < list.length; i++) {
        if (spans[i] !== undefined) continue;
        const plantId = list[i].plant_id;
        let count = 1;
        while (i + count < list.length && list[i + count].plant_id === plantId) {
            count++;
        }
        for (let j = i; j < i + count; j++) spans[j] = j === i ? count : 0;
    }
    return spans;
};

/**
 * Panel de administración de precios (ADR-010, Fases 8+).
 *
 * Matriz planta+producto con precios por mayorista, el ganador del motor
 * resaltado y el precio final de cada fila. Cada fila permite editar los
 * precios en un modal con preview en vivo del motor (debounced, sin recargar
 * la página), consultar el cálculo completo con su fórmula (ADR-012), ver el
 * historial en un drawer y activar o desactivar la relación.
 */
export default function PricingIndex({ rows, wholesalers, plants, products, config, filter }) {
    const { message, modal } = App.useApp();
    const { flash, errors, auth } = usePage().props;
    const { t } = useTranslations();

    // Eliminar una relación es una baja lógica que conserva precios e
    // historial: se restringe al dueño, igual que la papelera de pedidos
    // (ADR-011). El backend responde 403 igual (PriceApiController).
    const isOwner = Boolean(auth?.user?.is_owner);

    const [form] = Form.useForm();
    const [relationForm] = Form.useForm();

    const [editRow, setEditRow] = useState(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyRow, setHistoryRow] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [relationOpen, setRelationOpen] = useState(false);
    const [calcRow, setCalcRow] = useState(null);
    const [calcsOpen, setCalcsOpen] = useState(false);

    const [q, setQ] = useState(filter?.q || '');
    const [preview, setPreview] = useState(null);
    const [previewState, setPreviewState] = useState('idle');
    const previewTimer = useRef(null);
    const initialPrices = useRef([]);
    const plantSpans = computePlantSpans(rows?.data);
    const calcsRows = (rows?.data || []).filter((row) => row.calc);

    const wholesalerOptions = wholesalers || [];
    const plantOptions = (plants || []).map((o) => ({ ...o, value: String(o.value) }));
    const productOptions = (products || []).map((o) => ({ ...o, value: String(o.value) }));

    const applied = {};
    ['plant_id', 'product_id', 'active'].forEach((key) => {
        const v = filter?.[key];
        if (v !== undefined && v !== null && v !== '') {
            applied[key] = String(v);
        }
    });

    /**
     * El margen S/ es obligatorio y no puede ser negativo (0 sí vale: una
     * relación sin margen es válida, S = Q). El backend acepta hasta 4
     * decimales; con stringMode llega como string.
     */
    const validateMargin = (_, value) => {
        if (value === null || value === undefined || value === '') {
            return Promise.reject(new Error(t('common.required')));
        }

        const number = Number(value);

        if (!Number.isFinite(number) || number < 0) {
            return Promise.reject(new Error(t('pricing.invalid_margin')));
        }

        return Promise.resolve();
    };

    useEffect(() => () => clearTimeout(previewTimer.current), []);
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

    const navigate = (params) => {
        router.get(PricesAdmin.routes.index, params, { preserveState: true, replace: true });
    };

    const onSearchChange = (e) => {
        const value = e.target.value ?? '';
        setQ(value);
        clearTimeout(previewTimer.current);
        previewTimer.current = setTimeout(() => {
            navigate({ q: value.trim() || undefined, ...applied });
        }, 350);
    };

    const onFilterChange = (key, value) => {
        const next = { ...applied };
        if (value === undefined || value === '') {
            delete next[key];
        } else {
            next[key] = String(value);
        }
        navigate({ q: q.trim() || undefined, ...next });
    };

    const runPreview = (rawPrices, margin) => {
        if (!editRow) return;
        setPreviewState('loading');
        clearTimeout(previewTimer.current);
        previewTimer.current = setTimeout(async () => {
            try {
                const { data } = await PricesAdmin.preview({
                    plant_product_id: editRow.id,
                    prices: rawPrices,
                    margin: margin ?? null,
                });
                if (data?.ok) {
                    setPreview(data.result);
                    setPreviewState('ok');
                } else {
                    setPreview(null);
                    setPreviewState('empty');
                }
            } catch {
                setPreview(null);
                setPreviewState('error');
            }
        }, 400);
    };

    const openEdit = (row) => {
        setEditRow(row);
        setPreview(null);
        setPreviewState('idle');
        initialPrices.current = wholesalerOptions.map((w) => ({
            wholesaler_id: w.value,
            price: row.prices?.[w.value] ?? null,
        }));
    };

    const onEditOpenChange = (opened) => {
        if (!opened || !editRow) return;
        form.setFieldsValue({
            prices: initialPrices.current,
            // El margen se inyecta como STRING decimal ("0.1300"), no como number:
            // el preview es un POST JSON con la regla `string`, así que un
            // Number() aquí lo convertía en 422 y el recuadro caía en
            // `preview_error` ("No se pudo calcular el precio.") al abrir el modal.
            // `InputNumber` con stringMode muestra el string igual y a partir de
            // aquí todo lo que sale del Form es string.
            margin: editRow.margin ?? config?.default_margin,
        });
        setTimeout(() => onPricesChange(), 0);
    };

    const onPricesChange = () => {
        const current = form.getFieldValue('prices');
        if (!current || !editRow) return;
        runPreview(
            current.map((item) => ({
                wholesaler_id: item?.wholesaler_id,
                price: item?.price ?? null,
            })),
            form.getFieldValue('margin'),
        );
    };

    const savePrices = () => {
        const current = form.getFieldValue('prices');
        if (!current || !editRow) return;
        router.post(
            PricesAdmin.routes.pricesStore,
            {
                plant_product_id: editRow.id,
                prices: current.map((item) => ({
                    wholesaler_id: item?.wholesaler_id,
                    price: item?.price ?? null,
                })),
                margin: form.getFieldValue('margin') ?? null,
            },
            { preserveScroll: true, onSuccess: () => setEditRow(null) },
        );
    };

    const openHistory = (row) => {
        setHistoryRow(row);
        setHistoryOpen(true);
        setHistory([]);
        setHistoryLoading(true);
        PricesAdmin.history(row.id)
            .then(({ data }) => setHistory(data.history || []))
            .catch(() => message.error(t('pricing.preview_error')))
            .finally(() => setHistoryLoading(false));
    };

    const toggleActive = (row, checked) => {
        if (checked) {
            router.put(PricesAdmin.routes.relationsUpdate(row.id), { is_active: true }, { preserveScroll: true });
            return;
        }
        modal.confirm({
            title: t('pricing.deactivate_confirm'),
            content: `${row.plant_name} / ${row.product_name}`,
            okText: t('pricing.deactivate'),
            okType: 'danger',
            cancelText: t('common.cancel'),
            onOk: () => router.put(PricesAdmin.routes.relationsUpdate(row.id), { is_active: false }, { preserveScroll: true }),
        });
    };

    /**
     * Da de baja la relación planta+producto (baja lógica en el backend: la
     * fila desaparece de la matriz pero conserva precios e historial). La
     * confirmación avisa explícitamente de que no se borra nada, para que
     * nadie la tome por un borrado destructivo.
     */
    const confirmDeleteRelation = (row) => {
        modal.confirm({
            title: t('pricing.delete_relation_confirm'),
            content: (
                <div>
                    <div>
                        <Text strong>
                            {row.plant_name} / {row.product_name}
                        </Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('pricing.delete_relation_warning')}
                    </Text>
                </div>
            ),
            okText: t('pricing.delete_relation'),
            okType: 'danger',
            cancelText: t('common.cancel'),
            onOk: () => router.delete(PricesAdmin.routes.relationsDestroy(row.id), { preserveScroll: true }),
        });
    };

    const onRelationFinish = (values) => {
        router.post(PricesAdmin.routes.relationsStore, values, {
            preserveScroll: true,
            onSuccess: () => setRelationOpen(false),
        });
    };

    /**
     * Acciones de la fila como menú desplegable. La columna de acciones crece
     * con el módulo (5 controles ya no cabían en una columna estrecha), así que
     * van agrupados bajo un botón "más": agregar una acción futura es un ítem
     * más del array, sin tocar el ancho de la columna. El Switch activar/
     * desactivar NO entra en el menú: es un control de estado, se lee de un
     * vistazo y la columna Estado ya muestra la situación.
     */
    const actionMenuItems = (row) => {
        const items = [
            { key: 'edit', icon: <EditOutlined />, label: t('pricing.edit_prices') },
            {
                key: 'calc',
                icon: <CalculatorOutlined />,
                label: row.calc ? (
                    t('pricing.show_calc')
                ) : (
                    // En un menú no cabe la explicación larga: se deja la pista
                    // corta, porque el Tooltip no funciona en ítems deshabilitados.
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{t('pricing.show_calc')}</span>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('pricing.no_calc_short')}
                        </Text>
                    </span>
                ),
                disabled: !row.calc,
            },
            { key: 'history', icon: <HistoryOutlined />, label: t('pricing.history') },
        ];

        if (isOwner) {
            items.push({ type: 'divider' });
            items.push({ key: 'delete', icon: <DeleteOutlined />, label: t('pricing.delete_relation'), danger: true });
        }

        return items;
    };

    const onActionClick = (row, key) => {
        if (key === 'edit') {
            openEdit(row);
            return;
        }
        if (key === 'calc') {
            setCalcRow(row);
            return;
        }
        if (key === 'history') {
            openHistory(row);
            return;
        }
        if (key === 'delete') {
            confirmDeleteRelation(row);
        }
    };

    const wholesalerColumns = wholesalerOptions.map((w) => ({
        title: (
            <Tooltip title={w.label}>
                <span>{w.label}</span>
            </Tooltip>
        ),
        key: `wholesaler-${w.value}`,
        width: 150,
        align: 'right',
        render: (_, row) => {
            const value = row.prices?.[w.value];
            if (value === null || value === undefined) {
                return <Text type="secondary">—</Text>;
            }
            const isBest = row.calc?.winner_wholesaler_id === w.value;
            return (
                <Tooltip title={isBest ? t('pricing.best_price') : null}>
                    <span style={isBest ? { fontWeight: 700, color: '#10B981' } : undefined}>
                        {formatMoney(value, { digits: 4 })}
                    </span>
                </Tooltip>
            );
        },
    }));

    const columns = [
        {
            title: t('pricing.col_plant'),
            dataIndex: 'plant_name',
            fixed: 'left',
            minWidth: 150,
            onCell: (_, index) => {
                const span = plantSpans[index] ?? 1;
                return span === 0 ? { rowSpan: 0 } : { rowSpan: span, style: { verticalAlign: 'middle' } };
            },
        },
        { title: t('pricing.col_product'), dataIndex: 'product_name', fixed: 'left', minWidth: 160 },
        {
            title: (
                <Tooltip title={t('pricing.margin_hint')}>
                    <span>{t('pricing.margin_col')}</span>
                </Tooltip>
            ),
            dataIndex: 'margin',
            width: 120,
            align: 'right',
            render: (v) =>
                v === null || v === undefined ? (
                    <Text type="secondary">—</Text>
                ) : (
                    <Text strong>{formatMoney(v, { digits: 4 })}</Text>
                ),
        },
        ...wholesalerColumns,
        {
            title: t('pricing.col_final'),
            key: 'final',
            width: 190,
            align: 'right',
            render: (_, row) => {
                const calc = row.calc;
                if (!calc) {
                    return <Text type="secondary">—</Text>;
                }
                const winner = wholesalerOptions.find((w) => w.value === calc.winner_wholesaler_id)?.label;
                return (
                    <div>
                        <div style={{ fontWeight: 700 }}>{formatMoney(calc.final_price, { digits: 4 })}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('pricing.winner')}: {winner ?? calc.winner_wholesaler_id}
                        </Text>
                    </div>
                );
            },
        },
        {
            title: t('common.status'),
            dataIndex: 'is_active',
            width: 100,
            align: 'center',
            render: (v) => (v ? <Tag color="green">{t('common.active')}</Tag> : <Tag>{t('common.inactive')}</Tag>),
        },
        {
            title: t('common.actions'),
            key: 'actions',
            width: 90,
            align: 'center',
            fixed: 'right',
            render: (_, row) => (
                <Space size={4}>
                    <Dropdown
                        trigger={['click']}
                        placement="bottomRight"
                        menu={{
                            items: actionMenuItems(row),
                            onClick: ({ key }) => onActionClick(row, key),
                        }}
                    >
                        <Button type="text" icon={<MoreOutlined />} aria-label={t('pricing.more_actions')} />
                    </Dropdown>
                    <Switch
                        size="small"
                        checked={Boolean(row.is_active)}
                        onChange={(checked) => toggleActive(row, checked)}
                        aria-label={t('common.status')}
                    />
                </Space>
            ),
        },
    ];

    /** Etiqueta del mayorista ganador de un resultado del motor. */
    const winnerName = (calc) => {
        const id = calc?.winner_wholesaler_id ?? calc?.wholesaler_id;
        return wholesalerOptions.find((w) => String(w.value) === String(id))?.label ?? id ?? null;
    };

    const calcsColumns = [
        { title: t('pricing.col_plant'), dataIndex: 'plant_name', width: 150 },
        { title: t('pricing.col_product'), dataIndex: 'product_name', width: 160 },
        {
            title: t('pricing.margin_col'),
            dataIndex: 'margin',
            width: 120,
            align: 'right',
            render: (v) => formatMoney(v, { digits: 4 }),
        },
        {
            title: t('pricing.col_winner'),
            key: 'winner',
            width: 150,
            render: (_, row) => winnerName(row.calc) ?? '-',
        },
        {
            title: t('pricing.col_final'),
            key: 'final',
            width: 140,
            align: 'right',
            render: (_, row) => formatMoney(row.calc?.final_price, { digits: 4 }),
        },
    ];

    const historyColumns = [
        { title: t('pricing.col_calculated_at'), dataIndex: 'calculated_at', width: 180, render: (v) => formatDate(v) },
        {
            title: t('pricing.col_winner'),
            dataIndex: ['source', 'wholesaler_id'],
            width: 180,
            render: (v) => {
                const found = wholesalerOptions.find((w) => w.value === v);
                return found?.label ?? v ?? '—';
            },
        },
        {
            title: t('pricing.best_price'),
            dataIndex: ['inputs', 'best_price'],
            width: 140,
            align: 'right',
            render: (v) => (v === undefined ? '—' : formatMoney(v, { digits: 4 })),
        },
        {
            title: t('pricing.col_final'),
            dataIndex: ['results', 'final_price'],
            width: 140,
            align: 'right',
            render: (v) => (v === undefined ? '—' : formatMoney(v, { digits: 4 })),
        },
        { title: t('common.created_by'), dataIndex: 'created_by', width: 160 },
    ];

    return (
        <PanelLayout>
            <PageHeader
                title={t('pricing.admin_title')}
                description={t('pricing.admin_subtitle')}
                extra={
                    <Space wrap>
                        <Button icon={<UnorderedListOutlined />} onClick={() => setCalcsOpen(true)}>
                            {t('pricing.show_calcs_all')}
                        </Button>
                        <Button
                            icon={<ExportOutlined />}
                            onClick={() => {
                                const params = new URLSearchParams();
                                if (q.trim()) params.set('q', q.trim());
                                Object.entries(applied).forEach(([key, value]) => params.set(key, String(value)));
                                const query = params.toString();
                                window.location.assign(`${PricesAdmin.routes.export}${query ? `?${query}` : ''}`);
                            }}
                        >
                            {t('pricing.export_excel')}
                        </Button>
                        <Link href={PricesAdmin.routes.import}>
                            <Button icon={<FileExcelOutlined />}>{t('pricing.import_excel')}</Button>
                        </Link>
                        <Button type="primary" className="ui-accent-btn" icon={<PlusOutlined />} onClick={() => setRelationOpen(true)}>
                            {t('pricing.new_relation')}
                        </Button>
                    </Space>
                }
            />

            <div className="ui-list-section">
                <Space wrap style={{ marginBottom: 16, width: '100%' }}>
                    <Input
                        allowClear
                        placeholder={t('pricing.search_hint')}
                        value={q}
                        onChange={onSearchChange}
                        prefix={<SearchOutlined />}
                        className="ui-filter-search"
                    />
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder={t('pricing.col_plant')}
                        className="ui-filter-entity"
                        value={applied.plant_id}
                        onChange={(v) => onFilterChange('plant_id', v)}
                        options={plantOptions}
                    />
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder={t('pricing.col_product')}
                        className="ui-filter-entity"
                        value={applied.product_id}
                        onChange={(v) => onFilterChange('product_id', v)}
                        options={productOptions}
                    />
                    <Select
                        allowClear
                        placeholder={t('common.all_statuses')}
                        className="ui-filter-status"
                        value={applied.active}
                        onChange={(v) => onFilterChange('active', v)}
                        options={[
                            { value: '1', label: t('common.active') },
                            { value: '0', label: t('common.inactive') },
                        ]}
                    />
                </Space>

                {!config ? (
                    <Alert type="warning" showIcon message={t('pricing.config_none')} style={{ marginBottom: 16 }} />
                ) : null}

                <Table
                    rowKey="id"
                    dataSource={rows?.data || []}
                    columns={columns}
                    size="middle"
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: t('common.no_data') }}
                    pagination={{
                        current: rows?.current_page || 1,
                        pageSize: rows?.per_page || 15,
                        total: rows?.total || 0,
                        showTotal: (total) => `${total} ${t('common.records_found')}`,
                        onChange: (page) => {
                            router.get(
                                PricesAdmin.routes.index,
                                { ...filter, page },
                                { preserveState: true },
                            );
                        },
                    }}
                />
            </div>

            <Modal
                title={
                    editRow ? (
                        <span>
                            {t('pricing.edit_prices_title')} — {editRow.plant_name} / {editRow.product_name}
                        </span>
                    ) : null
                }
                open={Boolean(editRow)}
                onCancel={() => setEditRow(null)}
                width={560}
                footer={[
                    <Button key="cancel" onClick={() => setEditRow(null)}>
                        {t('common.cancel')}
                    </Button>,
                    <SubmitButton key="save" onClick={() => form.submit()}>
                        {t('pricing.save_prices')}
                    </SubmitButton>,
                ]}
                destroyOnHidden
                mask={{ closable: false }}
                afterOpenChange={onEditOpenChange}
            >
                <Form form={form} layout="vertical" onFinish={savePrices} onValuesChange={onPricesChange}>
                    <Form.Item
                        name="margin"
                        label={t('pricing.margin_field')}
                        extra={t('pricing.margin_hint')}
                        rules={[{ validator: validateMargin }]}
                        style={{ marginBottom: 12 }}
                    >
                        <InputNumber
                            stringMode
                            precision={4}
                            min={0}
                            step={0.01}
                            prefix="S/"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>

                    <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                        {t('pricing.price_empty_hint')}
                    </Text>
                    {wholesalerOptions.map((w, index) => (
                        <Form.Item
                            key={w.value}
                            name={['prices', index, 'price']}
                            label={w.label}
                            style={{ marginBottom: 12 }}
                        >
                            <InputNumber
                                stringMode
                                precision={4}
                                min={0.0001}
                                prefix="S/"
                                placeholder={t('pricing.no_price')}
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                    ))}

                    <Alert type="info" showIcon icon={<HistoryOutlined />} message={t('pricing.preview_title')} style={{ marginTop: 8 }} />
                    <div className="ui-price-preview" style={{ marginTop: 12, minHeight: 110 }}>
                        {previewState === 'idle' || previewState === 'loading' ? (
                            <Text type="secondary">{t('pricing.preview_loading')}</Text>
                        ) : previewState === 'error' ? (
                            <Text type="danger">{t('pricing.preview_error')}</Text>
                        ) : previewState === 'empty' ? (
                            <Text type="secondary">{t('pricing.no_prices_yet')}</Text>
                        ) : preview ? (
                            <CalculationBreakdown
                                calc={preview}
                                wholesalerName={winnerName(preview)}
                                showHeader={false}
                            />
                        ) : null}
                    </div>
                </Form>
            </Modal>

            {/* ADR-012 nivel 1: "Ver cálculo" por fila, con la fórmula de cada paso. */}
            <Modal
                title={
                    calcRow ? (
                        <span>
                            {t('pricing.calc_title')} — {calcRow.plant_name} / {calcRow.product_name}
                        </span>
                    ) : null
                }
                open={Boolean(calcRow)}
                onCancel={() => setCalcRow(null)}
                width={620}
                footer={[
                    <Button key="close" onClick={() => setCalcRow(null)}>
                        {t('common.close')}
                    </Button>,
                ]}
                destroyOnHidden
                mask={{ closable: false }}
            >
                <CalculationBreakdown calc={calcRow?.calc} wholesalerName={winnerName(calcRow?.calc)} />
            </Modal>

            <Drawer
                title={
                    historyRow ? (
                        <span>
                            {t('pricing.history_title')} — {historyRow.plant_name} / {historyRow.product_name}
                        </span>
                    ) : (
                        t('pricing.history_title')
                    )
                }
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                size="min(100%, 760px)"
            >
                {historyLoading ? (
                    <Text type="secondary">{t('common.loading')}</Text>
                ) : history.length === 0 ? (
                    <Text type="secondary">{t('pricing.history_empty')}</Text>
                ) : (
                    <Table
                        rowKey="id"
                        size="small"
                        columns={historyColumns}
                        dataSource={history}
                        pagination={{ pageSize: 10, hideOnSinglePage: true }}
                        scroll={{ x: 'max-content' }}
                        expandable={{
                            expandedRowRender: (item) => (
                                <CalculationBreakdown
                                    calc={{
                                        ...(item.results || {}),
                                        ...(item.inputs || {}),
                                        wholesaler_id: item.source?.wholesaler_id,
                                    }}
                                    wholesalerName={winnerName({
                                        wholesaler_id: item.source?.wholesaler_id,
                                    })}
                                />
                            ),
                        }}
                    />
                )}
            </Drawer>

            {/* ADR-012 nivel 2: "Ver cálculos" de las filas visibles (filtro + página actuales). */}
            <Drawer
                title={t('pricing.calcs_title')}
                open={calcsOpen}
                onClose={() => setCalcsOpen(false)}
                size="min(100%, 860px)"
                extra={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('pricing.calcs_count', {
                            count: calcsRows.length,
                            total: rows?.data?.length || 0,
                        })}
                    </Text>
                }
            >
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    {t('pricing.calcs_hint')}
                </Text>
                {calcsRows.length === 0 ? (
                    <Text type="secondary">{t('pricing.calcs_empty')}</Text>
                ) : (
                    <Table
                        rowKey="id"
                        size="small"
                        columns={calcsColumns}
                        dataSource={calcsRows}
                        pagination={false}
                        scroll={{ x: 'max-content' }}
                        expandable={{
                            expandedRowRender: (row) => (
                                <CalculationBreakdown
                                    calc={row.calc}
                                    wholesalerName={winnerName(row.calc)}
                                    compact
                                />
                            ),
                        }}
                    />
                )}
            </Drawer>

            <Modal
                title={t('pricing.new_relation')}
                open={relationOpen}
                onCancel={() => setRelationOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setRelationOpen(false)}>
                        {t('common.cancel')}
                    </Button>,
                    <SubmitButton key="submit" onClick={() => relationForm.submit()}>
                        {t('common.create')}
                    </SubmitButton>,
                ]}
                destroyOnHidden
                mask={{ closable: false }}
                afterOpenChange={(opened) => {
                    if (!opened) return;
                    relationForm.resetFields();
                    // String decimal, no number: el POST de relations valida el
                    // margen como `string` y un 0.13 numérico daba 422 al crear
                    // la relación sin tocar este campo.
                    relationForm.setFieldsValue({
                        margin: config?.default_margin ?? '0.1300',
                    });
                }}
            >
                <Form form={relationForm} layout="vertical" onFinish={onRelationFinish}>
                    <Form.Item name="plant_id" label={t('pricing.col_plant')} rules={[{ required: true, message: t('common.required') }]}>
                        <Select showSearch optionFilterProp="label" options={plantOptions} placeholder={t('pricing.col_plant')} />
                    </Form.Item>
                    <Form.Item name="product_id" label={t('pricing.col_product')} rules={[{ required: true, message: t('common.required') }]}>
                        <Select showSearch optionFilterProp="label" options={productOptions} placeholder={t('pricing.col_product')} />
                    </Form.Item>
                    <Form.Item
                        name="margin"
                        label={t('pricing.margin_field')}
                        extra={t('pricing.margin_default_hint')}
                        rules={[{ validator: validateMargin }]}
                    >
                        <InputNumber
                            stringMode
                            precision={4}
                            min={0}
                            step={0.01}
                            prefix="S/"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </PanelLayout>
    );
}