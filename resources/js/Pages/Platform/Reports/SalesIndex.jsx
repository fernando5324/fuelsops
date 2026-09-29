import { Alert, Button, Card, Col, DatePicker, Row, Select, Space, Statistic, Table, Tooltip, Typography } from 'antd';
import {
    BarChartOutlined,
    CalendarOutlined,
    ClearOutlined,
    DatabaseOutlined,
    DollarOutlined,
    RiseOutlined,
    ShoppingCartOutlined,
} from '@ant-design/icons';
import { router, usePage } from '@inertiajs/react';
import React, { useEffect, useMemo, useState } from 'react';
import PanelLayout from '@/Layouts/PanelLayout';
import PageHeader from '@/Components/PageHeader';
import SectionCard from '@/Components/SectionCard';
import EChart from '@/Components/Charts/EChart';
import useTranslations from '@/hooks/useTranslations';
import formatMoney from '@/lib/money';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const ROUTE = '/reportes/avance-ventas';

/**
 * Colores de las series, alineados con la paleta del panel (ADR-006 §18: los
 * gráficos no introducen una paleta nueva). Azul = ventas, gris = compras,
 * naranja = margen. Es el orden de lectura que pide el ADR: el margen es la
 * cifra que el gerente quiere ver destacada, y por eso va en el color de acento.
 */
const COLORS = {
    sales: '#1B3A6B',
    purchases: '#64748B',
    margin: '#F47920',
    axis: '#CBD5E1',
    text: '#64748B',
    ink: '#0F172A',
};

/** Paleta de la torta: derivados del azul y naranja de marca, en degradado. */
const PRODUCT_COLORS = [
    '#1B3A6B',
    '#F47920',
    '#3F6BA8',
    '#F6A868',
    '#6E93C4',
    '#C2410C',
    '#9BB8DC',
    '#FBBF8A',
];

/** Un guion largo donde no hay dato; nunca "S/ 0.00" (ADR-017, decisión del usuario). */
const DASH = '—';

