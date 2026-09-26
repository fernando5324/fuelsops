<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Precio de un mayorista para un producto en una planta (ADR-010).
 *
 * Sin columnas por mayorista: un registro por (planta+producto, mayorista).
 * `price` puede ser NULL (sin precio registrado) y jamás debe confundirse
 * con un precio 0 (celda vacía == sin precio disponible).
 */
class WholesalerPrice extends Model
{
    use Auditable, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'plant_product_id',
        'wholesaler_id',
        'price',
        'import_batch_id',
    ];

    protected $casts = [
        'price' => 'decimal:4',
    ];

    public function plantProduct(): BelongsTo
    {
        return $this->belongsTo(PlantProduct::class, 'plant_product_id');
    }

    public function wholesaler(): BelongsTo
    {
        return $this->belongsTo(Wholesaler::class, 'wholesaler_id');
    }

    public function importBatch(): BelongsTo
    {
        return $this->belongsTo(PriceImportBatch::class, 'import_batch_id');
    }
}