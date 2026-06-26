#!/usr/bin/env node
import { createServer } from "node:http";
import { once } from "node:events";
import { performance } from "node:perf_hooks";
import {
  CACHE_WARMUP_LIMITS,
  PRIVATE_CACHE_PROBE_PATHS,
  PUBLIC_CACHE_WARMUP_PATHS,
} from "./cache-warmup-manifest.mjs";

const DEFAULT_BASE_URL = "https://sobag-shop.online";
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_MS = 5000;
const DEFAULT_LATENCY_RETRIES = 2;

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    baseUrl: process.env.SOBAG_PRODUCTION_BASE_URL || DEFAULT_BASE_URL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxMs: DEFAULT_MAX_MS,
    latencyRetries: DEFAULT_LATENCY_RETRIES,
    paths: [],
    selfTest: false,
    json: false,
    warmBackgroundImages: true,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--base-url") args.baseUrl = argv[++index] || args.baseUrl;
    else if (token.startsWith("--base-url=")) args.baseUrl = token.slice("--base-url=".length);
    else if (token === "--timeout") args.timeoutMs = Number(argv[++index] || args.timeoutMs);
    else if (token === "--max-ms") args.maxMs = Number(argv[++index] || args.maxMs);
    else if (token === "--latency-retries") args.latencyRetries = Number(argv[++index] || args.latencyRetries);
    else if (token === "--path") args.paths.push(argv[++index]);
    else if (token.startsWith("--path=")) args.paths.push(token.slice("--path=".length));
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--json") args.json = true;
    else if (token === "--skip-background-images") args.warmBackgroundImages = false;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/cache-warmup-smoke.mjs --base-url https://sobag-shop.online

Read-only cache warmup and cache-policy verification for public paths.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  args.paths = args.paths.length
    ? args.paths.map((path) => ({ path: path.startsWith("/") ? path : `/${path}`, kind: "custom", label: "cli" }))
    : PUBLIC_CACHE_WARMUP_PATHS;
  return args;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeBaseUrl(raw) {
  const url = new URL(raw);
  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/$/, "");
}

