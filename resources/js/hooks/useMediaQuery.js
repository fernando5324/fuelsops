import { useEffect, useState } from 'react';

/**
 * Observa una media query CSS y devuelve su estado (true/false) reactivo.
 * Basado en window.matchMedia; usado por el layout para conmutar el Sider
 * a Drawer en móvil y para el padding del Content.
 *
 * Uso:
 *   const isMobile = useMediaQuery('(max-width: 767px)');
 */
export default function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window === 'undefined' || !window.matchMedia) {
            return false;
        }
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) {
            return undefined;
        }

        const mql = window.matchMedia(query);
        const handler = (event) => setMatches(event.matches);

        setMatches(mql.matches);
        mql.addEventListener('change', handler);

        return () => mql.removeEventListener('change', handler);
    }, [query]);

    return matches;
}