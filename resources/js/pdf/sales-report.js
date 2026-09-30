import echarts from '../lib/charts';
import { buildEvolutionOption, buildPieOption } from '../lib/reportCharts';

/**
 * Runtime de gráficos del PDF del reporte "Avance de ventas" (ADR-018 §14).
 *
 * Este archivo NO es una página de la aplicación: se compila aparte (ver
 * `vite.pdf.config.js`) a un IIFE que el Blade inyecta literal dentro del HTML
 * que Browsershot le pasa a Chromium. Por eso expone funciones en `window` en
 * vez de exportar componentes y no usa el alias `@/` (este bundle se compila
 * sin `jsconfig.json`).
 *
 * El contrato con la vista Blade es exactamente dos cosas:
 *
 *  1. `window.__renderSalesReportCharts(data, labels)` — dibuja los dos gráficos.
 *  2. `window.__pdfChartsReady === true` — la señal que Browsershot espera con
 *     `waitForFunction()` antes de imprimir (ADR-018 §14: "No generar el PDF
 *     antes de que ECharts termine de renderizar"). Es un evento, no un `delay`
 *     fijo, para no depender de un tiempo arbitrario.
 */

/** Dimensiones en px; Chromium las convierte a mm al paginar A4. */
const EVOLUTION_HEIGHT = 260;
const PIE_HEIGHT = 280;

function render(target, option, height) {
    const node = document.getElementById(target);

    // Sin datos no hay `option` (los builders devuelven null): el Blade ya
    // pintó un estado vacío, así que no hay nada que dibujar.
    if (!node || !option) {
        return null;
    }

    const chart = echarts.init(node, null, { renderer: 'canvas' });
    chart.setOption(option);
    chart.resize();

    return chart;
}

/**
 * Dibuja ambos gráficos y publica la señal de "listo para imprimir".
 *
 * Se espera un doble `requestAnimationFrame` antes de marcar listo: ECharts
 * pinta sobre canvas y el primer frame solo programa el trabajo; el segundo
 * confirma que ya está en pantalla. Sin esto el PDF puede salir con los ejes
 * pero sin las series, porque Chromium paginó antes del primer pintado.
 */
window.__renderSalesReportCharts = function renderSalesReportCharts(data, labels) {
    const charts = [
        render('pdf-chart-evolution', buildEvolutionOption(data?.daily, labels), EVOLUTION_HEIGHT),
        render('pdf-chart-products', buildPieOption(data?.products, labels), PIE_HEIGHT),
    ].filter(Boolean);

    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
            // `resize` por si el layout todavía no estaba listo cuando se
            // inicializó el chart (el ancho definitivo se conoce tras el reflow).
            charts.forEach((chart) => chart.resize());
            window.__pdfChartsReady = true;
        });
    });
};