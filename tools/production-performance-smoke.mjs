#!/usr/bin/env node
import { createServer } from "node:http";
import { once } from "node:events";
import { performance } from "node:perf_hooks";

const DEFAULT_BASE_URL = "https://sobag-shop.online";
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_QUERY_MAX_BYTES = 220 * 1024;
const DEFAULT_DETAIL_MAX_BYTES = 700 * 1024;
const DEFAULT_STATIC_MAX_BYTES = 520 * 1024;
const DEFAULT_MAX_MS = 5000;

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    baseUrl: process.env.SOBAG_PRODUCTION_BASE_URL || DEFAULT_BASE_URL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    queryMaxBytes: DEFAULT_QUERY_MAX_BYTES,
    detailMaxBytes: DEFAULT_DETAIL_MAX_BYTES,
    staticMaxBytes: DEFAULT_STATIC_MAX_BYTES,
    maxMs: DEFAULT_MAX_MS,
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
    else if (token === "--static-max-bytes") args.staticMaxBytes = Number(argv[++index] || args.staticMaxBytes);
    else if (token === "--max-ms") args.maxMs = Number(argv[++index] || args.maxMs);
    else if (token === "--json") args.json = true;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/production-performance-smoke.mjs --base-url https://sobag-shop.online

Read-only smoke for compact catalog API payloads and cache headers.`);
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

async function fetchText(base, path, args) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`Timed out after ${args.timeoutMs}ms`)), args.timeoutMs);
  const startedAt = performance.now();
  try {
    const response = await fetch(new URL(path, `${base}/`), {
      headers: { accept: "application/json,text/css,application/javascript,*/*;q=0.1", "user-agent": "sobag-production-performance-smoke/1.0" },
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
      bytes: Buffer.byteLength(body, "utf8"),
      body,
    };
  } finally {
    clearTimeout(timeout);
  }
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

async function runPerformanceSmoke(rawBaseUrl, args) {
  const base = normalizeBaseUrl(rawBaseUrl);
  const checks = [];
  const warnings = [];

  const query = await fetchText(base, "/api/catalog-query?pageSize=48&sort=popular", args);
  const queryPayload = parseJson(query);
  assertFast(query, args.maxMs);
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
    assert(asset.bytes <= args.staticMaxBytes, `${path}: ${asset.bytes} bytes exceeds ${args.staticMaxBytes}`);
    checks.push({ name: path.slice(1), path, bytes: asset.bytes, elapsedMs: asset.elapsedMs });
  }

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
  const product = { ...card, variants: [{ sku: "opt_1_a", price: 100 }], images: [{ url: "/x.webp" }] };
  const server = createServer((req, res) => {
    if (req.url.startsWith("/api/catalog-query")) {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300, stale-while-revalidate=3600" });
      res.end(JSON.stringify({ items: [card], total: 1, pageInfo: { pageSize: 48, hasMore: false } }));
      return;
    }
    if (req.url.startsWith("/api/catalog-detail")) {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300, stale-while-revalidate=3600" });
      res.end(JSON.stringify({ product }));
      return;
    }
    if (req.url === "/app.js" || req.url === "/styles.css") {
      res.writeHead(200, { "content-type": req.url.endsWith(".css") ? "text/css" : "application/javascript", "cache-control": "public, max-age=3600" });
      res.end("body{}");
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
