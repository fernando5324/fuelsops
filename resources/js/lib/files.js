import { locale } from '@/lib/format';

/**
 * Formatea un tamaño de archivo (`1,5 MB`). Usa el locale de la plataforma
 * (ADR-019) en vez del literal `es-PE`.
 */
export default function formatFileSize(bytes) {
    const n = Number(bytes || 0);
    if (!n) {
        return '-';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let value = n;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }

    const digits = value >= 100 || unit === 0 ? 0 : value >= 10 ? 1 : 2;

    return `${value.toLocaleString(locale(), {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    })} ${units[unit]}`;
}
