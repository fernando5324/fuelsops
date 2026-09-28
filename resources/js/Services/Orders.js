import { http } from '@/Utils/Ajax';

const base = '/api/orders';

export const Orders = {
    routes: {
        index: '/pedidos',
        create: '/pedidos/registro',
        show: (id) => `/pedidos/${id}`,
        edit: (id) => `/pedidos/${id}/editar`,
        update: (id) => `/pedidos/${id}`,
        confirmed: (id) => `/pedidos/${id}/confirmado`,
        changeStatus: (id) => `${base}/${id}/status`,
        detail: (id) => `${base}/${id}/detail`,
        storeDeposit: (id) => `${base}/${id}/deposits`,
        destroyDeposit: (id, deposit) => `${base}/${id}/deposits/${deposit}`,
        trashIndex: '/pedidos/papelera',
        trashShow: (id) => `/pedidos/papelera/${id}`,
        trash: (id) => `${base}/${id}/trash`,
        restore: (id) => `${base}/trash/${id}/restore`,
    },
    detail: (id) => http.get(`${base}/${id}/detail`),
    changeStatus: (id, data) => http.post(`${base}/${id}/status`, data),
    lookupCustomer: (taxId) => http.post('/orders/lookup-customer', { tax_id: taxId }),
    lookupDriver: (licenseNumber) => http.post('/orders/lookup-driver', { license_number: licenseNumber }),
    lookupVehicle: (licensePlate, type) => http.post('/orders/lookup-vehicle', { license_plate: licensePlate, type }),
    trash: (id, data) => http.post(`${base}/${id}/trash`, data),
};

export default Orders;