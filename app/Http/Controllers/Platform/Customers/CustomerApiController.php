<?php

namespace App\Http\Controllers\Platform\Customers;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Platform\Concerns\HasCrudActions;
use App\Models\Customer;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class CustomerApiController extends Controller
{
    use HasCrudActions;

    protected string $model = Customer::class;

    protected function logicalDelete(): bool
    {
        return true;
    }

    protected function rules(?Model $entity = null): array
    {
        return [
            'tax_id' => ['required', 'string', 'max:20', Rule::unique('customers', 'tax_id')->ignore($entity?->id)],
            'name' => ['required', 'string', 'max:200'],
            'preferred_wholesaler_id' => ['nullable', 'integer', 'exists:wholesalers,id'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}