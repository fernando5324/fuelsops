import { Alert, Button, Card, Col, DatePicker, message, Row, Select, Space, Statistic, Table, Tooltip, Typography } from 'antd';
import {
    BarChartOutlined,
    CalendarOutlined,
    ClearOutlined,
    DatabaseOutlined,
    DollarOutlined,
    FilePdfOutlined,
    RiseOutlined,
    ShoppingCartOutlined,
} from '@ant-design/icons';
import { router, usePage } from '@inertiajs/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PanelLayout from '@/Layouts/PanelLayout';
import PageHeader from '@/Components/PageHeader';
import SectionCard from '@/Components/SectionCard';
import EChart from '@/Components/Charts/EChart';
import useTranslations from '@/hooks/useTranslations';
import SalesReportsService from '@/Services/SalesReports';
import formatMoney from '@/lib/money';
import { buildEvolutionOption, buildPieOption, COLORS, DASH } from '@/lib/reportCharts';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const ROUTE = '/reportes/avance-ventas';

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

    // ── Exportar PDF (ADR-018 §5) ───────────────────────────────────────────
    //
    // El botón usa SIEMPRE los filtros que el backend está mostrando, no el
    // borrador de los controles: así el PDF contiene exactamente el período
    // que el usuario está viendo, incluso si dejó un rango a medio escribir
    // (ADR-018 §5 "El PDF debe contener exactamente ese período").
    //
    // La descarga va por fetch+blob y no por un <a href> para poder cumplir
    // ADR-018 §21: si Chromium falla, el backend devuelve un error y aquí se
    // muestra el mensaje amigable en lugar de una descarga corrupta.
    const [exporting, setExporting] = useState(false);

    const exportPdf = useCallback(async () => {
        setExporting(true);

        try {
            const { fileName, blob } = await SalesReportsService.exportPdf(filters);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch {
            message.error(t('reports.pdf_error'));
        } finally {
            setExporting(false);
        }
    }, [filters, t]);

    // ── Gráficos (ADR-017 §7/§8, ADR-018 §13/§15) ───────────────────────────
    //
    // Los `option` se arman con el módulo compartido `lib/reportCharts`, que es
    // la misma fuente que consume el bundle standalone dentro del PDF: por
    // construcción, web y PDF dibujan los mismos gráficos (ADR-018 §19).
    const chartLabels = useMemo(
        () => ({
            seriesSales: t('reports.series_sales'),
            seriesPurchases: t('reports.series_purchases'),
            seriesMargin: t('reports.series_margin'),
            axisAmount: t('reports.axis_amount'),
            pieTooltipGallons: t('reports.pie_tooltip_gallons'),
            pieTooltipShare: t('reports.pie_tooltip_share'),
            noData: t('reports.no_data'),
        }),
        [t],
    );

    const evolutionOption = useMemo(
        () => buildEvolutionOption(daily, chartLabels),
        [daily, chartLabels],
    );

    const pieOption = useMemo(() => buildPieOption(products, chartLabels), [products, chartLabels]);

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
                extra={
                    <Button
                        icon={<FilePdfOutlined />}
                        onClick={exportPdf}
                        loading={exporting}
                        disabled={loading}
                    >
                        {t('reports.pdf_export')}
                    </Button>
                }
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
