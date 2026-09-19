<?php

namespace App\Http\Controllers\Platform\Customers;

use App\Http\Controllers\Platform\Catalogs\CatalogController;
use App\Models\Customer;
use App\Models\Wholesaler;

class CustomerController extends CatalogController
{
    protected string $model = Customer::class;

    protected string $resource = 'customers';

    protected string $titleKey = 'menus.customers';

    protected array $searchable = ['name', 'tax_id'];

    protected array $fields = [
        ['key' => 'tax_id', 'label' => 'catalogs.tax_id', 'type' => 'text', 'required' => true],
        ['key' => 'name', 'label' => 'common.name', 'type' => 'text', 'required' => true],
        ['key' => 'preferred_wholesaler_id', 'label' => 'catalogs.preferred_wholesaler', 'type' => 'select', 'options' => 'wholesalers', 'required' => false],
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean', 'required' => true],
    ];

    protected function options(): array
    {
        return [
            'wholesalers' => Wholesaler::where('is_active', 1)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn ($w) => ['value' => (int) $w->id, 'label' => $w->name])
                ->all(),
        ];
    }
}