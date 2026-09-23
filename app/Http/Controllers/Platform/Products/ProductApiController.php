<?php

namespace App\Http\Controllers\Platform\Products;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Platform\Concerns\HasCrudActions;
use App\Models\Product;
use Illuminate\Database\Eloquent\Model;

class ProductApiController extends Controller
{
    use HasCrudActions;

    protected string $model = Product::class;

    protected function rules(?Model $entity = null): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}