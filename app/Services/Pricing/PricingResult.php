<?php

namespace App\Services\Pricing;

/**
 * Resultado del motor de cálculo de precios (ADR-010).
 *
 * Value object inmutable. Todos los montos son strings con precisión decimal
 * exacta (nunca float). Los valores almacenados corresponden a cada etapa del
 * motor: P (redondeado), Q (compra), R (margen), S (venta), T (venta+IGV),
 * U (venta+percepción) y V (precio final).
 */
class PricingResult
{
    public function __construct(
        public readonly int $plantProductId,
        public readonly int $wholesalerId,
        public readonly int $wholesalerPriceId,
        public readonly string $bestPrice,
        public readonly string $roundedPrice,
        public readonly string $purchasePrice,
        public readonly string $margin,
        public readonly string $igvRate,
        public readonly string $perceptionRate,
        public readonly string $salePrice,
        public readonly string $salePriceWithIgv,
        public readonly string $salePriceWithPerception,
        public readonly string $finalPrice,
    ) {
    }

    /** toArray con montos numéricos para el snapshot JSON. */
    public function toArray(): array
    {
        return [
            'best_price' => (float) $this->bestPrice,
            'rounded_price' => (float) $this->roundedPrice,
            'purchase_price' => (float) $this->purchasePrice,
            'sale_price' => (float) $this->salePrice,
            'sale_price_with_igv' => (float) $this->salePriceWithIgv,
            'sale_price_with_perception' => (float) $this->salePriceWithPerception,
            'final_price' => (float) $this->finalPrice,
        ];
    }
}