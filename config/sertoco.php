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

];