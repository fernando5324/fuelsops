import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';

/**
 * Permisos del usuario autenticado (RBAC, ADR-068).
 *
 * Lee `auth.permissions` (slugs `module.action` compartidos por el backend) y
 * expone `can(...slugs)` para ocultar botones/opciones en toda la UI. El Super
 * Admin de plataforma recibe el catálogo completo de slugs, por lo que `can`
 * devuelve true automáticamente para él. Como medición extra de UI también
 * expone `isPlatformUser`.
 */
export default function usePermissions() {
    const { auth } = usePage().props;

    const permissions = useMemo(
        () => new Set((auth?.permissions || []).map((p) => String(p))),
        [auth?.permissions],
    );

    const can = (...slugs) => slugs.some((slug) => permissions.has(String(slug)));

    return {
        can,
        permissions,
        isPlatformUser: Boolean(auth?.is_platform_user),
    };
}