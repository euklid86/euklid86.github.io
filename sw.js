const CACHE_NAME = 'site-cache-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/index.css',
  '/css/chat.css',
  '/js/index.js',
  '/js/chat.js',
  '/assets/profile.jpeg',
  '/api/chat.js',
  '/api/resume.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
