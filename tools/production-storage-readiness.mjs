#!/usr/bin/env node
import { createServer } from "node:http";
import { once } from "node:events";
import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "https://sobag-shop.online";
const DEFAULT_TIMEOUT_MS = 10000;

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    baseUrl: process.env.SOBAG_PRODUCTION_BASE_URL || DEFAULT_BASE_URL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    requireObjectStorage: false,
    requireCatalogDb: false,
    json: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--base-url") args.baseUrl = argv[++index] || args.baseUrl;
    else if (token.startsWith("--base-url=")) args.baseUrl = token.slice("--base-url=".length);
    else if (token === "--timeout") args.timeoutMs = Number(argv[++index] || args.timeoutMs);
    else if (token === "--require-object-storage") args.requireObjectStorage = true;
    else if (token === "--require-catalog-db") args.requireCatalogDb = true;
    else if (token === "--json") args.json = true;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/production-storage-readiness.mjs --base-url https://sobag-shop.online

Read-only smoke for live /api/health storage flags. Default mode reports pending object storage/catalog DB without failing.`);
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

async function fetchHealth(baseUrl, args) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`Timed out after ${args.timeoutMs}ms`)), args.timeoutMs);
  try {
    const response = await fetch(new URL("/api/health", `${baseUrl}/`), {
      headers: { accept: "application/json", "user-agent": "sobag-production-storage-readiness/1.0" },
      signal: controller.signal,
    });
    const body = await response.text();
    assert(response.ok, `/api/health: expected 2xx, got ${response.status}`);
    assert((response.headers.get("content-type") || "").includes("application/json"), "/api/health: expected application/json");
    return JSON.parse(body);
  } finally {
    clearTimeout(timeout);
  }
}

function analyzeHealth(payload, args) {
  const errors = [];
  const warnings = [];
  if (!payload?.ok) errors.push("health ok flag is not true");
  if (payload?.storage !== "ready") errors.push("primary store is not ready");
  if (!payload?.store?.configured) errors.push("primary store is not configured");

  const objectStorage = payload?.objectStorage || {};
  const catalogDb = payload?.catalogDb || {};
  const objectStorageSupported = objectStorage.supported !== false && objectStorage.provider === "s3-compatible";
  if (!objectStorage.configured) warnings.push(`object storage ${objectStorage.provider || "unknown"} is not configured`);
  if (!objectStorageSupported) warnings.push(`object storage ${objectStorage.provider || "unknown"} is not supported`);
  if (objectStorage.provider === "s3-compatible" && !objectStorage.publicUrlConfigured) warnings.push("S3-compatible public URL is not configured");
  if (args.requireObjectStorage && !objectStorage.configured) errors.push("object storage is required but not configured");
  if (args.requireObjectStorage && !objectStorageSupported) errors.push("object storage is required but provider is not supported");
  if (args.requireObjectStorage && objectStorage.provider === "s3-compatible" && !objectStorage.publicUrlConfigured) {
    errors.push("S3-compatible public URL is required but not configured");
  }

  if (!catalogDb.enabled) warnings.push("catalog DB source is disabled");
  if (catalogDb.enabled && !catalogDb.configured) errors.push("catalog DB source is enabled but not configured");
  if (args.requireCatalogDb && (!catalogDb.enabled || !catalogDb.configured)) errors.push("catalog DB source is required but not ready");

  return {
    ok: errors.length === 0,
    readyForPhotoCutover: Boolean(objectStorageSupported && objectStorage.configured && objectStorage.publicUrlConfigured),
    readyForCatalogDbCutover: Boolean(catalogDb.enabled && catalogDb.configured),
    provider: objectStorage.provider || "",
    store: payload.store || {},
    objectStorage,
    catalogDb,
    warnings,
    errors,
  };
}

async function runStorageReadiness(rawBaseUrl, args) {
  return analyzeHealth(await fetchHealth(normalizeBaseUrl(rawBaseUrl), args), args);
}

async function withFixture(payload, fn) {
  const server = createServer((req, res) => {
    if (req.url === "/api/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(payload));
      return;
    }
    res.writeHead(404).end("not found");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

async function selfTest() {
  const ready = await withFixture(
    {
      ok: true,
      storage: "ready",
      store: { provider: "redis", configured: true },
      objectStorage: { provider: "s3-compatible", configured: true, publicUrlConfigured: true },
      catalogDb: { enabled: true, configured: true },
    },
    (baseUrl) => runStorageReadiness(baseUrl, { timeoutMs: 1000, requireObjectStorage: true, requireCatalogDb: true })
  );
  assert(ready.ok && ready.readyForPhotoCutover && ready.readyForCatalogDbCutover, "ready fixture should pass strict readiness");

  const pending = await withFixture(
    {
      ok: true,
      storage: "ready",
      store: { provider: "redis", configured: true },
      objectStorage: { provider: "s3-compatible", configured: false, publicUrlConfigured: false },
      catalogDb: { enabled: false, configured: false },
    },
    (baseUrl) => runStorageReadiness(baseUrl, { timeoutMs: 1000 })
  );
  assert(pending.ok && !pending.readyForPhotoCutover && pending.warnings.length >= 2, "pending fixture should warn without failing");

  const unsupported = await withFixture(
    {
      ok: true,
      storage: "ready",
      store: { provider: "redis", configured: true },
      objectStorage: { provider: "vercel-blob", configured: true, publicUrlConfigured: true, supported: false },
      catalogDb: { enabled: true, configured: true },
    },
    (baseUrl) => runStorageReadiness(baseUrl, { timeoutMs: 1000 })
  );
  assert(unsupported.ok && !unsupported.readyForPhotoCutover, "unsupported storage provider must not be ready for photo cutover");

  const unsupportedStrict = await withFixture(
    {
      ok: true,
      storage: "ready",
      store: { provider: "redis", configured: true },
      objectStorage: { provider: "vercel-blob", configured: true, publicUrlConfigured: true, supported: false },
      catalogDb: { enabled: true, configured: true },
    },
    (baseUrl) => runStorageReadiness(baseUrl, { timeoutMs: 1000, requireObjectStorage: true })
  );
  assert(!unsupportedStrict.ok && unsupportedStrict.errors.some((item) => item.includes("not supported")), "strict storage readiness must reject unsupported providers");
}

async function main() {
  const args = parseArgs();
  if (args.selfTest) {
    await selfTest();
    console.log("Production storage readiness self-test passed");
    return;
  }
  const report = await runStorageReadiness(args.baseUrl, args);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Production storage readiness ${report.ok ? "passed" : "failed"}: photoCutover=${report.readyForPhotoCutover}, catalogDbCutover=${report.readyForCatalogDbCutover}`);
    if (report.warnings.length) console.log(`Warnings: ${report.warnings.join("; ")}`);
    if (report.errors.length) console.log(`Errors: ${report.errors.join("; ")}`);
  }
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

export { analyzeHealth, runStorageReadiness };
