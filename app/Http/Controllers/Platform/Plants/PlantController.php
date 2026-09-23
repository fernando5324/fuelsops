<?php

namespace App\Http\Controllers\Platform\Plants;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Platform\Concerns\HasIndexPage;
use App\Models\Plant;

class PlantController extends Controller
{
    use HasIndexPage;

    protected string $model = Plant::class;

    protected string $resource = 'plants';

    protected string $titleKey = 'menus.plants';

    protected array $searchable = ['name'];

    protected array $filters = [
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean'],
    ];

    protected array $fields = [
        ['key' => 'name', 'label' => 'common.name', 'type' => 'text', 'required' => true],
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean', 'required' => true],
    ];

    /**
     * La URL web es el segmento en español (ADR-003), distinto del
     * `$resource` interno en inglés.
     */
    protected function pageUrl(): string
    {
        return '/catalogos/plantas';
    }
}