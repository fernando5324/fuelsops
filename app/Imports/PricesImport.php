<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\ToArray;

/**
 * Lectura de archivos de importación de precios (ADR-010 §18).
 *
 * Se usa con `Excel::toArray(instance, $path)`: el método `array()` es
 * no-op porque la facade entrega por cada hoja un array de filas crudas
 * (índices 0-based). La validación de estructura, la detección de cabeceras
 * y la interpretación de columnas C-M las hace `PriceImportService` para
 * tener un único lugar con las reglas del ADR.
 */
class PricesImport implements ToArray
{
    public function array(array $array): void
    {
        // No-op: Excel::toArray() devuelve las filas directamente.
    }
}