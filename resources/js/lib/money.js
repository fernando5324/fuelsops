import { currency as brandCurrency, locale as brandLocale } from '@/lib/format';

/**
 * Formatea un monto en la moneda de la plataforma (ADR-019).
 *
 * Locale, moneda y símbolo salen de `config/brand.php` / `tenants.details`
 * (`resources/js/lib/format.js`), no de literales: antes estaban fijos como
 * `es-PE` / `PEN`. Se mantienen los overrides para llamadas puntuales.
 */
export default function formatMoney(
    value,
    { locale = brandLocale(), currency = brandCurrency(), digits = 2 } = {},
) {
    const n = Number(value || 0);

    return n.toLocaleString(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
}
