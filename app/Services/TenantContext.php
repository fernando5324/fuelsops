<?php

namespace App\Services;

use Illuminate\Support\Facades\Auth;

/**
 * Resuelve la organización (tenant) activa durante la petición.
 *
 * - Con sesión: el tenant del usuario autenticado.
 * - Sin sesión (flujo público): la organización por defecto (Sertoco),
 *   configurada en `config/platform.php` (`default_tenant_id`).
 *
 * Permite override en memoria para pruebas de aislamiento.
 */
class TenantContext
{
    private static ?int $override = null;

    public static function id(): ?int
    {
        if (self::$override !== null) {
            return self::$override;
        }

        if (($user = Auth::user()) !== null && $user->tenant_id !== null) {
            return (int) $user->tenant_id;
        }

        return (int) config('platform.default_tenant_id');
    }

    public static function override(?int $tenantId): void
    {
        self::$override = $tenantId;
    }

    public static function reset(): void
    {
        self::$override = null;
    }
}