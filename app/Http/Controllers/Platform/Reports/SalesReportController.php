<?php

namespace App\Http\Controllers\Platform\Reports;

use App\Http\Controllers\Controller;
use App\Http\Requests\SalesReportRequest;
use App\Models\Tenant;
use App\Services\Reports\SalesReportPdfService;
use App\Services\Reports\SalesReportService;
use App\Services\TenantContext;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Throwable;

/**
 * Reporte "Avance de ventas" (ADR-017).
 *
 * Vista Inertia `Platform/Reports/SalesIndex`. Toda la agregación vive en
 * `SalesReportService` y llega en UNA sola respuesta estructurada (ADR-017 §5 y
 * §20): summary (cards), daily (gráfico de evolución + tabla) y products (torta).
 * React no reconstruye ningún cálculo de negocio.
 *
 * Es un reporte de solo lectura: no escribe nada, no necesita API propia (los
 * filtros viajan en el query string de una visita Inertia) y no tiene gate más
 * allá del grupo `auth`, igual que el resto de páginas del panel. El aislamiento
 * por organización es responsabilidad de los global scopes de los modelos.
 */
class SalesReportController extends Controller
{
    public function index(SalesReportRequest $request, SalesReportService $reports): Response
    {
        $period = $request->period();
        $report = $reports->build($period['from'], $period['to']);

        return Inertia::render('Platform/Reports/SalesIndex', array_merge($report, [
            'filters' => [
                // Período EFECTIVO ya cerrado (incluye el mes actual por
                // defecto): es lo que el RangePicker muestra siempre.
                'from' => $period['from'],
                'to' => $period['to'],
                // Solo el mes realmente aplicado. El request lo anula cuando
                // venía un rango explícito, para que el front nunca muestre un
                // mes seleccionado junto a un rango que no corresponde.
                'month' => $request->month(),
            ],
            'months' => $reports->months(),
        ]));
    }

    /**
     * Exportación del reporte a PDF (ADR-018).
     *
     * Recibe los MISMOS filtros que la página y los vuelve a validar con el mismo
     * `SalesReportRequest`: el backend recalcula el período desde cero y no
     * acepta ningún importe de React (ADR-018 §6/§7/§22). Los datos salen de
     * `SalesReportService`, la misma fuente que alimenta la web, así que el PDF
     * no puede discrepar de la pantalla (ADR-018 §4/§19/§25).
     *
     * Ante cualquier fallo de generación se registra el error y se devuelve un
     * 500 con un mensaje genérico: nunca un PDF a medio construir (ADR-018 §21).
     */
    public function export(
        SalesReportRequest $request,
        SalesReportService $reports,
        SalesReportPdfService $pdf,
    ): HttpResponse {
        $period = $request->period();
        $report = $reports->build($period['from'], $period['to']);
        $tenantName = Tenant::find(TenantContext::id())?->name ?? config('app.name', 'Sertoco');

        try {
            return $pdf->export($report, $period, $tenantName);
        } catch (Throwable $e) {
            Log::error('Falló la exportación a PDF del reporte de avance de ventas.', [
                'period' => $period,
                'tenant_id' => TenantContext::id(),
                'user_id' => $request->user()?->id,
                'exception' => $e->getMessage(),
                'file' => $e->getFile().':'.$e->getLine(),
            ]);

            if (config('app.debug')) {
                throw $e;
            }

            return new HttpResponse(
                __('reports.pdf_error'),
                500,
                ['Content-Type' => 'text/plain; charset=utf-8'],
            );
        }
    }
}
