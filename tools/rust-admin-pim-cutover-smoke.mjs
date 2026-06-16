#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const DEFAULT_NODE_ENTRY = "server.mjs";
const DEFAULT_RUST_BIN = "rust-server/target/release/sobag-opt-rust";
const SESSION_COOKIE = "sobag_session";

function parseArgs(argv = process.argv.slice(2)) {
  const args = { nodeEntry: DEFAULT_NODE_ENTRY, rustBin: DEFAULT_RUST_BIN, timeout: 20000, selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--node-entry") args.nodeEntry = argv[++index] || args.nodeEntry;
    else if (token === "--rust-bin") args.rustBin = argv[++index] || args.rustBin;
    else if (token === "--timeout") args.timeout = Number(argv[++index] || args.timeout) || args.timeout;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log("Usage: node tools/rust-admin-pim-cutover-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function keyFileName(key) {
  return `${Buffer.from(String(key || ""), "utf8").toString("hex")}.json`;
}

function wrap(value, ttlSeconds = 0) {
  return {
    version: 1,
    expiresAt: ttlSeconds !== 0 ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : "",
    value,
  };
}

async function writeStoreValue(dir, key, value, ttlSeconds = 0) {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, keyFileName(key)), `${JSON.stringify(wrap(value, ttlSeconds), null, 2)}\n`, "utf8");
}

function fixtureCatalog() {
  const products = [
    {
      id: "pim-product-1",
      baseSku: "opt_pim_1",
      name: "PIM Pillow",
      status: "published",
      category: "Подушки",
      categories: ["Подушки"],
      collections: ["Велюр"],
      holidays: ["Новый год"],
      tags: ["test"],
      basePrice: 1200,
      stock: "in_stock",
      photoFolder: "pim",
      variants: [
        {
          id: "pim-variant-1",
          sku: "PIM-SKU-1",
          type: "Подушка",
          size: "40x40",
          material: "Велюр",
          name: "PIM Pillow 40x40",
          price: 1200,
          priceSource: "group",
        },
      ],
      images: [
        {
          id: "img-1",
          role: "main",
          source: "object-storage",
          url: "https://sobag-shop.online/sobag-products/products/opt_pim_1/1.webp",
          storageKey: "products/opt_pim_1/1.webp",
          provider: "s3-compatible",
          width: 800,
          height: 800,
          mime: "image/webp",
          fileName: "1.webp",
          size: 1024,
          status: "ready",
          uploadedAt: "2026-06-16T00:00:00.000Z",
          variants: [],
        },
      ],
    },
  ];
  return {
    products,
    updatedAt: "2026-06-16T00:00:00.000Z",
    updatedBy: "fixture",
    version: 1,
  };
}

function fixtureStore() {
  return {
    users: {
      "buyer@example.test": { email: "buyer@example.test", name: "Buyer", role: "buyer" },
      "content@example.test": { email: "content@example.test", name: "Content", role: "content" },
      "admin@example.test": { email: "admin@example.test", name: "Admin", role: "admin", owner: true },
    },
    orders: [],
    carts: {},
    favorites: {},
    savedCarts: {},
    reviews: [],
    briefs: [],
    audit: [],
    version: 1,
  };
}

async function createFixtureStore(dir) {
  await writeStoreValue(dir, "sobag:store:v1", fixtureStore());
  await writeStoreValue(dir, "sobag:catalog:v1", fixtureCatalog());
  await writeStoreValue(dir, "sobag:import-batches:v1", {
    batches: [
      {
        id: "BATCH-1",
        source: "fixture",
        status: "preview",
        createdAt: "2026-06-16T00:00:00.000Z",
        rowCount: 1,
        productCount: 1,
        snapshotProductCount: 1,
        counts: { created: 1, updated: 0, skipped: 0, errors: 0 },
      },
    ],
  });
  await writeStoreValue(dir, "sobag:content:v1", { content: {}, version: 1 });
  await writeStoreValue(dir, "sobag:session:buyer", { email: "buyer@example.test", createdAt: "2026-06-16T00:00:00.000Z" }, 3600);
  await writeStoreValue(dir, "sobag:session:content", { email: "content@example.test", createdAt: "2026-06-16T00:00:00.000Z" }, 3600);
  await writeStoreValue(dir, "sobag:session:admin", { email: "admin@example.test", createdAt: "2026-06-16T00:00:00.000Z" }, 3600);
}

function routeTarget(pathname, nodeBase, rustBase) {
  if (pathname === "/api/admin/pim") return `${rustBase}/rust/admin/pim`;
  return `${nodeBase}${pathname}`;
}

function startProcess(command, args, env) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
  return { child, output: () => output };
}

async function waitForJson(url, timeout) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
      lastError = new Error(`${url} -> HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(300);
  }
  throw lastError || new Error(`Timeout waiting for ${url}`);
}

function readRequestBody(request) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolveBody(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function copyRequestHeaders(request, body) {
  const headers = { ...request.headers };
  delete headers.host;
  delete headers.connection;
  delete headers["content-length"];
  if (body.length) headers["content-length"] = String(body.length);
  return headers;
}

async function startProxy({ port, nodePort, rustPort }) {
  const nodeBase = `http://127.0.0.1:${nodePort}`;
  const rustBase = `http://127.0.0.1:${rustPort}`;
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const target = `${routeTarget(url.pathname, nodeBase, rustBase)}${url.search}`;
      const body = await readRequestBody(request);
      const upstream = await fetch(target, {
        method: request.method,
        headers: copyRequestHeaders(request, body),
        body: body.length ? body : undefined,
      });
      response.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()));
      response.end(Buffer.from(await upstream.arrayBuffer()));
    } catch (error) {
      response.writeHead(502, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "proxy_error", message: String(error?.message || error) }));
    }
  });
  await new Promise((resolveListen) => server.listen(port, "127.0.0.1", resolveListen));
  return server;
}

