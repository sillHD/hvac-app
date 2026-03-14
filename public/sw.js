const CACHE_NAME = 'anc-hvac-v2';
const OFFLINE_URLS = ['/', '/login', '/manifest.webmanifest'];

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
      return response;
    })
    .catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      throw new Error('offline');
    });
}

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
      return response;
    });
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for API calls to avoid stale business data.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Network-first for app pages and Next bundles to avoid stale UI after deploys.
  if (
    request.mode === 'navigate' ||
    url.pathname.startsWith('/_next/') ||
    url.pathname === '/' ||
    url.pathname === '/login'
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first for remaining same-origin static assets.
  event.respondWith(cacheFirst(request));
});
