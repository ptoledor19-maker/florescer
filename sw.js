// Florescer — service worker
// Estratégia: só cuida dos arquivos do próprio app (mesma origem). Bibliotecas externas
// (Google Fonts, xlsx.js, pdf.js, vindas de CDN) NUNCA são interceptadas — sempre vão
// direto pra rede, pra nunca travar numa versão antiga de uma lib de terceiros.

const CACHE_NAME = 'florescer-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // só mesma origem e método GET — todo o resto (fontes, xlsx.js, pdf.js) vai direto pra rede
  if (url.origin !== self.location.origin || req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return resp;
        })
        .catch(() => cached); // offline: usa o que já está em cache

      // stale-while-revalidate: responde rápido com o cache (se existir) e atualiza em segundo plano
      return cached || network;
    })
  );
});
