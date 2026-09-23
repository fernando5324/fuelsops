<?php

namespace App\Models\Concerns;

use App\Models\Tenant;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Aislamiento por organización (tenant_id) para entidades de negocio.
 *
 * - Global scope: todas las consultas se filtran por la organización activa.
 * - Hook creating: asigna `tenant_id` automáticamente al insertar.
 * - Relación `tenant()`.
 *
 * NO usar en `User`: la autenticación es global (por email); los usuarios se
 * aíslan de forma explícita en su gestión administrativa.
 */
trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            $builder->where($builder->qualifyColumn('tenant_id'), TenantContext::id());
        });

        static::creating(function ($model) {
            if (empty($model->tenant_id)) {
                $model->tenant_id = TenantContext::id();
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}