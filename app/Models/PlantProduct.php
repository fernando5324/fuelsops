<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Relación Planta + Producto (ADR-010).
 *
 * Define qué productos están disponibles para cada planta; no se asume que
 * todos los productos existan en todas las plantas.
 */
class PlantProduct extends Model
{
    use Auditable, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'plant_id',
        'product_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function plant(): BelongsTo
    {
        return $this->belongsTo(Plant::class, 'plant_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function wholesalerPrices(): HasMany
    {
        return $this->hasMany(WholesalerPrice::class, 'plant_product_id');
    }

    public function priceCalculations(): HasMany
    {
        return $this->hasMany(PriceCalculation::class, 'plant_product_id');
    }
}