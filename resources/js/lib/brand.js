import { usePage } from '@inertiajs/react';

/**
 * Identidad y paleta del cliente (ADR-019).
 *
 * Los valores llegan ya resueltos desde el servidor en la prop `brand` de
 * Inertia: `BrandService` combina `tenants.details` (customization del cliente)
 * sobre `config/brand.php` (valores por defecto de la plataforma). Aquí NO hay
 * ningún color hardcodeado; si falta la prop se cae al archivo, que es el mismo
 * origen que usa el backend.
 *
 * Estructura:
 *   brand.product  nombre interno del producto (`fuels-ops`), no visible en el panel
 *   brand.client   nombre del cliente (`tenants.name`): lo que ve el usuario
 *   brand.slug     slug del cliente (prefijo de los archivos exportados)
 *   brand.logo     URL del logo
 *   brand.colors   paleta resuelta
 *   brand.format   locale, moneda, símbolo, fecha y unidad de galones
 */

export const FALLBACK_BRAND = {
    product: 'fuels-ops',
    short: 'fuelsops',
    client: 'fuels-ops',
    slug: 'fuelsops',
    logo: '/images/logo.png',
    colors: {
        primary: '#1B3A6B',
        accent: '#F47920',
        accent_hover: '#E06810',
        bg: '#F8FAFC',
        surface: '#FFFFFF',
        border: '#CBD5E1',
        border_soft: '#E2E8F0',
        fill_soft: '#F1F5F9',
        ink: '#0F172A',
        muted: '#64748B',
        success: '#10B981',
        danger: '#EF4444',
    },
    format: {
        locale: 'es-PE',
        currency: 'PEN',
        symbol: 'S/',
        date: 'DD/MM/YYYY',
        gallon: ' gal',
    },
};

/**
 * Paleta resuelta del cliente.
 *
 * Se puede usar fuera de un componente React (por ejemplo `lib/reportCharts.js`,
 * que construye los charts del PDF en un bundle standalone sin Inertia).
 */
export function brandColors() {
    try {
        return { ...FALLBACK_BRAND.colors, ...(usePage().props.brand?.colors || {}) };
    } catch {
        return { ...FALLBACK_BRAND.colors };
    }
}

/** Convenciones de formato del cliente (locale, símbolo, unidad, fecha). */
export function brandFormat() {
    try {
        return { ...FALLBACK_BRAND.format, ...(usePage().props.brand?.format || {}) };
    } catch {
        return { ...FALLBACK_BRAND.format };
    }
}

/** Nombre del cliente: es lo que se muestra arriba del menú y en el título. */
export function useBrand() {
    const page = usePage();

    return {
        ...FALLBACK_BRAND,
        ...(page.props.brand || {}),
        colors: { ...FALLBACK_BRAND.colors, ...(page.props.brand?.colors || {}) },
        format: { ...FALLBACK_BRAND.format, ...(page.props.brand?.format || {}) },
    };
}

/**
 * Lee una variable CSS de la página (`--color-primary`, …).
 *
 * El `<style>` con la paleta lo imprime el servidor en el `<head>`, así que
 * funciona incluso antes de que React monte (lo usa la barra de progreso de
 * Inertia). Si la variable no existe devuelve `null`.
 */
export function cssColor(variable) {
    if (typeof document === 'undefined') return null;

    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(variable)
        .trim();

    return value || null;
}

/**
 * Tokens del tema de Ant Design derivados de la paleta.
 *
 * Un solo lugar donde se decide qué color de la marca va en qué token; el
 * `ConfigProvider` de `app.jsx` y cualquier override posterior usan este mapa.
 */
export function brandThemeTokens(colors = brandColors()) {
    return {
        colorPrimary: colors.primary,
        colorInfo: colors.primary,
        colorLink: colors.primary,
        colorTextHeading: colors.ink,
        colorBgLayout: colors.bg,
        colorText: colors.ink,
        colorTextSecondary: colors.muted,
        colorBorder: colors.border,
        colorBorderSecondary: colors.border_soft,
        colorFillAlter: colors.fill_soft,
        colorSuccess: colors.success,
        colorError: colors.danger,
    };
}