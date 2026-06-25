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
  const warmupManifest = files.warmupManifest ?? read("tools/cache-warmup-manifest.mjs");
  const warmupSmoke = files.warmupSmoke ?? read("tools/cache-warmup-smoke.mjs");
  const swSource = files.swSource ?? read("sw.js");
  const vpsDeploy = files.vpsDeploy ?? read(".github/workflows/vps-deploy.yml");
  const productionWorkflow = files.productionWorkflow ?? read(".github/workflows/production-smoke.yml");
  const packageJson = files.packageJson ?? read("package.json");
  const rustMain = files.rustMain ?? read("rust-server/src/main.rs");
  const appData = files.appData ?? read("components/app-data.js");

  assert(docs.includes("Public HTML shells") && docs.includes("no-cache"), "cache architecture must document HTML revalidation");
  assert(docs.includes("Versioned JS/CSS") && docs.includes("immutable"), "cache architecture must document immutable versioned assets");
  assert(docs.includes("Private or user-specific APIs") && docs.includes("no-store"), "cache architecture must document private no-store policy");
  assert(docs.includes("partial `/api/catalog-query?pageSize=48"), "cache architecture must document partial listing count risk");
  assert(docs.includes("cache-warmup-smoke"), "cache architecture must document deploy warmup verification");
  assert(docs.includes("Safe migration plan"), "cache architecture must include safe migration steps");

  assert(server.includes("if (pathname === \"/data/products-live.json\") return \"public, max-age=300"), "server should keep public product data short-cache");
  assert(server.includes("return \"no-cache\""), "server should keep HTML no-cache behavior");
  assert(server.includes("max-age=31536000, immutable"), "server should keep immutable versioned asset cache");
  assert(rustMain.includes("public, max-age=300, stale-while-revalidate=3600"), "Rust public catalog cache should stay short public cache");
  assert(rustMain.includes("render_listing_page") && rustMain.includes("Ok((no_cache_headers(), Html(body)))"), "Rust full HTML shells should keep no-cache behavior");
  assert(rustMain.includes("no-store"), "Rust private/admin routes should keep no-store helper");

  assert(productionSmoke.includes("category counts look page-limited"), "production smoke must catch page-limited catalog counts");
  assert(productionSmoke.includes("expected current app.js cache-bust version"), "production smoke must catch stale app.js references");
  assert(productionSmoke.includes("expected current site-shell.js cache-bust version"), "production smoke must catch stale service-worker registration shell references");
  assert(productionSmoke.includes("HTML must not use aggressive cache-control"), "production smoke must reject aggressive HTML cache");
  assert(performanceSmoke.includes("catalog first-load categories look page-limited"), "performance smoke must catch first-load partial category counts");
  assert(performanceSmoke.includes("catalog-first-load"), "performance smoke must report first-load budget");
  assert(warmupManifest.includes("/business.html") && warmupManifest.includes("/contacts.html"), "cache warmup manifest must include representative static content pages");
  assert(warmupManifest.includes("PRIVATE_CACHE_PROBE_PATHS") && warmupManifest.includes("/api/admin/prices"), "cache warmup manifest must include private/admin no-store probes");
  assert(warmupManifest.includes("/api/catalog-query?pageSize=1&sort=popular"), "cache warmup must include catalog summary query");
  assert(warmupManifest.includes("/api/catalog-query?pageSize=48&sort=popular&category="), "cache warmup must include representative category query");
  assert(warmupSmoke.includes("/api/catalog-detail?baseSku="), "cache warmup must discover a representative catalog detail API");
  assert(warmupSmoke.includes("discoverVersionedAssetPaths") && warmupSmoke.includes("versioned static asset must be immutable"), "cache warmup must discover and verify versioned JS/CSS assets");
  assert(warmupSmoke.includes("PRIVATE_CACHE_PROBE_PATHS") && warmupSmoke.includes("no-store"), "cache warmup must verify private no-store paths");
  assert(swSource.includes("freshPublicApiFirst") && swSource.includes("isFreshApiResponse(cached)"), "service worker should serve fresh public API cache without repeat network fetches");
  assert(swSource.includes("SKIP_WAITING"), "service worker should handle explicit skip-waiting upgrades");
  assert(vpsDeploy.includes("node tools/cache-warmup-smoke.mjs --base-url https://sobag-shop.online"), "VPS deploy must run cache warmup after release activation");
  assert(productionWorkflow.includes("node tools/cache-warmup-smoke.mjs"), "production workflow must run cache warmup verification");
  assert(packageJson.includes("\"smoke:cache-warmup\""), "package scripts must expose cache warmup smoke");
  assert(/PUBLIC_API_CACHE_PREFIX\s*=\s*"sobag\.publicApiCache\.v\d+\."/u.test(appData), "public API cache key version should stay explicit");

  return { ok: true };
}

function runSelfTest() {
  auditCacheArchitecture();
  try {
    auditCacheArchitecture({
      docs: "Public HTML shells no-cache\nVersioned JS/CSS immutable\nPrivate or user-specific APIs no-store\nSafe migration plan\n",
      server: "return \"no-cache\"; max-age=31536000, immutable",
      productionSmoke: "expected current app.js cache-bust version\nexpected current site-shell.js cache-bust version",
      performanceSmoke: "catalog-first-load",
      warmupManifest: "/business.html\n/contacts.html\nPRIVATE_CACHE_PROBE_PATHS\n/api/admin/prices\n/api/catalog-query?pageSize=1&sort=popular\n/api/catalog-query?pageSize=48&sort=popular&category=",
      warmupSmoke: "/api/catalog-detail?baseSku=\ndiscoverVersionedAssetPaths\nversioned static asset must be immutable\nPRIVATE_CACHE_PROBE_PATHS\nno-store",
      swSource: "freshPublicApiFirst\nisFreshApiResponse(cached)\nSKIP_WAITING",
      vpsDeploy: "node tools/cache-warmup-smoke.mjs --base-url https://sobag-shop.online",
      productionWorkflow: "node tools/cache-warmup-smoke.mjs",
      packageJson: "\"smoke:cache-warmup\"",
      rustMain: "no-store",
      appData: "PUBLIC_API_CACHE_PREFIX = \"sobag.publicApiCache.v3.\"",
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
