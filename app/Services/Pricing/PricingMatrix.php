<?php

namespace App\Services\Pricing;

use App\Models\PlantProduct;
use App\Models\WholesalerPrice;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Resolución de la matriz de precios de referencia (ADR-010) para un conjunto
 * de líneas de pedido, con la MISMA regla que usa el motor y que muestran las
 * columnas del detalle del pedido:
 *
 *  1. `plant_products` resuelve (planta, producto) -> relación, y trae su
 *     `margin` (monto absoluto en S/ por galón, columna R del Excel). Se leen
 *     con `withDeleted()`: una relación dada de baja conserva sus precios y su
 *     margen para los pedidos históricos (mismo criterio que
 *     `OrderService::attachPricing()`).
 *  2. `wholesaler_prices` resuelve el precio de COMPRA de la celda
 *     (relación, mayorista) tomando `MIN(price)` y solo con `price > 0`: una
 *     celda vacía (NULL) o con 0 explícito equivale a "sin precio disponible"
 *     y no se inventa un 0.
 *
 * Se extrajo desde `OrderService::pricingFor()` (ADR-017) para que el detalle
 * del pedido y el reporte "Avance de ventas" compartan una sola fuente de
 * verdad de esta regla: si mañana el motor cambia cómo se elige el precio, los
 * dos lugares cambian juntos.
 */
class PricingMatrix
{
    /**
     * @param  iterable<int, array{plant_id:int, product_id:int, wholesaler_id:int}>  $lines
     * @return array{
     *     purchases: array<string,string>,
     *     margins: array<string,string>
     * }
     */
    public function resolve(iterable $lines): array
    {
        $empty = ['purchases' => [], 'margins' => []];

        $unique = [];

        foreach ($lines as $line) {
            $unique[self::relationKey((int) $line['plant_id'], (int) $line['product_id'])]
                [$line['wholesaler_id']] = (int) $line['wholesaler_id'];
        }

        if ($unique === []) {
            return $empty;
        }

        $plantIds = [];
        $productIds = [];
        $wholesalerIds = [];

        foreach ($unique as $key => $wholesalers) {
            [$plantId, $productId] = self::splitRelationKey($key);
            $plantIds[$plantId] = $plantId;
            $productIds[$productId] = $productId;

            foreach ($wholesalers as $wholesalerId) {
                $wholesalerIds[$wholesalerId] = $wholesalerId;
            }
        }

        $relations = PlantProduct::withDeleted()
            ->whereIn('plant_id', $plantIds)
            ->whereIn('product_id', $productIds)
            ->get()
            ->keyBy(fn (PlantProduct $relation) => self::relationKey((int) $relation->plant_id, (int) $relation->product_id));

        if ($relations->isEmpty()) {
            return $empty;
        }

        $prices = $this->cheapestPrices(
            $relations->pluck('id')->all(),
            array_values($wholesalerIds)
        );

        $purchases = [];
        $margins = [];

        foreach ($unique as $relationKey => $wholesalers) {
            $relation = $relations->get($relationKey);

            if ($relation === null) {
                continue;
            }

            $margins[$relationKey] = (string) $relation->margin;

            foreach ($wholesalers as $wholesalerId) {
                $cell = self::cellKey((int) $relation->id, $wholesalerId);

                if (isset($prices[$cell])) {
                    $purchases[$relationKey . '-' . $wholesalerId] = $prices[$cell];
                }
            }
        }

        return ['purchases' => $purchases, 'margins' => $margins];
    }

    /**
     * MIN(price) por celda (relación, mayorista), solo con precios válidos.
     *
     * @param  array<int>  $plantProductIds
     * @param  array<int>  $wholesalerIds
     * @return array<string,string>
     */
    private function cheapestPrices(array $plantProductIds, array $wholesalerIds): array
    {
        if ($plantProductIds === [] || $wholesalerIds === []) {
            return [];
        }

        return WholesalerPrice::query()
            ->whereIn('wholesaler_id', $wholesalerIds)
            ->where('price', '>', '0')
            ->whereIn('plant_product_id', $plantProductIds)
            ->select('plant_product_id', 'wholesaler_id', DB::raw('MIN(price) AS price'))
            ->groupBy('plant_product_id', 'wholesaler_id')
            ->get()
            ->mapWithKeys(
                fn (WholesalerPrice $price) => [
                    self::cellKey((int) $price->plant_product_id, (int) $price->wholesaler_id) => (string) $price->price,
                ]
            )
            ->all();
    }

    /**
     * El margen es de la RELACIÓN (planta + producto); el precio de compra es de
     * la CELDA (planta + producto + mayorista).
     */
    public static function relationKey(int $plantId, int $productId): string
    {
        return "{$plantId}-{$productId}";
    }

    public static function cellKey(int $plantProductId, int $wholesalerId): string
    {
        return "{$plantProductId}-{$wholesalerId}";
    }

    /** @return array{0:int, 1:int} */
    private static function splitRelationKey(string $key): array
    {
        [$plantId, $productId] = explode('-', $key);

        return [(int) $plantId, (int) $productId];
    }

    /**
     * Coincidencia de una línea ya resuelta, para quien solo tenga el modelo.
     *
     * @return array{plant_id:int, product_id:int, wholesaler_id:int}
     */
    public static function lineFrom(mixed $line): array
    {
        return [
            'plant_id' => (int) $line->plant_id,
            'product_id' => (int) $line->product_id,
            'wholesaler_id' => (int) $line->wholesaler_id,
        ];
    }

    /**
     * @param  Collection<int, mixed>  $lines
     * @return array<int, array{plant_id:int, product_id:int, wholesaler_id:int}>
     */
    public static function linesFrom(Collection $lines): array
    {
        return $lines->map(fn ($line) => self::lineFrom($line))->values()->all();
    }
}
