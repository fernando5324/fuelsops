import { Button } from 'antd';
import usePermissions from '@/hooks/usePermissions';
import { useProcessing } from '@/hooks/useProcessing';

/**
 * Botón de submit reutilizable que se bloquea mientras hay una mutation Inertia
 * en vuelo (processing global). Al quedar bloqueado evita el doble envío; el
 * estado se deriva del ProcessingProvider y se resetea solo al `finish` del
 * request (éxito o error de validación). Incluye gating de permisos RBAC.
 *
 * Props:
 *   permission — slug del permiso requerido (p.ej. 'articles.create').
 *                Si se omite, el botón siempre es visible.
 *   children   — contenido del botón (texto).
 *   ...rest    — cualquier prop de antd Button (icon, size, type, etc.)
 */
export default function SubmitButton({ permission, loadingText, children, ...rest }) {
    const { can } = usePermissions();
    const { processing } = useProcessing();

    if (permission && !can(permission)) return null;

    return (
        <Button
            type="primary"
            htmlType="submit"
            loading={processing}
            {...rest}
        >
            {processing && loadingText ? loadingText : children}
        </Button>
    );
}