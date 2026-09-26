<?php

return [
    'title' => 'Importación de precios',
    'subtitle' => 'Carga un Excel con precios por mayorista (columnas C-M) y el sistema calcula el mejor precio por planta y producto (ADR-010).',

    // Subida del archivo
    'upload_title' => 'Selecciona el archivo Excel',
    'upload_hint' => 'Arrastra o haz clic para elegir. Solo .xlsx o .xls, hasta 5 MB.',
    'upload_button' => 'Analizar archivo',
    'uploading' => 'Analizando archivo...',
    'uploaded_ok' => 'Archivo analizado. Revisa el preview antes de confirmar.',

    // Vista previa
    'preview_title' => 'Vista previa de la importación',
    'file' => 'Archivo',
    'uploaded_at' => 'Subido el',
    'batch_status' => 'Estado',
    'batch_pending' => 'Pendiente',
    'batch_cancelled' => 'Cancelada',
    'batch_completed' => 'Completada',

    'summary_title' => 'Resumen',
    'total_rows' => 'Total',
    'new_rows' => 'Nuevos',
    'updated_rows' => 'Actualizados',
    'unchanged_rows' => 'Sin cambios',
    'error_rows' => 'Errores',

    'items_title' => 'Detalle de filas',
    'col_row' => 'N.º',
    'col_plant' => 'Planta',
    'col_product' => 'Producto',
    'col_wholesaler' => 'Mayorista',
    'col_previous' => 'Precio anterior',
    'col_new' => 'Precio nuevo',
    'col_status' => 'Estado',
    'col_error' => 'Detalle',

    'status_new' => 'Nuevo',
    'status_updated' => 'Actualizado',
    'status_unchanged' => 'Sin cambios',
    'status_error' => 'Error',

    // Catálogos nuevos
    'new_catalogs_title' => 'Catálogos nuevos detectados',
    'new_catalogs_hint' => 'Se crearán al confirmar la importación. Desmarca los que NO quieras crear.',
    'plants' => 'Plantas',
    'products' => 'Productos',
    'wholesalers' => 'Mayoristas',
    'no_new_catalogs' => 'No se detectaron catálogos nuevos.',

    // Comparación con el motor
    'calc_title' => 'Comparación con el motor',
    'calc_active' => 'Columna V del Excel vs. cálculo del sistema con los precios del archivo.',
    'calc_inactive' => 'No hay una configuración de precios activa; no se puede mostrar el cálculo del sistema.',
    'calc_mismatches' => '{count} fila(s) con diferencia respecto al cálculo del sistema.',
    'calc_match' => 'Coincide',
    'calc_diff' => 'Difiere',
    'calc_na' => 'n/d',
    'col_excel_final' => 'Excel (V)',
    'col_system_final' => 'Sistema',

    'confirm_button' => 'Confirmar importación',
    'confirming' => 'Confirmando importación...',
    'cancel_button' => 'Cancelar importación',
    'confirmed_ok' => 'Importación aplicada: :new precio(s) nuevo(s), :updated actualizado(s), :errors error(es).',
    'cancelled_ok' => 'Importación cancelada sin aplicar cambios.',

    // Lotes recientes
    'recent_title' => 'Importaciones recientes',
    'empty_batches' => 'Aún no hay importaciones registradas.',

    // Validación de la subida
    'file_required' => 'Selecciona un archivo Excel.',
    'file_invalid' => 'El archivo subido no es válido.',
    'file_mimes' => 'El archivo debe ser .xlsx o .xls.',
    'file_max' => 'El archivo no debe superar los 5 MB.',

    // ─────────────────────────────────────────────────────────────────────────
    // Panel de administración de precios (ADR-010, Fases 8+)
    // ─────────────────────────────────────────────────────────────────────────
    'admin_title' => 'Precios',
    'admin_subtitle' => 'Matriz de precios por planta y producto. Edita los precios por mayorista y el sistema calcula el mejor precio automáticamente.',
    'import_excel' => 'Importar de Excel',
    'export_excel' => 'Exportar a Excel',
    'new_relation' => 'Nueva relación',
    'search_hint' => 'Buscar por planta, producto o mayorista...',
    'col_final' => 'Precio final',
    'best_price' => 'Mejor precio',
    'winner' => 'Gana',
    'edit_prices' => 'Editar precios',
    'edit_prices_title' => 'Editar precios',
    'history' => 'Historial',
    'history_title' => 'Historial de precios',
    'history_empty' => 'Aún no hay cálculos registrados para esta relación.',
    'deactivate' => 'Desactivar',
    'deactivate_confirm' => '¿Desactivar esta relación? Se conservan los precios y el historial.',
    'save_prices' => 'Guardar precios',
    'price_empty_hint' => 'Deja el campo vacío para "sin precio" (nunca usar 0: cero no es un precio válido).',
    'no_price' => 'Sin precio',
    'preview_title' => 'Resultado del motor de cálculo',
    'preview_loading' => 'Calculando...',
    'preview_error' => 'No se pudo calcular el precio.',
    'no_prices_yet' => 'No hay precios válidos: ingresa al menos un precio mayor a 0.',
    // Cadena del motor de cálculo (ADR-010 §16) con la nomenclatura de
    // ADR-012 §3: P redondeado, Q sin IGV, S subtotal, T con IGV, U ajuste
    // de percepción y V precio final.
    'step_rounded' => 'Precio redondeado (P)',
    'step_purchase' => 'Precio sin IGV (Q)',
    'step_sale' => 'Subtotal (S)',
    'step_sale_igv' => 'Precio con IGV (T)',
    'step_sale_perception' => 'Ajuste percepción (U)',
    'step_final' => 'Precio final (V)',
    'col_calculated_at' => 'Calculado el',
    'col_winner' => 'Mayorista ganador',
    'col_margin' => 'Margen (R)',
    'config_none' => 'No hay una configuración de precios activa para esta organización: el motor no puede calcular.',
    'updated_ok' => 'Precios guardados y recalculados correctamente.',
    'activated_ok' => 'Relación activada.',
    'deactivated_ok' => 'Relación desactivada.',
    'relation_created' => 'Relación creada o reactivada correctamente.',
    'invalid_relation' => 'La planta o el producto indicados no son válidos.',
    'invalid_wholesaler' => 'Uno de los mayoristas indicados no es válido.',

    // ─────────────────────────────────────────────────────────────────────────
    // ADR-012: visualización de los cálculos (niveles 1-3 + fórmula)
    // ─────────────────────────────────────────────────────────────────────────
    'show_calc' => 'Ver cálculo',
    'show_calcs_all' => 'Ver cálculos',
    'calc_title' => 'Cálculo de precio',
    'calcs_title' => 'Cálculos de precios',
    'calcs_hint' => 'Cálculos de las filas visibles con los filtros y la página actuales. Despliega una fila para ver el detalle y la fórmula.',
    'calcs_empty' => 'Ninguna de las filas visibles tiene un cálculo registrado.',
    'calcs_count' => ':count fila(s) con cálculo de :total fila(s) visibles',
    'no_calc_row' => 'Sin cálculo: no hay precios válidos para esta relación.',
    'min_price' => 'Menor precio',
    'winner_wholesaler' => 'Proveedor seleccionado',
    'formula_rounded' => 'REDONDEO(:value, 4) = :result',
    'formula_purchase' => ':value ÷ :divisor = :result',
    'formula_sale' => ':value + :margin = :result',
    'formula_sale_igv' => ':value × :factor = :result',
    'formula_sale_perception' => ':value × :factor = :result',
    'formula_final' => ':value = :result',
    // El margen del motor (pricing_configurations.margin) es un MONTO absoluto
    // que se suma a Q, no una tasa: S = Q + margen. IGV y percepción sí son tasas.
    'calc_factors' => 'IGV :igv% · Margen S/ :margin · Percepción :perception%',

    // Errores (códigos guardados en price_import_items.error_message)
    'errors' => [
        'invalid_extension' => 'El archivo debe ser .xlsx o .xls.',
        'empty_file' => 'El archivo no contiene filas de datos.',
        'no_header_row' => 'No se encontró una fila de encabezado con Planta y Producto.',
        'no_wholesalers' => 'No se detectaron columnas de mayoristas (C-M).',
        'wholesalers_duplicated' => 'Hay mayoristas duplicados en los encabezados (C-M).',
        'file_missing' => 'El archivo de la importación ya no existe en el almacenamiento.',
        'batch_not_pending' => 'Este lote ya fue procesado o cancelado.',
        'no_active_configuration' => 'No hay una configuración de precios activa para esta organización.',

        // Errores por ítem (fila/columna)
        'missing_plant' => 'Fila sin planta.',
        'missing_product' => 'Fila sin producto.',
        'price_zero' => 'Precio 0 no permitido (celda vacía = sin precio).',
        'price_negative' => 'Precio negativo no permitido.',
        'price_invalid' => 'Valor de precio no numérico.',
        'catalog_not_confirmed' => 'Catálogo no confirmado para crear.',
    ],
];