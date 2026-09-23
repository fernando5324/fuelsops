<?php

namespace App\Http\Controllers\Platform\Advisors;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Platform\Concerns\HasIndexPage;
use App\Models\Advisor;

class AdvisorController extends Controller
{
    use HasIndexPage;

    protected string $model = Advisor::class;

    protected string $resource = 'advisors';

    protected string $titleKey = 'menus.advisors';

    protected array $searchable = ['name'];

    protected array $filters = [
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean'],
    ];

    protected array $fields = [
        ['key' => 'name', 'label' => 'common.name', 'type' => 'text', 'required' => true],
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean', 'required' => true],
    ];

    protected function pageComponent(): string
    {
        return 'Platform/Advisors/Index';
    }

    /**
     * La URL web es el segmento en español (ADR-003), distinto del
     * `$resource` interno en inglés.
     */
    protected function pageUrl(): string
    {
        return '/catalogos/asesores';
    }
}