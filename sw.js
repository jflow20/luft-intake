const CACHE = 'luft-intake-v1';
const ASSETS = [
  '/luft-intake/',
  '/luft-intake/index.html',
  '/luft-intake/app.js',
  '/luft-intake/style.css',
  '/luft-intake/manifest.json',
  '/luft-intake/icons/icon-192.png',
  '/luft-intake/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('/luft-intake/index.html')))
  );
});
