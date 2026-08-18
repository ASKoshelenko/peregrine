const V = "control-room-12";
const CACHE = "peregrine-shell-" + V;
const SHELL = ["/", "/index.html", "/styles.css", "/app.js", "/manifest.webmanifest", "/peregrine-mark.svg", "/assets/warehouse-frame.svg", "/assets/samples/sample-1.jpg", "/assets/samples/sample-2.jpg", "/assets/samples/sample-3.jpg", "/platform-events.json", "/pipelines.json", "/artifacts/observed/latest.json", "/components/platform-event-model.js", "/components/pipeline-model.js", "/components/pwa-shell.js", "/components/motion.js", "/components/i18n.js", "/components/store.js", "/components/router.js", "/components/gloss.js", "/components/rail.js", "/components/lane.js", "/components/console.js", "/components/sections/hero.js", "/components/sections/platform.js", "/components/sections/conveyor.js", "/components/sections/control-room.js", "/components/sections/gates.js", "/components/sections/detector.js", "/components/sections/evidence.js", "/components/sections/ops.js", "/data/i18n.en.js", "/data/i18n.uk.js", "/data/content.js"];
const SHELL_PATHS = new Set(SHELL);
const EVIDENCE = new Set(["/platform-events.json", "/pipelines.json"]);
const isEvidence = (pathname) => EVIDENCE.has(pathname) || pathname.startsWith("/artifacts/");
const cached = (request) => caches.match(request, { cacheName: CACHE, ignoreSearch: true });

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.allSettled(SHELL.map((path) => cache.add(path)))));
});

self.addEventListener("activate", (event) => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
  const cache = await caches.open(CACHE);
  const stale = (await cache.keys()).filter((request) => !SHELL_PATHS.has(new URL(request.url).pathname));
  await Promise.all(stale.map((request) => cache.delete(request)));
  await self.clients.claim();
})()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  const navigation = event.request.mode === "navigate";
  event.respondWith(navigation || isEvidence(url.pathname) ? networkFirst(event.request, navigation ? "/index.html" : null) : cacheFirst(event));
});

async function store(request, response) {
  if (!response || response.status !== 200 || response.type !== "basic") return response;
  const url = new URL(request.url);
  const cache = await caches.open(CACHE);
  await cache.put(SHELL_PATHS.has(url.pathname) ? url.pathname : request, response.clone());
  return response;
}

async function networkFirst(request, fallback = null) {
  try {
    return await store(request, await fetch(request));
  } catch (error) {
    const hit = (await cached(request)) || (fallback ? await cached(fallback) : null);
    if (hit) return hit;
    throw error;
  }
}

async function cacheFirst(event) {
  const hit = await cached(event.request);
  if (hit) {
    event.waitUntil(fetch(event.request).then((response) => store(event.request, response)).catch(() => hit));
    return hit;
  }
  return store(event.request, await fetch(event.request));
}
