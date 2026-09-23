import { http } from '@/Utils/Ajax';

const base = '/api/advisors';

export const Advisors = {
    routes: {
        index: '/catalogos/asesores',
        store: base,
        update: (id) => `${base}/${id}`,
        destroy: (id) => `${base}/${id}`,
    },
    index: (params) => http.get(base, { params }),
    store: (data) => http.post(base, data),
    update: (id, data) => http.put(`${base}/${id}`, data),
    destroy: (id) => http.delete(`${base}/${id}`),
};

export default Advisors;