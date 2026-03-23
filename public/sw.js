/* Shrimp — Service Worker */

const CACHE_NAME = 'shrimp-__SW_VERSION__';

const PRECACHE = ['/offline.html'];

const NO_CACHE_PATHS = ['/favicon', '/logo.png', '/icons/', '/manifest.json', '/sw.js'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then(keys => {
      const old = keys.filter(k => k !== CACHE_NAME);
      return Promise.all(old.map(k => caches.delete(k))).then(() => {
        return self.clients.claim().then(() => {
          if (old.length > 0) {
            return self.clients.matchAll({ type: 'window' }).then(clients => {
              for (const client of clients) client.postMessage({ type: 'sw-activated' });
            });
          }
        });
      });
    })
  );
});

self.addEventListener('fetch', (ev) => {
  const { request } = ev;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/upload') return;
  if (url.origin !== self.location.origin) return;

  if (NO_CACHE_PATHS.some(p => url.pathname.startsWith(p))) return;

  if (request.mode === 'navigate') {
    ev.respondWith(networkFirst(request));
    return;
  }

  ev.respondWith(networkFirst(request));
});

function networkFirst(request) {
  return fetch(request).then(resp => {
    if (resp.ok) {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(c => c.put(request, clone));
    }
    return resp;
  }).catch(() =>
    caches.match(request).then(cached => {
      if (cached) return cached;
      if (request.mode === 'navigate') return caches.match('/offline.html');
      return new Response('', { status: 504, statusText: 'Offline' });
    })
  );
}
