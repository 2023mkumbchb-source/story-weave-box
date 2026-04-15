// OmpathStudy Service Worker - Enhanced Offline Support
const CACHE_NAME = "ompath-v3";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];
const API_CACHE = "ompath-api-v1";

// Install: cache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== API_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/~oauth")) return;
  
  // Cache Supabase API responses for offline reading
  if (url.hostname.includes("supabase") && url.pathname.includes("/rest/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Skip other supabase calls (auth, functions)
  if (url.hostname.includes("supabase")) return;
  
  // Navigation: network-first with offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match("/")))
    );
    return;
  }
  
  // Static assets: cache-first
  if (url.pathname.startsWith("/assets/") || /\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }
  
  // Everything else: network-first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
