<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Resultado por fila de una importación de precios (ADR-010).
 *
 * Permite auditar cada registro procesado (new | updated | unchanged | error)
 * conservando nombres y precios para mostrar resúmenes/preview sin modificar
 * todavía las tablas definitivas.
 */
class PriceImportItem extends Model
{
    use Auditable, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'import_batch_id',
        'row_number',
        'plant_name',
        'product_name',
        'wholesaler_name',
        'previous_price',
        'new_price',
        'status',
        'error_message',
    ];

    protected $casts = [
        'row_number' => 'integer',
        'previous_price' => 'decimal:4',
        'new_price' => 'decimal:4',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(PriceImportBatch::class, 'import_batch_id');
    }
}