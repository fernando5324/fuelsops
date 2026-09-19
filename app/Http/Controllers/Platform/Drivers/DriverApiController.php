<?php

namespace App\Http\Controllers\Platform\Drivers;

use App\Http\Controllers\Platform\Catalogs\CatalogApiController;
use App\Models\Driver;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class DriverApiController extends CatalogApiController
{
    protected string $model = Driver::class;

    protected bool $logicalDelete = true;

    protected function rules(?Model $entity = null): array
    {
        return [
            'license_number' => ['required', 'string', 'max:50', Rule::unique('drivers', 'license_number')->ignore($entity?->id)],
            'name' => ['required', 'string', 'max:200'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}