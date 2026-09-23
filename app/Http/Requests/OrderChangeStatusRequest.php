<?php

namespace App\Http\Requests;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OrderChangeStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status_id' => ['required', 'integer', Rule::exists('order_statuses', 'id')->where(fn ($query) => $query->where('tenant_id', TenantContext::id()))],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function attributes(): array
    {
        return [
            'status_id' => __('order.status'),
            'notes' => __('order.notes'),
        ];
    }
}