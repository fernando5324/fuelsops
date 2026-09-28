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
     * (edición del modal) y, si viene, actualiza también su margen.
     *
     * El margen y los precios se guardan juntos porque el margen es un dato de
     * la relación: cambiarlo cambia el precio final, así que la transacción
     * recalcula el motor y registra el snapshot una sola vez.
     *
     * @param  array<int, array{wholesaler_id: int, price: string|null}>  $prices
     * @param  string|null  $margin  Margen S/ de la relación; null = no cambia.
     */
    public function savePrices(
        PlantProduct $plantProduct,
        array $prices,
        ?string $margin = null,
    ): \App\Models\PricingConfiguration {
        $config = $this->activeConfiguration();
        $normalizedMargin = $this->normalizeMargin($margin);

        DB::transaction(function () use ($plantProduct, $prices, $config, $normalizedMargin) {
            if ($normalizedMargin !== null && (string) $plantProduct->margin !== $normalizedMargin) {
                $plantProduct->update(['margin' => $normalizedMargin]);
            }

            foreach ($prices as $entry) {
                WholesalerPrice::updateOrCreate(
                    ['plant_product_id' => $plantProduct->id, 'wholesaler_id' => (int) $entry['wholesaler_id']],
                    ['price' => $this->normalizePrice($entry['price'] ?? null)],
                );
            }

            $result = $this->calculator->calculate($plantProduct->refresh(), $config);

            if ($result !== null) {
                $this->history->record($plantProduct, $result, $config);
            }
        });

        return $config;
    }

    /**
     * Preview en vivo del motor con una edición aún no persistida.
     *
     * Si viene margen se usa ese (el que el usuario está escribiendo) para que
     * el desglose refleje el resultado final antes de guardar.
     *
     * @param  array<int, array{wholesaler_id: int, price: string|null}>  $prices
     */
    public function preview(
        PlantProduct $plantProduct,
        array $prices,
        ?string $margin = null,
    ): ?PricingResult {
        $config = $this->activeConfiguration();

        // El modal manda UNA entrada por mayorista (los activos del maestro), y
        // un precio vacío significa "quitar el precio", no "dejar el anterior".
        // Por eso aquí NO se filtran los vacíos: se fusionan igual y el filtro
        // va al final.
        $submitted = (new Collection($prices))
            ->keyBy(fn (array $entry) => (int) $entry['wholesaler_id'])
            ->map(fn (array $entry) => [
                'wholesaler_id' => (int) $entry['wholesaler_id'],
                'price' => $this->normalizePrice($entry['price'] ?? null),
            ]);

        // Los precios guardados que NO vienen en el formulario (mayorista dado
        // de baja, que el modal no lista) se conservan: cuentan igual en el
        // motor que después de guardar, así que el preview no puede omitirlos.
        //
        // `->toBase()` ANTES de map() es obligatorio: `Eloquent\Collection::map()`
        // devuelve Colección base solo si algún elemento mapeado NO es un modelo,
        // así que con cero precios se quedaría en Eloquent\Collection y su
        // `merge()` haría `$array->getKey()` (500) al fusionar los precios
        // enviados por el modal.
        $existing = $plantProduct->wholesalerPrices()
            ->whereNotNull('price')
            ->where('price', '>', '0')
            ->get()
            ->toBase()
            ->map(fn (WholesalerPrice $wp) => [
                'wholesaler_id' => (int) $wp->wholesaler_id,
                'price' => (string) $wp->price,
            ])
            ->keyBy('wholesaler_id');

        // `union()` y NO `merge()`: `merge()` es `array_merge()`, que con claves
        // enteras AGREGA en vez de reemplazar (renumera), así que el precio
        // guardado se colaba siempre en la colección y el motor comparaba contra
        // el valor viejo. Con `union()` (`$a + $b`) gana la IZQUIERDA: el precio
        // del modal pisa al guardado, y un vacío lo deja sin precio de verdad.
        $rows = $submitted
            ->union($existing)
            ->values()
            ->filter(fn (array $row) => $row['price'] !== null)
            ->values();

        $previewMargin = $this->normalizeMargin($margin) ?? (string) $plantProduct->margin;

        return $this->calculator->resolve(
            $rows,
            $config,
            $previewMargin !== '' ? $previewMargin : null,
        );
    }

    /**
     * Crea la relación planta+producto.
     *
     * Reactiva la fila si ya existía inactiva **o dada de baja lógicamente**
     * (con sus precios y su historial intactos). No puede insertar una segunda
     * fila para la misma relación: el índice único
     * `uq_plant_products_tenant_plant_product` no incluye `is_deleted`, así que
     * se busca también entre las dadas de baja (`withDeleted()`).
     *
     * @param  string|null  $margin  Margen S/ de la relación. Si es null no se
     *                               escribe: al crear entra el DEFAULT de la
     *                               columna (0.1300) y al revivir se conserva el
     *                               margen que ya tenía, para no perder uno
     *                               editado a mano o importado del Excel.
     */
    public function createRelation(int $plantId, int $productId, ?string $margin = null): PlantProduct
    {
        $margin = $this->normalizeMargin($margin);

        $existing = PlantProduct::withDeleted()
            ->where('plant_id', $plantId)
            ->where('product_id', $productId)
            ->first();

        if ($existing !== null) {
            $changes = [];

            if (! $existing->is_active || $existing->is_deleted) {
                $changes['is_active'] = true;
                $changes['is_deleted'] = false;
            }

            if ($margin !== null && (string) $existing->margin !== $margin) {
                $changes['margin'] = $margin;
            }

            if ($changes !== []) {
                $existing->update($changes);
            }

            return $existing;
        }

        $attributes = [
            'plant_id' => $plantId,
            'product_id' => $productId,
            'is_active' => true,
        ];

        // Sin margen informado no se escribe la columna: entra el DEFAULT de la
        // BD (0.1300) en vez de un NULL explícito (la columna es NOT NULL).
        if ($margin !== null) {
            $attributes['margin'] = $margin;
        }

        return PlantProduct::create($attributes);
    }

    /**
     * Margen por defecto (pricing_configurations.margin) para proponerlo en la
     * UI al crear una relación. Lanza si no hay configuración activa.
     */
    public function defaultMargin(): string
    {
        return (string) $this->activeConfiguration()->margin;
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
     * Da de baja la relación planta+producto (baja lógica, `is_deleted`).
     *
     * No borra `wholesaler_prices` ni `price_calculations`: ambas tablas la
     * referencian con ON DELETE RESTRICT y su contenido es histórico
     * (ADR-010 §27/§28, sin CASCADE). Se desactiva además para que la
     * relación no quede en un estado contradictorio. Volver a crearla desde
     * la matriz la revive con sus precios intactos.
     */
    public function deleteRelation(PlantProduct $plantProduct): void
    {
        DB::transaction(function () use ($plantProduct) {
            $plantProduct->update(['is_active' => false]);
            $plantProduct->delete();
        });
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

    /**
     * Normaliza el margen de la relación a string con 4 decimales o null
     * (null = "no informado", no "cero").
     *
     * A diferencia del precio, el margen SÍ admite 0 (una relación sin margen
     * es válida: S = Q). Se rechazan los negativos y lo no numérico; quien
     * llama decide si eso es un error de validación o un "no informado".
     */
    private function normalizeMargin(?string $margin): ?string
    {
        if ($margin === null || trim($margin) === '') {
            return null;
        }

        $margin = str_replace(',', '.', trim($margin));

        if (! is_numeric($margin)) {
            return null;
        }

        if ((float) $margin < 0) {
            return null;
        }

        return number_format((float) $margin, 4, '.', '');
    }
}