<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validación de la subida del archivo de importación de precios (ADR-010).
 *
 * Solo se aceptan hojas .xlsx/.xls hasta 5 MB; la estructura del contenido
 * (encabezados, columnas C-M) la valida PriceImportService.
 */
class ImportPricesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => __('pricing.file_required'),
            'file.file' => __('pricing.file_invalid'),
            'file.mimes' => __('pricing.file_mimes'),
            'file.max' => __('pricing.file_max'),
        ];
    }
}