<?php

namespace App\Http\Controllers\Platform\Plants;

use App\Http\Controllers\Platform\Catalogs\CatalogApiController;
use App\Models\Plant;
use Illuminate\Database\Eloquent\Model;

class PlantApiController extends CatalogApiController
{
    protected string $model = Plant::class;

    protected function rules(?Model $entity = null): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}