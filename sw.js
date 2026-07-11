/* Hayat PWA service worker
   v2 — network-first for pages/code so new deploys show up immediately;
   cache-first only for images (they are content-hashed by name in practice). */
const CACHE = "hayat-v2";
const SHELL = [
  "./",
  "index.html",
  "404.html",
  "css/style.css",
  "js/main.js",
  "manifest.json",
  "imgs/hero-sky.jpg",
  "imgs/cloud-a.webp",
  "imgs/cloud-b.webp",
  "imgs/ico-logo.png",
  "imgs/ico-dark.png",
  "imgs/text-dark.png",
  "imgs/text-light.png",
  "imgs/icon-192.png",
  "imgs/icon-512.png",
  "imgs/dest-istanbul.webp",
  "imgs/dest-dubai.webp",
  "imgs/dest-cairo.webp",
  "imgs/dest-tokyo.webp",
  "imgs/dest-santorini.webp",
  "imgs/dest-muscat.webp",
  "imgs/moment-1.webp",
  "imgs/moment-2.webp",
  "imgs/moment-3.webp",
  "imgs/moment-4.webp",
  "imgs/moment-5.webp",
  "imgs/moment-6.webp"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;

  // images: cache-first (fast), refresh in background
  if (req.destination === "image") {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // everything else (HTML/CSS/JS/JSON): network-first, cache as offline fallback
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() =>
      caches.match(req).then(hit => hit || caches.match("index.html"))
    )
  );
});
