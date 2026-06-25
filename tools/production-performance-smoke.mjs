#!/usr/bin/env node
import { createServer } from "node:http";
import { once } from "node:events";
import { performance } from "node:perf_hooks";

const DEFAULT_BASE_URL = "https://sobag-shop.online";
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_QUERY_MAX_BYTES = 220 * 1024;
const DEFAULT_DETAIL_MAX_BYTES = 700 * 1024;
const DEFAULT_PRICE_LIST_MAX_BYTES = 160 * 1024;
const DEFAULT_STATIC_MAX_BYTES = 520 * 1024;
const DEFAULT_MAX_MS = 5000;
const DEFAULT_CATALOG_API_MAX_MS = 3000;
const DEFAULT_CATALOG_FIRST_LOAD_MAX_MS = 4500;
const DEFAULT_IMAGE_MAX_MS = 2000;

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    baseUrl: process.env.SOBAG_PRODUCTION_BASE_URL || DEFAULT_BASE_URL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    queryMaxBytes: DEFAULT_QUERY_MAX_BYTES,
    detailMaxBytes: DEFAULT_DETAIL_MAX_BYTES,
    priceListMaxBytes: DEFAULT_PRICE_LIST_MAX_BYTES,
    staticMaxBytes: DEFAULT_STATIC_MAX_BYTES,
    maxMs: DEFAULT_MAX_MS,
    catalogApiMaxMs: DEFAULT_CATALOG_API_MAX_MS,
    catalogFirstLoadMaxMs: DEFAULT_CATALOG_FIRST_LOAD_MAX_MS,
    imageMaxMs: DEFAULT_IMAGE_MAX_MS,
    json: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--base-url") args.baseUrl = argv[++index] || args.baseUrl;
    else if (token.startsWith("--base-url=")) args.baseUrl = token.slice("--base-url=".length);
    else if (token === "--timeout") args.timeoutMs = Number(argv[++index] || args.timeoutMs);
    else if (token === "--query-max-bytes") args.queryMaxBytes = Number(argv[++index] || args.queryMaxBytes);
    else if (token === "--detail-max-bytes") args.detailMaxBytes = Number(argv[++index] || args.detailMaxBytes);
    else if (token === "--price-list-max-bytes") args.priceListMaxBytes = Number(argv[++index] || args.priceListMaxBytes);
    else if (token === "--static-max-bytes") args.staticMaxBytes = Number(argv[++index] || args.staticMaxBytes);
    else if (token === "--max-ms") args.maxMs = Number(argv[++index] || args.maxMs);
    else if (token === "--catalog-api-max-ms") args.catalogApiMaxMs = Number(argv[++index] || args.catalogApiMaxMs);
    else if (token === "--catalog-first-load-max-ms") args.catalogFirstLoadMaxMs = Number(argv[++index] || args.catalogFirstLoadMaxMs);
    else if (token === "--image-max-ms") args.imageMaxMs = Number(argv[++index] || args.imageMaxMs);
    else if (token === "--json") args.json = true;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/production-performance-smoke.mjs --base-url https://sobag-shop.online

Read-only smoke for compact catalog API payloads, first-load budgets, and cache headers.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
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

