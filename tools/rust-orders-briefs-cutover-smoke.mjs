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
      console.log("Usage: node tools/rust-orders-briefs-cutover-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust");
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

function fixtureStore() {
  return {
    users: {
      "buyer@example.test": { email: "buyer@example.test", name: "Buyer", role: "buyer", phone: "+7 968 959-32-54" },
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
  await writeStoreValue(dir, "sobag:content:v1", { content: {}, version: 1 });
  await writeStoreValue(dir, "sobag:session:buyer", { email: "buyer@example.test", createdAt: "2026-06-12T00:00:00.000Z" }, 3600);
  await writeStoreValue(dir, "sobag:session:admin", { email: "admin@example.test", createdAt: "2026-06-12T00:00:00.000Z" }, 3600);
}

function routeTarget(pathname, nodeBase, rustBase) {
  if (pathname === "/api/orders") return `${rustBase}/rust/orders`;
  if (pathname === "/api/briefs") return `${rustBase}/rust/briefs`;
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

async function requestJson(base, path, { token = "", method = "GET", body = null } = {}) {
  const headers = token ? { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` } : {};
  if (body) headers["content-type"] = "application/json";
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    ok: response.ok,
    payload: await response.json().catch(() => ({})),
  };
}

function discountedTotal(unitPrice, qty) {
  const subtotal = unitPrice * qty;
  const discount = subtotal >= 300000 ? 18 : subtotal >= 150000 ? 12 : subtotal >= 70000 ? 7 : subtotal >= 30000 ? 5 : 0;
  return Math.round((subtotal - (subtotal * discount) / 100) * 100) / 100;
}

async function loadOrderFixture(base) {
  const query = await requestJson(base, "/api/catalog-query?pageSize=1");
  const card = query.payload.items?.[0];
  if (!card?.baseSku) throw new Error("catalog-query did not return a product card");
  const detail = await requestJson(base, `/api/catalog-detail?baseSku=${encodeURIComponent(card.baseSku)}`);
  const product = detail.payload.product || {};
  const variant = product.variants?.[0];
  if (!variant?.sku) throw new Error("catalog-detail did not return a variant");
  const unitPrice = Number(variant.price || 0);
  const qty = Math.max(1, Math.ceil(32000 / unitPrice));
  return { product, variant, qty, total: discountedTotal(unitPrice, qty) };
}

function orderBody(fixture = null, options = {}) {
  const variant = fixture?.variant || { sku: "sku-1", price: 520 };
  const product = fixture?.product || { id: "", name: "Pillow" };
  const qty = fixture?.qty || 1;
  const total = Object.prototype.hasOwnProperty.call(options, "total") ? options.total : fixture?.total || 30000;
  return {
    items: [{ key: variant.sku, productId: product.id || "", productName: product.name || "", qty, variant }],
    total,
    customer: {
      name: "Buyer",
      company: "Sobag LLC",
      inn: "1234567890",
      phone: "89689593254",
      email: "buyer@example.test",
      city: "Kursk",
      address: "Factory lane",
      layoutFileName: "layout.pdf",
      comment: "Call first",
    },
    source: "rust-cutover-smoke",
  };
}

function briefBody() {
  return {
    product: "Pillow",
    quantity: 100,
    name: "Buyer",
    contact: "Telegram @buyer",
    phone: "89689593254",
    email: "buyer@example.test",
    layoutReference: "layout.pdf",
    comment: "Need sample",
  };
}

async function runSmoke(args) {
  const temp = await mkdtemp(join(tmpdir(), "sobag-rust-orders-cutover-"));
  const nodePort = 54000 + Math.floor(Math.random() * 1000);
  const rustPort = nodePort + 1000;
  const proxyPort = nodePort + 2000;
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
    const orderFixture = await loadOrderFixture(base);

    const created = await requestJson(base, "/api/orders", { token: "buyer", method: "POST", body: orderBody(orderFixture) });
    if (created.status !== 201 || created.payload.order?.source !== "rust-cutover-smoke") {
      throw new Error(`order create through Rust route failed: ${created.status} ${JSON.stringify(created.payload)}`);
    }
    if (created.payload.order?.items?.[0]?.qty !== 1) throw new Error("Rust order route did not sanitize quantity");
    console.log("OK POST /api/orders through Rust");

    const adminOrders = await requestJson(base, "/api/admin/orders", { token: "admin" });
    if (!adminOrders.payload.orders?.some((order) => order.source === "rust-cutover-smoke")) {
      throw new Error("Node admin orders cannot see Rust-created order");
    }
    console.log("OK Node admin fallback sees Rust-created order");

    const account = await requestJson(base, "/api/auth/me", { token: "buyer" });
    const accountOrders = account.payload.orders || account.payload.user?.orders || [];
    if (account.status !== 200 || !accountOrders.some((order) => order.source === "rust-cutover-smoke")) {
      throw new Error(`Node account fallback cannot see Rust-created order: ${account.status} ${JSON.stringify(account.payload)}`);
    }
    if (account.payload.user?.company !== "Sobag LLC" || account.payload.user?.lastCustomer?.layoutFileName !== "layout.pdf") {
      throw new Error("Node account fallback cannot see Rust order profile side effects");
    }
    console.log("OK Node account fallback sees Rust order side effects");

    const patched = await requestJson(base, "/api/orders", {
      token: "buyer",
      method: "PATCH",
      body: { id: created.payload.order.id, commentText: "Need invoice" },
    });
    if (patched.status !== 200 || patched.payload.order?.crmThread?.[0]?.text !== "Need invoice") {
      throw new Error(`buyer message through Rust route failed: ${patched.status} ${JSON.stringify(patched.payload)}`);
    }
    console.log("OK PATCH /api/orders through Rust");

    const belowMinimum = await requestJson(base, "/api/orders", { method: "POST", body: orderBody(orderFixture, { total: 29999 }) });
    if (belowMinimum.status !== 400 || belowMinimum.payload.error !== "minimum_total") {
      throw new Error(`minimum check mismatch: ${belowMinimum.status} ${JSON.stringify(belowMinimum.payload)}`);
    }
    console.log("OK Rust order validation stays active");

    const brief = await requestJson(base, "/api/briefs", { token: "buyer", method: "POST", body: briefBody() });
    if (brief.status !== 201 || brief.payload.brief?.type !== "custom_print" || brief.payload.order?.source !== "custom_brief") {
      throw new Error(`brief create through Rust route failed: ${brief.status} ${JSON.stringify(brief.payload)}`);
    }
    console.log("OK POST /api/briefs through Rust");

    const adminBriefOrders = await requestJson(base, "/api/admin/orders", { token: "admin" });
    if (!adminBriefOrders.payload.orders?.some((order) => order.source === "custom_brief" && order.customBrief?.product === "Pillow")) {
      throw new Error("Node admin orders cannot see Rust-created custom brief");
    }
    console.log("OK Node admin fallback sees Rust-created brief");

    const methodGuard = await requestJson(base, "/api/briefs", { method: "GET" });
    if (methodGuard.status !== 405) throw new Error(`GET /api/briefs should stay 405, got ${methodGuard.status}`);
    const health = await requestJson(base, "/api/health");
    if (health.status !== 200 || !health.payload.ok) throw new Error(`Node fallback health mismatch: ${health.status}`);
    console.log("OK unrelated API remains Node fallback");
    console.log("Rust orders/briefs cutover smoke passed");
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
  if (routeTarget("/api/orders", "node", "rust") !== "rust/rust/orders") throw new Error("orders should route to Rust");
  if (routeTarget("/api/briefs", "node", "rust") !== "rust/rust/briefs") throw new Error("briefs should route to Rust");
  if (routeTarget("/api/admin/orders", "node", "rust") !== "node/api/admin/orders") throw new Error("admin orders should route to Node");
  if (routeTarget("/api/auth/me", "node", "rust") !== "node/api/auth/me") throw new Error("auth/me should route to Node");
  console.log("Rust orders/briefs cutover smoke self-test passed");
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
