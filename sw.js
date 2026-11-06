// Service worker: makes the app installable and usable offline.
// Strategy: network-first for same-origin files (so updates show up right away),
// falling back to the cached copy when offline.
const CACHE = 'planner-v3';
const NETWORK_TIMEOUT_MS = 3000;
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/theme.js',
  './js/util.js',
  './js/ui.js',
  './js/store.js',
  './js/plan.js',
  './js/foods.js',
  './js/calc.js',
  './js/recommendations.js',
  './js/settings-model.js',
  './js/chart.js',
  './js/views/today.js',
  './js/views/food.js',
  './js/views/workout.js',
  './js/views/progress.js',
  './js/views/settings.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Network first (so updates show up), but if the network is slow or offline,
  // answer from the saved copy after a few seconds. The network reply still refreshes the cache.
  const network = fetch(req).then(async (res) => {
    if (res.ok) await caches.open(CACHE).then((c) => c.put(req, res.clone()));
    return res;
  });
  event.waitUntil(network.catch(() => {}));
  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (!cached) return network.catch(() => caches.match('./index.html'));
    const slow = new Promise((resolve) => setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS));
    return Promise.race([network.catch(() => cached), slow]);
  })());
});
