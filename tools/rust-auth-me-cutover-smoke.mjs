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
      console.log("Usage: node tools/rust-auth-me-cutover-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust");
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

async function createFixtureStore(dir) {
  await writeStoreValue(dir, "sobag:store:v1", {
    users: {},
    orders: [],
    carts: {},
    favorites: {},
    savedCarts: {},
    reviews: [],
    briefs: [],
    audit: [],
    version: 1,
  });
  await writeStoreValue(dir, "sobag:content:v1", { content: {}, version: 1 });
}

function routeTarget(pathname, nodeBase, rustBase) {
  if (pathname === "/api/auth/me") return `${rustBase}/rust/auth/me`;
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

async function requestJson(base, path, { method = "GET", body = null, cookie = "" } = {}) {
  const headers = cookie ? { cookie } : {};
  if (body) headers["content-type"] = "application/json";
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    ok: response.ok,
    cookie: response.headers.get("set-cookie") || "",
    payload: await response.json().catch(() => ({})),
  };
}

function sessionCookie(setCookie) {
  const match = String(setCookie || "").match(/sobag_session=([^;]+)/);
  return match ? `${SESSION_COOKIE}=${match[1]}` : "";
}

function assertNoPrivateFields(label, payload) {
  const text = JSON.stringify(payload);
  if (text.includes("passwordHash") || text.includes("passwordSalt")) {
    throw new Error(`${label} leaked password fields`);
  }
}

function accountStateBody() {
  return {
    profile: {
      name: "Cutover Buyer",
      phone: "89001234567",
      company: "Cutover LLC",
      inn: "1234567890",
      city: "Kursk",
      address: "Cutover street",
    },
    cartItems: [["line-1", { key: "line-1", productName: "Pillow", qty: 3, variant: { sku: "sku-1", price: 520 } }]],
    favoriteItems: ["p1", "p1", "p2"],
    savedCarts: [{
      id: "SC-CUTOVER",
      title: "Cutover quote",
      items: [["line-1", { key: "line-1", qty: 2, variant: { sku: "sku-1", price: 520 } }]],
      qty: 2,
      subtotal: 1040,
      total: 1040,
    }],
  };
}

async function runSmoke(args) {
  const temp = await mkdtemp(join(tmpdir(), "sobag-rust-auth-cutover-"));
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

    const register = await requestJson(base, "/api/auth/register", {
      method: "POST",
      body: {
        name: "Cutover Buyer",
        email: "cutover@example.test",
        phone: "+7 968 959-32-54",
        password: "TempPass123",
        personalDataConsent: true,
      },
    });
    const cookie = sessionCookie(register.cookie);
    if (register.status !== 201 || !cookie) throw new Error(`register through Node fallback failed: ${register.status}`);
    assertNoPrivateFields("register", register.payload);
    console.log("OK register through Node fallback");

    const me = await requestJson(base, "/api/auth/me", { cookie });
    if (me.status !== 200 || me.payload.user?.email !== "cutover@example.test") {
      throw new Error(`Rust auth/me read mismatch: ${me.status} ${JSON.stringify(me.payload)}`);
    }
    assertNoPrivateFields("rust auth/me get", me.payload);
    console.log("OK GET /api/auth/me through Rust");

    const update = await requestJson(base, "/api/auth/me", { method: "PUT", cookie, body: accountStateBody() });
    if (
      update.status !== 200 ||
      update.payload.user?.name !== "Cutover Buyer" ||
      update.payload.user?.company !== "Cutover LLC" ||
      update.payload.cartItems?.[0]?.[1]?.qty !== 3 ||
      update.payload.favoriteItems?.length !== 2 ||
      update.payload.savedCarts?.[0]?.id !== "SC-CUTOVER"
    ) {
      throw new Error(`Rust auth/me write mismatch: ${update.status} ${JSON.stringify(update.payload)}`);
    }
    assertNoPrivateFields("rust auth/me put", update.payload);
    console.log("OK PUT /api/auth/me through Rust");

    const nodeRead = await requestJson(`http://127.0.0.1:${nodePort}`, "/api/auth/me", { cookie });
    if (nodeRead.status !== 200 || nodeRead.payload.user?.company !== "Cutover LLC" || nodeRead.payload.favoriteItems?.length !== 2) {
      throw new Error(`Node fallback cannot read Rust auth/me write: ${nodeRead.status} ${JSON.stringify(nodeRead.payload)}`);
    }
    console.log("OK Node fallback reads Rust-auth state");

    const methodGuard = await requestJson(base, "/api/auth/me", { method: "POST", cookie });
    if (methodGuard.status !== 405) throw new Error(`POST /api/auth/me should stay 405, got ${methodGuard.status}`);
    console.log("OK unsupported method guard");

    const health = await requestJson(base, "/api/health");
    if (health.status !== 200 || !health.payload.ok) throw new Error(`Node fallback health mismatch: ${health.status}`);
    console.log("OK non-auth API remains Node fallback");
    console.log("Rust auth/me cutover smoke passed");
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
  if (routeTarget("/api/auth/me", "node", "rust") !== "rust/rust/auth/me") throw new Error("auth/me should route to Rust");
  if (routeTarget("/api/auth/login", "node", "rust") !== "node/api/auth/login") throw new Error("auth/login should route to Node");
  console.log("Rust auth/me cutover smoke self-test passed");
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
