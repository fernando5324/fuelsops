<?php

namespace App\Http\Controllers\Platform\Pricing;

use App\Exports\PricesExport;
use App\Http\Controllers\Controller;
use App\Models\Plant;
use App\Models\PlantProduct;
use App\Models\Product;
use App\Models\Wholesaler;
use App\Services\Pricing\PricingAdminService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Pantalla de administración de precios (ADR-010, Fases 8+).
 *
 * Vista Inertia `Platform/Pricing/Index`: matriz de relaciones
 * planta+producto con precios por mayorista y el resultado del motor de
 * cálculo por fila. El CRUD y el preview del motor viven en
 * PriceApiController (rutas /api/pricing/*).
 */
class PriceController extends Controller
{
    public function index(Request $request, PricingAdminService $pricing): Response
    {
        $filter = $request->only(['q', 'plant_id', 'product_id', 'active']);

        $paginator = $this->queryFor($request)
            ->orderBy('plant_id')
            ->orderBy('product_id')
            ->paginate(15)
            ->withQueryString();

        $rows = $paginator
            ->getCollection()
            ->map(fn (PlantProduct $pp) => $this->rowFor($pp, $pricing))
            ->values();

        return Inertia::render('Platform/Pricing/Index', [
            'rows' => [
                'data' => $rows,
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
            'wholesalers' => $this->catalog(Wholesaler::where('is_active', 1)->orderBy('name')),
            'plants' => $this->catalog(Plant::where('is_active', 1)->orderBy('name')),
            'products' => $this->catalog(Product::where('is_active', 1)->orderBy('name')),
            'config' => $this->activeConfig($pricing),
            'filter' => $filter,
        ]);
    }

    /**
     * Descarga a Excel la matriz filtrada actual (todos los registros que
     * matchean los filtros, sin paginación). Lectura pura: no modifica datos.
     */
    public function export(Request $request): BinaryFileResponse
    {
        $pricing = app(PricingAdminService::class);

        $rows = $this->queryFor($request)
            ->orderBy('plant_id')
            ->orderBy('product_id')
            ->get()
            ->map(fn (PlantProduct $pp) => $this->rowFor($pp, $pricing))
            ->values()
            ->toArray();

        $wholesalers = $this->catalog(Wholesaler::where('is_active', 1)->orderBy('name'));

        $fileName = 'sertoco_precios_'.now()->format('Y-m-d').'.xlsx';

        return Excel::download(new PricesExport($rows, $wholesalers), $fileName);
    }

    /**
     * Query de relaciones filtrando por los parámetros de la pantalla.
     *
     * @return Builder<PlantProduct>
     */
    private function queryFor(Request $request): Builder
    {
        $filter = $request->only(['q', 'plant_id', 'product_id', 'active']);

        $query = PlantProduct::query()
            ->with([
                'plant:id,name',
                'product:id,name',
                'wholesalerPrices:id,plant_product_id,wholesaler_id,price',
            ]);

        $plantId = (int) ($filter['plant_id'] ?? 0);
        $productId = (int) ($filter['product_id'] ?? 0);

        if ($plantId > 0) {
            $query->where('plant_id', $plantId);
        }

        if ($productId > 0) {
            $query->where('product_id', $productId);
        }

        $active = $filter['active'] ?? null;

        if ($active === '1') {
            $query->where('is_active', true);
        } elseif ($active === '0') {
            $query->where('is_active', false);
        }

        $q = trim((string) ($filter['q'] ?? ''));

        if ($q !== '') {
            $query->where(function ($builder) use ($q) {
                $builder
                    ->whereHas('plant', fn ($plant) => $plant->where('name', 'like', "%{$q}%"))
                    ->orWhereHas('product', fn ($product) => $product->where('name', 'like', "%{$q}%"))
                    ->orWhereHas('wholesalerPrices.wholesaler', fn ($wholesaler) => $wholesaler->where('name', 'like', "%{$q}%"));
            });
        }

        return $query;
    }

    /**
     * Fila de la matriz para un plant_product.
     *
     * @return array<string, mixed>
     */
    private function rowFor(PlantProduct $pp, PricingAdminService $pricing): array
    {
        return [
            'id' => $pp->id,
            'plant_id' => $pp->plant_id,
            'product_id' => $pp->product_id,
            'plant_name' => $pp->plant?->name,
            'product_name' => $pp->product?->name,
            'is_active' => (bool) $pp->is_active,
            'prices' => $pp->wholesalerPrices
                ->mapWithKeys(fn ($wp) => [(int) $wp->wholesaler_id => $wp->price])
                ->toArray(),
            'calc' => $this->calculationFor($pp, $pricing),
        ];
    }

    /**
     * Resultado del motor para una fila (null si no hay precios válidos o no
     * existe configuración activa).
     *
     * ADR-012: expone el desglose completo de la cadena P→V con los mismos
     * nombres de clave que la API de preview (`prices/preview`), para que la
     * UI muestre resultado **y** fórmula (ver cálculo por fila / ver
     * cálculos). Todos los montos son strings decimales (nunca float).
     *
     * @return array<string, string|int>|null
     */
    private function calculationFor(PlantProduct $pp, PricingAdminService $pricing): ?array
    {
        try {
            $result = $pricing->calculate($pp);
        } catch (RuntimeException) {
            return null;
        }

        return $result === null ? null : [
            'best_price' => $result->bestPrice,
            'rounded_price' => $result->roundedPrice,
            'winner_wholesaler_id' => $result->wholesalerId,
            'purchase_price' => $result->purchasePrice,
            'margin' => $result->margin,
            'igv_rate' => $result->igvRate,
            'perception_rate' => $result->perceptionRate,
            'sale_price' => $result->salePrice,
            'sale_price_with_igv' => $result->salePriceWithIgv,
            'sale_price_with_perception' => $result->salePriceWithPerception,
            'final_price' => $result->finalPrice,
        ];
    }

    private function activeConfig(PricingAdminService $pricing): ?array
    {
        try {
            $config = $pricing->activeConfiguration();
        } catch (RuntimeException) {
            return null;
        }

        return [
            'margin' => (string) $config->margin,
            'igv_rate' => (string) $config->igv_rate,
            'perception_rate' => (string) $config->perception_rate,
        ];
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return array<int, array{value: int, label: string}>
     */
    private function catalog($query): array
    {
        return $query
            ->get(['id', 'name'])
            ->map(fn ($row) => ['value' => $row->id, 'label' => $row->name])
            ->values()
            ->toArray();
    }
}