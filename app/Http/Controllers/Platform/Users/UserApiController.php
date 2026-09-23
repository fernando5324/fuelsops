<?php

namespace App\Http\Controllers\Platform\Users;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Platform\Concerns\HasCrudActions;
use App\Models\User;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class UserApiController extends Controller
{
    use HasCrudActions;

    protected string $model = User::class;

    protected function logicalDelete(): bool
    {
        return true;
    }

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
        // El usuario solo puede crear cuentas en su propia organización.
        $data['tenant_id'] = TenantContext::id();
        // Solo el propietario de la organización puede crear propietarios.
        $data['is_owner'] = $this->canAssignOwnership() && (bool) ($data['is_owner'] ?? false);

        return $data;
    }

    protected function prepareForUpdate(Model $entity, array $data): array
    {
        $data['name'] = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''));

        if ($this->canAssignOwnership()) {
            $data['is_owner'] = (bool) ($data['is_owner'] ?? false);
        } else {
            unset($data['is_owner']);
        }

        if (empty($data['password'])) {
            unset($data['password']);
        }

        return $data;
    }

    public function destroy(Request $request): RedirectResponse
    {
        if ((int) $this->resolveRouteEntity()->getKey() === (int) config('sertoco.system_user_id')) {
            return back()
                ->withErrors(['system_user' => __('catalogs.system_user_protected')]);
        }

        $entity = $this->resolveRouteEntity();
        $this->authorizeEntity($entity);

        $entity->delete();

        return back()->with('flash', ['success' => __('catalogs.deleted')]);
    }

    /**
     * Solo es posible operar usuarios de la propia organización.
     */
    protected function authorizeEntity(Model $entity): void
    {
        abort_unless((int) $entity->tenant_id === TenantContext::id(), 404);
    }

    private function canAssignOwnership(): bool
    {
        return (bool) auth()->user()?->is_owner;
    }
}