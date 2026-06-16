import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSobagServer } from "../server.mjs";

const tempDir = mkdtempSync(join(tmpdir(), "sobag-vps-server-"));

process.env.SOBAG_STORE_PROVIDER = "file";
process.env.SOBAG_FILE_STORE_DIR = tempDir;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address()));
  });
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function readJson(baseUrl, path) {
  const response = await fetch(new URL(path, baseUrl));
  const text = await response.text();
  assert(response.ok, `${path} should return 2xx, got ${response.status}: ${text.slice(0, 160)}`);
  assert((response.headers.get("content-type") || "").includes("application/json"), `${path} should return JSON`);
  return JSON.parse(text);
}

async function readText(baseUrl, path) {
  const response = await fetch(new URL(path, baseUrl));
  const text = await response.text();
  assert(response.ok, `${path} should return 2xx, got ${response.status}`);
  return { response, text };
}

async function assertNotServed(baseUrl, path) {
  const response = await fetch(new URL(path, baseUrl));
  assert(response.status === 404, `${path} should not be publicly served, got ${response.status}`);
}

const server = createSobagServer();

try {
  const address = await listen(server);
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const home = await readText(baseUrl, "/");
  assert(home.text.includes("Sobag"), "home page should include Sobag marker");
  assert(home.response.headers.get("x-content-type-options") === "nosniff", "security headers should be set");
  assert((home.response.headers.get("cache-control") || "").includes("no-cache"), "HTML shell should require revalidation");

  const indexRedirect = await fetch(new URL("/index.html", baseUrl), { redirect: "manual" });
  assert(indexRedirect.status === 301, `/index.html should redirect to /, got ${indexRedirect.status}`);
  assert(indexRedirect.headers.get("location") === "/", "/index.html should redirect to root");

  const appJs = await readText(baseUrl, "/app.js");
  assert((appJs.response.headers.get("cache-control") || "").includes("max-age=3600"), "static JS should be browser-cacheable");
  const appEtag = appJs.response.headers.get("etag");
  assert(appEtag, "static JS should include ETag");
  assert(appJs.response.headers.get("last-modified"), "static JS should include Last-Modified");
  const cachedAppJs = await fetch(new URL("/app.js", baseUrl), { headers: { "if-none-match": appEtag } });
  assert(cachedAppJs.status === 304, `static JS should support conditional 304, got ${cachedAppJs.status}`);
  const headAppJs = await fetch(new URL("/app.js", baseUrl), { method: "HEAD" });
  assert(headAppJs.ok, `static JS HEAD should return 2xx, got ${headAppJs.status}`);
  assert((await headAppJs.text()) === "", "static JS HEAD should not return a body");

  const styles = await readText(baseUrl, "/styles.css");
  assert((styles.response.headers.get("content-type") || "").includes("text/css"), "CSS should use text/css MIME");
  assert((styles.response.headers.get("cache-control") || "").includes("max-age=3600"), "non-fingerprinted CSS should use short static cache");

  const heroImage = await fetch(new URL("/assets/production-hero-1.png", baseUrl), { method: "HEAD" });
  assert(heroImage.ok, `image HEAD should return 2xx, got ${heroImage.status}`);
  assert((heroImage.headers.get("content-type") || "").includes("image/png"), "image should use image/png MIME");
  assert((heroImage.headers.get("cache-control") || "").includes("max-age=86400"), "assets images should use cautious one-day cache");

  const catalogPage = await readText(baseUrl, "/catalog");
  assert(catalogPage.text.includes("Каталог"), "clean catalog URL should resolve to catalog.html");

  await assertNotServed(baseUrl, "/server.mjs");
  await assertNotServed(baseUrl, "/package.json");
  await assertNotServed(baseUrl, "/docs/vps-rust-runtime-map.md");
  await assertNotServed(baseUrl, "/.github/workflows/vps-deploy.yml");
  await assertNotServed(baseUrl, "/rust-server/src/main.rs");
  await assertNotServed(baseUrl, "/server-routes/_lib/auth.js");
  await assertNotServed(baseUrl, "/assets/%2e%2e/server.mjs");
  await assertNotServed(baseUrl, "/components/%2e%2e/.github/workflows/vps-deploy.yml");
  await assertNotServed(baseUrl, "/templates/%2e%2e/server-routes/_lib/auth.js");

  const health = await readJson(baseUrl, "/api/health");
  assert(health.ok === true, "health should be ready with file store");
  assert(health.store?.provider === "file", "health should expose safe file store provider");
  assert(health.store?.configured === true, "file store should be configured");
  const healthResponse = await fetch(new URL("/api/health", baseUrl));
  assert((healthResponse.headers.get("cache-control") || "").includes("no-store"), "API health should not be cached");

  const query = await readJson(baseUrl, "/api/catalog-query?pageSize=2");
  assert(query.items?.length === 2, "catalog-query should return compact cards");
  assert(!("variants" in query.items[0]), "catalog-query cards should not include full variants");
  const queryResponse = await fetch(new URL("/api/catalog-query?pageSize=1", baseUrl));
  assert((queryResponse.headers.get("cache-control") || "").includes("max-age=300"), "catalog-query should be browser-cacheable");

  const detail = await readJson(baseUrl, `/api/catalog-detail?baseSku=${encodeURIComponent(query.items[0].baseSku)}`);
  assert(detail.product?.baseSku === query.items[0].baseSku, "catalog-detail should resolve from baseSku");
  assert(Array.isArray(detail.product?.variants) && detail.product.variants.length > 0, "catalog-detail should include variants");

  console.log(`vps-server smoke passed: ${baseUrl}`);
} finally {
  await close(server).catch(() => {});
  rmSync(tempDir, { recursive: true, force: true });
}
