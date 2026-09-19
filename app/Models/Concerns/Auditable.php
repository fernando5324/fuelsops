<?php

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * Convención de auditoría (ADR-005).
 *
 * - created_by: NOT NULL; si no se envía, se asigna el actor actual o el
 *   usuario "sistema" (p. ej. formulario público).
 * - updated_by: se actualiza en cada modificación por Eloquent.
 * - created_at / updated_at los gestiona Eloquent con TIMESTAMP/DATETIME.
 */
trait Auditable
{
    public static function bootAuditable(): void
    {
        static::creating(function ($model) {
            if (empty($model->created_by)) {
                $model->created_by = self::actorId();
            }
        });

        static::updating(function ($model) {
            $model->updated_by = self::actorId();
        });
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    protected static function actorId(): int
    {
        if (($id = Auth::id()) !== null) {
            return (int) $id;
        }

        return (int) config('sertoco.system_user_id', 999999);
    }
}