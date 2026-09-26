/**
 * Service del módulo de precios (importación desde Excel).
 * URLs para Inertia: las páginas navegan con router.get/post.
 */
const base = '/precios/importar';

export default {
    routes: {
        index: base,
        upload: base,
        preview: (batchId) => `${base}/${batchId}/preview`,
        confirm: (batchId) => `${base}/${batchId}`,
        cancel: (batchId) => `${base}/${batchId}/cancelar`,
    },
};