<?php

namespace App\Http\Controllers\Platform\Users;

use App\Http\Controllers\Platform\Catalogs\CatalogApiController;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Http\RedirectResponse;

class UserApiController extends CatalogApiController
{
    protected string $model = User::class;

    protected bool $logicalDelete = true;

    protected function rules(?Model $entity = null): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($entity?->id)],
            'password' => [$entity ? 'nullable' : 'required', 'string', 'min:8'],
            'is_owner' => ['nullable', 'boolean'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    protected function prepareForCreate(array $data): array
    {
        $data['name'] = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''));
        $data['is_owner'] = (bool) ($data['is_owner'] ?? false);

        return $data;
    }

    protected function prepareForUpdate(Model $entity, array $data): array
    {
        $data['name'] = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''));
        unset($data['is_owner']);

        if (empty($data['password'])) {
            unset($data['password']);
        }

        return $data;
    }

    public function destroy(Model $entity): RedirectResponse
    {
        if ((int) $entity->getKey() === (int) config('sertoco.system_user_id')) {
            return Redirect::back()
                ->withErrors(['system_user' => __('catalogs.system_user_protected')]);
        }

        return parent::destroy($entity);
    }
}