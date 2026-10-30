/*
 * 童识 · 认知卡片 Service Worker（v0.7）
 *
 * 策略只有两条，刻意不引 Workbox：
 *   1) 导航请求：网络优先，断网时回退缓存的外壳（index.html）
 *   2) 同源静态资源（js / css / 图片 / 音频）：缓存优先，未命中再取并写入
 * 跨源请求（GitHub 外链等）一律不拦截。
 *
 * 更新链条：导航网络优先 → 联网即拿到新 index.html → 新 hash 文件名 → 缓存未命中 → 取新文件。
 * 因此缓存名不需要跟版本号绑定；activate 时清掉同前缀的旧缓存即可。
 */

const CACHE = 'early-learn:v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

const STATIC_RE = /\.(?:js|css|webp|mp3|svg|png|jpg|jpeg|json|woff2?)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // 逐个 add：任何一个 404 都不该让整次安装失败
      await Promise.allSettled(CORE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('early-learn:') && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 1) 页面导航：网络优先，断网回退外壳
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE);
          return (
            (await cache.match('./index.html')) ??
            (await cache.match('./')) ??
            new Response('离线状态下暂无缓存内容', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        }
      })(),
    );
    return;
  }

  // 2) 静态资源：缓存优先
  if (!STATIC_RE.test(url.pathname)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok) void cache.put(request, response.clone());
      return response;
    })(),
  );
});
