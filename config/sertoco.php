<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Usuario sistema
    |--------------------------------------------------------------------------
    |
    | Id del usuario "sistema" usado por el formulario público, las semillas
    | y los cambios automáticos del sistema. Nunca debe autenticarse
    | (su contraseña está vacía). Ver ADR-005.
    |
    */

    'system_user_id' => (int) env('SERTOCO_SYSTEM_USER_ID', 999999),

    /*
    |--------------------------------------------------------------------------
    | Organización por defecto (tenant)
    |--------------------------------------------------------------------------
    |
    | Organización activa cuando no hay usuario autenticado (formulario público
    | y flujos de sistema). Por ahora es "Sertoco" (id 1). El usuario autenticado
    | siempre opera dentro de su propia organización (users.tenant_id).
    |
    */

    'default_tenant_id' => (int) env('SERTOCO_DEFAULT_TENANT_ID', 1),

    'default_tenant_slug' => (string) env('SERTOCO_DEFAULT_TENANT_SLUG', 'sertoco'),

];