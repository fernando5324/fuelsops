<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OrderChangeStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status_id' => ['required', 'integer', 'exists:order_statuses,id'],
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