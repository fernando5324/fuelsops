import dayjs from 'dayjs';

export default function formatDate(value, { withTime = false } = {}) {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    const d = dayjs(value);
    if (!d.isValid()) {
        return value;
    }

    return d.format(withTime ? 'DD/MM/YYYY HH:mm:ss' : 'DD/MM/YYYY');
}