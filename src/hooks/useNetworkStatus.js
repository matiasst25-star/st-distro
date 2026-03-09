import { useState, useEffect, useCallback } from 'react';

export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(true);

    const checkConnection = useCallback(async () => {
        try {
            const res = await fetch('/api/health', {
                method: 'GET',
                cache: 'no-store',
                signal: AbortSignal.timeout(4000),
            });
            setIsOnline(res.ok);
        } catch {
            // Si navigator.onLine está en true pero el fetch falló,
            // puede ser que el backend esté caído — pero en localhost
            // generalmente navigator.onLine es false incorrectamente.
            // Solo marcamos offline si el browser TAMBIÉN lo reporta.
            setIsOnline(navigator.onLine);
        }
    }, []);

    useEffect(() => {
        // Check inmediato al montar
        checkConnection();

        // Re-check cada 10 segundos
        const interval = setInterval(checkConnection, 10_000);

        // También escuchar eventos nativos del browser
        const handleOnline = () => checkConnection();
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [checkConnection]);

    return { isOnline };
}
