<?php

namespace App\Services\Reports;

use App\Models\Order;
use App\Models\Product;
use App\Services\Pricing\Decimal;
use App\Services\Pricing\PricingMatrix;
use Illuminate\Support\Facades\DB;

/**
 * Reporte "Avance de ventas" (ADR-017): resumen de ventas, compras y margen por
 * período, calculado a partir de los pedidos que YA existen. No crea ni
 * persiste ninguna tabla de estadísticas (ADR-017 §14/§23): todo se deriva de
 * `orders`, `order_details` y de la matriz de precios de ADR-010.
 *
 * DEFINICIÓN DEL MARGEN (decisión de implementación, ver ADR-017 "Nota de
 * implementación"): el margen NO es `ventas - compras` como dice §12/§13 del
 * ADR, sino `SUMA(galones × plant_products.margin)`, que es exactamente lo que
 * ya muestra la Ganancia del detalle del pedido desde ADR-013. Motivo: el margen
 * del motor es un monto absoluto aplicado ANTES del IGV, así que la resta
 * "ventas - compras" da un número ~18% mayor (margen × 1.18) y el reporte
 * dejaría de cuadrar con el pedido. Además el margen de la relación se conoce
 * aunque la línea no tenga precio de compra registrado, mientras que la resta
 * no. El ADR-013 es la decisión vigente y ya verificada.
 *
 * `compras` se conserva como dato del período (precio de compra de la celda de
 * cada línea, ADR-010) y se muestra en cards, gráfico y tabla, pero no es la
 * base del margen.
 *
 * RENDIMIENTO (ADR-017 §20): un número constante de consultas — 1 agregada de
 * líneas + 1 conteo de pedidos + 3 de apoyo (relaciones, precios, nombres de
 * producto) — sin importar cuántos pedidos o días tenga el período, y sin N+1.
 *
 * AISLAMIENTO MULTI-TENANT (ADR-008): todas las consultas parten de modelos
 * Eloquent, así que los global scopes de `BelongsToTenant` y `LogicalDelete`
 * filtran por organización y por `is_deleted` sin escribirlo a mano. Nunca usar
 * `DB::table()` aquí: se saltaría el scope del tenant.
 *
 * PRECISIÓN: todo el dinero se acumula con bcmath, nunca con float. Cada línea
 * se redondea a 2 decimales ANTES de acumular (redondeo de ítem de línea), con
 * lo que el total es la suma exacta de los subtotales mostrados y las tres
 * superficies del reporte (cards, gráfico y tabla) cuadran entre sí, requisito
 * de ADR-017 §24. El cast a float ocurre solo al serializar, porque ECharts y
 * la `Table` de antd necesitan números; el cálculo ya está cerrado a 2.
 */
class SalesReportService
{
    public function __construct(private readonly PricingMatrix $matrix)
    {
    }

