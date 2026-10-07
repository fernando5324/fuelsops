<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Secuencia del código de pedido por organización (ADR-020 §13).
 *
 * Existe para NO deducir el siguiente número del código anterior: el código es
 * editable y puede tener formatos distintos, así que `MAX(code) + 1` no es
 * válido. `last_number` es el último número entregado; el número inicial de la
 * secuencia es `tenant_settings.order_code_start` (ADR-021), que NO lleva el
 * avance.
 *
 * Tabla técnica: una fila por organización, sin `is_deleted` ni auditoría de
 * usuarios (los números nunca se reciclan, tampoco al restaurar de la
 * papelera). No usa `BelongsToTenant` por la misma razón que `TenantSetting`.
 */
class OrderCodeCounter extends Model
{
    protected $primaryKey = 'tenant_id';

    public $incrementing = false;

    protected $keyType = 'int';

    protected $fillable = [
        'tenant_id',
        'last_number',
    ];

    protected $casts = [
        'last_number' => 'integer',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}