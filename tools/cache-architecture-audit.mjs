#!/usr/bin/env node
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function auditCacheArchitecture(files = {}) {
  const docs = files.docs ?? read("docs/cache-architecture.md");
  const server = files.server ?? read("server.mjs");
  const productionSmoke = files.productionSmoke ?? read("tools/production-smoke.mjs");
  const performanceSmoke = files.performanceSmoke ?? read("tools/production-performance-smoke.mjs");
  const rustMain = files.rustMain ?? read("rust-server/src/main.rs");
  const appData = files.appData ?? read("components/app-data.js");

  assert(docs.includes("Public HTML shells") && docs.includes("no-cache"), "cache architecture must document HTML revalidation");
  assert(docs.includes("Versioned JS/CSS") && docs.includes("immutable"), "cache architecture must document immutable versioned assets");
  assert(docs.includes("Private or user-specific APIs") && docs.includes("no-store"), "cache architecture must document private no-store policy");
  assert(docs.includes("partial `/api/catalog-query?pageSize=48"), "cache architecture must document partial listing count risk");
  assert(docs.includes("Safe migration plan"), "cache architecture must include safe migration steps");

  assert(server.includes("if (pathname === \"/data/products-live.json\") return \"public, max-age=300"), "server should keep public product data short-cache");
  assert(server.includes("return \"no-cache\""), "server should keep HTML no-cache behavior");
  assert(server.includes("max-age=31536000, immutable"), "server should keep immutable versioned asset cache");
  assert(rustMain.includes("public, max-age=300, stale-while-revalidate=3600"), "Rust public catalog cache should stay short public cache");
  assert(rustMain.includes("no-store"), "Rust private/admin routes should keep no-store helper");

  assert(productionSmoke.includes("category counts look page-limited"), "production smoke must catch page-limited catalog counts");
  assert(productionSmoke.includes("expected current app.js cache-bust version"), "production smoke must catch stale app.js references");
  assert(productionSmoke.includes("HTML must not use aggressive cache-control"), "production smoke must reject aggressive HTML cache");
  assert(performanceSmoke.includes("catalog first-load categories look page-limited"), "performance smoke must catch first-load partial category counts");
  assert(performanceSmoke.includes("catalog-first-load"), "performance smoke must report first-load budget");
  assert(appData.includes("PUBLIC_API_CACHE_PREFIX = \"sobag.publicApiCache.v2.\""), "public API cache key version should stay explicit");

  return { ok: true };
}

function runSelfTest() {
  auditCacheArchitecture();
  try {
    auditCacheArchitecture({
      docs: "Public HTML shells no-cache\nVersioned JS/CSS immutable\nPrivate or user-specific APIs no-store\nSafe migration plan\n",
      server: "return \"no-cache\"; max-age=31536000, immutable",
      productionSmoke: "expected current app.js cache-bust version",
      performanceSmoke: "catalog-first-load",
      rustMain: "no-store",
      appData: "PUBLIC_API_CACHE_PREFIX = \"sobag.publicApiCache.v2.\"",
    });
  } catch (error) {
    if (String(error.message).includes("partial listing count risk")) return;
    throw error;
  }
  throw new Error("cache architecture audit self-test did not reject missing partial-count risk");
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
  console.log("Cache architecture audit self-test passed");
} else {
  auditCacheArchitecture();
  console.log("Cache architecture audit passed");
}

