<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

/**
 * Exportación de la matriz de precios (ADR-010, Fase 8+).
 *
 * Replica en .xlsx lo que muestra la pantalla `/precios` para los filtros
 * activos: una columna por mayorista más el resultado del motor (mejor
 * precio, ganador y precio final). Los montos se escriben como strings
 * decimales de 4 dígitos (nunca float) y la celda vacía representa "sin
 * precio" (NULL), igual que en la BD.
 */
class PricesExport implements FromArray, WithHeadings
{
    public function __construct(
        private readonly array $rows,
        private readonly array $wholesalers,
    ) {
    }

    public function headings(): array
    {
        $headers = [
            __('pricing.col_plant'),
            __('pricing.col_product'),
            __('common.status'),
        ];

        foreach ($this->wholesalers as $wholesaler) {
            $headers[] = $wholesaler['label'];
        }

        $headers[] = __('pricing.best_price');
        $headers[] = __('pricing.col_winner');
        $headers[] = __('pricing.col_final');

        return $headers;
    }

    public function array(): array
    {
        return array_map(fn (array $row) => $this->excelRow($row), $this->rows);
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<int, mixed>
     */
    private function excelRow(array $row): array
    {
        $out = [
            $row['plant_name'],
            $row['product_name'],
            $row['is_active'] ? __('common.active') : __('common.inactive'),
        ];

        foreach ($this->wholesalers as $wholesaler) {
            $price = $row['prices'][(int) $wholesaler['value']] ?? null;
            $out[] = $price === null ? '' : (string) $price;
        }

        $calc = $row['calc'];

        $winner = null;
        if ($calc !== null) {
            foreach ($this->wholesalers as $wholesaler) {
                if ((int) $wholesaler['value'] === (int) $calc['winner_wholesaler_id']) {
                    $winner = $wholesaler['label'];
                    break;
                }
            }
            $winner ??= (string) $calc['winner_wholesaler_id'];
        }

        $out[] = $calc === null ? '' : (string) $calc['best_price'];
        $out[] = $winner ?? '';
        $out[] = $calc === null ? '' : (string) $calc['final_price'];

        return $out;
    }
}