<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Lote de importación de precios desde Excel (ADR-010).
 *
 * Registra qué archivo se importó, cuándo, quién y el resumen de resultados
 * por fila (totales de nuevos/actualizados/sin cambios/errores).
 *
 * Estados sugeridos: pending | processing | completed | failed | cancelled.
 */
class PriceImportBatch extends Model
{
    use Auditable, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'file_name',
        'status',
        'total_rows',
        'new_rows',
        'updated_rows',
        'unchanged_rows',
        'error_rows',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'total_rows' => 'integer',
        'new_rows' => 'integer',
        'updated_rows' => 'integer',
        'unchanged_rows' => 'integer',
        'error_rows' => 'integer',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(PriceImportItem::class, 'import_batch_id');
    }

    public function wholesalerPrices(): HasMany
    {
        return $this->hasMany(WholesalerPrice::class, 'import_batch_id');
    }
}