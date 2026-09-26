/**
 * Service del panel de administración de precios (ADR-010, Fases 8+).
 * URLs para Inertia (mutaciones) y axios (preview/historial en vivo).
 */
import { http } from '@/Utils/Ajax';

const base = '/api/pricing';

export const PricesAdmin = {
    routes: {
        index: '/precios',
        export: '/precios/exportar',
        import: '/precios/importar',
        preview: `${base}/prices/preview`,
        pricesStore: `${base}/prices`,
        pricesUpdate: (id) => `${base}/prices/${id}`,
        pricesDestroy: (id) => `${base}/prices/${id}`,
        relationsStore: `${base}/relations`,
        relationsUpdate: (id) => `${base}/relations/${id}`,
        relationsHistory: (id) => `${base}/relations/${id}/history`,
    },
    preview: (data) => http.post(`${base}/prices/preview`, data),
    history: (id) => http.get(`${base}/relations/${id}/history`),
};

export default PricesAdmin;