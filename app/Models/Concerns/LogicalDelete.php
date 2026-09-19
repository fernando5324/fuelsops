<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

/**
 * Baja lógica usando la columna `is_deleted` (ADR-005).
 *
 * - Global scope: sólo se consultan registros activos (is_deleted = 0).
 * - delete(): marca is_deleted = 1 (conservando la auditoría de updated_by).
 * - restore(): vuelve a is_deleted = 0.
 * - forceDelete(): elimina físicamente el registro.
 */
trait LogicalDelete
{
    public static function bootLogicalDelete(): void
    {
        static::addGlobalScope('not_deleted', function (Builder $builder) {
            $builder->where($builder->qualifyColumn('is_deleted'), 0);
        });
    }

    public function delete(): bool
    {
        if ($this->fireModelEvent('deleting') === false) {
            return false;
        }

        $this->is_deleted = 1;
        $deleted = $this->save();

        if ($deleted) {
            $this->fireModelEvent('deleted', false);
        }

        return $deleted;
    }

    public function restore(): bool
    {
        $restored = $this->save();

        if ($restored) {
            // restore() es "no-op" del scope; el evento ayuda a simetría.
            $this->fireModelEvent('restored', false);
        }

        return $restored;
    }

    public function forceDelete(): bool
    {
        return (bool) $this->newQueryWithoutScopes()
            ->where($this->getKeyName(), $this->getKey())
            ->delete();
    }
}