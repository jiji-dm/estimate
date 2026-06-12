// ══════════════════════════════════════════════════════════════
// Service Worker (PWA)
//   - app shell を事前キャッシュ
//   - ネットワーク優先＋キャッシュフォールバック
//     （オンライン時は常に最新、圏外時はキャッシュで起動）
//   - キャッシュ対象は同一オリジンの GET のみ
//     （Google認証・Maps 等の外部リクエストには関与しない）
// ══════════════════════════════════════════════════════════════
const CACHE_NAME = 'gencho-shell-v2'; // app.js等を更新したら数字を上げる
const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './estimate.js',
  './auth.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) =>
          hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())
        )
      )
  );
});
