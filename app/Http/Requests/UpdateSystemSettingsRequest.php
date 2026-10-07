<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Guardado de la página de Configuración → Sistema (ADR-026).
 *
 * Preferencias (idioma/zona horaria) y formato del código de pedido
 * (prefijo/número inicial/dígitos, ADR-020/021). El prefijo, el inicio y el
 * relleno se aplican a los pedidos NUEVOS: el contador y los códigos ya
 * emitidos no cambian.
 */
class UpdateSystemSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) auth()->user()?->is_owner;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'default_language' => ['required', Rule::in(['es'])],
            'timezone' => ['required', 'string', Rule::in(\DateTimeZone::listIdentifiers())],
            'order_code_prefix' => ['required', 'string', 'max:20', 'regex:/^[A-Z0-9][A-Z0-9.-]*$/'],
            'order_code_start' => ['required', 'integer', 'min:1', 'max:999999999'],
            'order_code_padding' => ['required', 'integer', 'min:1', 'max:10'],
        ];
    }

    /**
     * El prefijo se normaliza a mayúsculas (mismo criterio que el código del
     * pedido en UpdateOrderRequest) antes de validar.
     */
    protected function prepareForValidation(): void
    {
        $prefix = $this->input('order_code_prefix');

        if (is_string($prefix)) {
            $this->merge(['order_code_prefix' => mb_strtoupper(trim($prefix))]);
        }
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'default_language' => 'idioma',
            'timezone' => 'zona horaria',
            'order_code_prefix' => 'prefijo',
            'order_code_start' => 'número inicial',
            'order_code_padding' => 'cantidad de dígitos',
        ];
    }
}
