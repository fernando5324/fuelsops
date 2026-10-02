<?php

return [
    'name' => 'Nombre',
    'last_name' => 'Apellido',
    'first_name' => 'Nombre',
    'full_name' => 'Nombre completo',
    'status' => 'Estado',
    'save' => 'Guardar',
    'cancel' => 'Cancelar',
    'edit' => 'Editar',
    'delete' => 'Eliminar',
    'actions' => 'Acciones',
    'active' => 'Activo',
    'inactive' => 'Inactivo',
    'all_statuses' => 'Todos los estados',
    'back' => 'Volver',
    'search' => 'Buscar',
    'filter' => 'Filtrar',
    'all' => 'Todos',
    'yes' => 'Sí',
    'no' => 'No',
    'confirm' => 'Confirmar',
    'close' => 'Cerrar',
    'loading' => 'Cargando...',
    'required' => 'Campo obligatorio',
    'submit' => 'Guardar',
    'reset' => 'Limpiar',
    'saved' => 'Guardado correctamente.',
    'view' => 'Ver',
    'download' => 'Descargar',
    'files' => 'Archivos',
    'records_found' => 'registros',
    'email_placeholder' => 'correo@ejemplo.com',
    'password_min' => 'Mínimo 8 caracteres',
    'password_mismatch' => 'Las contraseñas no coinciden',
    'no_data' => 'No hay datos',
    'confirm_delete' => '¿Eliminar este registro?',
    'edit_record' => 'Editar registro',
    'create_record' => 'Nuevo registro',
    'add' => 'Agregar',
    'create' => 'Crear',
    'save_changes' => 'Guardar cambios',
    'dash' => '-',
    'number' => 'N.°',
    'created_at' => 'Creado el',
    'updated_at' => 'Actualizado el',
    'created_by' => 'Creado por',
    'updated_by' => 'Actualizado por',
    'online' => 'En línea',
    'offline' => 'Sin conexión',
    'autocomplete' => 'Autocompletado',

    // Nombre del producto. Es el nombre INTERNO (config/brand.name = fuels-ops),
    // no el cliente: en el panel, la cabecera y el título muestran `tenants.name`
    // a través de la prop `brand`. Esta clave solo se usa en textos internos de
    // la plataforma, nunca como título de página.
    'brand' => config('brand.name', 'fuels-ops'),

    // Etiqueta del preset de colores de estados del ColorPicker (los colores
    // son semánticos, no de marca, así que no vienen de `brand.colors`).
    'statuses_preset' => 'Estados',

    /*
     * Sustantivos y etiquetas compartidos por varios módulos.
     *
     * Los módulos los referencian con `__('common.…')` en vez de repetir el
     * mismo texto en `order.php`, `pricing.php` y `reports.php` (ADR-019 §6):
     * un cambio de redacción se hace una sola vez. Los textos que solo se
     * parecen (pero no son iguales, como "Total galones" vs "Total de
     * galones") siguen en su archivo de módulo.
     */
    'plant' => 'Planta',
    'product' => 'Producto',
    'wholesaler' => 'Mayorista',
    'gallons' => 'Galones',
    'margin' => 'Margen',
    'customer' => 'Cliente',
    'driver' => 'Conductor',
    'vehicle' => 'Vehículo',
    'pending' => 'Pendiente',
    'total_gallons' => 'Total galones',
    'sales_report' => 'Avance de ventas',

    'try_again' => 'Reintentar',
    'undo' => 'Deshacer',
];