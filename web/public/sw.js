// SyncCinema PWA Service Worker
const CACHE_NAME = 'syncinema-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass non-GET and API / socket requests straight to network
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/peerjs')
  ) {
    return;
  }

  // Stale-while-revalidate for static assets, network first for pages
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
