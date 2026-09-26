<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Resultado histórico de un cálculo de precios (ADR-010).
 *
 * Tabla append-only: una vez guardado, el registro no se actualiza ni se
 * elimina. `calculation_data` es un snapshot JSON inmutable con los valores
 * reales utilizados en el momento del cálculo (mejor precio, margen, IGV,
 * percepción y resultados). No se reconstruye dinámicamente al consultar.
 *
 * Por inmutabilidad no usa `Auditable`/`updated_at`; `created_by` se asigna
 * explícitamente por el servicio que registra el cálculo.
 */
class PriceCalculation extends Model
{
    use BelongsToTenant;

    public const VERSION = '1.0';

    protected $table = 'price_calculations';

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'plant_product_id',
        'wholesaler_price_id',
        'pricing_configuration_id',
        'calculation_version',
        'calculation_data',
        'calculated_at',
        'created_by',
    ];

    protected $casts = [
        'calculation_data' => 'array',
        'calculated_at' => 'datetime',
    ];

    public function plantProduct(): BelongsTo
    {
        return $this->belongsTo(PlantProduct::class, 'plant_product_id');
    }

    public function wholesalerPrice(): BelongsTo
    {
        return $this->belongsTo(WholesalerPrice::class, 'wholesaler_price_id');
    }

    public function pricingConfiguration(): BelongsTo
    {
        return $this->belongsTo(PricingConfiguration::class, 'pricing_configuration_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}