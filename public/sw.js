/* 虾饺 (Xiajiao) — Service Worker (offline-first for static, network-first for dynamic) */

const CACHE_NAME = 'xiajiao-v2';

const PRECACHE = [
  '/',
  '/offline.html',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

const STATIC_EXT = /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|webp|ico)(?:\?|$)/i;

/* ── Install: precache shell ── */
self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: clean old caches ── */
self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch strategies ── */
self.addEventListener('fetch', (ev) => {
  const { request } = ev;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/upload') return;
  if (url.origin !== self.location.origin) return;

  const isNav = request.mode === 'navigate';

  if (isNav) {
    ev.respondWith(networkFirst(request, true));
    return;
  }

  if (STATIC_EXT.test(url.pathname)) {
    ev.respondWith(cacheFirst(request));
    return;
  }

  ev.respondWith(networkFirst(request, false));
});

function cacheFirst(request) {
  return caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(resp => {
      if (resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
      }
      return resp;
    }).catch(() => new Response('', { status: 504, statusText: 'Offline' }));
  });
}

function networkFirst(request, fallbackOffline) {
  return fetch(request).then(resp => {
    if (resp.ok) {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(c => c.put(request, clone));
    }
    return resp;
  }).catch(() =>
    caches.match(request).then(cached => {
      if (cached) return cached;
      if (fallbackOffline) return caches.match('/offline.html');
      return new Response('', { status: 504, statusText: 'Offline' });
    })
  );
}
