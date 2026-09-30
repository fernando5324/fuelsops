import { http } from '@/Utils/Ajax';

/**
 * Cliente HTTP del reporte "Avance de ventas" (ADR-017 web, ADR-018 PDF).
 *
 * La página no tiene API propia (los filtros viajan en el query string de la
 * visita Inertia); este Service existe únicamente para la descarga del PDF, que
 * sí necesita axios porque la respuesta es un archivo binario y no una página.
 *
 * ADR-009: aquí no hay lógica de UI. El Service devuelve el blob y el nombre que
 * calculó el backend; quien dispara el `<a download>` es la página.
 */
const base = '/reportes/avance-ventas';

export const SalesReports = {
    routes: {
        index: base,
        exportPdf: (filters) => {
            const params = new URLSearchParams();

            // El request del backend da prioridad al rango explícito y descarta
            // el mes, así que no se envían los dos a la vez.
            if (filters?.month) {
                params.set('month', filters.month);
            } else {
                if (filters?.from) {
                    params.set('date_from', filters.from);
                }
                if (filters?.to) {
                    params.set('date_to', filters.to);
                }
            }

            const query = params.toString();

            return query ? `${base}/exportar?${query}` : `${base}/exportar`;
        },
    },

    /**
     * Descarga el PDF del período indicado.
     *
     * Va por fetch+blob y no por un `<a href>` porque ADR-018 §21 exige que un
     * fallo de generación (Chromium caído, falta de Chromium) llegue al usuario
     * como mensaje amigable: con una navegación el navegador se quedaría en la
     * página de error y el usuario no sabría qué pasó.
     *
     * @returns {Promise<{blob: Blob, fileName: string}>}
     */
    exportPdf: async (filters) => {
        const response = await http.get(SalesReports.routes.exportPdf(filters), {
            responseType: 'blob',
        });

        const disposition = response.headers?.['content-disposition'] || '';
        const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);

        return {
            blob: response.data,
            fileName: match ? decodeURIComponent(match[1]) : 'avance-ventas.pdf',
        };
    },
};

export default SalesReports;