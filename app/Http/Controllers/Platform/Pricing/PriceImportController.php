<?php

namespace App\Http\Controllers\Platform\Pricing;

use App\Http\Controllers\Controller;
use App\Http\Requests\ImportPricesRequest;
use App\Models\PriceImportBatch;
use App\Services\Pricing\PriceImportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

/**
 * Importación de precios desde Excel (ADR-010, Fases 5-7).
 *
 * Vista: Platform/Pricing/Import. Flujo: subir archivo → preview (POST
 * almacena el lote y redirige a su preview) → confirmar/cancelar. El preview
 * lista catálogos nuevos y la comparación del motor; la confirmación aplica
 * cambios en transacción sin tocar nada hasta ese momento (§18).
 */
class PriceImportController extends Controller
{
    public function __construct(
        private readonly PriceImportService $service,
    ) {
    }

    public function index(): Response
    {
        return Inertia::render('Platform/Pricing/Import', [
            'batch' => null,
            'recentBatches' => $this->recentBatches(),
        ]);
    }

    public function store(ImportPricesRequest $request): RedirectResponse
    {
        try {
            $batch = $this->service->upload($request->file('file'));
        } catch (RuntimeException $e) {
            return back()->with('flash', ['error' => $this->translateError($e->getMessage())]);
        }

        return redirect()->route('pricing.preview', $batch)
            ->with('flash', ['success' => __('pricing.uploaded_ok')]);
    }

    public function preview(PriceImportBatch $batch): Response|RedirectResponse
    {
        if (! in_array($batch->status, ['pending', 'processing'], true)) {
            return redirect()->route('pricing.index')
                ->with('flash', ['error' => __('pricing.errors.batch_not_pending')]);
        }

        $analysis = $this->service->catalogPreview($batch);

        return Inertia::render('Platform/Pricing/Import', [
            'batch' => [
                'id' => $batch->id,
                'file_name' => $batch->file_name,
                'status' => $batch->status,
                'created_at' => $batch->created_at?->format('d/m/Y H:i:s'),
                'summary' => [
                    'total' => $batch->total_rows,
                    'new' => $batch->new_rows,
                    'updated' => $batch->updated_rows,
                    'unchanged' => $batch->unchanged_rows,
                    'error' => $batch->error_rows,
                ],
                'items' => $batch->items()
                    ->orderBy('row_number')
                    ->get(['id', 'row_number', 'plant_name', 'product_name', 'wholesaler_name', 'previous_price', 'new_price', 'status', 'error_message'])
                    ->map(fn ($item) => [
                        'id' => $item->id,
                        'row_number' => $item->row_number,
                        'plant_name' => $item->plant_name,
                        'product_name' => $item->product_name,
                        'wholesaler_name' => $item->wholesaler_name,
                        'previous_price' => $item->previous_price,
                        'new_price' => $item->new_price,
                        'status' => $item->status,
                        'error_message' => $item->error_message,
                    ]),
                'new_catalogs' => $analysis['new_catalogs'],
                'calc' => $analysis['calc'],
            ],
            'recentBatches' => $this->recentBatches(),
        ]);
    }

    public function confirm(Request $request, PriceImportBatch $batch): RedirectResponse
    {
        $flags = $request->validate([
            'plants' => ['nullable', 'array'],
            'plants.*' => ['string', 'max:150'],
            'products' => ['nullable', 'array'],
            'products.*' => ['string', 'max:150'],
            'wholesalers' => ['nullable', 'array'],
            'wholesalers.*' => ['string', 'max:150'],
        ]);

        try {
            $counts = $this->service->confirm($batch, $flags);
        } catch (RuntimeException $e) {
            return back()->with('flash', ['error' => $this->translateError($e->getMessage())]);
        }

        return redirect()->route('pricing.index')
            ->with('flash', ['success' => __('pricing.confirmed_ok', $counts)]);
    }

    public function cancel(PriceImportBatch $batch): RedirectResponse
    {
        try {
            $this->service->cancel($batch);
        } catch (RuntimeException $e) {
            return back()->with('flash', ['error' => $this->translateError($e->getMessage())]);
        }

        return redirect()->route('pricing.index')
            ->with('flash', ['success' => __('pricing.cancelled_ok')]);
    }

    private function translateError(string $code): string
    {
        return __('pricing.errors.'.$code);
    }

    private function recentBatches(): array
    {
        return PriceImportBatch::query()
            ->orderByDesc('id')
            ->limit(6)
            ->get()
            ->map(fn (PriceImportBatch $batch) => [
                'id' => $batch->id,
                'file_name' => $batch->file_name,
                'status' => $batch->status,
                'total_rows' => $batch->total_rows,
                'new_rows' => $batch->new_rows,
                'updated_rows' => $batch->updated_rows,
                'unchanged_rows' => $batch->unchanged_rows,
                'error_rows' => $batch->error_rows,
                'created_at' => $batch->created_at?->format('d/m/Y H:i:s'),
                'completed_at' => $batch->completed_at?->format('d/m/Y H:i:s'),
            ])
            ->values()
            ->toArray();
    }
}