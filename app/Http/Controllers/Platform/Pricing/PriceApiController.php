<?php

namespace App\Http\Controllers\Platform\Pricing;

use App\Http\Controllers\Controller;
use App\Models\Plant;
use App\Models\PlantProduct;
use App\Models\Product;
use App\Models\Wholesaler;
use App\Models\WholesalerPrice;
use App\Services\Pricing\PricingAdminService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * APIs JSON del módulo de precios (ADR-010, Fases 8+).
 *
 * El preview del motor responde JSON (se consume con axios desde el modal de
 * edición, sin recargar la página). El CRUD responde redirect + flash y se
 * consume con mutaciones Inertia (router.post/put/delete), igual que los
 * catálogos.
 */
class PriceApiController extends Controller
{
    protected function flashOk(string $key): RedirectResponse
    {
        return back()->with('flash', ['success' => __($key)]);
    }

    /**
     * Preview en vivo del motor de cálculo con una edición no persistida.
     */
    public function preview(Request $request, PricingAdminService $pricing): JsonResponse
    {
        $data = $request->validate([
            'plant_product_id' => ['required', 'integer'],
            'prices' => ['required', 'array'],
            'prices.*.wholesaler_id' => ['required', 'integer'],
            'prices.*.price' => ['nullable', 'string', 'max:20'],
            'margin' => ['nullable', 'string', 'max:20', 'regex:/^\d{1,10}(\.\d{1,4})?$/'],
        ]);

        $plantProduct = PlantProduct::findOrFail((int) $data['plant_product_id']);

        try {
            $result = $pricing->preview($plantProduct, $data['prices'], $data['margin'] ?? null);
        } catch (RuntimeException) {
            return response()->json([
                'ok' => false,
                'message' => __('pricing.no_active_configuration'),
                'result' => null,
            ]);
        }

        return response()->json([
            'ok' => $result !== null,
            'message' => $result === null ? __('pricing.no_prices_yet') : null,
            'result' => $result === null ? null : [
                'wholesaler_id' => $result->wholesalerId,
                'best_price' => $result->bestPrice,
                'rounded_price' => $result->roundedPrice,
                'purchase_price' => $result->purchasePrice,
                'margin' => $result->margin,
                'igv_rate' => $result->igvRate,
                'perception_rate' => $result->perceptionRate,
                'sale_price' => $result->salePrice,
                'sale_price_with_igv' => $result->salePriceWithIgv,
                'sale_price_with_perception' => $result->salePriceWithPerception,
                'final_price' => $result->finalPrice,
            ],
        ]);
    }

    /**
     * Guarda el lote completo de precios de un plant_product (modal de
     * edición). Recalcula el motor y registra el snapshot.
     */
    public function store(Request $request, PricingAdminService $pricing): RedirectResponse
    {
        $data = $request->validate([
            'plant_product_id' => ['required', 'integer'],
            'prices' => ['required', 'array', 'max:50'],
            'prices.*.wholesaler_id' => ['required', 'integer'],
            'prices.*.price' => ['nullable', 'string', 'max:20'],
            'margin' => ['nullable', 'string', 'max:20', 'regex:/^\d{1,10}(\.\d{1,4})?$/'],
        ]);

        $plantProduct = PlantProduct::findOrFail((int) $data['plant_product_id']);

        if (! $this->wholesalersExist(array_column($data['prices'], 'wholesaler_id'))) {
            return back()->withErrors(['prices' => __('pricing.invalid_wholesaler')]);
        }

        try {
            $pricing->savePrices($plantProduct, $data['prices'], $data['margin'] ?? null);
        } catch (RuntimeException) {
            return back()->with('flash', ['error' => __('pricing.no_active_configuration')]);
        }

        return $this->flashOk('pricing.updated_ok');
    }

