import { useRef, useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { ProcessingContext } from '@/hooks/useProcessing';

/**
 * ProcessingProvider monitorea las requests Inertia en vuelo.
 * Incrementa un counter en `before` (solo mutations) y decrementa en `finish`.
 * Expone `processing=true` si hay ≥1 mutation en vuelo (doble clic bloqueado).
 */
export default function ProcessingProvider({ children }) {
    const countRef = useRef(0);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const unsubs = [
            router.on('before', (event) => {
                const method = (event.detail.visit.method ?? 'get').toLowerCase();
                if (method !== 'get') {
                    countRef.current += 1;
                    setProcessing(true);
                }
            }),
            router.on('finish', () => {
                countRef.current = Math.max(0, countRef.current - 1);
                if (countRef.current === 0) {
                    setProcessing(false);
                }
            }),
        ];

        return () => unsubs.forEach((u) => u());
    }, []);

    return (
        <ProcessingContext.Provider value={{ processing }}>
            {children}
        </ProcessingContext.Provider>
    );
}