<?php

namespace App\Http\Controllers\Platform\Drivers;

use App\Http\Controllers\Platform\Catalogs\CatalogController;
use App\Models\Driver;

class DriverController extends CatalogController
{
    protected string $model = Driver::class;

    protected string $resource = 'drivers';

    protected string $titleKey = 'menus.drivers';

    protected array $searchable = ['name', 'license_number'];

    protected array $fields = [
        ['key' => 'license_number', 'label' => 'catalogs.license_number', 'type' => 'text', 'required' => true],
        ['key' => 'name', 'label' => 'common.name', 'type' => 'text', 'required' => true],
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean', 'required' => true],
    ];
}