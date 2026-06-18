#!/usr/bin/env node

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  createObjectStorageAdapter,
  objectStorageStatus,
  safePathSegment,
} = require("../server-routes/_lib/object-storage.js");

const DEFAULT_BASE_URL = "https://sobag-shop.online";
const ONE_PIXEL_WEBP =
  "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";
const ENV_KEYS = [
  "SOBAG_OBJECT_STORAGE_PROVIDER",
  "SOBAG_S3_ENDPOINT",
  "SOBAG_S3_BUCKET",
  "SOBAG_S3_ACCESS_KEY_ID",
  "SOBAG_S3_SECRET_ACCESS_KEY",
  "SOBAG_S3_SESSION_TOKEN",
  "SOBAG_S3_REGION",
  "SOBAG_S3_PUBLIC_BASE_URL",
  "SOBAG_S3_FORCE_PATH_STYLE",
];

function parseArgs(argv = process.argv.slice(2)) {
  const args = { baseUrl: DEFAULT_BASE_URL, productKey: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--self-test") args.selfTest = true;
    else if (arg === "--base-url") args.baseUrl = argv[++index];
    else if (arg === "--product-key") args.productKey = argv[++index];
  }
  return args;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function envText(name) {
  return String(process.env[name] || "").trim();
}

function safeRegionMode(value) {
  const region = String(value || "").trim();
  if (!region) return "empty";
  if (region.toLowerCase() === "auto") return "auto";
  if (region.toLowerCase() === "us-east-1") return "us-east-1";
  return "custom";
}

function safeDiagnostics(productKey = "") {
  let endpointHost = "missing";
  let endpointPath = "missing";
  try {
    const endpoint = new URL(envText("SOBAG_S3_ENDPOINT"));
    endpointHost = endpoint.host || "missing";
    endpointPath = endpoint.pathname && endpoint.pathname !== "" ? endpoint.pathname : "/";
  } catch {
    endpointHost = "invalid";
    endpointPath = "invalid";
  }
  const keyPrefix = productKey ? `products/${safePathSegment(productKey, "unknown-product")}` : "none";
  return [
    `endpointHost=${endpointHost}`,
    `endpointPath=${endpointPath}`,
    `pathStyle=${envText("SOBAG_S3_FORCE_PATH_STYLE") || "default-true"}`,
    `regionMode=${safeRegionMode(envText("SOBAG_S3_REGION"))}`,
    `bucketLen=${envText("SOBAG_S3_BUCKET").length}`,
    `token=${envText("SOBAG_S3_SESSION_TOKEN") ? "present" : "absent"}`,
    `keyPrefix=${keyPrefix}`,
  ].join(", ");
}

async function requestJson(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl), {
    headers: { accept: "application/json" },
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text.slice(0, 120) };
  }
  return { response, status: response.status, payload };
}

async function resolveProductKey(baseUrl, explicitProductKey) {
  if (explicitProductKey) return explicitProductKey;
  const catalog = await requestJson(baseUrl, "/api/catalog-query?pageSize=1&sort=popular");
  assert(catalog.status === 200, `catalog query failed: ${catalog.status}`);
  const item = catalog.payload?.items?.[0] || catalog.payload?.products?.[0];
  const productKey = String(item?.baseSku || item?.id || "").trim();
  assert(productKey, "object storage write smoke needs a public catalog product key");
  return productKey;
}

function imageFixture() {
  return {
    fileName: "object-storage-write-smoke.webp",
    mime: "image/webp",
    body: Buffer.from(ONE_PIXEL_WEBP, "base64"),
    width: 1,
    height: 1,
  };
}

async function liveSmoke(args) {
  const productKey = await resolveProductKey(args.baseUrl, args.productKey);
  const status = objectStorageStatus("s3-compatible");
  assert(status.configured, `object storage is not configured; ${safeDiagnostics(productKey)}`);
  const adapter = createObjectStorageAdapter("s3-compatible");
  let uploaded = null;
  try {
    const fixture = imageFixture();
    uploaded = await adapter.upload({
      productKey,
      ...fixture,
    });
    assert(uploaded?.storageKey, "upload should return storageKey");
    assert(
      uploaded.storageKey.startsWith(`products/${safePathSegment(productKey, "unknown-product")}/`),
      "upload storage key should stay under product prefix",
    );
    const listed = await adapter.listByProduct(productKey);
    assert(Array.isArray(listed), "listByProduct should return an array");
    await adapter.deleteOrMarkUnused(uploaded);
    uploaded = null;
    console.log("object storage write smoke passed");
  } catch (error) {
    throw new Error(`${error.message || error}; ${safeDiagnostics(productKey)}`);
  } finally {
    if (uploaded?.storageKey) {
      await adapter.deleteOrMarkUnused(uploaded).catch(() => {});
    }
  }
}

async function selfTest() {
  const savedEnv = {};
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  const savedFetch = globalThis.fetch;
  try {
    process.env.SOBAG_OBJECT_STORAGE_PROVIDER = "s3-compatible";
    process.env.SOBAG_S3_ENDPOINT = "https://storage.example.test";
    process.env.SOBAG_S3_BUCKET = "sobag-test";
    process.env.SOBAG_S3_ACCESS_KEY_ID = "test-access-key";
    process.env.SOBAG_S3_SECRET_ACCESS_KEY = "test-secret-key";
    process.env.SOBAG_S3_REGION = "auto";
    process.env.SOBAG_S3_PUBLIC_BASE_URL = "https://cdn.example.test/media";
    process.env.SOBAG_S3_FORCE_PATH_STYLE = "true";
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
      const parsed = new URL(String(url));
      calls.push({ parsed, options });
      if (parsed.hostname === "sobag-shop.online") {
        return new Response(JSON.stringify({ items: [{ baseSku: "opt_70190" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      const headers = options.headers || {};
      assert(headers.Authorization?.startsWith("AWS4-HMAC-SHA256 "), "S3 request should be signed");
      assert(headers["x-amz-content-sha256"], "S3 request should include payload hash");
      if (options.method === "PUT") {
        assert(parsed.pathname.startsWith("/sobag-test/products/opt_70190/"), "S3 request should use product prefix");
        return new Response("", { status: 200, headers: { etag: '"upload-etag"' } });
      }
      if (options.method === "GET") {
        assert(parsed.pathname === "/sobag-test", "S3 list should target bucket root");
        assert(parsed.searchParams.get("prefix") === "products/opt_70190/", "S3 list should use product prefix");
        return new Response(
          `<?xml version="1.0"?><ListBucketResult><Contents><Key>products/opt_70190/1.webp</Key><LastModified>2026-06-18T00:00:00.000Z</LastModified><ETag>&quot;etag&quot;</ETag><Size>1</Size></Contents></ListBucketResult>`,
          { status: 200, headers: { "content-type": "application/xml" } },
        );
      }
      if (options.method === "DELETE") {
        assert(parsed.pathname.startsWith("/sobag-test/products/opt_70190/"), "S3 delete should use product prefix");
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected method ${options.method}`);
    };
    await liveSmoke({ baseUrl: DEFAULT_BASE_URL, productKey: "" });
    assert(calls.map((call) => call.options.method || "GET").join(",") === "GET,PUT,GET,DELETE", "self-test should cover catalog, upload, list, delete");
    console.log("object storage write smoke self-test passed");
  } finally {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    globalThis.fetch = savedFetch;
  }
}

async function main() {
  const args = parseArgs();
  if (args.selfTest) {
    await selfTest();
    return;
  }
  await liveSmoke(args);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
