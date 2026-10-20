// SyncCinema Production PWA Service Worker (Mobile & Tablet Fast Launcher)
const CACHE_NAME = 'syncinema-v4';
const PRECACHE_ASSETS = [
  '/favicon.ico',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/home-bg.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass non-GET, API, socket, peer, and streaming requests straight to network
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/peerjs')
  ) {
    return;
  }

  // Always network-first for navigation HTML to prevent Next.js hydration mismatches
  // NEVER return an image/icon file as navigation fallback, as Chromium treats this as ERR_FAILED
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response(
          '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SyncCinema — Reconnecting</title><meta http-equiv="refresh" content="3"></head><body style="background:#18181b;color:#f472b6;font-family:sans-serif;text-align:center;padding:40px;"><h2>🍿 SyncCinema — Reconnecting...</h2><p style="color:#94a3b8;font-size:14px;">Re-establishing your cinema room connection.</p><p><a href="' + event.request.url + '" style="color:#ec4899;text-decoration:underline;">Tap here to reload</a></p></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
