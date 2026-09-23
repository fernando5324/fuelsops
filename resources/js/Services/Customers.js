import { http } from '@/Utils/Ajax';

const base = '/api/customers';

export const Customers = {
    routes: {
        index: '/catalogos/clientes',
        store: base,
        update: (id) => `${base}/${id}`,
        destroy: (id) => `${base}/${id}`,
    },
    index: (params) => http.get(base, { params }),
    store: (data) => http.post(base, data),
    update: (id, data) => http.put(`${base}/${id}`, data),
    destroy: (id) => http.delete(`${base}/${id}`),
};

export default Customers;