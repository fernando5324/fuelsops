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
    // Los módulos compartidos (`lib/reportCharts.js` → `lib/format.js`,
    // `lib/brand.js`, `lib/money.js`) usan el alias `@/`. Al compilar el PDF
    // fuera de la app hay que declararlo aquí también. Además `lib/brand.js`
    // importa `@inertiajs/react`: como el PDF corre sin Inertia, se sustituye
    // por un stub local (ADR-019) en vez de arrastrar React.
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/js'),
            '@inertiajs/react': path.resolve(__dirname, 'resources/js/pdf/inertia-stub.js'),
        },
    },
    // Chromium abre el HTML por `file://`, donde no existe `process`. Varias
    // librerías del bundle (ECharts entre ellas) leen `process.env.NODE_ENV`
    // para recortar código, y sin esta definición el bundle entero revienta al
    // ejecutarse con `ReferenceError: process is not defined`. Con
    // `'production'` es además el valor que corresponde: este runtime no lleva
    // comprobaciones de desarrollo, igual que el resto de la aplicación.
    define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
        'process.env': '{}',
        'process.browser': 'true',
        global: 'globalThis',
    },
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