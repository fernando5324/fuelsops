<?php

namespace App\Http\Controllers\Platform\Users;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Platform\Concerns\HasIndexPage;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class UserController extends Controller
{
    use HasIndexPage;

    protected string $model = User::class;

    protected string $resource = 'users';

    protected string $titleKey = 'menus.users';

    protected array $searchable = ['first_name', 'last_name', 'email', 'name'];

    protected array $filters = [
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean'],
        ['key' => 'is_owner', 'label' => 'catalogs.is_owner', 'type' => 'boolean'],
    ];

    protected array $fields = [
        ['key' => 'name', 'label' => 'profile.username', 'type' => 'text', 'required' => true],
        ['key' => 'first_name', 'label' => 'common.first_name', 'type' => 'text', 'required' => true],
        ['key' => 'last_name', 'label' => 'common.last_name', 'type' => 'text', 'required' => false],
        ['key' => 'email', 'label' => 'auth.email', 'type' => 'text', 'required' => true],
        ['key' => 'password', 'label' => 'auth.password', 'type' => 'password', 'required' => false, 'create_only' => true],
        ['key' => 'is_owner', 'label' => 'catalogs.is_owner', 'type' => 'boolean', 'required' => false],
        ['key' => 'is_active', 'label' => 'common.active', 'type' => 'boolean', 'required' => true],
    ];

    /**
     * La página de usuarios está fuera de `catalogos/`.
     */
    protected function pageUrl(): string
    {
        return '/usuarios';
    }

    /**
     * Solo usuarios de la organización del actor actual.
     */
    protected function applyQueryScope(Builder $query): void
    {
        $query->forTenant();
    }
}