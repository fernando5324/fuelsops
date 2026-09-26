<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Parámetros del motor de cálculo de precios (ADR-010).
 *
 * Los porcentajes se almacenan como decimales (0.13, 0.18, 0.01), no como
 * enteros (13, 18, 1). Puede versionarse con effective_from/effective_until.
 */
class PricingConfiguration extends Model
{
    use Auditable, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'margin',
        'igv_rate',
        'perception_rate',
        'is_active',
        'effective_from',
        'effective_until',
    ];

    protected $casts = [
        'margin' => 'decimal:4',
        'igv_rate' => 'decimal:4',
        'perception_rate' => 'decimal:4',
        'is_active' => 'boolean',
        'effective_from' => 'datetime',
        'effective_until' => 'datetime',
    ];

    public function priceCalculations(): HasMany
    {
        return $this->hasMany(PriceCalculation::class, 'pricing_configuration_id');
    }

    public function isEffectiveAt(?string $date = null): bool
    {
        $at = $date ? now()->parse($date) : now();

        if (! $this->is_active) {
            return false;
        }

        if ($this->effective_from && $at->lt($this->effective_from)) {
            return false;
        }

        if ($this->effective_until && $at->gt($this->effective_until)) {
            return false;
        }

        return true;
    }
}