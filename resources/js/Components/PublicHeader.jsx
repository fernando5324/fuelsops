import React, { useEffect, useState } from 'react';
import useTranslations from '@/hooks/useTranslations';
import { useBrand } from '@/lib/brand';

export default function PublicHeader() {
    const { t } = useTranslations();
    const brand = useBrand();
    const [online, setOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true,
    );

    useEffect(() => {
        const on = () => setOnline(true);
        const off = () => setOnline(false);

        window.addEventListener('online', on);
        window.addEventListener('offline', off);

        return () => {
            window.removeEventListener('online', on);
            window.removeEventListener('offline', off);
        };
    }, []);

    return (
        <header className="ui-public-header">
            <span className="ui-header-logo">
                {/* `brand.client` es el nombre del cliente (tenants.name), que es lo que
                debe leerse; el logo viene de `brand.logo` para que todos los
                puntos de entrada usen el mismo origen (ADR-019). */}
                <img src={brand.logo} alt={brand.client} />
            </span>
            <span className={`ui-pill ${online ? 'ui-pill--online' : 'ui-pill--offline'}`}>
                <span className="ui-pill-dot" />
                {online ? t('common.online') : t('common.offline')}
            </span>
        </header>
    );
}