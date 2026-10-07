<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesCompartments;
use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PublicOrderStoreRequest extends FormRequest
{
    use ValidatesCompartments;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantScope = fn ($query) => $query->where('tenant_id', TenantContext::id());

        return array_merge([
            // La fecha del pedido no puede ser anterior a hoy: un pedido se registra el día
            // que se hace. Solo el formulario público lo restringe; el panel
            // mantiene `date` porque edita pedidos históricos con fechas ya
            // escritas.
            'order_date' => ['nullable', 'date', 'after_or_equal:today'],
            'advisor_id' => ['required', 'integer', Rule::exists('advisors', 'id')->where($tenantScope)],
            'customer' => ['required', 'array'],
            'customer.tax_id' => ['required', 'string', 'max:20'],
            'customer.name' => ['required', 'string', 'max:200'],
            'driver' => ['required', 'array'],
            'driver.license_number' => ['required', 'string', 'max:50'],
            'driver.name' => ['required', 'string', 'max:200'],
            // La cisterna es una fila de `vehicles` con sus dos placas
            // (ADR-023): la de la cisterna y la del tracto.
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
        ], $this->compartmentRules());
    }

    /**
     * Nombres amigables para los mensajes de validación.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return array_merge([
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
        ], $this->compartmentAttributes());
    }

    /**
     * Mensajes en español de las reglas con texto propio. `after_or_equal` trae
     * un mensaje en inglés que no le sirve al usuario final.
     */
    public function messages(): array
    {
        return [
            'order_date.after_or_equal' => __('order.order_date_not_past'),
            'order_date.date' => __('order.order_date_invalid'),
        ];
    }
}