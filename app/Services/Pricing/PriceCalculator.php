<?php

namespace App\Services\Pricing;

use App\Models\PlantProduct;
use App\Models\PricingConfiguration;
use App\Models\WholesalerPrice;
use Illuminate\Support\Collection;

use function bcadd;
use function bccomp;
use function bcdiv;
use function bcmul;

/**
 * Motor de cálculo de precios (ADR-010 §16).
 *
 * Reproduce de forma independiente del Excel la lógica de sus columnas N-V:
 *
 *   Paso 1-3: mejores precios válidos y mayorista ganador (desempate
 *             determinístico por wholesaler_id ASC).
 *   Paso 4:   P = ROUND(N, 4)                       -> rounded_price
 *   Paso 5:   Q = P / (1 + igv_rate)                -> purchase_price
 *   Paso 6:   R = margin (pricing_configurations)   -> margin
 *   Paso 7:   S = Q + margin                        -> sale_price
 *   Paso 8:   T = S * (1 + igv_rate)                -> sale_price_with_igv
 *   Paso 9:   U = T * (1 + perception_rate)         -> sale_price_with_perception
 *   Paso 10:  V = U                                 -> final_price
 *
 * Solo se consideran precios válidos (NOT NULL y > 0); una celda vacía de un
 * mayorista representa "sin precio disponible" y jamás debe tomar el valor 0
 * (ADR-010 §24).
 *
 * La cadena se calcula con la precisión interna de `Decimal` (12 decimales) y
 * cada resultado se almacena (y se usa como entrada del siguiente paso) con
 * DECIMAL(12,4), de forma reproducible tipo hoja de cálculo.
 */
class PriceCalculator
{
    public function __construct(
        private readonly PricingConfigurationService $configurations,
    ) {
    }

    /**
     * Calcula el precio de un plant_product usando la configuración activa
     * del tenant actual.
     *
     * @throws \RuntimeException si no existe una configuración de precios activa.
     */
    public function forPlantProduct(PlantProduct $plantProduct): ?PricingResult
    {
        $config = $this->configurations->active();

        if ($config === null) {
            throw new \RuntimeException(
                'No existe una configuración de precios activa para la organización.'
            );
        }

        return $this->calculate($plantProduct, $config);
    }

    /**
     * Ejecuta los 10 pasos del motor con una configuración explícita.
     *
     * Devuelve null cuando el plant_product no tiene ningún precio válido
     * (ningún mayorista con precio > 0).
     */
    public function calculate(PlantProduct $plantProduct, PricingConfiguration $config): ?PricingResult
    {
        $prices = $plantProduct->wholesalerPrices()
            ->whereNotNull('price')
            ->where('price', '>', '0')
            ->get()
            ->map(fn (WholesalerPrice $price) => $this->winnerRow($price));

        return $this->resolve($prices, $config);
    }

    /**
     * Resuelve el ganador y construye el resultado a partir de una colección
     * de filas de precio (cada una con wholesaler_id y price).
     *
     * Lo usan `calculate()` (precios persistidos) y el preview de la
     * importación (precios nuevos aún sin persistir), manteniendo una única
     * fuente de verdad para la cadena de cálculo (ADR-010 §16-§17).
     *
     * @param  Collection<int, array{wholesaler_id: int, price: string}>  $priceRows
     */
    public function resolve(Collection $priceRows, PricingConfiguration $config): ?PricingResult
    {
        if ($priceRows->isEmpty()) {
            return null;
        }

        $winner = $priceRows
            ->sort(function (array $a, array $b) {
                $cmp = bccomp($a['price'], $b['price'], 4);

                return $cmp !== 0 ? $cmp : ($a['wholesaler_id'] <=> $b['wholesaler_id']);
            })
            ->first();

        return $this->buildResult(
            (int) $winner['wholesaler_id'],
            $winner['wholesaler_price_id'] ?? null,
            $winner['price'],
            $config,
        );
    }

    /**
     * Normaliza un registro de WholesalerPrice a fila de cálculo.
     *
     * @return array{wholesaler_price_id: int, wholesaler_id: int, price: string}
     */
    private function winnerRow(WholesalerPrice $price): array
    {
        return [
            'wholesaler_price_id' => (int) $price->id,
            'wholesaler_id' => (int) $price->wholesaler_id,
            'price' => (string) $price->price,
        ];
    }

    private function buildResult(
        int $wholesalerId,
        ?int $wholesalerPriceId,
        string $bestPrice,
        PricingConfiguration $config,
    ): PricingResult {
        $wholesalerPriceId ??= 0;

        $roundedPrice = Decimal::round($bestPrice, 4);                    // P
        $igv = (string) $config->igv_rate;                                // 0.1800
        $margin = (string) $config->margin;                               // 0.1300
        $perception = (string) $config->perception_rate;                  // 0.0100

        $onePlusIgv = bcadd('1', $igv, Decimal::$scale);

        $purchasePrice = bcdiv($roundedPrice, $onePlusIgv, Decimal::$scale);   // Q
        $salePrice = bcadd($purchasePrice, $margin, Decimal::$scale);           // S
        $salePriceWithIgv = bcmul($salePrice, $onePlusIgv, Decimal::$scale);    // T
        $salePriceWithPerception = bcmul(
            $salePriceWithIgv,
            bcadd('1', $perception, Decimal::$scale),
            Decimal::$scale
        );                                                                      // U
        $finalPrice = $salePriceWithPerception;                                 // V

        return new PricingResult(
            plantProductId: 0,
            wholesalerId: $wholesalerId,
            wholesalerPriceId: $wholesalerPriceId,
            bestPrice: $bestPrice,
            roundedPrice: $roundedPrice,
            purchasePrice: Decimal::round($purchasePrice, 4),
            margin: $margin,
            igvRate: $igv,
            perceptionRate: $perception,
            salePrice: Decimal::round($salePrice, 4),
            salePriceWithIgv: Decimal::round($salePriceWithIgv, 4),
            salePriceWithPerception: Decimal::round($salePriceWithPerception, 4),
            finalPrice: Decimal::round($finalPrice, 4),
        );
    }
}