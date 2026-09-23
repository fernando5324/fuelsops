<?php

namespace App\Http\Controllers\Platform\OrderStatuses;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Platform\Concerns\HasIndexPage;
use App\Models\OrderStatus;

class OrderStatusController extends Controller
{
    use HasIndexPage;

    protected string $model = OrderStatus::class;

    protected string $resource = 'estados';

    protected string $titleKey = 'menus.order_statuses';

    protected array $searchable = ['code', 'name'];

    protected array $filters = [
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean'],
    ];

    protected array $fields = [
        ['key' => 'code', 'label' => 'catalogs.code', 'type' => 'text', 'required' => true],
        ['key' => 'name', 'label' => 'common.name', 'type' => 'text', 'required' => true],
        ['key' => 'description', 'label' => 'catalogs.description', 'type' => 'textarea', 'required' => false],
        ['key' => 'color', 'label' => 'catalogs.color', 'type' => 'text', 'required' => false],
        ['key' => 'is_default', 'label' => 'catalogs.is_default', 'type' => 'boolean', 'required' => false],
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean', 'required' => true],
    ];
}