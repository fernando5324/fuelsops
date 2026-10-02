/**
 * Stub de `@inertiajs/react` para el bundle standalone del PDF (ADR-018/019).
 *
 * `lib/brand.js` usa `usePage()` para leer la prop `brand` del cliente. El
 * runtime del PDF se compila aparte y se ejecuta dentro de Chromium con
 * `Browsershot::html()`, SIN Inertia (ni React): por eso `vite.pdf.config.js`
 * aliasa `@inertiajs/react` a este archivo. Así `brandColors()`/`brandFormat()`
 * caen a `FALLBACK_BRAND` (los valores por defecto de `config/brand.php`) en vez
 * de romper el build por un import que no puede resolverse fuera de la app.
 *
 * Este archivo SOLO lo usa `vite.pdf.config.js`; la aplicación usa el paquete
 * real.
 */
export function usePage() {
    return { props: {} };
}
