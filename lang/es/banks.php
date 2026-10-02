<?php

/*
|--------------------------------------------------------------------------
| Bancos (sugerencias de depósito)
|--------------------------------------------------------------------------
|
| Catálogo de bancos que ofrece el formulario de depósitos del pedido
| (`resources/js/Components/Orders/OrderDeposits.jsx`). Estaba hardcodeado en
| el componente (ADR-019 §6): al vivir en `lang/es` se traduce/edita sin tocar
| React y el `AutoComplete` sigue permitiendo escribir un banco fuera de lista.
|
| El campo `bank` de `order_deposits` es texto libre, así que esta lista son
| solo sugerencias; renombrar una entrada no altera los vouchers ya guardados.
|
*/

return [

    'list' => [
        'BCP',
        'BBVA',
        'Interbank',
        'Scotiabank',
        'Bancoficial',
        'Bancesud',
        'Citibank',
        'Credibank',
        'Mibanco',
        'Banco de la Nación',
        'Caja Arequipa',
        'Caja Piura',
        'Cajamars',
        'Otro',
    ],

];
