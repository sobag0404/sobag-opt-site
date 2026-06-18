#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createServer as createNetServer } from "node:net";
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
      console.log("Usage: node tools/rust-admin-users-cutover-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust");
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
        id: "SO-OTHER",
        createdAt: "2026-06-10T06:41:23.000Z",
        status: "new",
        userEmail: "",
        customer: { name: "Other Buyer", phone: "+7 900 000-00-00", email: "other@example.test", address: "Kursk" },
        items: [],
        total: 30000,
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
  if (pathname === "/api/admin/users") return `${rustBase}/rust/admin/users`;
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

function assertNoPasswordFields(label, payload) {
  const text = JSON.stringify(payload);
  if (text.includes("passwordHash") || text.includes("passwordSalt")) throw new Error(`${label} leaked password fields`);
}

async function getFreePort() {
  const server = createNetServer();
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const { port } = server.address();
  await new Promise((resolveClose) => server.close(resolveClose));
  return port;
}

async function runSmoke(args) {
  const temp = await mkdtemp(join(tmpdir(), "sobag-rust-admin-users-cutover-"));
  const nodePort = await getFreePort();
  const rustPort = await getFreePort();
  const proxyPort = await getFreePort();
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

    const list = await requestJson(base, "/api/admin/users", { token: "admin" });
    if (list.status !== 200 || !list.payload.users?.some((user) => user.email === "manager@example.test")) {
      throw new Error(`admin users list through Rust failed: ${list.status} ${JSON.stringify(list.payload)}`);
    }
    assertNoPasswordFields("admin users list", list.payload);
    console.log("OK GET /api/admin/users through Rust");

    const detail = await requestJson(base, "/api/admin/users?email=other@example.test", { token: "manager" });
    if (detail.status !== 200 || detail.payload.user?.email !== "other@example.test" || detail.payload.user?.orders?.[0]?.id !== "SO-OTHER") {
      throw new Error(`admin users detail through Rust failed: ${detail.status} ${JSON.stringify(detail.payload)}`);
    }
    console.log("OK GET /api/admin/users?email=... through Rust");

    const invited = await requestJson(base, "/api/admin/users", {
      token: "admin",
      method: "POST",
      body: { email: "employee@example.test", name: "Employee", phone: "89001234567" },
    });
    if (invited.status !== 201 || invited.payload.user?.role !== "manager" || invited.payload.user?.employee !== true) {
      throw new Error(`admin users invite through Rust failed: ${invited.status} ${JSON.stringify(invited.payload)}`);
    }
    assertNoPasswordFields("admin users invite", invited.payload);
    console.log("OK POST /api/admin/users through Rust");

    await writeStoreValue(temp, "sobag:session:employee", { email: "employee@example.test", createdAt: "2026-06-12T00:10:00.000Z" }, 3600);
    const employeeAccount = await requestJson(base, "/api/auth/me", { token: "employee" });
    if (employeeAccount.status !== 200 || employeeAccount.payload.user?.role !== "manager") {
      throw new Error(`Node account fallback cannot see Rust-created employee: ${employeeAccount.status} ${JSON.stringify(employeeAccount.payload)}`);
    }
    console.log("OK Node account fallback sees Rust-created employee");

    const patched = await requestJson(base, "/api/admin/users", {
      token: "admin",
      method: "PATCH",
      body: { email: "employee@example.test", role: "content" },
    });
    if (patched.status !== 200 || patched.payload.user?.role !== "content") {
      throw new Error(`admin users role patch through Rust failed: ${patched.status} ${JSON.stringify(patched.payload)}`);
    }
    const deleted = await requestJson(base, "/api/admin/users", {
      token: "admin",
      method: "DELETE",
      body: { email: "employee@example.test" },
    });
    if (deleted.status !== 200 || deleted.payload.user?.role !== "buyer" || deleted.payload.user?.employee !== false) {
      throw new Error(`admin users delete through Rust failed: ${deleted.status} ${JSON.stringify(deleted.payload)}`);
    }
    console.log("OK PATCH/DELETE /api/admin/users through Rust");

    const managerInvite = await requestJson(base, "/api/admin/users", { token: "manager", method: "POST", body: { email: "blocked@example.test" } });
    if (managerInvite.status !== 403 || managerInvite.payload.error !== "forbidden") throw new Error(`manager invite guard mismatch: ${managerInvite.status}`);
    const invalidInvite = await requestJson(base, "/api/admin/users", { token: "admin", method: "POST", body: { email: "bad-email" } });
    if (invalidInvite.status !== 400 || invalidInvite.payload.error !== "invalid_email") throw new Error(`invalid invite guard mismatch: ${invalidInvite.status}`);
    const invalidRole = await requestJson(base, "/api/admin/users", { token: "admin", method: "PATCH", body: { email: "buyer@example.test", role: "admin" } });
    if (invalidRole.status !== 400 || invalidRole.payload.error !== "invalid_role") throw new Error(`invalid role guard mismatch: ${invalidRole.status}`);
    const adminLocked = await requestJson(base, "/api/admin/users", { token: "admin", method: "DELETE", body: { email: "admin@example.test" } });
    if (adminLocked.status !== 403 || adminLocked.payload.error !== "admin_locked") throw new Error(`admin lock guard mismatch: ${adminLocked.status}`);
    const buyerRead = await requestJson(base, "/api/admin/users", { token: "buyer" });
    if (buyerRead.status !== 403 || buyerRead.payload.error !== "forbidden") throw new Error(`buyer admin users mismatch: ${buyerRead.status}`);
    const guestRead = await requestJson(base, "/api/admin/users");
    if (guestRead.status !== 401 || guestRead.payload.error !== "unauthorized") throw new Error(`guest admin users mismatch: ${guestRead.status}`);
    console.log("OK admin users guards through Rust");

    const health = await requestJson(base, "/api/health");
    if (health.status !== 200 || !health.payload.ok) throw new Error(`Node fallback health mismatch: ${health.status}`);
    console.log("OK unrelated API remains Node fallback");
    console.log("Rust admin users cutover smoke passed");
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
  if (routeTarget("/api/admin/users", "node", "rust") !== "rust/rust/admin/users") throw new Error("admin users should route to Rust");
  if (routeTarget("/api/admin/orders", "node", "rust") !== "node/api/admin/orders") throw new Error("admin orders should route to Node in this smoke");
  if (routeTarget("/api/auth/me", "node", "rust") !== "node/api/auth/me") throw new Error("auth/me should route to Node");
  const store = fixtureStore();
  if (!store.orders.some((order) => order.customer?.email === "other@example.test")) throw new Error("fixture should include order-only customer");
  console.log("Rust admin users cutover smoke self-test passed");
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
