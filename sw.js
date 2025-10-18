// sw.js — Cave Miner v2 (cache-first + html fallback) — icons/ only
var CACHE = 'caveminer-v2-cache-v2';
var ASSETS = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  // SPA / navigazioni → prova la rete, poi fallback html
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }

  // statici → cache first, poi rete e metti in cache
  e.respondWith(
    caches.match(req).then(function (r) {
      if (r) return r;
      return fetch(req).then(function (res) {
        try {
          if (new URL(req.url).origin === self.location.origin) {
            caches.open(CACHE).then(function (c) { c.put(req, res.clone()); });
          }
        } catch (_) {}
        return res;
      });
    })
  );
});
