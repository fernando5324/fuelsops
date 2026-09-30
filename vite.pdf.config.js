import { defineConfig } from 'vite';
import path from 'path';

/**
 * Build del runtime de gráficos que Chromium carga dentro del PDF del reporte
 * "Avance de ventas" (ADR-018 §14).
 *
 * Va aparte de `vite.config.js` a propósito, y por dos razones:
 *
 *  1. `Browsershot::html()` abre el HTML desde `file://`, así que NO puede
 *     cargar `/build/assets/*.js` por HTTP: el runtime tiene que estar inlineado
 *     en el HTML. Un `<script type="module" src=…>` tampoco valdría (el build
 *     principal emite ESM, con `export`).
 *  2. Por lo mismo se compila en modo `lib` a un IIFE, que es lo único que un
 *     `<script>` normal puede ejecutar.
 *
 * Salida: `public/build/pdf/sales-report.js`. Reutiliza el registro tree-shaken
 * de `lib/charts.js` en vez del dist completo de ECharts: 605 kB en vez de los
 * 1.12 MB de `echarts/dist/echarts.min.js` (207 kB con gzip).
 *
 * `emptyOutDir: false` es OBLIGATORIO: la salida vive dentro de `public/build`,
 * que es justo la carpeta que `vite build` acaba de vaciar y rellenar. Por eso
 * el script `build` encadena los dos builds en orden (ver `package.json`).
 */
export default defineConfig({
    // `outDir` está DENTRO de `publicDir`; sin esto Vite avisa y además intenta
    // copiar `public/` sobre sí mismo. Este build no necesita assets públicos.
    publicDir: false,
    build: {
        outDir: 'public/build',
        emptyOutDir: false,
        lib: {
            entry: path.resolve(__dirname, 'resources/js/pdf/sales-report.js'),
            name: 'SertocoSalesReport',
            formats: ['iife'],
            fileName: () => 'pdf/sales-report.js',
        },
    },
});