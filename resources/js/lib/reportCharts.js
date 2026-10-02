import formatMoney from './money';
import dayjs from 'dayjs';
import { brandColors, FALLBACK_BRAND } from './brand';
import { dateFormat, locale } from './format';

/**
 * Builders de las opciones de Apache ECharts del reporte "Avance de ventas".
 *
 * Este módulo es la fuente única de la geometría de los gráficos y la consumen
 * DOS consumidores con arquitecturas opuestas:
 *
 *  - `Pages/Platform/Reports/SalesIndex.jsx` (web, Inertia + React).
 *  - `resources/js/pdf/sales-report.js` (bundle standalone que Chromium carga
 *    dentro del PDF, ADR-018 §2/§4/§19).
 *
 * Por eso no puede importar React, ni antd, ni usar el alias `@/` (el bundle del
 * PDF se compila sin `jsconfig.json`): solo `dayjs` y `lib/money`.
 *
 * Los textos NO se resuelven aquí: entran como `labels`, ya traducidos. La web
 * los arma con `t('reports.…')` y el PDF los pasa la vista Blade con `__()`.
 * Así el mismo `option` se genera en los dos lados sin duplicar la lógica de
 * formato ni la de i18n.
 */

/**
 * Colores de las series, alineados con la paleta del panel (ADR-006 §18: los
 * gráficos no introducen una paleta nueva). Azul = ventas, gris = compras,
 * naranja = margen. Es el orden de lectura que pide el ADR: el margen es la
 * cifra que el gerente quiere ver destacada, y por eso va en el color de acento.
 */
export const COLORS = {
    sales: brandColors().primary,
    purchases: brandColors().muted,
    margin: brandColors().accent,
    axis: brandColors().border,
    text: brandColors().muted,
    ink: brandColors().ink,
};

/** Paleta de la torta: derivados del azul y naranja de marca, en degradado. */
export const PRODUCT_COLORS = [
    brandColors().primary,
    brandColors().accent,
    '#3F6BA8',
    '#F6A868',
    '#6E93C4',
    '#C2410C',
    '#9BB8DC',
    '#FBBF8A',
];

/** Un guion largo donde no hay dato; nunca "S/ 0.00" (ADR-017, decisión del usuario). */
export const DASH = '—';

/**
 * Gráfico de evolución de compras, ventas y margen (ADR-017 §7, ADR-018 §13).
 *
 * Ventas y compras van a la izquierda y el margen a la derecha, en un segundo
 * eje. No es un detalle cosmético: el margen es ~0.6 % del valor de las ventas,
 * así que en un solo eje sus barras quedarían pegadas al cero y el gráfico no
 * cumpliría su propósito de comparar.
 *
 * @param {Array} daily   filas `daily` del reporte (una por día CON pedidos).
 * @param {Object} labels textos ya traducidos.
 * @returns {Object|null} `null` si no hay días, para que el consumidor muestre
 *   su estado vacío en vez de un gráfico en blanco.
 */
export function buildEvolutionOption(daily, labels) {
    if (!daily?.length) {
        return null;
    }

    const money = (value) => (value === null || value === undefined ? DASH : formatMoney(value));
    const points = (key) => daily.map((row) => (row[key] === null ? null : row[key]));
    const series = [labels.seriesSales, labels.seriesPurchases, labels.seriesMargin];

    return {
        animationDuration: 400,
        grid: { left: 8, right: 8, top: 48, bottom: 8, containLabel: true },
        legend: { top: 8, data: series },
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
                    `<strong>${day.isValid() ? day.format(dateFormat()) : params[0].axisValue}</strong>`,
                ];

                series.forEach((label) => {
                    lines.push(`${label}: <strong>${money(valueOf(label))}</strong>`);
                });

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
                name: labels.axisAmount,
                nameTextStyle: { color: COLORS.text },
                axisLabel: { color: COLORS.text },
                splitLine: { lineStyle: { color: COLORS.axis, type: 'dashed' } },
            },
            {
                type: 'value',
                name: labels.seriesMargin,
                nameTextStyle: { color: COLORS.text },
                axisLabel: { color: COLORS.text },
                splitLine: { show: false },
            },
        ],
        series: [
            {
                name: labels.seriesSales,
                type: 'line',
                data: points('sales'),
                showSymbol: true,
                symbolSize: 6,
                itemStyle: { color: COLORS.sales },
                lineStyle: { color: COLORS.sales, width: 2 },
            },
            {
                name: labels.seriesPurchases,
                type: 'line',
                data: points('purchases'),
                showSymbol: true,
                symbolSize: 6,
                itemStyle: { color: COLORS.purchases },
                lineStyle: { color: COLORS.purchases, width: 2 },
            },
            {
                name: labels.seriesMargin,
                type: 'bar',
                yAxisIndex: 1,
                data: points('margin'),
                barMaxWidth: 22,
                itemStyle: { color: COLORS.margin, borderRadius: [3, 3, 0, 0] },
            },
        ],
    };
}

/**
 * Torta de galones por producto (ADR-017 §8/§9/§10, ADR-018 §15).
 *
 * En la web la selección de productos es la legend nativa de ECharts: el
 * usuario hace clic en la leyenda y la porción desaparece. No se toca el arreglo
 * que llegó de Laravel ni se vuelve a consultar al backend, así que el detalle
 * diario y los cards no cambian (ADR-017 §9).
 *
 * En el PDF esa interacción no aplica (ADR-018 §15): como no hay ocultación por
 * leyenda, el `{d}%` de la etiqueta es directamente la participación real.
 *
 * @param {Array} products filas `products` del reporte (ordenadas por share desc).
 * @param {Object} labels  textos ya traducidos.
 * @returns {Object|null} `null` si no hay productos.
 */
export function buildPieOption(products, labels) {
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
                    `${labels.pieTooltipGallons}: <strong>${Number(value).toLocaleString(locale(), { maximumFractionDigits: 2 })}</strong>`,
                    `${labels.pieTooltipShare}: <strong>${share.toFixed(1)}%</strong>`,
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
                    name: product.name || `${labels.noData} #${product.id}`,
                    value: product.total_gallons || 0,
                    itemStyle: { color: PRODUCT_COLORS[index % PRODUCT_COLORS.length] },
                })),
            },
        ],
    };
}