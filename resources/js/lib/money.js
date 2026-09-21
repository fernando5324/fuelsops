export default function formatMoney(value, { locale = 'es-PE', currency = 'PEN', digits = 2 } = {}) {
    const n = Number(value || 0);

    return n.toLocaleString(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
}