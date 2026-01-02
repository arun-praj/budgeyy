const CACHE_NAME = 'budgeyy-cache-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Don't cache API calls (except maybe GET categories if we wanted)
    // For now, let's keep API network-only to avoid stale data issues
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/static/')) {
        // _next/static is better cached, but without hashing manifest, simple Stale-While-Revalidate is risky? 
        // Actually Next.js handles its own caching headers well.
        // Let's just use Network First for everything to be safe for a "Manual" implementation without manifests.
        // OR StaleWhileRevalidate for assets.
        return;
    }

    // Basic "Network First, Fallback to Cache" strategy for HTML navigation
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clone and cache the successfully fetched page
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                })
                .catch(() => {
                    // If offline, try to serve from cache
                    return caches.match(event.request);
                })
        );
        return;
    }

    // For other assets (CSS/JS/Images), try cache first, then network?
    // Or Stale-While-Revalidate.
    // Let's stick to network first for safety in dev cycles.
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then(response => {
                // Cache dynamic assets too? Maybe risky without versioning.
                return response;
            });
        })
    );
});