    /**
     * Actualiza un precio individual (null limpia la celda = "sin precio").
     */
    public function update(Request $request, WholesalerPrice $wholesalerPrice, PricingAdminService $pricing): RedirectResponse
    {
        $data = $request->validate([
            'price' => ['nullable', 'string', 'max:20'],
        ]);

        try {
            $pricing->savePrice(
                $wholesalerPrice->plantProduct,
                (int) $wholesalerPrice->wholesaler_id,
                $data['price'] ?? null,
            );
        } catch (RuntimeException) {
            return back()->with('flash', ['error' => __('pricing.no_active_configuration')]);
        }

        return $this->flashOk('pricing.updated_ok');
    }

    /**
     * Limpia el precio de un mayorista (lo deja en NULL, no lo elimina).
     */
    public function destroy(WholesalerPrice $wholesalerPrice, PricingAdminService $pricing): RedirectResponse
    {
        try {
            $pricing->savePrice(
                $wholesalerPrice->plantProduct,
                (int) $wholesalerPrice->wholesaler_id,
                null,
            );
        } catch (RuntimeException) {
            return back()->with('flash', ['error' => __('pricing.no_active_configuration')]);
        }

        return $this->flashOk('pricing.updated_ok');
    }

    /**
     * Crea una relación planta+producto (reactiva si ya existía inactiva).
     */
    public function storeRelation(Request $request, PricingAdminService $pricing): RedirectResponse
    {
        $data = $request->validate([
            'plant_id' => ['required', 'integer'],
            'product_id' => ['required', 'integer'],
            'margin' => ['nullable', 'string', 'max:20', 'regex:/^\d{1,10}(\.\d{1,4})?$/'],
        ]);

        if ($this->catalogExists(Plant::class, (int) $data['plant_id'])
            && $this->catalogExists(Product::class, (int) $data['product_id'])) {
            $pricing->createRelation(
                (int) $data['plant_id'],
                (int) $data['product_id'],
                $data['margin'] ?? null,
            );

            return $this->flashOk('pricing.relation_created');
        }

        return back()->withErrors(['relation' => __('pricing.invalid_relation')]);
    }

    /**
     * Historial de cálculos de un plant_product (snapshots append-only).
     */
    public function history(PlantProduct $plantProduct): JsonResponse
    {
        $history = $plantProduct->priceCalculations()
            ->with('createdBy:id,name')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($calculation) => [
                'id' => $calculation->id,
                'calculated_at' => $calculation->calculated_at,
                'created_by' => $calculation->createdBy?->name ?? '—',
                'source' => $calculation->calculation_data['source'] ?? [],
                'inputs' => $calculation->calculation_data['inputs'] ?? [],
                'results' => $calculation->calculation_data['results'] ?? [],
            ]);

        return response()->json(['history' => $history]);
    }

    /**
     * Activa/desactiva una relación planta+producto.
     */
    public function updateRelation(Request $request, PlantProduct $plantProduct, PricingAdminService $pricing): RedirectResponse
    {
        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $pricing->toggleRelation($plantProduct, (bool) $data['is_active']);

        return $this->flashOk($data['is_active'] ? 'pricing.activated_ok' : 'pricing.deactivated_ok');
    }

    /**
     * Da de baja la relación planta+producto (baja lógica, `is_deleted`).
     *
     * Solo el dueño (is_owner), igual que enviar un pedido a la papelera
     * (ADR-011). El binding de {plant_product} usa los global scopes: una
     * relación ya dada de baja o de otra organización devuelve 404.
     * Los precios y el historial NO se borran (ADR-010 §27/§28).
     */
    public function destroyRelation(PlantProduct $plantProduct, PricingAdminService $pricing): RedirectResponse
    {
        abort_unless((bool) auth()->user()?->is_owner, 403);

        $pricing->deleteRelation($plantProduct);

        return $this->flashOk('pricing.relation_deleted');
    }

    private function wholesalersExist(array $ids): bool
    {
        $ids = array_values(array_unique(array_filter($ids)));

        if ($ids === []) {
            return true;
        }

        return Wholesaler::query()->whereIn('id', $ids)->count() === count($ids);
    }

    private function catalogExists(string $modelClass, int $id): bool
    {
        return $modelClass::query()->whereKey($id)->exists();
    }
}