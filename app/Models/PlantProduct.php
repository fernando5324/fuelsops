<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\LogicalDelete;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Relación Planta + Producto (ADR-010).
 *
 * Define qué productos están disponibles para cada planta; no se asume que
 * todos los productos existan en todas las plantas.
 *
 * Baja lógica (`is_deleted`): `wholesaler_prices` y `price_calculations` la
 * referencian con ON DELETE RESTRICT y su información es histórica
 * (ADR-010 §27/§28), así que la eliminación nunca es física. Al darla de baja
 * se conservan sus precios y sus snapshots: volver a crear la misma
 * planta+producto la revive (el índice único no incluye `is_deleted`).
 * Consistente con el resto del panel, que usa `is_active` para desactivar y
 * `is_deleted` para eliminar.
 *
 * `margin` es el margen S/ **de esta relación** (columna R del Excel), un monto
 * absoluto que el motor suma a Q (S = Q + margen). IGV y percepción siguen
 * siendo globales (pricing_configurations).
 */
class PlantProduct extends Model
{
    use Auditable, BelongsToTenant, LogicalDelete;

    protected $fillable = [
        'tenant_id',
        'plant_id',
        'product_id',
        'margin',
        'is_active',
        'is_deleted',
    ];

    protected $casts = [
        'margin' => 'decimal:4',
        'is_active' => 'boolean',
        'is_deleted' => 'boolean',
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