<?php

namespace App\Http\Controllers\Platform\Advisors;

use App\Http\Controllers\Platform\Catalogs\CatalogApiController;
use App\Models\Advisor;
use Illuminate\Database\Eloquent\Model;

class AdvisorApiController extends CatalogApiController
{
    protected string $model = Advisor::class;

    protected function rules(?Model $entity = null): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}