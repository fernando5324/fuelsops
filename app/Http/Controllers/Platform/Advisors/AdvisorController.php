<?php

namespace App\Http\Controllers\Platform\Advisors;

use App\Http\Controllers\Platform\Catalogs\CatalogController;
use App\Models\Advisor;

class AdvisorController extends CatalogController
{
    protected string $model = Advisor::class;

    protected string $resource = 'advisors';

    protected string $titleKey = 'menus.advisors';

    protected array $searchable = ['name'];

    protected array $fields = [
        ['key' => 'name', 'label' => 'common.name', 'type' => 'text', 'required' => true],
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean', 'required' => true],
    ];
}