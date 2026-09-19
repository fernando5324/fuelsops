<?php

namespace App\Http\Controllers\Platform\Catalogs;

use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Operaciones HTTP de catálogos (ADR-064).
 *
 * Cada módulo extiende esta clase y define el modelo y las reglas.
 * El borrado usa `is_deleted` (baja lógica) en entidades maestras o
 * `is_active = 0` en catálogos simples (ADR-005).
 */
abstract class CatalogApiController extends Controller
{
    /** @var class-string */
    protected string $model;

    /** Reglas de validación (reciben entidad nullable para update). */
    protected function rules(?Model $entity = null): array
    {
        return [];
    }

    /** Entidades maestras con `is_deleted`: borrado lógico vía modelo. */
    protected bool $logicalDelete = false;

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

    public function update(Request $request, Model $entity): RedirectResponse
    {
        $data = $request->validate($this->rules($entity));

        try {
            $this->beforeUpdate($entity, $data);
            $entity->update($this->prepareForUpdate($entity, $data));
        } catch (QueryException $e) {
            return back()->withErrors(['duplicate' => __('catalogs.duplicate')]);
        }

        return back()->with('flash', ['success' => __('catalogs.updated')]);
    }

    public function destroy(Model $entity): RedirectResponse
    {
        try {
            if ($this->logicalDelete) {
                $entity->delete();
            } else {
                $entity->update(['is_active' => 0]);
            }
        } catch (QueryException $e) {
            return back()->withErrors(['duplicate' => __('catalogs.delete_blocked')]);
        }

        return back()->with('flash', ['success' => __('catalogs.deleted')]);
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