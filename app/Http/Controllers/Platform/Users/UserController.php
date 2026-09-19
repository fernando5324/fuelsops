<?php

namespace App\Http\Controllers\Platform\Users;

use App\Http\Controllers\Platform\Catalogs\CatalogController;
use App\Models\User;

class UserController extends CatalogController
{
    protected string $model = User::class;

    protected string $resource = 'users';

    protected string $titleKey = 'menus.users';

    protected array $searchable = ['first_name', 'last_name', 'email', 'name'];

    protected array $fields = [
        ['key' => 'first_name', 'label' => 'common.first_name', 'type' => 'text', 'required' => true],
        ['key' => 'last_name', 'label' => 'common.last_name', 'type' => 'text', 'required' => false],
        ['key' => 'email', 'label' => 'auth.email', 'type' => 'text', 'required' => true],
        ['key' => 'password', 'label' => 'auth.password', 'type' => 'password', 'required' => false, 'create_only' => true],
        ['key' => 'is_owner', 'label' => 'catalogs.is_owner', 'type' => 'boolean', 'required' => false],
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean', 'required' => true],
    ];
}