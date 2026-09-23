<?php

namespace App\Http\Controllers\Platform\Drivers;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Platform\Concerns\HasIndexPage;
use App\Models\Driver;

class DriverController extends Controller
{
    use HasIndexPage;

    protected string $model = Driver::class;

    protected string $resource = 'drivers';

    protected string $titleKey = 'menus.drivers';

    protected array $searchable = ['name', 'license_number'];

    protected array $filters = [
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean'],
    ];

    protected array $fields = [
        ['key' => 'license_number', 'label' => 'catalogs.license_number', 'type' => 'text', 'required' => true],
        ['key' => 'name', 'label' => 'common.name', 'type' => 'text', 'required' => true],
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean', 'required' => true],
    ];

    /**
     * La URL web es el segmento en español (ADR-003), distinto del
     * `$resource` interno en inglés.
     */
    protected function pageUrl(): string
    {
        return '/catalogos/conductores';
    }
}