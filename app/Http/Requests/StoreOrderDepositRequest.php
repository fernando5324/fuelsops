<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validación del alta manual de un depósito del cliente (ADR-013).
 *
 * El depósito transcribe un voucher adjunto: banco, número de operación, fecha
 * y monto. El monto admite hasta 4 decimales (columna DECIMAL(12,4) del
 * modelo) y la fecha no puede ser futura: un voucher siempre es un hecho
 * passado. El pedido no puede estar en la papelera (se valida en el
 * controlador, que además aborta con 409).
 */
class StoreOrderDepositRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'deposit_date' => ['required', 'date', 'before_or_equal:today'],
            'bank' => ['required', 'string', 'max:100'],
            'operation_number' => ['required', 'string', 'max:50'],
            'amount' => ['required', 'string', 'gt:0', 'regex:/^\d{1,10}(\.\d{1,4})?$/'],
        ];
    }

    public function attributes(): array
    {
        return [
            'deposit_date' => __('order.deposit_date'),
            'bank' => __('order.bank'),
            'operation_number' => __('order.operation_number'),
            'amount' => __('order.amount'),
        ];
    }

    public function messages(): array
    {
        return [
            'deposit_date.required' => __('order.deposit_date_required'),
            'deposit_date.before_or_equal' => __('order.deposit_date_future'),
            'amount.gt' => __('order.deposit_amount_invalid'),
            'amount.regex' => __('order.deposit_amount_invalid'),
        ];
    }
}
