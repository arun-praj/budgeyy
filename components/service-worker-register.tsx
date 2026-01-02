'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
    useEffect(() => {
        if ('serviceWorker' in navigator && window.workbox !== undefined) {
            const wb = window.workbox;
            wb.register();
        } else if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('SW registered: ', registration);
                })
                .catch((registrationError) => {
                    console.log('SW registration failed: ', registrationError);
                });
        }
    }, []);

    return null;
}
