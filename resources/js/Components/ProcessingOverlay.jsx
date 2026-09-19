import { useEffect, useRef, useState } from 'react';
import { Spin } from 'antd';
import { useProcessing } from '@/hooks/useProcessing';

const SPINNER_DELAY_MS = 300;

/**
 * Overlay global que bloquea interacciones mientras hay una mutation Inertia
 * en vuelo. Aparece transparente inmediatamente (doble clic bloqueado) y
 * muestra spinner si la request supera SPINNER_DELAY_MS (operación pesada).
 */
export default function ProcessingOverlay() {
    const { processing } = useProcessing();
    const [showSpinner, setShowSpinner] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (processing) {
            timerRef.current = setTimeout(() => {
                setShowSpinner(true);
            }, SPINNER_DELAY_MS);
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            setShowSpinner(false);
        };
    }, [processing]);

    if (!processing) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: showSpinner ? 'rgba(255,255,255,0.6)' : 'transparent',
                transition: 'background 0.15s ease',
            }}
        >
            {showSpinner && <Spin size="large" />}
        </div>
    );
}
