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

    /*
    |--------------------------------------------------------------------------
    | Chromium para la exportación de PDF (ADR-018 §3/§24)
    |--------------------------------------------------------------------------
    |
    | Browsershot maneja Chromium a través de Puppeteer. Si se deja vacío,
    | Puppeteer usa el navegador que él mismo descargó al instalar. En este
    | proyecto se apunta al Chromium/Edge DEL SISTEMA: en Windows no está en el
    | PATH, así que la ruta hay que declararla.
    |
    | En Linux (contenedor) la ruta habitual es `/usr/bin/chromium`.
    |
    */

    'browsershot' => [
        'chrome_path' => env('BROWSERSHOT_CHROME_PATH'),
    ],

];