export default function SalesReport({ summary, daily, products, filters, months }) {
    const { t } = useTranslations();
    const { errors } = usePage().props;
    const [loading, setLoading] = useState(false);

    // Borrador de los filtros: el usuario ajusta el mes o el rango y consulta
    // con el botón. El mes se aplica al instante (elegir un mes de una lista es
    // una decisión discreta); el rango se confirma, porque en un RangePicker el
    // momento natural de confirmar es cuando ya se han escrito las dos fechas.
    const [monthDraft, setMonthDraft] = useState(filters.month || '');
    const [rangeDraft, setRangeDraft] = useState([
        dayjs(filters.from),
        dayjs(filters.to),
    ]);

    // Cada respuesta del servidor es la fuente de verdad de los filtros: si el
    // backend corrigió o descartó algo (un rango invertido, un mes inválido),
    // los controles vuelven a mostrar exactamente lo que se está graficando.
    useEffect(() => {
        setMonthDraft(filters.month || '');
        setRangeDraft([dayjs(filters.from), dayjs(filters.to)]);
    }, [filters.from, filters.to, filters.month]);

    const navigate = (params) => {
        setLoading(true);
        router.get(ROUTE, params, {
            preserveState: true,
            replace: true,
            onFinish: () => setLoading(false),
        });
    };

    const applyMonth = (value) => {
        setMonthDraft(value || '');
        navigate(value ? { month: value } : {});
    };

    const applyRange = () => {
        const [from, to] = rangeDraft;

        if (!from || !to) {
            return;
        }

        setMonthDraft('');
        navigate({ date_from: from.format('YYYY-MM-DD'), date_to: to.format('YYYY-MM-DD') });
    };

    const reset = () => {
        setMonthDraft('');
        navigate({});
    };

    // ── Gráfico de evolución (ADR-017 §7) ──────────────────────────────────
    //
    // Ventas y compras van a la izquierda y el margen a la derecha, en un
    // segundo eje. No es un detalle cosmético: el margen es ~0.6 % del valor de
    // las ventas, así que en un solo eje sus barras quedarían pegadas al cero y
    // el gráfico no cumpliría su propósito de comparar.
    const evolutionOption = useMemo(() => {
        if (!daily?.length) {
            return null;
        }

        const money = (value) => (value === null || value === undefined ? DASH : formatMoney(value));
        const points = (key) => daily.map((row) => (row[key] === null ? null : row[key]));

        return {
            animationDuration: 400,
            grid: { left: 8, right: 8, top: 48, bottom: 8, containLabel: true },
            legend: { top: 8, data: [t('reports.series_sales'), t('reports.series_purchases'), t('reports.series_margin')] },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params) => {
                    if (!params?.length) {
                        return '';
                    }

                    const day = dayjs(params[0].axisValue);
                    const valueOf = (name) => params.find((item) => item.seriesName === name)?.value;

                    const lines = [
                        `<strong>${day.isValid() ? day.format('DD/MM/YYYY') : params[0].axisValue}</strong>`,
                    ];

                    [t('reports.series_sales'), t('reports.series_purchases'), t('reports.series_margin')].forEach(
                        (label) => {
                            lines.push(`${label}: <strong>${money(valueOf(label))}</strong>`);
                        }
                    );

                    return lines.join('<br/>');
                },
            },
            xAxis: {
                type: 'category',
                data: daily.map((row) => row.date),
                axisLabel: {
                    color: COLORS.text,
                    formatter: (value) => (dayjs(value).isValid() ? dayjs(value).format('DD/MM') : value),
                },
                axisLine: { lineStyle: { color: COLORS.axis } },
                axisTick: { show: false },
            },
            yAxis: [
                {
                    type: 'value',
                    name: t('reports.axis_amount'),
                    nameTextStyle: { color: COLORS.text },
                    axisLabel: { color: COLORS.text },
                    splitLine: { lineStyle: { color: COLORS.axis, type: 'dashed' } },
                },
                {
                    type: 'value',
                    name: t('reports.series_margin'),
                    nameTextStyle: { color: COLORS.text },
                    axisLabel: { color: COLORS.text },
                    splitLine: { show: false },
                },
            ],
            series: [
                {
                    name: t('reports.series_sales'),
                    type: 'line',
                    data: points('sales'),
                    showSymbol: true,
                    symbolSize: 6,
                    itemStyle: { color: COLORS.sales },
                    lineStyle: { color: COLORS.sales, width: 2 },
                },
                {
                    name: t('reports.series_purchases'),
                    type: 'line',
                    data: points('purchases'),
                    showSymbol: true,
                    symbolSize: 6,
                    itemStyle: { color: COLORS.purchases },
                    lineStyle: { color: COLORS.purchases, width: 2 },
                },
                {
                    name: t('reports.series_margin'),
                    type: 'bar',
                    yAxisIndex: 1,
                    data: points('margin'),
                    barMaxWidth: 22,
                    itemStyle: { color: COLORS.margin, borderRadius: [3, 3, 0, 0] },
                },
            ],
        };
    }, [daily, t]);

    // ── Torta de galones por producto (ADR-017 §8/§9/§10) ─────────────────
    //
    // La selección de productos es la legend nativa de ECharts: el usuario
    // hace clic en la leyenda y la porción desaparece. No se toca el arreglo
    // que llegó de Laravel ni se vuelve a consultar al backend, así que el
    // detalle diario y los cards no cambian (ADR-017 §9).
    const pieOption = useMemo(() => {
        if (!products?.length) {
            return null;
        }

        const total = products.reduce((acc, product) => acc + (product.total_gallons || 0), 0);

        return {
            animationDuration: 400,
            legend: { type: 'scroll', bottom: 0, icon: 'circle' },
            tooltip: {
                trigger: 'item',
                formatter: (params) => {
                    const value = Number(params.value || 0);
                    // El porcentaje se recalcula sobre lo que está visible: si un
                    // producto está oculto, el resto suma 100% entre sí.
                    const share = total > 0 ? (value / total) * 100 : 0;

                    return [
                        `<strong>${params.name}</strong>`,
                        `${t('reports.pie_tooltip_gallons')}: <strong>${Number(value).toLocaleString('es-PE', { maximumFractionDigits: 2 })}</strong>`,
                        `${t('reports.pie_tooltip_share')}: <strong>${share.toFixed(1)}%</strong>`,
                    ].join('<br/>');
                },
            },
            series: [
                {
                    type: 'pie',
                    radius: ['45%', '68%'],
                    center: ['50%', '46%'],
                    avoidLabelOverlap: true,
                    label: {
                        formatter: '{b}\n{d}%',
                        color: COLORS.text,
                        lineHeight: 16,
                    },
                    labelLine: { length: 12, length2: 10, lineStyle: { color: COLORS.axis } },
                    itemStyle: { borderColor: '#FFFFFF', borderWidth: 2 },
                    data: products.map((product, index) => ({
                        name: product.name || `${t('reports.no_data')} #${product.id}`,
                        value: product.total_gallons || 0,
                        itemStyle: { color: PRODUCT_COLORS[index % PRODUCT_COLORS.length] },
                    })),
                },
            ],
        };
    }, [products, t]);

    // ── Tabla "Resumen por día" (ADR-017 §11) ─────────────────────────────
    const gallons = (value) =>
        Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const moneyCell = (value) => (value === null || value === undefined ? DASH : formatMoney(value));

    const rateCell = (value) => (value === null || value === undefined ? DASH : `S/ ${Number(value).toFixed(2)}`);

    const columns = [
        {
            title: t('reports.col_date'),
            dataIndex: 'date',
            key: 'date',
            width: 130,
            fixed: 'left',
            render: (value) => (dayjs(value).isValid() ? dayjs(value).format('DD/MM/YYYY') : value),
        },
        {
            title: t('reports.col_gallons'),
            dataIndex: 'total_gallons',
            key: 'total_gallons',
            align: 'right',
            render: gallons,
        },
        {
            title: t('reports.col_purchases'),
            dataIndex: 'purchases',
            key: 'purchases',
            align: 'right',
            render: moneyCell,
        },
        {
            title: t('reports.col_sales'),
            dataIndex: 'sales',
            key: 'sales',
            align: 'right',
            render: moneyCell,
        },
        {
            title: t('reports.col_margin'),
            dataIndex: 'margin',
            key: 'margin',
            align: 'right',
            render: moneyCell,
        },
        {
            title: t('reports.col_margin_per_gallon'),
            dataIndex: 'margin_per_gallon',
            key: 'margin_per_gallon',
            align: 'right',
            render: rateCell,
        },
    ];

    const hasData = Boolean(daily?.length);

    // Fila de totales como fila real de la tabla, no con `Table.Summary`: así
    // sobrevive al scroll horizontal y a la columna fija de la fecha, que es
    // donde `Table.Summary` se descuadra.
    const tableData = useMemo(() => {
        if (!hasData) {
            return [];
        }

        return [
            ...daily,
            {
                __total: true,
                date: t('reports.total_row'),
                total_gallons: summary.total_gallons,
                purchases: summary.total_purchases,
                sales: summary.total_sales,
                margin: summary.total_margin,
                // El margen por galón del período es total_margin / total_gallons,
                // NO el promedio de los valores diarios (ADR-017 §13).
                margin_per_gallon: summary.margin_per_gallon,
            },
        ];
    }, [daily, summary, hasData, t]);

    const monthOptions = (months || []).map((value) => {
        const [year, month] = value.split('-');

        return {
            value,
            label: `${t(`reports.month_names.${Number(month)}`)} ${year}`,
        };
    });

    return (
        <PanelLayout>
            <PageHeader
                title={t('reports.title')}
                description={t('reports.description')}
                headTitle={t('reports.title')}
            />

            {errors && Object.keys(errors).length > 0 ? (
                <Alert type="error" showIcon message={Object.values(errors)[0]} style={{ marginBottom: 16 }} />
            ) : null}

            <Card className="ui-card-gap" style={{ marginBottom: 16 }}>
                <Space wrap size={12} style={{ width: '100%' }}>
                    <Select
                        className="ui-filter-status"
                        value={monthDraft || undefined}
                        placeholder={t('reports.filter_month_placeholder')}
                        options={monthOptions}
                        onChange={applyMonth}
                        allowClear
                        suffixIcon={<CalendarOutlined />}
                        aria-label={t('reports.filter_month')}
                    />
                    <RangePicker
                        className="ui-filter-range"
                        value={rangeDraft}
                        onChange={(value) => setRangeDraft(value || [])}
                        format="DD/MM/YYYY"
                        placeholder={[t('reports.filter_range_placeholder.from'), t('reports.filter_range_placeholder.to')]}
                        allowEmpty={[false, false]}
                        aria-label={t('reports.filter_range')}
                    />
                    <Button type="primary" icon={<BarChartOutlined />} onClick={applyRange} loading={loading}>
                        {t('reports.filter_apply')}
                    </Button>
                    <Button icon={<ClearOutlined />} onClick={reset} disabled={loading}>
                        {t('reports.filter_reset')}
                    </Button>
                    {hasData ? (
                        <Text type="secondary">
                            {t('reports.filter_days', { count: summary.days_count })}
                        </Text>
                    ) : null}
                </Space>
            </Card>

            {summary?.lines_without_price > 0 ? (
                <Alert
                    type="warning"
                    showIcon
                    message={t('reports.missing_price', { count: summary.lines_without_price })}
                    style={{ marginBottom: 16 }}
                />
            ) : null}

            {summary?.lines_without_margin > 0 ? (
                <Alert
                    type="info"
                    showIcon
                    message={t('reports.missing_margin', { count: summary.lines_without_margin })}
                    style={{ marginBottom: 16 }}
                />
            ) : null}

            <Row gutter={[16, 16]} className='ui-card-gap'>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title={t('reports.total_gallons')}
                            value={gallons(summary?.total_gallons)}
                            prefix={<DatabaseOutlined />}
                            valueStyle={{ color: COLORS.sales }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title={t('reports.total_purchases')}
                            value={moneyCell(summary?.total_purchases)}
                            prefix={<ShoppingCartOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title={t('reports.total_sales')}
                            value={moneyCell(summary?.total_sales)}
                            prefix={<DollarOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        {/* El Tooltip envuelve un <span> y no el Statistic: antd
                            necesita un hijo que reenvíe la ref para poder
                            posicionarlo. */}
                        <Tooltip title={t('reports.margin_formula')}>
                            <span>
                                <Statistic
                                    title={
                                        summary?.margin_per_gallon !== null && summary?.margin_per_gallon !== undefined
                                            ? `${t('reports.total_margin')} · S/ ${Number(summary.margin_per_gallon).toFixed(2)}/${t('reports.unit_gallons')}`
                                            : t('reports.total_margin')
                                    }
                                    value={moneyCell(summary?.total_margin)}
                                    prefix={<RiseOutlined />}
                                    valueStyle={{ color: COLORS.margin }}
                                />
                            </span>
                        </Tooltip>
                    </Card>
                </Col>
            </Row>

            <SectionCard index={1} title={t('reports.evolution_title')} description={t('reports.evolution_desc')}  >
                <EChart
                    option={evolutionOption}
                    height={340}
                    loading={loading}
                    emptyText={t('reports.empty_period')}
                    ariaLabel={t('reports.evolution_title')}
                />
            </SectionCard>

            <SectionCard index={2} title={t('reports.pie_title')} description={t('reports.pie_hint')}>
                <EChart
                    option={pieOption}
                    height={380}
                    loading={loading}
                    emptyText={t('reports.empty_period')}
                    ariaLabel={t('reports.pie_title')}
                />
            </SectionCard>

            <SectionCard
                index={3}
                title={t('reports.daily_title')}
                description={hasData ? t('reports.daily_desc') : undefined}
            >
                {!hasData ? (
                    <Alert
                        type="info"
                        showIcon
                        message={t('reports.empty_period')}
                        description={t('reports.empty_period_hint')}
                    />
                ) : (
                    <Table
                        rowKey="date"
                        dataSource={tableData}
                        columns={columns}
                        size="middle"
                        scroll={{ x: 'max-content' }}
                        pagination={false}
                        rowClassName={(row) => (row.__total ? 'ui-report-total' : '')}
                        locale={{ emptyText: t('reports.empty_period') }}
                    />
                )}
            </SectionCard>
        </PanelLayout>
    );
}