    /**
     * Datos completos del reporte para un período cerrado.
     *
     * @param  string  $from  Y-m-d inclusive
     * @param  string  $to  Y-m-d inclusive
     * @return array{summary: array<string, mixed>, daily: array<int, array<string, mixed>>, products: array<int, array<string, mixed>>}
     */
    public function build(string $from, string $to): array
    {
        $rows = $this->linesByDay($from, $to);

        // Sin pedidos: no hay gráficos ni filas, pero los cards deben responder
        // en cero y no en null (ADR-017 §17).
        if ($rows->isEmpty()) {
            return [
                'summary' => $this->emptySummary(),
                'daily' => [],
                'products' => [],
            ];
        }

        $matrix = $this->matrix->resolve(
            $rows->map(fn ($row) => [
                'plant_id' => (int) $row->plant_id,
                'product_id' => (int) $row->product_id,
                'wholesaler_id' => (int) $row->wholesaler_id,
            ])->all()
        );

        $productNames = Product::query()
            ->whereIn('id', $rows->pluck('product_id')->unique())
            ->pluck('name', 'id')
            ->all();

        $days = [];
        $products = [];
        $totalGallons = '0';
        $totalSales = '0';
        $totalPurchases = '0';
        $totalMargin = '0';
        $hasPurchases = false;
        $hasMargin = false;
        $linesWithoutPrice = 0;
        $linesWithoutMargin = 0;

        foreach ($rows as $row) {
            $day = (string) $row->day;
            $productId = (int) $row->product_id;
            $gallons = (string) $row->gallons;

            $relationKey = PricingMatrix::relationKey((int) $row->plant_id, $productId);
            $cellKey = $relationKey . '-' . (int) $row->wholesaler_id;

            $price = $matrix['purchases'][$cellKey] ?? null;
            $margin = $matrix['margins'][$relationKey] ?? null;

            // Una línea sin precio no aporta a las compras (celda vacía o 0
            // explícito == sin precio, ADR-010) y una línea sin relación no
            // aporta al margen. Se cuentan aparte para que la UI lo diga en
            // lugar de mostrar un total silenciosamente incompleto.
            $purchases = $price === null
                ? null
                : Decimal::round(bcmul($gallons, $price, 4), 2);

            $marginAmount = $margin === null
                ? null
                : Decimal::round(bcmul($gallons, $margin, 4), 2);

            if ($purchases === null) {
                $linesWithoutPrice++;
            } else {
                $hasPurchases = true;
                $totalPurchases = bcadd($totalPurchases, $purchases, 2);
            }

            if ($marginAmount === null) {
                $linesWithoutMargin++;
            } else {
                $hasMargin = true;
                $totalMargin = bcadd($totalMargin, $marginAmount, 2);
            }

            $totalGallons = bcadd($totalGallons, $gallons, 2);
            $totalSales = bcadd($totalSales, Decimal::round((string) $row->sales, 2), 2);

            $days[$day] ??= $this->newBucket();
            $days[$day]['gallons'] = bcadd($days[$day]['gallons'], $gallons, 2);
            $days[$day]['sales'] = bcadd($days[$day]['sales'], Decimal::round((string) $row->sales, 2), 2);

            if ($purchases !== null) {
                $days[$day]['has_purchases'] = true;
                $days[$day]['purchases'] = bcadd($days[$day]['purchases'], $purchases, 2);
            }

            if ($marginAmount !== null) {
                $days[$day]['has_margin'] = true;
                $days[$day]['margin'] = bcadd($days[$day]['margin'], $marginAmount, 2);
            }

            $products[$productId] ??= [
                'id' => $productId,
                'name' => $productNames[$productId] ?? null,
                'gallons' => '0',
            ];
            $products[$productId]['gallons'] = bcadd($products[$productId]['gallons'], $gallons, 2);
        }

        return [
            'summary' => [
                'total_gallons' => (float) $totalGallons,
                'total_purchases' => $hasPurchases ? (float) $totalPurchases : null,
                'total_sales' => (float) $totalSales,
                'total_margin' => $hasMargin ? (float) $totalMargin : null,
                'margin_per_gallon' => $this->perGallon($hasMargin ? $totalMargin : null, $totalGallons),
                'orders_count' => $this->ordersCount($from, $to),
                'lines' => (int) $rows->sum('line_count'),
                'days_count' => count($days),
                'lines_without_price' => $linesWithoutPrice,
                'lines_without_margin' => $linesWithoutMargin,
            ],
            'daily' => $this->dailyRows($days),
            'products' => $this->productRows($products, $totalGallons),
        ];
    }

    /**
     * Meses con pedidos del tenant, del más reciente al más antiguo. Alimenta el
     * selector de mes con datos reales: si no hay pedidos en un mes, no se
     * ofrece. Devuelve solo el `YYYY-MM`; la etiqueta la arma el front con
     * `lang/es/reports.php` (los meses traducidos viven en el archivo i18n, no
     * en PHP).
     *
     * @return array<int, string>
     */
    public function months(): array
    {
        return Order::query()
            ->selectRaw("DATE_FORMAT(order_date, '%Y-%m') AS ym")
            ->distinct()
            ->orderByDesc('ym')
            ->pluck('ym')
            ->map(fn ($value) => (string) $value)
            ->all();
    }

    /**
     * Una fila por día CON pedidos, con sus galones, ventas, compras y margen.
     * Los días sin pedidos no existen en el resultado porque el agrupado nace de
     * las líneas reales del período (ADR-017 §7/§11): no hay que rellenar ni
     * filtrar después.
     */
    private function linesByDay(string $from, string $to)
    {
        return Order::query()
            ->join('order_details', 'order_details.order_id', '=', 'orders.id')
            // El scope de `LogicalDelete` de OrderDetail no se aplica en un join
            // (los scopes solo afectan a la tabla raíz), así que la baja lógica
            // del detalle se filtra explícitamente. La de `orders` y la del
            // tenant sí llegan solas, ya cualificadas.
            ->where('order_details.is_deleted', 0)
            ->whereBetween('orders.order_date', ["{$from} 00:00:00", "{$to} 23:59:59"])
            ->groupBy('day', 'order_details.product_id', 'order_details.plant_id', 'order_details.wholesaler_id')
            ->select([
                DB::raw('DATE(orders.order_date) AS day'),
                'order_details.product_id',
                'order_details.plant_id',
                'order_details.wholesaler_id',
                // Alias `line_count` y no `lines`: `lines` es palabra reservada
                // en MySQL 8 y el DDL/alias sin comillas rompe la consulta
                // (mismo gotcha que `row_number` en price_import_items).
                DB::raw('COUNT(*) AS line_count'),
                DB::raw('SUM(order_details.gallons) AS gallons'),
                DB::raw('SUM(order_details.gallons * order_details.sale_price) AS sales'),
            ])
            ->orderBy('day')
            ->get();
    }

