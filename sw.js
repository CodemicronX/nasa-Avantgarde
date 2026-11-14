// Cache-first for heavy static media (3D models, textures, Draco decoder, images) so repeat visits are instant.
// The cache name carries a hash of those files (?v=… from the build); a new hash drops the old cache.
const V = new URL(self.location.href).searchParams.get('v') || '0';
const CACHE = 'avg-media-' + V;
const MEDIA = /\/(models|textures|draco|img)\/[^?]+$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('avg-media-') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== self.location.origin || !MEDIA.test(u.pathname)) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE); const hit = await c.match(r, { ignoreSearch: true }); if (hit) return hit;
    const res = await fetch(r); if (res.ok && res.type === 'basic') c.put(r, res.clone()).catch(() => {});
    return res;
  })());
});
