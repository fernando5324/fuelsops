<?php

namespace App\Http\Controllers\Platform\Wholesalers;

use App\Http\Controllers\Platform\Catalogs\CatalogApiController;
use App\Models\Wholesaler;
use Illuminate\Database\Eloquent\Model;

class WholesalerApiController extends CatalogApiController
{
    protected string $model = Wholesaler::class;

    protected function rules(?Model $entity = null): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}