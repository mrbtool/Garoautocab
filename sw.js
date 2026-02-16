const CACHE_NAME = 'rickshaw-go-v1';
const urlsToCache = [
  './index.html',
  './https://github.com/mrbtool/Garoautocab/blob/main/grok_image_1771136820619~2.jpg',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
