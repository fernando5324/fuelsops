<?php

namespace App\Services\Pricing;

use App\Models\PlantProduct;
use App\Models\WholesalerPrice;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Administración de precios (ADR-010, Fases 8+).
 *
 * Operaciones CRUD de la pantalla de precios sobre la relación
 * planta+producto (plant_products) y sus precios por mayorista
 * (wholesaler_prices). Toda escritura que cambie un precio dispara el
 * recálculo con el motor y el registro del snapshot histórico
 * (PriceHistoryService, con dedupe por cálculo idéntico).
 *
 * Reglas (ADR-010 §24): un precio ausente se guarda como NULL ("sin precio"),
 * jamás como 0. Los valores numéricos se normalizan a DECIMAL(12,4) como
 * string para no introducir errores de float.
 */
class PricingAdminService
{
    public function __construct(
        private readonly PriceCalculator $calculator,
        private readonly PriceHistoryService $history,
        private readonly PricingConfigurationService $configurations,
    ) {
    }

    /**
     * Configuración activa del tenant (lanza si no existe).
     */
    public function activeConfiguration(): \App\Models\PricingConfiguration
    {
        $config = $this->configurations->active();

        if ($config === null) {
            throw new RuntimeException('no_active_configuration');
        }

        return $config;
    }

    /**
     * Resultado del motor para un plant_product con la configuración activa
     * (null si no hay precios válidos).
     */
    public function calculate(PlantProduct $plantProduct): ?PricingResult
    {
        return $this->calculator->calculate($plantProduct, $this->activeConfiguration());
    }

    /**
     * Guarda (crea o actualiza) el precio de un mayorista para un
     * plant_product y recalcula el motor + historial en transacción.
     *
     * @param  string|null  $price  Precio con precisión de 4 decimales (o null
     *                              para "sin precio"; nunca 0).
     * @return \App\Models\PricingConfiguration
     */
    public function savePrice(
        PlantProduct $plantProduct,
        int $wholesalerId,
        ?string $price,
    ): \App\Models\PricingConfiguration {
        $config = $this->activeConfiguration();

        DB::transaction(function () use ($plantProduct, $wholesalerId, $price) {
            $normalized = $this->normalizePrice($price);

            WholesalerPrice::updateOrCreate(
                ['plant_product_id' => $plantProduct->id, 'wholesaler_id' => $wholesalerId],
                ['price' => $normalized],
            );

            $result = $this->calculator->calculate($plantProduct, $config);

            if ($result !== null) {
                $this->history->record($plantProduct, $result, $config);
            }
        });

        return $config;
    }

    /**
     * Guarda varios precios de un plant_product en una sola transacción
     * (edición del modal). Devuelve la configuración utilizada.
     *
     * @param  array<int, array{wholesaler_id: int, price: string|null}>  $prices
     */
    public function savePrices(
        PlantProduct $plantProduct,
        array $prices,
    ): \App\Models\PricingConfiguration {
        $config = $this->activeConfiguration();

        DB::transaction(function () use ($plantProduct, $prices, $config) {
            foreach ($prices as $entry) {
                WholesalerPrice::updateOrCreate(
                    ['plant_product_id' => $plantProduct->id, 'wholesaler_id' => (int) $entry['wholesaler_id']],
                    ['price' => $this->normalizePrice($entry['price'] ?? null)],
                );
            }

            $result = $this->calculator->calculate($plantProduct, $config);

            if ($result !== null) {
                $this->history->record($plantProduct, $result, $config);
            }
        });

        return $config;
    }

    /**
     * Preview en vivo del motor con una edición aún no persistida.
     *
     * @param  array<int, array{wholesaler_id: int, price: string|null}>  $prices
     */
    public function preview(
        PlantProduct $plantProduct,
        array $prices,
    ): ?PricingResult {
        $config = $this->activeConfiguration();

        $rows = (new Collection($prices))
            ->filter(fn (array $entry) => $this->normalizePrice($entry['price'] ?? null) !== null)
            ->map(fn (array $entry) => [
                'wholesaler_id' => (int) $entry['wholesaler_id'],
                'price' => (string) $this->normalizePrice($entry['price'] ?? null),
            ])
            ->keyBy('wholesaler_id');

        $existing = $plantProduct->wholesalerPrices()
            ->whereNotNull('price')
            ->where('price', '>', '0')
            ->get()
            ->map(fn (WholesalerPrice $wp) => [
                'wholesaler_id' => (int) $wp->wholesaler_id,
                'price' => (string) $wp->price,
            ])
            ->keyBy('wholesaler_id');

        $rows = $existing->merge($rows)->values();

        return $this->calculator->resolve($rows, $config);
    }

    /**
     * Crea la relación planta+producto (reactiva si ya existía inactiva).
     */
    public function createRelation(int $plantId, int $productId): PlantProduct
    {
        $relation = PlantProduct::firstOrCreate(
            ['plant_id' => $plantId, 'product_id' => $productId],
            ['is_active' => true],
        );

        if (! $relation->is_active) {
            $relation->update(['is_active' => true]);
        }

        return $relation;
    }

    /**
     * Activa/desactiva la relación planta+producto (no borra precios ni
     * historial; ADR-010 §27 recomienda is_active, nunca DELETE).
     */
    public function toggleRelation(PlantProduct $plantProduct, bool $active): void
    {
        $plantProduct->update(['is_active' => $active]);
    }

    /**
     * Normaliza el precio a string con 4 decimales o null.
     *
     * 0, valores negativos o no numéricos no son precios válidos (ADR-010
     * §24): se devuelven como null ("sin precio") para no romper el motor.
     */
    private function normalizePrice(?string $price): ?string
    {
        if ($price === null || $price === '') {
            return null;
        }

        $price = (string) $price;
        $price = str_replace(',', '.', $price);

        if (! is_numeric($price)) {
            return null;
        }

        $number = (float) $price;

        if ($number <= 0) {
            return null;
        }

        return number_format($number, 4, '.', '');
    }
}