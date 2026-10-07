import { http } from '@/Utils/Ajax';

const base = '/api/vehicles';

export const Vehicles = {
    routes: {
        index: '/catalogos/vehiculos',
        store: base,
        update: (id) => `${base}/${id}`,
        destroy: (id) => `${base}/${id}`,
        compartments: (id) => `${base}/${id}/compartments`,
    },
    index: (params) => http.get(base, { params }),
    store: (data) => http.post(base, data),
    update: (id, data) => http.put(`${base}/${id}`, data),
    destroy: (id) => http.delete(`${base}/${id}`),
    getCompartments: (id) => http.get(`${base}/${id}/compartments`),
    saveCompartments: (id, data) => http.put(`${base}/${id}/compartments`, data),
};

export default Vehicles;