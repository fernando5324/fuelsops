<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesCompartments;
use App\Models\Order;
use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación del formulario de edición de un pedido del panel (Fase B).
 * Espejo del request público (PublicOrderStoreRequest) con dos adiciones:
 * esquema igual para detalles/archivos y `remove_files` para eliminar
 * documentos adjuntos existentes. La referencia a estructuras ajenas a la
 * organización se valida por tenant (misma regla que el registro).
 */
class UpdateOrderRequest extends FormRequest
{
    use ValidatesCompartments;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normaliza el código antes de validar (ADR-020 §6): sin espacios
     * alrededor y en mayúsculas, para que `ped-1` y `PED-1` no parezcan dos
     * códigos distintos (la collation utf8mb4_unicode_ci ya los trataría como
     * duplicados). Lo mismo con la placa de tracto (ADR-023), que se guarda
     * como snapshot en mayúsculas.
     */
    protected function prepareForValidation(): void
    {
        $merge = [];

        if ($this->has('code')) {
            $code = $this->input('code');
            $merge['code'] = is_string($code) ? mb_strtoupper(trim($code)) : $code;
        }

        if ($this->has('tractor_plate')) {
            $plate = $this->input('tractor_plate');
            $merge['tractor_plate'] = is_string($plate) ? mb_strtoupper(trim($plate)) : $plate;
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }

    public function rules(): array
    {
        $tenantScope = fn ($query) => $query->where('tenant_id', TenantContext::id());

        return array_merge([
            // Código operativo del pedido (ADR-020). Editable y único SOLO
            // dentro del tenant. `Rule::unique` consulta sin global scopes, así
            // que también ve los pedidos en papelera: el índice único
            // uq_orders_tenant_code no incluye `is_deleted` y sus códigos
            // quedan reservados (nunca se reciclan).
            'code' => [
                'required',
                'string',
                'max:50',
                'regex:/^[A-Z0-9][A-Z0-9.-]*$/',
                Rule::unique('orders', 'code')
                    ->where($tenantScope)
                    ->ignore($this->route('order')),
            ],
            'order_date' => ['nullable', 'date'],
            'advisor_id' => ['required', 'integer', Rule::exists('advisors', 'id')->where($tenantScope)],
            'customer' => ['required', 'array'],
            'customer.tax_id' => ['required', 'string', 'max:20'],
            'customer.name' => ['required', 'string', 'max:200'],
            'driver' => ['required', 'array'],
            'driver.license_number' => ['required', 'string', 'max:50'],
            'driver.name' => ['required', 'string', 'max:200'],
            'tanker' => ['required', 'array'],
            'tanker.license_plate' => ['required', 'string', 'max:20'],
            'tractor_plate' => ['required', 'string', 'max:20'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'details' => ['required', 'array', 'min:1'],
            'details.*.scop' => ['required', 'string', 'max:50'],
            'details.*.plant_id' => ['required', 'integer', Rule::exists('plants', 'id')->where($tenantScope)],
            'details.*.wholesaler_id' => ['required', 'integer', Rule::exists('wholesalers', 'id')->where($tenantScope)],
            'details.*.product_id' => ['required', 'integer', Rule::exists('products', 'id')->where($tenantScope)],
            'details.*.gallons' => ['required', 'numeric', 'gt:0'],
            'details.*.sale_price' => ['nullable', 'numeric', 'min:0'],
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'mimes:pdf,jpg,jpeg', 'max:10240'],
            'remove_files' => ['nullable', 'array'],
            'remove_files.*' => ['integer', Rule::exists('media_files', 'id')->where(function ($query) {
                $query->where('model_type', (new Order)->getMorphClass())
                    ->where('tenant_id', TenantContext::id());
            })],
        ], $this->compartmentRules());
    }

    public function attributes(): array
    {
        return array_merge([
            'code' => __('order.code'),
            'order_date' => __('order.order_date'),
            'advisor_id' => __('order.advisor'),
            'customer.tax_id' => 'RUC',
            'customer.name' => __('order.customer'),
            'driver' => __('order.driver'),
            'driver.license_number' => __('order.license_number'),
            'driver.name' => __('order.driver_name'),
            'tanker' => __('order.tanker'),
            'tanker.license_plate' => __('order.tanker_plate'),
            'tractor_plate' => __('order.tractor_plate'),
            'notes' => __('order.notes'),
            'details' => __('order.details'),
            'details.*.scop' => 'SCOP',
            'details.*.plant_id' => __('order.plant'),
            'details.*.wholesaler_id' => __('order.wholesaler'),
            'details.*.product_id' => __('order.product'),
            'details.*.gallons' => __('order.gallons'),
            'details.*.sale_price' => __('order.sale_price'),
            'files' => __('order.attachments'),
            'remove_files' => __('order.documents'),
        ], $this->compartmentAttributes());
    }

    /**
     * Mensajes propios: el `validation.unique` genérico no dice qué código está
     * repetido (ADR-020 §14). Los códigos guardados en el panel pueden tener
     * cualquier formato heredado (`OC-45892`), así que no hay un mensaje por
     * formato, solo el de duplicidad.
     */
    public function messages(): array
    {
        return [
            'code.required' => __('order.code_required'),
            'code.regex' => __('order.code_invalid'),
            'code.max' => __('order.code_too_long'),
            'code.unique' => __('order.code_taken'),
        ];
    }
}