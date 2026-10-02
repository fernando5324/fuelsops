import { brandFormat } from '@/lib/brand';

/**
 * Convenciones de formato de la plataforma (ADR-019).
 *
 * Reemplaza los literales que estaban repetidos en las páginas (`es-ES`,
 * `DD/MM/YYYY`, `S/`, ` gal`) por los valores que resuelve `BrandService` desde
 * `config/brand.php` / `tenants.details`. El locale es el mismo para moneda y
 * cantidades: antes los pedidos formateaban en `es-ES` mientras el dinero usaba
 * `es-PE` (`lib/money.js`), lo que mezclaba los separadores.
 */

export function locale() {
    return brandFormat().locale;
}

export function currency() {
    return brandFormat().currency;
}

export function symbol() {
    return brandFormat().symbol;
}

export function dateFormat() {
    return brandFormat().date;
}

/** Sufijo de unidad de los galones (` gal`). */
export function gallonUnit() {
    return brandFormat().gallon;
}

/**
 * Formatea un número con el locale de la plataforma.
 *
 * @param {number|string} value
 * @param {number} [digits] decimales fijos; sin el argumento se muestran los
 *   decimales que tenga el número.
 */
export function formatNumber(value, digits) {
    const n = Number(value);

    if (!Number.isFinite(n)) return '-';

    return digits === undefined
        ? n.toLocaleString(locale())
        : n.toLocaleString(locale(), {
              minimumFractionDigits: digits,
              maximumFractionDigits: digits,
          });
}

/**
 * Formatea galones con el sufijo de unidad (`1.234,5 gal`).
 */
export function formatGallons(value, digits) {
    const formatted = formatNumber(value, digits);

    return formatted === '-' ? formatted : `${formatted}${gallonUnit()}`;
}