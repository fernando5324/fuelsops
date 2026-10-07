<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validación del reemplazo de los compartimentos de una cisterna (plantilla
 * `vehicle_compartments`, ADR-023).
 *
 * El front envía el set completo de cámaras y el servidor reconcilia contra lo
 * existente (baja lógica de las que sobran, actualización de las que
 * coinciden por numeración y creación de las faltantes). El número de
 * compartimento NO viaja en el payload: sale del índice de cada fila
 * (1..N), la misma convención del flujo de pedidos.
 *
 * Permitir un set vacío no es un error: equivale a "la cisterna todavía no
 * declara cámaras" (el motor de pedidos solo se cede cuando un pedido trae
 * distribución).
 */
class SaveVehicleCompartmentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'compartments' => ['nullable', 'array', 'max:50'],
            'compartments.*.scop' => ['nullable', 'string', 'max:50'],
            'compartments.*.volume' => ['required', 'numeric', 'gt:0', 'decimal:0,2'],
        ];
    }

    public function attributes(): array
    {
        return [
            'compartments' => __('catalogs.compartments'),
            'compartments.*.scop' => __('catalogs.scop'),
            'compartments.*.volume' => __('catalogs.volume_gal'),
        ];
    }

    public function messages(): array
    {
        return [
            'compartments.*.volume.required' => __('catalogs.volume_required'),
            'compartments.*.volume.gt' => __('catalogs.volume_invalid'),
            'compartments.*.volume.decimal' => __('catalogs.volume_invalid'),
        ];
    }
}