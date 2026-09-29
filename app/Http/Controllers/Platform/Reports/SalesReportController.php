<?php

namespace App\Http\Controllers\Platform\Reports;

use App\Http\Controllers\Controller;
use App\Http\Requests\SalesReportRequest;
use App\Services\Reports\SalesReportService;
use Inertia\Inertia;
use Inertia\Response;

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
}
