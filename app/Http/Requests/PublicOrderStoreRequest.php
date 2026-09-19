<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PublicOrderStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'order_date' => ['nullable', 'date'],
            'advisor_id' => ['required', 'integer', 'exists:advisors,id'],
            'customer' => ['required', 'array'],
            'customer.tax_id' => ['required', 'string', 'max:20'],
            'customer.name' => ['required', 'string', 'max:200'],
            'driver_id' => ['required', 'integer', 'exists:drivers,id'],
            'tanker_id' => ['required', 'integer', 'exists:vehicles,id'],
            'tractor_id' => ['required', 'integer', 'exists:vehicles,id'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'details' => ['required', 'array', 'min:1'],
            'details.*.scop' => ['required', 'string', 'max:50'],
            'details.*.plant_id' => ['required', 'integer', 'exists:plants,id'],
            'details.*.wholesaler_id' => ['required', 'integer', 'exists:wholesalers,id'],
            'details.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'details.*.gallons' => ['required', 'numeric', 'gt:0'],
            'details.*.sale_price' => ['nullable', 'numeric', 'min:0'],
            'details.*.compartments' => ['nullable', 'integer', 'min:1'],
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png', 'max:10240'],
        ];
    }

    /**
     * Nombres amigables para los mensajes de validación.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'order_date' => __('order.order_date'),
            'advisor_id' => __('order.advisor'),
            'customer.tax_id' => 'RUC',
            'customer.name' => __('order.customer'),
            'driver_id' => __('order.driver'),
            'tanker_id' => __('order.tanker'),
            'tractor_id' => __('order.tractor'),
            'notes' => __('order.notes'),
            'details' => __('order.details'),
            'details.*.scop' => 'SCOP',
            'details.*.plant_id' => __('order.plant'),
            'details.*.wholesaler_id' => __('order.wholesaler'),
            'details.*.product_id' => __('order.product'),
            'details.*.gallons' => __('order.gallons'),
            'details.*.sale_price' => __('order.sale_price'),
            'details.*.compartments' => __('order.compartments'),
            'files' => __('order.attachments'),
        ];
    }
}