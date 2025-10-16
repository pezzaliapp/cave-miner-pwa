// Minimal SW (app-shell). iOS 8 non lo usa.
const CACHE = 'cave-miner-v1';
const SHELL = ['/', './index.html', './style.css', './app.js', './icons/icon-192.png', './icons/icon-512.png', './manifest.webmanifest'];
self.addEventListener('install', e=> e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener('activate', e=> e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(caches.delete)))));
self.addEventListener('fetch', e=> e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request))));
