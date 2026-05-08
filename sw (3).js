const CACHE = 'luft-v9'; // ← bump this to match your app version every time you deploy (v10, v11, etc.)

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll([
        '/luft-intake/',
        '/luft-intake/index.html'
      ])
    )
  );
  self.skipWaiting(); // activate immediately, don't wait for old SW to die
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // take control of all open tabs immediately
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/luft-intake')) {
    e.respondWith(
      // Network first: always try to get fresh files, fall back to cache if offline
      fetch(e.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match('/luft-intake/index.html'))
    );
  }
});
