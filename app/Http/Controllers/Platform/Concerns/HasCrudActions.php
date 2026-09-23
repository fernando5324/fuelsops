<?php

namespace App\Http\Controllers\Platform\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Operaciones HTTP (CRUD) de un módulo (ADR-003/ADR-064).
 *
 * Cada módulo compone este trait y declara en su ApiController el modelo y
 * las reglas de validación. El borrado usa `is_deleted` (baja lógica) en
 * entidades maestras o `is_active = 0` en catálogos simples (ADR-005).
 *
 * "Catálogo" es solo el nombre lógico con el que se agrupan ciertos módulos
 * en la UI: NO existe aquí agrupación física por catálogo.
 */
trait HasCrudActions
{
    /**
     * Cada módulo declara en su ApiController el modelo a operar:
     *
     * @var class-string $model
     */
    /** Reglas de validación (reciben entidad nullable para update). */
    protected function rules(?Model $entity = null): array
    {
        return [];
    }

    /**
     * Entidades maestras con `is_deleted`: borrado lógico vía modelo.
     * Los módulos que requieran borrado lógico sobreescriben el método.
     */
    protected function logicalDelete(): bool
    {
        return false;
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate($this->rules(null));

        try {
            $this->beforeCreate($data);
            ($this->model)::create($this->prepareForCreate($data));
        } catch (QueryException $e) {
            return back()->withErrors(['duplicate' => __('catalogs.duplicate')]);
        }

        return back()->with('flash', ['success' => __('catalogs.created')]);
    }

    public function update(Request $request): RedirectResponse
    {
        $entity = $this->resolveRouteEntity();
        $this->authorizeEntity($entity);
        $data = $request->validate($this->rules($entity));

        try {
            $this->beforeUpdate($entity, $data);
            $entity->update($this->prepareForUpdate($entity, $data));
        } catch (QueryException $e) {
            return back()->withErrors(['duplicate' => __('catalogs.duplicate')]);
        }

        return back()->with('flash', ['success' => __('catalogs.updated')]);
    }

    public function destroy(Request $request): RedirectResponse
    {
        $entity = $this->resolveRouteEntity();
        $this->authorizeEntity($entity);

        try {
            if ($this->logicalDelete()) {
                $entity->delete();
            } else {
                $entity->update(['is_active' => 0]);
            }
        } catch (QueryException $e) {
            return back()->withErrors(['duplicate' => __('catalogs.delete_blocked')]);
        }

        return back()->with('flash', ['success' => __('catalogs.deleted')]);
    }

    /**
     * Resuelve la entidad del parámetro de ruta (`{advisor}`, `{customer}`, ...).
     *
     * Se resuelve con el modelo concreto (y sus global scopes), de modo que
     * operar sobre registros de otra organización devuelve 404.
     */
    protected function resolveRouteEntity(): Model
    {
        $parameters = request()->route()?->parameters() ?? [];
        $id = collect($parameters)->first();

        return ($this->model)::query()->findOrFail($id);
    }

    /** Hook de autorización por módulo (p. ej. aislamiento por organización). */
    protected function authorizeEntity(Model $entity): void
    {
    }

    /** Hooks de extensión para módulos específicos. */
    protected function beforeCreate(array &$data): void
    {
    }

    protected function prepareForCreate(array $data): array
    {
        return $data;
    }

    protected function beforeUpdate(Model $entity, array &$data): void
    {
    }

    protected function prepareForUpdate(Model $entity, array $data): array
    {
        return $data;
    }
}