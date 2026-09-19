<?php

namespace App\Http\Controllers\Platform\Vehicles;

use App\Http\Controllers\Platform\Catalogs\CatalogController;
use App\Models\Vehicle;

class VehicleController extends CatalogController
{
    protected string $model = Vehicle::class;

    protected string $resource = 'vehicles';

    protected string $titleKey = 'menus.vehicles';

    protected array $searchable = ['license_plate'];

    protected array $fields = [
        ['key' => 'license_plate', 'label' => 'catalogs.license_plate', 'type' => 'text', 'required' => true],
        ['key' => 'type', 'label' => 'catalogs.vehicle_type', 'type' => 'select', 'options' => 'vehicle_types', 'required' => true],
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean', 'required' => true],
    ];

    protected function options(): array
    {
        return [
            'vehicle_types' => [
                ['value' => Vehicle::TYPE_TANKER, 'label' => __('catalogs.type_tanker')],
                ['value' => Vehicle::TYPE_TRACTOR, 'label' => __('catalogs.type_tractor')],
            ],
        ];
    }
}