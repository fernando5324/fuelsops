import { createContext, useContext } from 'react';

export const ProcessingContext = createContext({ processing: false });

/**
 * Hook que expone si hay requests Inertia en vuelo (mutations).
 */
export function useProcessing() {
    return useContext(ProcessingContext);
}