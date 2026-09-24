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

    return `${value.toLocaleString('es-PE', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    })} ${units[unit]}`;
}