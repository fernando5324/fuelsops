import dayjs from 'dayjs';
import { dateFormat } from '@/lib/format';

/**
 * Formatea una fecha con el formato de la plataforma (`dd/mm/yyyy`,
 * ADR-019). El formato sale de `config/brand.php` / `tenants.details`; con
 * `withTime` se añade la hora (`dd/mm/yyyy hh:mm:ss`) que usan los pedidos.
 */
export default function formatDate(value, { withTime = false } = {}) {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    const d = dayjs(value);
    if (!d.isValid()) {
        return value;
    }

    const format = withTime ? `${dateFormat()} HH:mm:ss` : dateFormat();

    return d.format(format);
}
