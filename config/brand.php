<?php

/*
|--------------------------------------------------------------------------
| Identidad y presentación de la plataforma
|--------------------------------------------------------------------------
|
| FUENTE ÚNICA de la marca (ADR-019). Este archivo reemplaza a los valores
| que estaban duplicados en `resources/css/app.css`, el `ConfigProvider` de
| `resources/js/app.jsx`, `resources/js/lib/reportCharts.js`, la vista del PDF
| y un `style` inline en `SalesReportPdfService`.
|
| Prioridad de resolución (ver `App\Services\BrandService`):
|
|   1. `tenants.details` (JSON en la base de datos) → define el cliente.
|   2. Este archivo                            → valor por defecto.
|
| Es decir: `details` = customization por cliente, este archivo = fallback.
| Un tenant con `details = NULL` se ve exactamente igual que el de arriba.
|
| ── `name` NO es el nombre que ve el usuario ────────────────────────────────
|
| `name`/`short` son el nombre INTERNO del producto (fuels-ops / fuelsops).
| En el panel, el encabezado y el título del navegador muestran el nombre del
| TENANT/cliente, que viene de la base de datos (`tenants.name`). Hoy ese
| cliente es "Sertoco"; mañana cada cliente ve el suyo.
|
*/

return [

    /*
    |--------------------------------------------------------------------------
    | Nombre interno del producto
    |--------------------------------------------------------------------------
    |
    | No se muestra en el panel (allí manda `tenants.name`). Se usa en los
    | textos internos, los nombres de archivo exportados y la documentación.
    |
    */

    'name' => env('BRAND_NAME', 'fuels-ops'),

    'short' => env('BRAND_SHORT', 'fuelsops'),

    /*
    |--------------------------------------------------------------------------
    | Prefijo de los archivos exportados
    |--------------------------------------------------------------------------
    |
    | Por defecto el slug del tenant activo, para que la exportación de cada
    | cliente salga con su propio nombre: `sertoco_precios_2026-10-01.xlsx`.
    | Con `BRAND_FILE_PREFIX=fijos` se fuerza un nombre único de plataforma.
    |
    */

    'file_prefix' => env('BRAND_FILE_PREFIX'),

    /*
    |--------------------------------------------------------------------------
    | Logo por defecto
    |--------------------------------------------------------------------------
    |
    | Ruta dentro de `public/`. Si el tenant tiene `logo_media_file_id`, gana
    | el logo de ese cliente (ver `BrandService::logoUrl()`).
    |
    */

    'logo' => 'images/logo.png',

    /*
    |--------------------------------------------------------------------------
    | Paleta
    |--------------------------------------------------------------------------
    |
    | Formato: `#RRGGBB` en mayúsculas. `BrandService` valida el formato de lo
    | que venga de `tenants.details` y descarta lo que no cumpla (un tenant no
    | puede romper el diseño de la plataforma).
    |
    | `border` es el borde fuerte (el que usa antd en `colorBorder`) y
    | `border_soft` el suave (`colorBorderSecondary` y `--color-border`).
    |
    */

    'colors' => [
        'primary' => '#1B3A6B',
        'accent' => '#F47920',
        'accent_hover' => '#E06810',
        'bg' => '#F8FAFC',
        'surface' => '#FFFFFF',
        'border' => '#CBD5E1',
        'border_soft' => '#E2E8F0',
        'fill_soft' => '#F1F5F9',
        'ink' => '#0F172A',
        'muted' => '#64748B',
        'success' => '#10B981',
        'danger' => '#EF4444',
    ],

    /*
    |--------------------------------------------------------------------------
    | Convenciones de formato
    |--------------------------------------------------------------------------
    |
    | Locale, moneda, símbolo y unidades. Se comparten con el front mediante
    | la prop `brand` de Inertia (`resources/js/lib/format.js`) para que no
    | se repitan literales como `es-ES`, `DD/MM/YYYY`, `S/` o ` gal`.
    |
    */

    'format' => [
        'locale' => 'es-PE',
        'currency' => 'PEN',
        'symbol' => 'S/',
        'date' => 'DD/MM/YYYY',
        'gallon' => ' gal',
    ],

];