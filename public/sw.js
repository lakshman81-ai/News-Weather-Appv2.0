/* Service Worker for News & Weather App */
const CACHE_NAME = 'news-weather-app-v1';
const BASE_PATH = '/News-Weather-App/';

// Assets to cache immediately
const PRECACHE_URLS = [
    BASE_PATH,
    `${BASE_PATH}index.html`,
    `${BASE_PATH}vite.svg`,
    `${BASE_PATH}manifest.json`
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Activate immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_URLS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
    // Cleanup old caches
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

    // 1. API Requests (RSS, Weather): Network First, Fallback to nothing (or cache if we want offline news)
    // We want fresh news, but offline support is nice.
    if (url.protocol.startsWith('http') && event.request.method === 'GET') {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return fetch(event.request)
                    .then((response) => {
                        // Cache successful responses
                        if (response.status === 200) {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    })
                    .catch(() => {
                        return cache.match(event.request);
                    });
            })
        );
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Focus existing window or open new one
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check for existing tab
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                // Check if it's our app
                if (client.url.includes(BASE_PATH) && 'focus' in client) {
                    // Send a message to the client to trigger a specific view/refresh if needed
                    client.postMessage({ type: 'NOTIFICATION_CLICK', action: event.action });
                    return client.focus();
                }
            }
            // If no window is open, open one
            if (clients.openWindow) {
                return clients.openWindow(BASE_PATH);
            }
        })
    );
});