async function fetchText(base, path, args, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`Timed out after ${args.timeoutMs}ms`)), args.timeoutMs);
  const startedAt = performance.now();
  try {
    const response = await fetch(new URL(path, `${base}/`), {
      method: options.method || "GET",
      headers: {
        accept: "application/json,text/css,application/javascript,*/*;q=0.1",
        "user-agent": "sobag-production-performance-smoke/1.0",
        ...(options.headers || {}),
      },
      redirect: options.redirect || "follow",
      signal: controller.signal,
    });
    const body = await response.text();
    return {
      path,
      status: response.status,
      ok: response.ok,
      elapsedMs: Math.round(performance.now() - startedAt),
      contentType: response.headers.get("content-type") || "",
      cacheControl: response.headers.get("cache-control") || "",
      etag: response.headers.get("etag") || "",
      lastModified: response.headers.get("last-modified") || "",
      bytes: Buffer.byteLength(body, "utf8"),
      body,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function assertStaticRevalidation(base, asset, args) {
  const headers = asset.etag ? { "If-None-Match": asset.etag } : { "If-Modified-Since": asset.lastModified };
  const cached = await fetchText(base, asset.path, args, { headers });
  assert(cached.status === 304, `${asset.path}: expected 304 revalidation, got ${cached.status}`);

  const head = await fetchText(base, asset.path, args, { method: "HEAD" });
  assert(head.ok, `${asset.path}: HEAD expected 2xx, got ${head.status}`);
  assert(head.bytes === 0, `${asset.path}: HEAD should not return a body`);
}

function parseJson(result) {
  assert(result.ok, `${result.path}: expected 2xx, got ${result.status}`);
  assert(result.contentType.includes("application/json"), `${result.path}: expected application/json`);
  try {
    return JSON.parse(result.body);
  } catch (error) {
    throw new Error(`${result.path}: invalid JSON (${error.message})`);
  }
}

function assertPublicCache(result) {
  assert(result.cacheControl.includes("public"), `${result.path}: missing public cache-control`);
  assert(result.cacheControl.includes("max-age="), `${result.path}: missing max-age cache-control`);
}

function assertFast(result, maxMs) {
  assert(result.elapsedMs <= maxMs, `${result.path}: ${result.elapsedMs}ms exceeds ${maxMs}ms`);
}

function assertFirstLoadFast(name, checks, maxMs) {
  const elapsedMs = checks.reduce((sum, check) => sum + Number(check.elapsedMs || 0), 0);
  assert(elapsedMs <= maxMs, `${name}: ${elapsedMs}ms exceeds ${maxMs}ms`);
  return elapsedMs;
}

function facetCounts(bucket) {
  if (Array.isArray(bucket)) {
    return bucket
      .map((item) => Number(item?.count || 0))
      .filter((count) => count > 0);
  }
  if (bucket && typeof bucket === "object") {
    return Object.values(bucket)
      .map((value) => {
        if (value && typeof value === "object") return Number(value.count || 0);
        return Number(value || 0);
      })
      .filter((count) => count > 0);
  }
  return [];
}

function firstCardImagePaths(items, limit = 6) {
  const paths = [];
  function add(raw) {
    if (!raw || paths.includes(raw)) return;
    paths.push(raw);
  }
  for (const item of items || []) {
    add(item?.image);
    add(item?.imageMeta?.url || item?.imageMeta?.publicUrl || item?.imageMeta?.downloadUrl);
    for (const variant of item?.imageMeta?.variants || []) add(variant?.url || variant?.publicUrl || variant?.downloadUrl);
    if (paths.length >= limit) break;
  }
  return paths.slice(0, limit);
}

async function runPerformanceSmoke(rawBaseUrl, args) {
  const base = normalizeBaseUrl(rawBaseUrl);
  const checks = [];
  const warnings = [];

  const home = await fetchText(base, "/", args);
  assert(home.ok, `${home.path}: expected 2xx, got ${home.status}`);
  assert(home.contentType.includes("text/html"), `${home.path}: expected text/html`);
  assert((home.cacheControl || "").includes("no-cache") || (home.cacheControl || "").includes("max-age=0"), `${home.path}: HTML shell should revalidate`);
  checks.push({ name: "home-html", path: home.path, bytes: home.bytes, elapsedMs: home.elapsedMs });

  const catalogHtml = await fetchText(base, "/catalog.html", args);
  assert(catalogHtml.ok, `${catalogHtml.path}: expected 2xx, got ${catalogHtml.status}`);
  assert(catalogHtml.contentType.includes("text/html"), `${catalogHtml.path}: expected text/html`);
  assert((catalogHtml.cacheControl || "").includes("no-cache") || (catalogHtml.cacheControl || "").includes("max-age=0"), `${catalogHtml.path}: catalog HTML shell should revalidate`);
  assertFast(catalogHtml, args.maxMs);
  checks.push({ name: "catalog-html", path: catalogHtml.path, bytes: catalogHtml.bytes, elapsedMs: catalogHtml.elapsedMs });

  const canonical = await fetchText(base, "/index.html", args, { method: "HEAD", redirect: "manual" });
  assert([301, 308].includes(canonical.status), `${canonical.path}: expected canonical redirect, got ${canonical.status}`);
  checks.push({ name: "index-redirect", path: canonical.path, bytes: canonical.bytes, elapsedMs: canonical.elapsedMs });

  const health = await fetchText(base, "/api/health", args);
  parseJson(health);
  assert((health.cacheControl || "").includes("no-store"), `${health.path}: API health should be no-store`);
  checks.push({ name: "api-health", path: health.path, bytes: health.bytes, elapsedMs: health.elapsedMs });

  const query = await fetchText(base, "/api/catalog-query?pageSize=48&sort=popular", args);
  const queryPayload = parseJson(query);
  assertFast(query, args.catalogApiMaxMs);
  assertPublicCache(query);
  assert(query.bytes <= args.queryMaxBytes, `${query.path}: ${query.bytes} bytes exceeds ${args.queryMaxBytes}`);
  assert(queryPayload.pageInfo?.pageSize === 48, "catalog-query should use 48-card pages");
  assert(Array.isArray(queryPayload.items), "catalog-query should return items[]");
  assert(queryPayload.items.length > 0 && queryPayload.items.length <= 48, "catalog-query should return 1..48 cards");
  queryPayload.items.forEach((item, index) => {
    ["variants", "gallery", "detailDescription", "reviews"].forEach((field) => {
      assert(!(field in item), `catalog-query item[${index}] should not include ${field}`);
    });
  });
  checks.push({ name: "catalog-query", path: query.path, bytes: query.bytes, elapsedMs: query.elapsedMs });

  const summaryQuery = await fetchText(base, "/api/catalog-query?pageSize=1&sort=popular", args);
  const summaryPayload = parseJson(summaryQuery);
  assertFast(summaryQuery, args.catalogApiMaxMs);
  assertPublicCache(summaryQuery);
  assert(summaryPayload.total > 1, "catalog first-load summary should expose full catalog total");
  const categoryCounts = facetCounts(summaryPayload.facets?.categories);
  const maxCategoryCount = categoryCounts.length ? Math.max(...categoryCounts) : 0;
  assert(maxCategoryCount > summaryPayload.pageInfo?.pageSize, `catalog first-load categories look page-limited (total=${summaryPayload.total}, pageSize=${summaryPayload.pageInfo?.pageSize}, maxCategoryCount=${maxCategoryCount})`);
  const firstLoadMs = assertFirstLoadFast("catalog first-load budget", [catalogHtml, summaryQuery], args.catalogFirstLoadMaxMs);
  checks.push({ name: "catalog-first-load", path: "/catalog.html + /api/catalog-query?pageSize=1&sort=popular", bytes: catalogHtml.bytes + summaryQuery.bytes, elapsedMs: firstLoadMs });

  const priceList = await fetchText(base, "/api/price-list?format=json", args);
  const priceListPayload = parseJson(priceList);
  assertFast(priceList, args.catalogApiMaxMs);
  assertPublicCache(priceList);
  assert(priceList.bytes <= args.priceListMaxBytes, `${priceList.path}: ${priceList.bytes} bytes exceeds ${args.priceListMaxBytes}`);
  assert(Array.isArray(priceListPayload.rows), "price-list should include rows[]");
  assert(priceListPayload.rows.length > 0, "price-list should expose public price rows");
  assert(priceListPayload.rows.every((row) => !row.skus), "price-list JSON should not include full SKU lists by default");
  checks.push({ name: "price-list", path: priceList.path, bytes: priceList.bytes, elapsedMs: priceList.elapsedMs });

  const firstSku = queryPayload.items[0]?.baseSku;
  assert(firstSku, "catalog-query first card should include baseSku");
  const detail = await fetchText(base, `/api/catalog-detail?baseSku=${encodeURIComponent(firstSku)}`, args);
  const detailPayload = parseJson(detail);
  assertFast(detail, args.maxMs);
  assertPublicCache(detail);
  assert(detail.bytes <= args.detailMaxBytes, `${detail.path}: ${detail.bytes} bytes exceeds ${args.detailMaxBytes}`);
  assert(detailPayload.product?.baseSku === firstSku, "catalog-detail should hydrate selected baseSku");
  assert(Array.isArray(detailPayload.product?.variants) && detailPayload.product.variants.length > 0, "catalog-detail should include variants");
  checks.push({ name: "catalog-detail", path: detail.path, bytes: detail.bytes, elapsedMs: detail.elapsedMs });

  for (const path of ["/app.js", "/styles.css"]) {
    const asset = await fetchText(base, path, args);
    assert(asset.ok, `${path}: expected 2xx, got ${asset.status}`);
    assertFast(asset, args.maxMs);
    assert(asset.cacheControl.includes("max-age=3600") || asset.cacheControl.includes("max-age=31536000"), `${path}: static cache header missing`);
    assert(asset.etag || asset.lastModified, `${path}: static validator header missing`);
    assert(asset.bytes <= args.staticMaxBytes, `${path}: ${asset.bytes} bytes exceeds ${args.staticMaxBytes}`);
    await assertStaticRevalidation(base, asset, args);
    checks.push({ name: path.slice(1), path, bytes: asset.bytes, elapsedMs: asset.elapsedMs });
  }

  for (const path of ["/app.js?v=cache-smoke", "/styles.css?v=cache-smoke"]) {
    const asset = await fetchText(base, path, args);
    assert(asset.ok, `${path}: expected 2xx, got ${asset.status}`);
    assert(asset.cacheControl.includes("max-age=31536000") && asset.cacheControl.includes("immutable"), `${path}: versioned assets should use immutable long cache`);
    checks.push({ name: `versioned-${path.split("?")[0].slice(1)}`, path, bytes: asset.bytes, elapsedMs: asset.elapsedMs });
  }

  const data = await fetchText(base, "/data/products-live.json", args);
  assert(data.ok, `${data.path}: expected 2xx, got ${data.status}`);
  assert(data.contentType.includes("application/json"), `${data.path}: expected JSON MIME`);
  assert(data.cacheControl.includes("max-age=300"), `${data.path}: product data should use short cache`);
  checks.push({ name: "products-json", path: data.path, bytes: data.bytes, elapsedMs: data.elapsedMs });

  const imagePaths = firstCardImagePaths(queryPayload.items);
  if (!imagePaths.length) imagePaths.push(detailPayload.product?.images?.find((item) => item?.url)?.url || "/assets/production-hero-1.png");
  for (const imagePath of imagePaths) {
    const image = await fetchText(base, imagePath, args);
    assert(image.ok, `${image.path}: expected image GET 2xx, got ${image.status}`);
    assertFast(image, args.imageMaxMs);
    assert(image.contentType.startsWith("image/"), `${image.path}: expected image MIME, got ${image.contentType}`);
    assert(image.cacheControl.includes("max-age=86400") || image.cacheControl.includes("max-age=31536000"), `${image.path}: image cache header missing`);
    assert(!image.contentType.includes("text/html"), `${image.path}: image URL must not fall back to HTML`);
    checks.push({ name: "first-card-image-get", path: image.path, bytes: image.bytes, elapsedMs: image.elapsedMs });
  }

  const missingAsset = await fetchText(base, "/assets/missing-cache-smoke.webp", args, { redirect: "manual" });
  assert(missingAsset.status === 404, `${missingAsset.path}: missing asset should return 404, got ${missingAsset.status}`);
  assert(!missingAsset.contentType.includes("text/html"), `${missingAsset.path}: missing asset must not fall back to HTML`);
  checks.push({ name: "missing-asset-404", path: missingAsset.path, bytes: missingAsset.bytes, elapsedMs: missingAsset.elapsedMs });

  if (!queryPayload.pageInfo?.hasMore) warnings.push("catalog-query has no next page; real catalog growth still needs later CWV audit");
  return { ok: true, baseUrl: base, checks, warnings };
}

function printReport(report) {
  console.log(`Production performance smoke passed: ${report.baseUrl}`);
  report.checks.forEach((check) => {
    console.log(`OK ${String(check.elapsedMs).padStart(4, " ")}ms ${String(check.bytes).padStart(7, " ")} bytes ${check.path}`);
  });
  if (report.warnings.length) console.log(`Warnings: ${report.warnings.join("; ")}`);
}

async function closeServer(server) {
  server.close();
  await once(server, "close");
}

async function createSelfTestServer() {
  const card = { id: "p1", baseSku: "opt_1", name: "Test", minPrice: 100, maxPrice: 120, variantCount: 2, image: "/x.webp" };
  const secondCard = { id: "p2", baseSku: "opt_2", name: "Test 2", minPrice: 110, maxPrice: 130, variantCount: 1, image: "/x.webp" };
  const product = { ...card, variants: [{ sku: "opt_1_a", price: 100 }], images: [{ url: "/x.webp" }] };
  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/" || url.pathname === "/catalog.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
      res.end("<!doctype html><title>Sobag</title>");
      return;
    }
    if (url.pathname === "/index.html") {
      res.writeHead(301, { location: "/", "cache-control": "public, max-age=3600" });
      res.end();
      return;
    }
    if (url.pathname === "/api/health") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url.pathname === "/api/catalog-query") {
      const pageSize = Number(url.searchParams.get("pageSize") || 48) || 48;
      const items = pageSize <= 1 ? [card] : [card, secondCard];
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300, stale-while-revalidate=3600" });
      res.end(JSON.stringify({ items, total: 2, facets: { categories: [{ value: "Test", count: 2 }] }, pageInfo: { pageSize, hasMore: pageSize < 2 } }));
      return;
    }
    if (url.pathname === "/api/price-list") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300, stale-while-revalidate=3600" });
      res.end(JSON.stringify({ rows: [{ group: "Test", price: 100 }] }));
      return;
    }
    if (url.pathname === "/api/catalog-detail") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300, stale-while-revalidate=3600" });
      res.end(JSON.stringify({ product }));
      return;
    }
    if (url.pathname === "/app.js" || url.pathname === "/styles.css") {
      if (req.headers["if-none-match"] === '"fixture"') {
        const cache = url.searchParams.has("v") ? "public, max-age=31536000, immutable" : "public, max-age=3600";
        res.writeHead(304, { "cache-control": cache, etag: '"fixture"' });
        res.end();
        return;
      }
      const cache = url.searchParams.has("v") ? "public, max-age=31536000, immutable" : "public, max-age=3600";
      res.writeHead(200, { "content-type": url.pathname.endsWith(".css") ? "text/css" : "application/javascript", "cache-control": cache, etag: '"fixture"' });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      res.end("body{}");
      return;
    }
    if (url.pathname === "/data/products-live.json") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300, stale-while-revalidate=3600" });
      res.end("[]");
      return;
    }
    if (url.pathname === "/x.webp") {
      res.writeHead(200, { "content-type": "image/webp", "cache-control": "public, max-age=86400, stale-while-revalidate=604800" });
      res.end();
      return;
    }
    res.writeHead(404).end("not found");
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
      const report = await runPerformanceSmoke(fixture.baseUrl, args);
      if (args.json) console.log(JSON.stringify(report, null, 2));
      else {
        printReport(report);
        console.log("Production performance smoke self-test passed");
      }
    } finally {
      await closeServer(fixture.server);
    }
    return;
  }
  const report = await runPerformanceSmoke(args.baseUrl, args);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
