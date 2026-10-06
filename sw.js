// Hoops Stats · service worker : la page et ses dépendances sont mises en cache pour un démarrage instantané et un fonctionnement hors ligne (lecture).
const VERSION = 'hs-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Firestore / auth : jamais via le cache (temps réel)
  if (/googleapis\.com\/(google\.firestore|identitytoolkit|securetoken)|firestore\.googleapis\.com|firebaseapp\.com\/__/.test(u.href)) return;
  // page : réseau d'abord (toujours la dernière version), cache en secours
  if (u.origin === location.origin && (u.pathname.endsWith('/') || u.pathname.endsWith('index.html'))) {
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
    return;
  }
  // SDK, polices, icônes : cache d'abord, puis réseau
  if (/gstatic\.com\/firebasejs|fonts\.(googleapis|gstatic)\.com|\.(png|json|woff2?)$/.test(u.href)) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const cp = res.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); return res; })));
  }
});
