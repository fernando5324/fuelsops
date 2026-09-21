export default function statusColor(status = {}) {
    const map = {
        pending: 'gold',
        attended: 'green',
        cancelled: 'red',
    };

    return map[status.code] || status.color || 'default';
}