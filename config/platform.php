<?php

/*
|--------------------------------------------------------------------------
| Configuración de la plataforma
|--------------------------------------------------------------------------
|
| Ajustes que pertenecen a la PLATAFORMA, no a un cliente concreto. Se separó
| de la anterior `config/sertoco.php` porque "Sertoco" es el tenant que hoy usa
| el servicio, no el nombre del producto: con un segundo cliente, estos valores
| no deben cambiar.
|
| La identidad visual (nombre interno, paleta, formato) vive en
| `config/brand.php`; la customization por cliente en `tenants.details`.
|
*/

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

    'system_user_id' => (int) env('PLATFORM_SYSTEM_USER_ID', 999999),

    /*
    |--------------------------------------------------------------------------
    | Organización por defecto (tenant)
    |--------------------------------------------------------------------------
    |
    | Organización activa cuando no hay usuario autenticado (formulario público
    | y flujos de sistema). El usuario autenticado siempre opera dentro de su
    | propia organización (users.tenant_id).
    |
    */

    'default_tenant_id' => (int) env('PLATFORM_DEFAULT_TENANT_ID', 1),

    'default_tenant_slug' => (string) env('PLATFORM_DEFAULT_TENANT_SLUG', 'fuelsops'),

    /*
    |--------------------------------------------------------------------------
    | Chromium para la exportación de PDF (ADR-018 §3/§24)
    |--------------------------------------------------------------------------
    |
    | Browsershot maneja Chromium a través de Puppeteer. Si se deja vacío,
    | Puppeteer usa el navegador que él mismo descargó al instalar. En este
    | proyecto se apunta al Chromium DEL SISTEMA: en Windows no está en el PATH,
    | así que la ruta hay que declararla.
    |
    | ── Por qué Chrome y NO Edge en desarrollo ────────────────────────────────
    |
    | Apache de WAMP corre como servicio de Windows (`LocalSystem`, sesión 0),
    | sin escritorio y sin `USERPROFILE`. En ese contexto el binario de Edge
    | aborta al arrancar con `Code: 1002` incluso con `--version` y sin ninguna
    | bandera: no es un problema de headless ni de sandbox. Google Chrome sí
    | arranca en el mismo contexto y es el que se usa.
    |
    | Se deja el override por entorno porque en Linux (contenedor) la ruta
    | habitual es `/usr/bin/chromium`.
    |
    */

    'browsershot' => [
        'chrome_path' => env('BROWSERSHOT_CHROME_PATH'),
    ],

];