async function request(base, path, { token = "" } = {}) {
  const headers = token ? { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` } : {};
  const response = await fetch(`${base}${path}`, { headers });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json().catch(() => ({})) : await response.text();
  return { status: response.status, headers: response.headers, body };
}

async function runSmoke(args) {
  const temp = await mkdtemp(join(tmpdir(), "sobag-rust-admin-pim-cutover-"));
  const nodePort = 64000 + Math.floor(Math.random() * 500);
  const rustPort = nodePort + 500;
  const proxyPort = nodePort + 1000;
  await createFixtureStore(temp);
  const env = {
    NODE_ENV: "test",
    SOBAG_STORE_PROVIDER: "file",
    SOBAG_FILE_STORE_DIR: temp,
    SOBAG_ADMIN_EMAIL: "",
    SOBAG_ADMIN_PASSWORD: "",
  };
  const node = startProcess(process.execPath, [resolve(args.nodeEntry)], { ...env, PORT: String(nodePort), HOST: "127.0.0.1" });
  const rust = startProcess(resolve(args.rustBin), [], { ...env, SOBAG_RUST_BIND: `127.0.0.1:${rustPort}` });
  let proxy = null;
  try {
    await waitForJson(`http://127.0.0.1:${nodePort}/api/health`, args.timeout);
    await waitForJson(`http://127.0.0.1:${rustPort}/api/health-rust`, args.timeout);
    proxy = await startProxy({ port: proxyPort, nodePort, rustPort });
    const base = `http://127.0.0.1:${proxyPort}`;

    const guest = await request(base, "/api/admin/pim");
    if (guest.status !== 401 || guest.body?.error !== "unauthorized") throw new Error(`guest PIM guard mismatch: ${guest.status}`);
    const buyer = await request(base, "/api/admin/pim", { token: "buyer" });
    if (buyer.status !== 403 || buyer.body?.error !== "forbidden") throw new Error(`buyer PIM guard mismatch: ${buyer.status}`);
    console.log("OK admin PIM auth guards through Rust");

    const summary = await request(base, "/api/admin/pim", { token: "content" });
    if (summary.status !== 200 || summary.body.view !== "summary" || Number(summary.body.counts?.products || 0) !== 1) {
      throw new Error(`PIM summary through Rust failed: ${summary.status} ${JSON.stringify(summary.body)}`);
    }
    if (summary.headers.get("cache-control") !== "no-store") throw new Error("PIM summary must be no-store");
    console.log("OK GET /api/admin/pim through Rust");

    const variants = await request(base, "/api/admin/pim?view=variants", { token: "admin" });
    if (variants.status !== 200 || variants.body.rows?.[0]?.sku !== "PIM-SKU-1" || Number(variants.body.rows?.[0]?.price || 0) <= 0) {
      throw new Error(`PIM variants through Rust failed: ${variants.status} ${JSON.stringify(variants.body)}`);
    }
    console.log("OK PIM variant prices stay non-zero through Rust");

    const csv = await request(base, "/api/admin/pim?view=products&format=csv", { token: "content" });
    if (csv.status !== 200 || !String(csv.headers.get("content-type") || "").includes("text/csv") || !String(csv.body).includes("PIM Pillow")) {
      throw new Error(`PIM CSV through Rust failed: ${csv.status}`);
    }
    console.log("OK PIM CSV through Rust");

    const invalid = await request(base, "/api/admin/pim?view=unknown", { token: "admin" });
    if (invalid.status !== 400 || invalid.body?.error !== "unsupported_pim_view") {
      throw new Error(`PIM invalid view guard mismatch: ${invalid.status} ${JSON.stringify(invalid.body)}`);
    }
    const publicCatalog = await request(base, "/api/catalog-query?pageSize=1");
    if (publicCatalog.status !== 200 || !publicCatalog.body.items?.length) {
      throw new Error(`public catalog fallback mismatch: ${publicCatalog.status}`);
    }
    console.log("OK public catalog remains available");
    console.log("Rust admin PIM cutover smoke passed");
  } catch (error) {
    error.message = `${error.message}\nNode output:\n${node.output().slice(-2000)}\nRust output:\n${rust.output().slice(-2000)}`;
    throw error;
  } finally {
    if (proxy) await new Promise((resolveClose) => proxy.close(resolveClose));
    node.child.kill();
    rust.child.kill();
    await rm(temp, { recursive: true, force: true });
  }
}

function selfTest() {
  if (routeTarget("/api/admin/pim", "node", "rust") !== "rust/rust/admin/pim") throw new Error("admin PIM should route to Rust");
  if (routeTarget("/api/admin/catalog", "node", "rust") !== "node/api/admin/catalog") throw new Error("admin catalog should stay Node");
  if (routeTarget("/api/admin/product-images", "node", "rust") !== "node/api/admin/product-images") throw new Error("admin product images should stay Node");
  const catalog = fixtureCatalog();
  if (Number(catalog.products?.[0]?.variants?.[0]?.price || 0) <= 0) throw new Error("fixture variant price must be non-zero");
  console.log("Rust admin PIM cutover smoke self-test passed");
}

async function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    return;
  }
  await runSmoke(args);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

export { routeTarget };
