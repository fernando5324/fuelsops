<?php

namespace App\Services\Pricing;

use App\Models\PricingConfiguration;

/**
 * Resolución de la configuración activa de precios (ADR-010 §11).
 *
 * Devuelve la configuración vigente del tenant actual (aislada por el global
 * scope de BelongsToTenant): debe estar activa y con su rango effective_from/
 * effective_until cubriendo la fecha consultada.
 */
class PricingConfigurationService
{
    public function active(?string $at = null): ?PricingConfiguration
    {
        $moment = $at ? now()->parse($at) : now();

        return PricingConfiguration::query()
            ->where('is_active', true)
            ->get()
            ->first(fn (PricingConfiguration $config) => $config->isEffectiveAt((string) $moment));
    }
}