const CACHE_NAME = 'smartdistro-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
];

// Instalar: pre-cachear assets estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activar: limpiar caches viejas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch: Network-first para API, Cache-first para assets estáticos
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Las llamadas a la API siempre van a la red (datos en tiempo real)
    if (url.pathname.startsWith('/api')) {
        event.respondWith(
            fetch(request).catch(() => {
                return new Response(
                    JSON.stringify({ error: 'Sin conexión a internet' }),
                    { status: 503, headers: { 'Content-Type': 'application/json' } }
                );
            })
        );
        return;
    }

    // Assets estáticos: Cache-first, luego red
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                // Actualizar cache en background
                fetch(request).then((response) => {
                    if (response.ok) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, response);
                        });
                    }
                }).catch(() => { });
                return cached;
            }

            return fetch(request).then((response) => {
                // Solo cachear respuestas exitosas de assets
                if (response.ok && (
                    url.pathname.endsWith('.js') ||
                    url.pathname.endsWith('.css') ||
                    url.pathname.endsWith('.html') ||
                    url.pathname.endsWith('.png') ||
                    url.pathname.endsWith('.svg') ||
                    url.pathname.endsWith('.woff2')
                )) {
                    const cloned = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, cloned);
                    });
                }
                return response;
            }).catch(() => {
                // Fallback para navegación: devolver index.html (SPA)
                if (request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
