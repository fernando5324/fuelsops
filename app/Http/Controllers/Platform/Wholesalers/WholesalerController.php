<?php

namespace App\Http\Controllers\Platform\Wholesalers;

use App\Http\Controllers\Platform\Catalogs\CatalogController;
use App\Models\Wholesaler;

class WholesalerController extends CatalogController
{
    protected string $model = Wholesaler::class;

    protected string $resource = 'wholesalers';

    protected string $titleKey = 'menus.wholesalers';

    protected array $searchable = ['name'];

    protected array $fields = [
        ['key' => 'name', 'label' => 'common.name', 'type' => 'text', 'required' => true],
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean', 'required' => true],
    ];
}