<?php

namespace App\Http\Controllers\Platform\Vehicles;

use App\Http\Controllers\Platform\Catalogs\CatalogApiController;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class VehicleApiController extends CatalogApiController
{
    protected string $model = Vehicle::class;

    protected bool $logicalDelete = true;

    protected function rules(?Model $entity = null): array
    {
        return [
            'license_plate' => ['required', 'string', 'max:20', Rule::unique('vehicles', 'license_plate')->ignore($entity?->id)],
            'type' => ['required', Rule::in([Vehicle::TYPE_TANKER, Vehicle::TYPE_TRACTOR])],
            'is_active' => ['required', 'boolean'],
        ];
    }
}