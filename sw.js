const CACHE_NAME = 'site-cache-v6';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/index.css',
  '/css/chat.css',
  '/js/index.js',
  '/js/chat.js',
  '/assets/profile.jpeg',
  '/assets/android-chrome-192x192.png',
  '/assets/android-chrome-512x512.png',
  '/assets/profile.png',
  '/assets/apple-touch-icon.png',
  '/assets/favicon-16x16.png',
  '/assets/favicon-32x32.png',
  '/assets/favicon.ico',
  '/assets/profile-32x32.png',
  '/assets/site.webmanifest',
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
