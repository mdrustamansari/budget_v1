// Rustam's Budget Manager: offline service worker.
// Bump CACHE_VERSION whenever you replace any file so phones pick up the update.
const CACHE_VERSION = 'rustams-budget-manager-v16';
const ASSETS = ['./', './index.html', './style.css', './engine.js', './companion-art.js', './companion-lines.js', './companion.js', './app.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(cached => {
    const refresh = fetch(req).then(res => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(req, copy)); } return res; }).catch(() => cached);
    return cached || refresh;
  }));
});
