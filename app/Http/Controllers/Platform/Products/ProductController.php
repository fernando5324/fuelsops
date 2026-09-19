<?php

namespace App\Http\Controllers\Platform\Products;

use App\Http\Controllers\Platform\Catalogs\CatalogController;
use App\Models\Product;

class ProductController extends CatalogController
{
    protected string $model = Product::class;

    protected string $resource = 'products';

    protected string $titleKey = 'menus.products';

    protected array $searchable = ['name'];

    protected array $fields = [
        ['key' => 'name', 'label' => 'common.name', 'type' => 'text', 'required' => true],
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean', 'required' => true],
    ];
}