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
     * Con `responseType: 'blob'` un 422 o un 500 NO llegan como error de axios:
     * se resuelven con `response.data` siendo un Blob que en realidad contiene
     * JSON o texto plano. Sin desarmarlo, la página acabaría guardando un
     * archivo llamado `avance-ventas.pdf` lleno de un mensaje de error. Por eso
     * se comprueba el `Content-Type` y, si no es PDF, se lee el cuerpo y se
     * lanza el mensaje real.
     *
     * @returns {Promise<{blob: Blob, fileName: string}>}
     */
    exportPdf: async (filters) => {
        const response = await http.get(SalesReports.routes.exportPdf(filters), {
            responseType: 'blob',
        });

        const contentType = response.headers?.['content-type'] || '';

        if (! contentType.includes('application/pdf')) {
            throw new Error(await SalesReports.readError(response.data));
        }

        const disposition = response.headers?.['content-disposition'] || '';
        const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)"?/i);

        return {
            blob: response.data,
            fileName: match ? decodeURIComponent(match[1]) : 'avance-ventas.pdf',
        };
    },

    /**
     * Saca el mensaje de error de una respuesta que llegó como `blob`.
     *
     * @returns {Promise<string>} El `message` del backend si lo hay; si no, el
     *   texto plano tal cual (así el 500 de Chromium sigue siendo visible).
     */
    readError: async (blob) => {
        try {
            const text = await blob.text();

            try {
                const parsed = JSON.parse(text);

                if (parsed?.message) {
                    return parsed.message;
                }
            } catch {
                // No era JSON: se devuelve el texto plano.
            }

            return text.trim();
        } catch {
            return '';
        }
    },
};

export default SalesReports;