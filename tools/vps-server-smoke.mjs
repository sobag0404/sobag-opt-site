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

const server = createSobagServer();

try {
  const address = await listen(server);
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const home = await readText(baseUrl, "/");
  assert(home.text.includes("Sobag"), "home page should include Sobag marker");
  assert(home.response.headers.get("x-content-type-options") === "nosniff", "security headers should be set");

  const catalogPage = await readText(baseUrl, "/catalog");
  assert(catalogPage.text.includes("Каталог"), "clean catalog URL should resolve to catalog.html");

  const health = await readJson(baseUrl, "/api/health");
  assert(health.ok === true, "health should be ready with file store");
  assert(health.store?.provider === "file", "health should expose safe file store provider");
  assert(health.store?.configured === true, "file store should be configured");

  const query = await readJson(baseUrl, "/api/catalog-query?pageSize=2");
  assert(query.items?.length === 2, "catalog-query should return compact cards");
  assert(!("variants" in query.items[0]), "catalog-query cards should not include full variants");

  const detail = await readJson(baseUrl, `/api/catalog-detail?baseSku=${encodeURIComponent(query.items[0].baseSku)}`);
  assert(detail.product?.baseSku === query.items[0].baseSku, "catalog-detail should resolve from baseSku");
  assert(Array.isArray(detail.product?.variants) && detail.product.variants.length > 0, "catalog-detail should include variants");

  console.log(`vps-server smoke passed: ${baseUrl}`);
} finally {
  await close(server).catch(() => {});
  rmSync(tempDir, { recursive: true, force: true });
}