    /**
     * Pedidos del período con al menos una línea activa. No se puede sumar un
     * `COUNT(DISTINCT orders.id)` por grupo: un pedido con dos productos
     * aparecería en dos grupos y se contaría dos veces.
     */
    private function ordersCount(string $from, string $to): int
    {
        return (int) Order::query()
            ->whereBetween('order_date', ["{$from} 00:00:00", "{$to} 23:59:59"])
            ->whereHas('details')
            ->count();
    }

    /**
     * @param  array<string, array<string, mixed>>  $days
     * @return array<int, array<string, mixed>>
     */
    private function dailyRows(array $days): array
    {
        ksort($days);

        $daily = [];

        foreach ($days as $day => $bucket) {
            $daily[] = [
                'date' => $day,
                'total_gallons' => (float) $bucket['gallons'],
                'purchases' => $bucket['has_purchases'] ? (float) $bucket['purchases'] : null,
                'sales' => (float) $bucket['sales'],
                'margin' => $bucket['has_margin'] ? (float) $bucket['margin'] : null,
                'margin_per_gallon' => $this->perGallon(
                    $bucket['has_margin'] ? $bucket['margin'] : null,
                    $bucket['gallons']
                ),
            ];
        }

        return $daily;
    }

    /**
     * @param  array<int, array{id:int, name:?string, gallons:string}>  $products
     * @return array<int, array<string, mixed>>
     */
    private function productRows(array $products, string $totalGallons): array
    {
        $rows = [];

        foreach ($products as $product) {
            $gallons = (float) $product['gallons'];

            $rows[] = [
                'id' => $product['id'],
                'name' => $product['name'],
                'total_gallons' => $gallons,
                // Participación en el total de galones. El pie de la torta
                // recalcula el porcentaje sobre el subconjunto visible cuando el
                // usuario desactiva un producto en la leyenda (ADR-017 §10);
                // este valor es el dato de referencia del período completo.
                'share' => bccomp($totalGallons, '0', 2) === 0
                    ? 0.0
                    : round(($gallons / (float) $totalGallons) * 100, 2),
            ];
        }

        // Mayor participación primero; desempate por id asc (criterio
        // determinista, el mismo que usa el motor de precios).
        usort($rows, function (array $a, array $b) {
            $byShare = $b['share'] <=> $a['share'];

            return $byShare !== 0 ? $byShare : $a['id'] <=> $b['id'];
        });

        return $rows;
    }

    /**
     * @return array{gallons: string, sales: string, purchases: string, margin: string, has_purchases: bool, has_margin: bool}
     */
    private function newBucket(): array
    {
        return [
            'gallons' => '0',
            'sales' => '0',
            'purchases' => '0',
            'margin' => '0',
            'has_purchases' => false,
            'has_margin' => false,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function emptySummary(): array
    {
        return [
            'total_gallons' => 0.0,
            'total_purchases' => null,
            'total_sales' => 0.0,
            'total_margin' => null,
            'margin_per_gallon' => null,
            'orders_count' => 0,
            'lines' => 0,
            'days_count' => 0,
            'lines_without_price' => 0,
            'lines_without_margin' => 0,
        ];
    }

    /**
     * Margen por galón a 2 decimales (ADR-017 §12). Es un cociente, no un
     * promedio de los valores diarios: para el total del período se divide el
     * margen TOTAL entre los galones TOTALES (§13), y cada día divide su propio
     * margen entre sus propios galones. `bcdiv` trunca, así que se divide con
     * precisión extra y se redondea con el mismo helper del motor de precios
     * (half away from zero).
     */
    private function perGallon(?string $amount, string $gallons): ?float
    {
        if ($amount === null || bccomp($gallons, '0', 2) === 0) {
            return null;
        }

        return (float) Decimal::round(bcdiv($amount, $gallons, 6), 2);
    }
}
