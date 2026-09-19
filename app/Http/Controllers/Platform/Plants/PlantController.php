<?php

namespace App\Http\Controllers\Platform\Plants;

use App\Http\Controllers\Platform\Catalogs\CatalogController;
use App\Models\Plant;

class PlantController extends CatalogController
{
    protected string $model = Plant::class;

    protected string $resource = 'plants';

    protected string $titleKey = 'menus.plants';

    protected array $searchable = ['name'];

    protected array $fields = [
        ['key' => 'name', 'label' => 'common.name', 'type' => 'text', 'required' => true],
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean', 'required' => true],
    ];
}