function maxAgeSeconds(cacheControl = "") {
  const match = String(cacheControl || "").match(/(?:^|,)\s*max-age=(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function isVersionedStaticPath(path) {
  const url = new URL(path, "https://sobag-shop.online");
  return /\.(?:js|css)$/i.test(url.pathname) && url.searchParams.has("v");
}

function normalizeSameOriginPath(raw, base) {
  const url = new URL(raw, `${base}/`);
  const baseUrl = new URL(base);
  if (url.origin !== baseUrl.origin) return null;
  return `${url.pathname}${url.search}`;
}

function discoverVersionedAssetPaths(html, base) {
  const paths = [];
  const pattern = /\b(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/giu;
  let match;
  while ((match = pattern.exec(html))) {
    const normalized = normalizeSameOriginPath(match[1], base);
    if (normalized && isVersionedStaticPath(normalized)) paths.push(normalized);
  }
  return paths;
}

function discoverCatalogDetailPaths(result) {
  if (!result.path.startsWith("/api/catalog-query")) return [];
  try {
    const payload = JSON.parse(result.body);
    const items = Array.isArray(payload.items) ? payload.items : [];
    const details = [];
    for (const item of items) {
      const baseSku = item?.baseSku || item?.base_sku || item?.sku || item?.id;
      if (!baseSku) continue;
      details.push(`/api/catalog-detail?baseSku=${encodeURIComponent(baseSku)}`);
      if (details.length >= CACHE_WARMUP_LIMITS.maxDiscoveredCatalogDetails) break;
    }
    return details;
  } catch {
    return [];
  }
}

function discoverProductPagePaths(result, limit = CACHE_WARMUP_LIMITS.maxDiscoveredProductPages) {
  if (!result.path.startsWith("/api/catalog-query")) return [];
  try {
    const payload = JSON.parse(result.body);
    const items = Array.isArray(payload.items) ? payload.items : [];
    const pages = [];
    for (const item of items) {
      const baseSku = item?.baseSku || item?.base_sku || item?.sku || item?.id;
      if (!baseSku) continue;
      pages.push(`/product?baseSku=${encodeURIComponent(baseSku)}`);
      if (pages.length >= limit) break;
    }
    return pages;
  } catch {
    return [];
  }
}

function discoverImagePaths(result, base) {
  const candidates = [];
  function add(raw) {
    if (!raw) return;
    const normalized = normalizeSameOriginPath(raw, base);
    if (normalized && /\.(?:avif|gif|jpe?g|png|webp|svg)(?:\?|$)/i.test(normalized)) candidates.push(normalized);
  }
  if (result.contentType.includes("text/html")) {
    const pattern = /\b(?:src|href)=["']([^"']+\.(?:avif|gif|jpe?g|png|webp|svg)(?:\?[^"']*)?)["']/giu;
    let match;
    while ((match = pattern.exec(result.body))) add(match[1]);
    return candidates;
  }
  if (!result.path.startsWith("/api/catalog-query") && !result.path.startsWith("/api/catalog-detail")) return [];
  try {
    const payload = JSON.parse(result.body);
    const products = [
      ...(Array.isArray(payload.items) ? payload.items : []),
      ...(payload.product ? [payload.product] : []),
    ];
    products.forEach((product) => {
      add(product?.image);
      add(product?.imageMeta?.url || product?.imageMeta?.publicUrl || product?.imageMeta?.downloadUrl);
      (product?.imageMeta?.variants || []).forEach((variant) => add(variant?.url || variant?.publicUrl || variant?.downloadUrl));
      (product?.gallery || []).forEach(add);
      (product?.images || []).forEach((image) => {
        add(image?.url || image?.publicUrl || image?.downloadUrl);
        (image?.variants || []).forEach((variant) => add(variant?.url || variant?.publicUrl || variant?.downloadUrl));
      });
    });
  } catch {
    return [];
  }
  return candidates;
}

async function fetchWarm(base, path, args, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`Timed out after ${args.timeoutMs}ms`)), args.timeoutMs);
  const startedAt = performance.now();
  try {
    const response = await fetch(new URL(path, `${base}/`), {
      method: options.method || "GET",
      redirect: options.redirect || "follow",
      headers: {
        accept: "text/html,application/json,text/css,application/javascript,*/*;q=0.1",
        "user-agent": "sobag-cache-warmup/1.0",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    let body = "";
    let bytes = 0;
    if (options.method !== "HEAD") {
      if (options.discardBody) {
        bytes = (await response.arrayBuffer()).byteLength;
      } else {
        body = await response.text();
        bytes = Buffer.byteLength(body, "utf8");
      }
    }
    return {
      path,
      method: options.method || "GET",
      status: response.status,
      ok: response.ok,
      elapsedMs: Math.round(performance.now() - startedAt),
      contentType: response.headers.get("content-type") || "",
      cacheControl: response.headers.get("cache-control") || "",
      bytes,
      body,
    };
  } catch (error) {
    throw new Error(`${path}: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPublicWarm(base, path, args, options = {}) {
  let result;
  for (let attempt = 0; attempt <= args.latencyRetries; attempt += 1) {
    result = await fetchWarm(base, path, args, options);
    result.attempts = attempt + 1;
    result.maxMs = args.maxMs;
    if (attempt === 0) result.firstElapsedMs = result.elapsedMs;
    if (!result.ok || result.elapsedMs <= args.maxMs || attempt === args.latencyRetries) return result;
  }
  return result;
}

function assertPublicPath(result) {
  assert(result.ok, `${result.path}: expected 2xx, got ${result.status}`);
  assert(result.elapsedMs <= result.maxMs, `${result.path}: ${result.elapsedMs}ms exceeds ${result.maxMs}ms`);
  const cache = result.cacheControl || "";
  if (result.contentType.includes("text/html")) {
    assert(/no-cache|max-age=0/i.test(cache), `${result.path}: HTML shell must revalidate`);
    assert(!/immutable/i.test(cache) && maxAgeSeconds(cache) <= 300, `${result.path}: HTML must not be immutable or long-cache`);
    return;
  }
  if (result.path.startsWith("/api/catalog-query") || result.path.startsWith("/api/catalog-detail") || result.path.startsWith("/api/price-list")) {
    assert(/public/i.test(cache) && /max-age=300/i.test(cache), `${result.path}: public API must use short public cache`);
    assert(result.contentType.includes("application/json"), `${result.path}: expected JSON content-type`);
    return;
  }
  if (/\.(?:js|css)(?:\?|$)/.test(result.path)) {
    assert(/public/i.test(cache), `${result.path}: static asset should use public cache`);
    assert(!/no-store/i.test(cache), `${result.path}: static asset must not be no-store`);
    if (isVersionedStaticPath(result.path)) {
      assert(/immutable/i.test(cache) && maxAgeSeconds(cache) >= 31536000, `${result.path}: versioned static asset must be immutable long-cache`);
    }
  }
  if (result.contentType.startsWith("image/")) {
    assert(result.method === "GET", `${result.path}: public image warmup must use GET, not ${result.method || "unknown"}`);
    assert(/public/i.test(cache), `${result.path}: image asset should use public cache`);
    assert(!/no-store/i.test(cache), `${result.path}: image asset must not be no-store`);
    assert(!result.contentType.includes("text/html"), `${result.path}: image URL must not fall back to HTML`);
  }
}

function assertPrivatePath(result) {
  assert([200, 401, 403, 405].includes(result.status), `${result.path}: unexpected private-path status ${result.status}`);
  assert(/no-store/i.test(result.cacheControl || ""), `${result.path}: private route must use no-store`);
}

function nextCatalogPagePath(path, payload) {
  const nextCursor = payload?.pageInfo?.nextCursor || payload?.nextCursor || "";
  if (!nextCursor) return "";
  const url = new URL(path, "https://sobag-shop.online");
  url.searchParams.set("cursor", nextCursor);
  return `${url.pathname}${url.search}`;
}

async function warmImageBatch(base, paths, args, label) {
  const concurrency = Math.max(1, CACHE_WARMUP_LIMITS.backgroundImageConcurrency || 4);
  const results = [];
  let index = 0;
  async function worker() {
    while (index < paths.length) {
      const path = paths[index];
      index += 1;
      const result = await fetchPublicWarm(base, path, args, { method: "GET", discardBody: true });
      result.kind = "image";
      result.label = label;
      assertPublicPath(result);
      results.push(result);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, paths.length) }, worker));
  return results;
}

async function warmPublicPathBatch(base, paths, args, label, kind, concurrencyLimit) {
  const concurrency = Math.max(1, concurrencyLimit || 3);
  const results = [];
  let index = 0;
  async function worker() {
    while (index < paths.length) {
      const path = paths[index];
      index += 1;
      const result = await fetchPublicWarm(base, path, args);
      result.kind = kind;
      result.label = label;
      assertPublicPath(result);
      results.push(result);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, paths.length) }, worker));
  return results;
}

async function warmBackgroundCatalogImages(base, args, seen) {
  if (!args.warmBackgroundImages) return { catalogPages: 0, discoveredProductPages: 0, warmedProductPages: 0, discoveredImages: 0, warmedImages: 0, productResults: [], results: [] };
  const discovered = new Set();
  const discoveredProductPages = new Set();
  let path = "/api/catalog-query?pageSize=48&sort=popular";
  let catalogPages = 0;
  while (path && catalogPages < CACHE_WARMUP_LIMITS.maxBackgroundCatalogPages && discovered.size < CACHE_WARMUP_LIMITS.maxBackgroundImages) {
    const result = await fetchPublicWarm(base, path, args);
    assertPublicPath(result);
    catalogPages += 1;
    for (const imagePath of discoverImagePaths(result, base)) {
      if (discovered.size >= CACHE_WARMUP_LIMITS.maxBackgroundImages) break;
      discovered.add(imagePath);
    }
    for (const productPath of discoverProductPagePaths(result, CACHE_WARMUP_LIMITS.maxBackgroundProductPages)) {
      if (discoveredProductPages.size >= CACHE_WARMUP_LIMITS.maxBackgroundProductPages) break;
      discoveredProductPages.add(productPath);
    }
    try {
      path = nextCatalogPagePath(path, JSON.parse(result.body));
    } catch {
      path = "";
    }
  }
  const productCandidates = [...discoveredProductPages].filter((productPath) => !seen.has(productPath));
  const productResults = await warmPublicPathBatch(
    base,
    productCandidates,
    args,
    "background-product-page",
    "html",
    CACHE_WARMUP_LIMITS.backgroundProductConcurrency,
  );
  productResults.forEach((result) => seen.add(result.path));
  const candidates = [...discovered].filter((imagePath) => !seen.has(imagePath));
  const results = await warmImageBatch(base, candidates, args, "background-catalog-image");
  results.forEach((result) => seen.add(result.path));
  return {
    catalogPages,
    discoveredProductPages: discoveredProductPages.size,
    warmedProductPages: productResults.length,
    discoveredImages: discovered.size,
    warmedImages: results.length,
    productResults,
    results,
  };
}

async function runWarmup(rawBaseUrl, args) {
  const base = normalizeBaseUrl(rawBaseUrl);
  const publicResults = [];
  const queue = [...args.paths];
  const seen = new Set(queue.map((entry) => entry.path));
  let discoveredVersionedAssets = 0;
  let discoveredImages = 0;
  let mandatoryImageGets = 0;

  function enqueue(path, kind, label, extra = {}) {
    if (seen.has(path)) return;
    seen.add(path);
    queue.push({ path, kind, label, ...extra });
  }

  for (let index = 0; index < queue.length; index += 1) {
    const entry = queue[index];
    const result = await fetchPublicWarm(base, entry.path, args, { method: entry.method || "GET", discardBody: entry.kind === "image" });
    result.kind = entry.kind;
    result.label = entry.label;
    assertPublicPath(result);
    publicResults.push(result);

    if (result.contentType.includes("text/html")) {
      for (const assetPath of discoverVersionedAssetPaths(result.body, base)) {
        if (discoveredVersionedAssets >= CACHE_WARMUP_LIMITS.maxDiscoveredVersionedAssets) break;
        if (!seen.has(assetPath)) discoveredVersionedAssets += 1;
        enqueue(assetPath, "versioned-static", "discovered-versioned-asset");
      }
    }

    for (const detailPath of discoverCatalogDetailPaths(result)) {
      enqueue(detailPath, "public-api", "discovered-catalog-detail");
    }

    for (const productPath of discoverProductPagePaths(result)) {
      enqueue(productPath, "html", "discovered-product-page");
    }

    for (const imagePath of discoverImagePaths(result, base)) {
      if (discoveredImages >= CACHE_WARMUP_LIMITS.maxDiscoveredImages) break;
      if (!seen.has(imagePath)) {
        discoveredImages += 1;
        mandatoryImageGets += 1;
      }
      enqueue(imagePath, "image", "mandatory-first-view-image", { method: "GET" });
    }
  }

  const background = await warmBackgroundCatalogImages(base, args, seen);

  const privateResults = [];
  for (const entry of PRIVATE_CACHE_PROBE_PATHS) {
    const result = await fetchWarm(base, entry.path, args, { method: "GET" });
    result.label = entry.label;
    assertPrivatePath(result);
    privateResults.push(result);
  }
  return {
    ok: true,
    baseUrl: base,
    publicResults,
    privateResults,
    backgroundProductResults: background.productResults,
    backgroundResults: background.results,
    summary: {
      mandatoryImageGets,
      backgroundCatalogPages: background.catalogPages,
      backgroundProductPagesDiscovered: background.discoveredProductPages,
      backgroundProductPagesWarmed: background.warmedProductPages,
      backgroundImagesDiscovered: background.discoveredImages,
      backgroundImagesWarmed: background.warmedImages,
    },
  };
}

function printReport(report) {
  console.log(`Cache warmup passed: ${report.baseUrl}`);
  report.publicResults.forEach((result) => {
    const attempts = result.attempts > 1 ? ` attempts=${result.attempts} cold=${result.firstElapsedMs}ms` : "";
    console.log(`WARM ${String(result.elapsedMs).padStart(4, " ")}ms ${String(result.status).padStart(3, " ")} ${result.method || "GET"} ${result.path}${attempts}`);
  });
  report.backgroundProductResults.forEach((result) => {
    const attempts = result.attempts > 1 ? ` attempts=${result.attempts} cold=${result.firstElapsedMs}ms` : "";
    console.log(`BG-PAGE ${String(result.elapsedMs).padStart(4, " ")}ms ${String(result.status).padStart(3, " ")} ${result.method || "GET"} ${result.path}${attempts}`);
  });
  report.backgroundResults.forEach((result) => {
    const attempts = result.attempts > 1 ? ` attempts=${result.attempts} cold=${result.firstElapsedMs}ms` : "";
    console.log(`BG-IMAGE ${String(result.elapsedMs).padStart(4, " ")}ms ${String(result.status).padStart(3, " ")} ${result.method || "GET"} ${result.path}${attempts}`);
  });
  console.log(
    `SUMMARY mandatoryImageGets=${report.summary.mandatoryImageGets} backgroundCatalogPages=${report.summary.backgroundCatalogPages} backgroundProductPagesDiscovered=${report.summary.backgroundProductPagesDiscovered} backgroundProductPagesWarmed=${report.summary.backgroundProductPagesWarmed} backgroundImagesDiscovered=${report.summary.backgroundImagesDiscovered} backgroundImagesWarmed=${report.summary.backgroundImagesWarmed}`,
  );
  report.privateResults.forEach((result) => {
    console.log(`PRIVATE ${String(result.status).padStart(3, " ")} ${result.path}`);
  });
}

async function closeServer(server) {
  server.close();
  await once(server, "close");
}

async function createSelfTestServer() {
  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/" || url.pathname === "/catalog.html" || url.pathname === "/catalog" || url.pathname === "/search" || url.pathname === "/product" || /\.(?:html)$/i.test(url.pathname)) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
      res.end('<!doctype html><title>Sobag</title><img src="/x.webp"><script src="/app.js?v=self-test"></script><link rel="stylesheet" href="/styles.css?v=self-test">');
      return;
    }
    if (url.pathname === "/api/catalog-query") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300, stale-while-revalidate=3600" });
      const secondPage = url.searchParams.has("cursor");
      res.end(JSON.stringify({
        items: secondPage
          ? [{ baseSku: "OPT-2", minPrice: 200, image: "/y.webp", imageMeta: { url: "/y.webp", variants: [{ url: "/y-320.webp" }] } }]
          : [{ baseSku: "OPT-1", minPrice: 100, image: "/x.webp", imageMeta: { url: "/x.webp", variants: [{ url: "/x-320.webp" }] } }],
        total: 2,
        pageInfo: { hasMore: !secondPage, nextCursor: secondPage ? "" : "MQ" },
        facets: { categories: [{ value: "Test", count: 2 }] },
      }));
      return;
    }
    if (url.pathname === "/api/price-list") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300, stale-while-revalidate=3600" });
      res.end(JSON.stringify({ rows: [{ group: "Test", price: 100 }] }));
      return;
    }
    if (url.pathname === "/api/catalog-detail") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300, stale-while-revalidate=3600" });
      res.end(JSON.stringify({ product: { baseSku: url.searchParams.get("baseSku") || "OPT-1", minPrice: 100, images: [{ url: "/x.webp", variants: [{ url: "/x-320.webp" }] }] } }));
      return;
    }
    if (url.pathname === "/x.webp" || url.pathname === "/x-320.webp" || url.pathname === "/y.webp" || url.pathname === "/y-320.webp") {
      res.writeHead(200, { "content-type": "image/webp", "cache-control": "public, max-age=86400, stale-while-revalidate=604800" });
      res.end();
      return;
    }
    if (url.pathname === "/app.js" || url.pathname === "/styles.css") {
      const isVersioned = url.searchParams.has("v");
      res.writeHead(200, {
        "content-type": url.pathname.endsWith(".css") ? "text/css" : "application/javascript",
        "cache-control": isVersioned ? "public, max-age=31536000, immutable" : "public, max-age=3600, stale-while-revalidate=86400",
      });
      res.end("body{}");
      return;
    }
    if (PRIVATE_CACHE_PROBE_PATHS.some((entry) => entry.path === url.pathname)) {
      res.writeHead(url.pathname.includes("/admin/") ? 401 : 200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404, { "cache-control": "no-store" }).end("not found");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function main() {
  const args = parseArgs();
  if (args.selfTest) {
    const fixture = await createSelfTestServer();
    try {
      const report = await runWarmup(fixture.baseUrl, args);
      assert(report.summary.mandatoryImageGets >= 1, "self-test should GET-warm mandatory first-view images");
      assert(report.summary.backgroundProductPagesDiscovered >= 2, "self-test should discover background product pages from catalog pages");
      assert(report.summary.backgroundProductPagesWarmed >= 1, "self-test should warm background product pages not already in the mandatory set");
      assert(report.summary.backgroundImagesDiscovered >= 4, "self-test should discover background catalog images");
      if (args.json) console.log(JSON.stringify(report, null, 2));
      else {
        printReport(report);
        console.log("Cache warmup self-test passed");
      }
    } finally {
      await closeServer(fixture.server);
    }
    return;
  }
  const report = await runWarmup(args.baseUrl, args);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
