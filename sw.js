/* Hayat PWA service worker — cache-first for the app shell */
const CACHE = "hayat-v1";
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
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit ||
      fetch(e.request).then(res => {
        const copy = res.clone();
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match("index.html"))
    )
  );
});
