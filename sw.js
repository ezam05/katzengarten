// sw.js – damit die App auch ohne Internet startet (und sich sauber installieren lässt).
// Netz zuerst: online immer der neuste Stand. Ohne Netz kommt die zuletzt gespeicherte Kopie.
// Anfragen an den Server (api/) werden nie gespeichert.

const CACHE = 'katzengarten-v1';
const START = [
  './', 'index.html', 'uhr.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/arten.js', 'js/katze.js', 'js/regeln.js', 'js/ton.js',
  'bilder/hintergrund.webp', 'bilder/icons/icon-192.png', 'bilder/icons/icon-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(START)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.includes('/api/')) return;
  const eigene = url.origin === self.location.origin || url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (!eigene) return;
  e.respondWith(
    fetch(e.request)
      .then((antwort) => {
        if (antwort.ok) {
          const kopie = antwort.clone();
          caches.open(CACHE).then((c) => c.put(e.request, kopie));
        }
        return antwort;
      })
      .catch(async () => (await caches.match(e.request, { ignoreSearch: true }))
        || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())),
  );
});
