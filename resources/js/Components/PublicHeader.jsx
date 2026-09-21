import React, { useEffect, useState } from 'react';
import useTranslations from '@/hooks/useTranslations';
import logo from '../../images/logo.png';

export default function PublicHeader() {
    const { t } = useTranslations();
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
            <img key={logo} src={logo} alt={t('common.brand')} />
            <span className={`ui-pill ${online ? 'ui-pill--online' : 'ui-pill--offline'}`}>
                <span className="ui-pill-dot" />
                {online ? t('common.online') : t('common.offline')}
            </span>
        </header>
    );
}