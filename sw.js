const CACHE_NAME = 'garo-cab-gh-v5';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // The RAW image URL must be cached here
  'https://raw.githubusercontent.com/mrbtool/Garoautocab/main/grok_image_1771136820619~2.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch((err) => console.error('Cache failed:', err))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});
