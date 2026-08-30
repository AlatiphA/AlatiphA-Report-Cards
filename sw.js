// AlatiphA Report Cards — service worker
// Keep CACHE_NAME's version in sync with APP_VERSION in app-7.js
const CACHE_NAME = 'arc-cache-v7';

const APP_SHELL = [
  './',
  './index.html',
  './style-5.css',
  './app-7.js',
  './manifest.json',
  './icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        APP_SHELL.map(url =>
          fetch(url, { mode: url.startsWith('http') ? 'no-cors' : 'same-origin' })
            .then(res => cache.put(url, res))
            .catch(() => {})
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
    })
  );
});
