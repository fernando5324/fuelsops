<?php

namespace App\Services\Pricing;

use App\Models\PlantProduct;
use App\Models\PriceCalculation;
use App\Models\PricingConfiguration;
use Illuminate\Support\Facades\Auth;

/**
 * Historial de cálculos de precios (ADR-010 §12-§15, §28).
 *
 * Registra en `price_calculations` un snapshot JSON inmutable de cada cálculo:
 * los valores reales usados en ese momento (mejor precio del mayorista,
 * margen, IGV, percepción) y los resultados, para que un cambio posterior de
 * precio o de parámetros no altere el historial.
 *
 * Si ya existe un cálculo idéntico (mismo plant_product, misma configuración,
 * mismo mayorista ganador y mismo precio final) no se duplica (ADR-010 §21).
 */
class PriceHistoryService
{
    public function record(
        PlantProduct $plantProduct,
        PricingResult $result,
        PricingConfiguration $config,
        ?int $actorId = null,
    ): PriceCalculation {
        $existing = PriceCalculation::query()
            ->where('plant_product_id', $plantProduct->id)
            ->where('pricing_configuration_id', $config->id)
            ->where('wholesaler_price_id', $result->wholesalerPriceId)
            ->get()
            ->first(fn (PriceCalculation $calculation) => (string) ($calculation->calculation_data['results']['final_price'] ?? '') === $result->finalPrice);

        if ($existing !== null) {
            return $existing;
        }

        return PriceCalculation::create([
            'tenant_id' => $plantProduct->tenant_id,
            'plant_product_id' => $plantProduct->id,
            'wholesaler_price_id' => $result->wholesalerPriceId,
            'pricing_configuration_id' => $config->id,
            'calculation_version' => PriceCalculation::VERSION,
            'calculation_data' => $this->snapshot($plantProduct, $result, $config),
            'calculated_at' => now(),
            'created_by' => $actorId ?? (Auth::id() ?? (int) config('sertoco.system_user_id', 999999)),
        ]);
    }

    /**
     * Snapshot JSON v1.0 con las fuentes, los inputs y los resultados del
     * cálculo. Se construye una sola vez al guardar; no se regenera al leer.
     */
    private function snapshot(PlantProduct $plantProduct, PricingResult $result, PricingConfiguration $config): array
    {
        return [
            'version' => PriceCalculation::VERSION,
            'source' => [
                'plant_id' => $plantProduct->plant_id,
                'product_id' => $plantProduct->product_id,
                'wholesaler_id' => $result->wholesalerId,
                'wholesaler_price_id' => $result->wholesalerPriceId,
            ],
            'inputs' => [
                'best_price' => (float) $result->bestPrice,
                'margin' => (float) $result->margin,
                'igv_rate' => (float) $result->igvRate,
                'perception_rate' => (float) $result->perceptionRate,
            ],
            'results' => $result->toArray(),
        ];
    }
}