const CACHE_NAME = 'budgeyy-cache-v1-noop';

self.addEventListener('install', (event) => {
    // Force new service worker to activate immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Claim clients immediately
    event.waitUntil(self.clients.claim());

    // Clear ALL old caches to ensure fresh start
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    console.log('Deleting cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Do NOTHING. Let the browser handle the network request naturally.
    // This allows Next.js dev server/turbopack to handle HMR and API requests without interference.
    return;
});
