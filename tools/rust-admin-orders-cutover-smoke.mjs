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
      console.log("Usage: node tools/rust-admin-orders-cutover-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust");
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
      "manager@example.test": { email: "manager@example.test", name: "Manager", role: "manager" },
      "admin@example.test": { email: "admin@example.test", name: "Admin", role: "admin", owner: true },
    },
    orders: [
      {
        id: "SO-1",
        date: "10.06.2026, 09:41:23",
        createdAt: "2026-06-10T06:41:23.000Z",
        status: "new",
        userEmail: "buyer@example.test",
        customer: { name: "Buyer", phone: "+7 968 959-32-54", email: "buyer@example.test" },
        items: [{ key: "sku-1", productName: "Pillow", qty: 100, variant: { sku: "sku-1", price: 520 } }],
        total: 52000,
        source: "admin-cutover-smoke",
        crmThread: [
          { id: "CRM-I", at: "2026-06-10T07:00:00.000Z", actor: "Admin", role: "admin", visibility: "internal", text: "Internal note" },
          { id: "CRM-C", at: "2026-06-10T07:01:00.000Z", actor: "Buyer", role: "buyer", visibility: "customer", text: "Customer note" },
        ],
        statusHistory: [],
      },
    ],
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
  await writeStoreValue(dir, "sobag:session:manager", { email: "manager@example.test", createdAt: "2026-06-12T00:00:00.000Z" }, 3600);
  await writeStoreValue(dir, "sobag:session:admin", { email: "admin@example.test", createdAt: "2026-06-12T00:00:00.000Z" }, 3600);
}

function routeTarget(pathname, nodeBase, rustBase) {
  if (pathname === "/api/admin/orders") return `${rustBase}/rust/admin/orders`;
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

async function runSmoke(args) {
  const temp = await mkdtemp(join(tmpdir(), "sobag-rust-admin-orders-cutover-"));
  const nodePort = 55000 + Math.floor(Math.random() * 1000);
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

    const adminRead = await requestJson(base, "/api/admin/orders", { token: "admin" });
    if (adminRead.status !== 200 || adminRead.payload.orders?.[0]?.source !== "admin-cutover-smoke") {
      throw new Error(`admin order read through Rust failed: ${adminRead.status} ${JSON.stringify(adminRead.payload)}`);
    }
    console.log("OK GET /api/admin/orders through Rust");

    const managerPatch = await requestJson(base, "/api/admin/orders", {
      token: "manager",
      method: "PATCH",
      body: {
        id: "SO-1",
        status: "processing",
        managerEmail: "manager@example.test",
        managerNote: "Call client",
        commentText: "Visible update",
        commentVisibility: "customer",
      },
    });
    if (
      managerPatch.status !== 200 ||
      managerPatch.payload.order?.status !== "processing" ||
      managerPatch.payload.order?.managerName !== "Manager" ||
      managerPatch.payload.order?.managerNote !== "Call client" ||
      managerPatch.payload.order?.crmThread?.[0]?.visibility !== "customer" ||
      !managerPatch.payload.order?.statusHistory?.length
    ) {
      throw new Error(`admin order patch through Rust failed: ${managerPatch.status} ${JSON.stringify(managerPatch.payload)}`);
    }
    console.log("OK PATCH /api/admin/orders through Rust");

    const buyerAccount = await requestJson(base, "/api/auth/me", { token: "buyer" });
    const accountOrders = buyerAccount.payload.orders || buyerAccount.payload.user?.orders || [];
    const buyerOrder = accountOrders.find((order) => order.id === "SO-1");
    if (buyerAccount.status !== 200 || buyerOrder?.status !== "processing") {
      throw new Error(`Node account fallback cannot see Rust admin order update: ${buyerAccount.status} ${JSON.stringify(buyerAccount.payload)}`);
    }
    if (JSON.stringify(buyerOrder).includes("Internal note")) throw new Error("buyer account fallback leaked internal CRM entry");
    console.log("OK Node account fallback sees safe Rust admin update");

    const invalidStatus = await requestJson(base, "/api/admin/orders", { token: "admin", method: "PATCH", body: { id: "SO-1", status: "bad" } });
    if (invalidStatus.status !== 400 || invalidStatus.payload.error !== "invalid_status") {
      throw new Error(`admin invalid status mismatch: ${invalidStatus.status} ${JSON.stringify(invalidStatus.payload)}`);
    }
    const invalidManager = await requestJson(base, "/api/admin/orders", {
      token: "admin",
      method: "PATCH",
      body: { id: "SO-1", managerEmail: "buyer@example.test" },
    });
    if (invalidManager.status !== 400 || invalidManager.payload.error !== "invalid_manager") {
      throw new Error(`admin invalid manager mismatch: ${invalidManager.status} ${JSON.stringify(invalidManager.payload)}`);
    }
    const buyerRead = await requestJson(base, "/api/admin/orders", { token: "buyer" });
    if (buyerRead.status !== 403 || buyerRead.payload.error !== "forbidden") throw new Error(`buyer admin orders mismatch: ${buyerRead.status}`);
    const guestRead = await requestJson(base, "/api/admin/orders");
    if (guestRead.status !== 401 || guestRead.payload.error !== "unauthorized") throw new Error(`guest admin orders mismatch: ${guestRead.status}`);
    console.log("OK admin orders guards through Rust");

    const health = await requestJson(base, "/api/health");
    if (health.status !== 200 || !health.payload.ok) throw new Error(`Node fallback health mismatch: ${health.status}`);
    console.log("OK unrelated API remains Node fallback");
    console.log("Rust admin orders cutover smoke passed");
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
  if (routeTarget("/api/admin/orders", "node", "rust") !== "rust/rust/admin/orders") throw new Error("admin orders should route to Rust");
  if (routeTarget("/api/orders", "node", "rust") !== "node/api/orders") throw new Error("public orders should route to Node in this smoke");
  if (routeTarget("/api/auth/me", "node", "rust") !== "node/api/auth/me") throw new Error("auth/me should route to Node");
  const store = fixtureStore();
  if (!store.orders[0].crmThread.some((entry) => entry.visibility === "internal")) throw new Error("fixture should include internal note");
  console.log("Rust admin orders cutover smoke self-test passed");
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
