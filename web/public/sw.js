// SyncCinema Production PWA Service Worker (v5 - Mobile Resilient & Offline Guard)
const CACHE_NAME = 'syncinema-v5';
const PRECACHE_ASSETS = [
  '/',
  '/favicon.ico',
  '/icon-48.png',
  '/icon-96.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/logo.png',
  '/home-bg.jpg',
  '/manifest.webmanifest',
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

function getOfflineHtml(url) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>SyncCinema — Connection Paused</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #141416;
      color: #fce7f3;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: #222222;
      border: 1px solid rgba(236, 72, 153, 0.35);
      border-radius: 24px;
      padding: 36px 24px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(236, 72, 153, 0.15);
    }
    .icon {
      font-size: 42px;
      margin-bottom: 16px;
      display: inline-block;
      animation: pulse 2s infinite ease-in-out;
    }
    h2 {
      font-size: 20px;
      font-weight: 800;
      color: #fdf2f8;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(236, 72, 153, 0.15);
      border: 1px solid rgba(236, 72, 153, 0.3);
      color: #f472b6;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 16px;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #f43f5e;
      animation: blink 1s infinite alternate;
    }
    p {
      color: #cbd5e1;
      font-size: 13px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      background: linear-gradient(135deg, #ec4899, #db2777);
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 20px;
      border-radius: 14px;
      box-shadow: 0 8px 24px rgba(236, 72, 153, 0.35);
      transition: transform 0.15s, opacity 0.15s;
      cursor: pointer;
      border: none;
    }
    .btn:active { transform: scale(0.98); }
    .hint {
      margin-top: 16px;
      font-size: 11px;
      color: #94a3b8;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    @keyframes blink {
      0% { opacity: 0.3; }
      100% { opacity: 1; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🍿</div>
    <div class="tag"><span class="dot"></span> Network Paused</div>
    <h2>SyncCinema Reconnecting</h2>
    <p>Your internet connection momentarily dipped. SynCinema is ready to resume your private room stream.</p>
    <button class="btn" onclick="retryConnection()">Tap Here to Reload ⚡</button>
    <div class="hint">Will auto-resume the instant connection returns.</div>
  </div>
  <script>
    function retryConnection() {
      window.location.href = ${JSON.stringify(url)};
    }
    window.addEventListener('online', () => {
      retryConnection();
    });
    setInterval(() => {
      if (navigator.onLine) {
        fetch('/manifest.webmanifest', { method: 'HEAD', cache: 'no-store' })
          .then(() => retryConnection())
          .catch(() => {});
      }
    }, 2500);
  </script>
</body>
</html>`;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Pass non-GET, API, socket, peer, and streaming requests straight to network
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/peerjs')
  ) {
    return;
  }

  // Handle navigation requests (HTML page loads)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful root navigation responses for offline resilience
          if (response && response.status === 200 && url.pathname === '/') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          // 1. Try exact cached navigation URL
          const cached = await caches.match(event.request);
          if (cached) return cached;

          // 2. Try root shell cache
          if (url.pathname === '/') {
            const rootCached = await caches.match('/');
            if (rootCached) return rootCached;
          }

          // 3. Elegant, auto-reconnecting offline fallback
          return new Response(getOfflineHtml(event.request.url), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Static assets: cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => cached);
    })
  );
});
