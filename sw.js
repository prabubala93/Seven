const CACHE = 'vi-capture-v2';
const APP_SHELL = [
  './vehicle_inspection_capture.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Only these cross-origin hosts (static libraries/fonts) are cached for offline use.
// Everything else (location, address and police-station lookups) always goes to the network.
const CACHEABLE_HOSTS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Cross-origin API calls: bypass the service worker entirely.
  if (!sameOrigin && !CACHEABLE_HOSTS.includes(url.hostname)) return;

  if (sameOrigin) {
    // Network-first for the app itself, so a re-uploaded version is picked up right away.
    event.respondWith(
      fetch(event.request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, copy));
        }
        return res;
      }).catch(() => caches.match(event.request))
    );
  } else {
    // Static libraries/fonts: cache-first.
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, copy));
        }
        return res;
      }))
    );
  }
});
