<?php

namespace App\Http\Controllers\Platform\Products;

use App\Http\Controllers\Platform\Catalogs\CatalogApiController;
use App\Models\Product;
use Illuminate\Database\Eloquent\Model;

class ProductApiController extends CatalogApiController
{
    protected string $model = Product::class;

    protected function rules(?Model $entity = null): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}