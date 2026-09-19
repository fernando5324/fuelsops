<?php

namespace App\Http\Controllers\Platform\Customers;

use App\Http\Controllers\Platform\Catalogs\CatalogApiController;
use App\Models\Customer;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class CustomerApiController extends CatalogApiController
{
    protected string $model = Customer::class;

    protected bool $logicalDelete = true;

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