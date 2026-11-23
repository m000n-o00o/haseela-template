// Offline support for حصيلة.
// Pages and data (HTML, JSON) are network-first, so updates reach everyone right away;
// the cached copy is used only when there is no connection.
// Images, fonts, PDFs and other static files are cache-first.
// This file also replaces the service worker of the earlier site version: a new VERSION deletes old caches.
const VERSION = 'haseela-v3';
const CORE = [
  './', 'index.html', 'course.html', 'chapter.html', 'bank.html', 'planner.html', 'glossary.html', '404.html',
  'assets/tokens.css', 'assets/components.css', 'assets/site.css?v=3', 'assets/app.js?v=3', 'assets/katex/katex.min.css',
  'assets/img/favicon.svg', 'data/courses.json', 'data/team.json', 'manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameSite = url.origin === location.origin;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameSite && !fonts) return;
  const networkFirst = sameSite && (req.mode === 'navigate' || /\.(html|json|js|css)$/.test(url.pathname) || url.pathname.endsWith('/'));
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    if (networkFirst) {
      try {
        // no-cache: always revalidate with the server, so a new deploy is never mixed with old files from the HTTP cache
        const res = await fetch(req, { cache: 'no-cache' });
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
        return hit || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
      }
    }
    const hit = await cache.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
    return res;
  }));
});
