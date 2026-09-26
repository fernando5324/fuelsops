<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Registro histórico de cada eliminación lógica de un pedido (ADR-011).
 *
 * - Un pedido eliminado (orders.is_deleted = 1) tiene un registro con
 *   `restored_at IS NULL`; al restaurar se cierra ese registro.
 * - Una nueva eliminación crea otro registro (historial completo).
 * - Es un registro permanente: NO usa LogicalDelete (nunca se elimina).
 */
class OrderDeletion extends Model
{
    use Auditable, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'order_id',
        'reason',
        'deleted_at',
        'deleted_by',
        'snapshot',
        'affected_media_ids',
        'restored_at',
        'restored_by',
    ];

    protected $casts = [
        'deleted_at' => 'datetime',
        'snapshot' => 'array',
        'affected_media_ids' => 'array',
        'restored_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function restoredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'restored_by');
    }
}