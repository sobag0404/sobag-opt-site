const SOBAG_SW_VERSION = "20260624-browser-cache";
const SOBAG_PUBLIC_CACHE = `sobag-public-${SOBAG_SW_VERSION}`;
const SOBAG_API_MAX_AGE_MS = 10 * 60 * 1000;
const SOBAG_HTML_TIMEOUT_MS = 1200;
const SOBAG_API_TIMEOUT_MS = 900;

const PRIVATE_PREFIXES = [
  "/api/auth",
  "/api/orders",
  "/api/admin",
  "/api/briefs",
  "/admin-",
];

const PUBLIC_API_PATHS = new Set([
  "/api/catalog-query",
  "/api/catalog-detail",
  "/api/price-list",
]);

function sameOriginUrl(input) {
  try {
    const url = new URL(typeof input === "string" ? input : input.url);
    return url.origin === self.location.origin ? url : null;
  } catch {
    return null;
  }
}

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isPublicApi(url) {
  return PUBLIC_API_PATHS.has(url.pathname);
}

function isPublicStatic(url) {
  return (
    url.pathname === "/" ||
    url.pathname === "/catalog" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".json") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".avif")
  );
}

function requestLooksPrivate(request, url) {
  if (request.method !== "GET") return true;
  if (!url || isPrivatePath(url.pathname)) return true;
  if (request.headers.has("authorization")) return true;
  return url.pathname.startsWith("/api/") && !isPublicApi(url);
}

function shouldHandle(request) {
  const url = sameOriginUrl(request);
  if (requestLooksPrivate(request, url)) return false;
  return isPublicApi(url) || isPublicStatic(url);
}

function isHtmlRequest(request, url) {
  return request.mode === "navigate" || request.headers.get("accept")?.includes("text/html") || url.pathname === "/" || url.pathname.endsWith(".html");
}

function isApiRequest(url) {
  return isPublicApi(url);
}

function cacheableResponse(response) {
  return response && response.ok && (response.type === "basic" || response.type === "default");
}

function withCacheTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set("x-sobag-sw-cached-at", String(Date.now()));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function cachedAt(response) {
  return Number(response?.headers?.get("x-sobag-sw-cached-at") || response?.headers?.get("date") || 0);
}

function isFreshApiResponse(response) {
  const stamp = cachedAt(response);
  return Boolean(stamp && Date.now() - stamp <= SOBAG_API_MAX_AGE_MS);
}

async function putCache(request, response) {
  if (!cacheableResponse(response)) return;
  const cache = await caches.open(SOBAG_PUBLIC_CACHE);
  await cache.put(request, withCacheTimestamp(response.clone()));
}

async function networkFirst(request, timeoutMs, options = {}) {
  const cache = await caches.open(SOBAG_PUBLIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      await putCache(request, response);
      return response;
    })
    .catch(() => null);

  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(cached || null), timeoutMs);
  });

  const first = await Promise.race([network, timeout]);
  if (first) {
    if (!options.requireFreshCached || first !== cached || isFreshApiResponse(first)) return first;
  }
  const response = await network;
  if (response) return response;
  if (cached && (!options.requireFreshCached || isFreshApiResponse(cached))) return cached;
  return fetch(request);
}

async function cacheFirst(request) {
  const cache = await caches.open(SOBAG_PUBLIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  await putCache(request, response);
  return response;
}

async function prefetchPublic(urls = []) {
  const unique = [...new Set(urls)].slice(0, 36);
  for (const rawUrl of unique) {
    const url = sameOriginUrl(new URL(rawUrl, self.location.origin).href);
    if (!url) continue;
    const request = new Request(url.href, { method: "GET", credentials: "omit", cache: "default" });
    if (!shouldHandle(request)) continue;
    try {
      const response = await fetch(request);
      await putCache(request, response);
    } catch {
      // Background prefetch is opportunistic.
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("sobag-public-") && key !== SOBAG_PUBLIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SOBAG_PREFETCH_PUBLIC") {
    event.waitUntil(prefetchPublic(event.data.urls || []));
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = sameOriginUrl(request);
  if (!shouldHandle(request)) return;

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, SOBAG_API_TIMEOUT_MS, { requireFreshCached: true }));
    return;
  }

  if (isHtmlRequest(request, url)) {
    event.respondWith(networkFirst(request, SOBAG_HTML_TIMEOUT_MS));
    return;
  }

  event.respondWith(cacheFirst(request));
});
