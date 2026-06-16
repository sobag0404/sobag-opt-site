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
      console.log("Usage: node tools/rust-auth-write-cutover-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust");
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
  if (pathname === "/api/auth/login") return `${rustBase}/rust/auth/login`;
  if (pathname === "/api/auth/register") return `${rustBase}/rust/auth/register`;
  if (pathname === "/api/auth/logout") return `${rustBase}/rust/auth/logout`;
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
  if (text.includes("passwordHash") || text.includes("passwordSalt")) throw new Error(`${label} leaked password fields`);
}

async function runSmoke(args) {
  const temp = await mkdtemp(join(tmpdir(), "sobag-rust-auth-write-cutover-"));
  const nodePort = 46000 + Math.floor(Math.random() * 1000);
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
      body: { name: "Auth Writer", email: "writer@example.test", phone: "+7 900 111-22-33", password: "TempPass123", personalDataConsent: true },
    });
    const registerCookie = sessionCookie(register.cookie);
    if (register.status !== 201 || register.payload.user?.email !== "writer@example.test" || !registerCookie) {
      throw new Error(`register through Rust failed: ${register.status} ${JSON.stringify(register.payload)}`);
    }
    if (!/HttpOnly/i.test(register.cookie) || !/SameSite=Lax/i.test(register.cookie)) {
      throw new Error("register cookie is missing HttpOnly/SameSite=Lax attributes");
    }
    assertNoPrivateFields("register", register.payload);
    console.log("OK POST /api/auth/register through Rust");

    const meAfterRegister = await requestJson(base, "/api/auth/me", { cookie: registerCookie });
    if (meAfterRegister.status !== 200 || meAfterRegister.payload.user?.email !== "writer@example.test") {
      throw new Error(`auth/me after Rust register mismatch: ${meAfterRegister.status} ${JSON.stringify(meAfterRegister.payload)}`);
    }
    console.log("OK Rust auth/me sees Rust registration session");

    const logout = await requestJson(base, "/api/auth/logout", { method: "POST", cookie: registerCookie });
    if (logout.status !== 200 || logout.payload.ok !== true || !logout.cookie.includes("sobag_session=")) {
      throw new Error(`logout through Rust failed: ${logout.status} ${JSON.stringify(logout.payload)}`);
    }
    console.log("OK POST /api/auth/logout through Rust");

    const loggedOut = await requestJson(base, "/api/auth/me", { cookie: registerCookie });
    if (loggedOut.status !== 200 || loggedOut.payload.user !== null) {
      throw new Error(`auth/me after Rust logout mismatch: ${loggedOut.status} ${JSON.stringify(loggedOut.payload)}`);
    }
    console.log("OK Rust logout clears session");

    const login = await requestJson(base, "/api/auth/login", { method: "POST", body: { login: "writer@example.test", password: "TempPass123" } });
    const loginCookie = sessionCookie(login.cookie);
    if (login.status !== 200 || login.payload.user?.email !== "writer@example.test" || !loginCookie) {
      throw new Error(`login through Rust failed: ${login.status} ${JSON.stringify(login.payload)}`);
    }
    assertNoPrivateFields("login", login.payload);
    console.log("OK POST /api/auth/login through Rust");

    const phoneLogin = await requestJson(base, "/api/auth/login", { method: "POST", body: { login: "+7 900 111-22-33", password: "TempPass123" } });
    if (phoneLogin.status !== 200 || phoneLogin.payload.user?.email !== "writer@example.test" || !sessionCookie(phoneLogin.cookie)) {
      throw new Error(`phone login through Rust failed: ${phoneLogin.status} ${JSON.stringify(phoneLogin.payload)}`);
    }
    console.log("OK phone login through Rust");

    const nodeRead = await requestJson(`http://127.0.0.1:${nodePort}`, "/api/auth/me", { cookie: loginCookie });
    if (nodeRead.status !== 200 || nodeRead.payload.user?.email !== "writer@example.test") {
      throw new Error(`Node fallback cannot read Rust login session: ${nodeRead.status} ${JSON.stringify(nodeRead.payload)}`);
    }
    console.log("OK Node fallback reads Rust auth session");

    const duplicate = await requestJson(base, "/api/auth/register", {
      method: "POST",
      body: { name: "Auth Writer", email: "writer@example.test", phone: "+7 900 111-22-33", password: "TempPass123", personalDataConsent: true },
    });
    if (duplicate.status !== 409 || duplicate.payload.error !== "email_exists") throw new Error(`duplicate register guard mismatch: ${duplicate.status}`);
    const invalidLogin = await requestJson(base, "/api/auth/login", { method: "POST", body: { login: "writer@example.test", password: "badpass" } });
    if (invalidLogin.status !== 401 || invalidLogin.payload.error !== "invalid_credentials") throw new Error(`invalid login guard mismatch: ${invalidLogin.status}`);
    const missingConsent = await requestJson(base, "/api/auth/register", {
      method: "POST",
      body: { name: "No Consent", email: "noconsent@example.test", phone: "+7 900 111-22-34", password: "TempPass123" },
    });
    if (missingConsent.status !== 400 || missingConsent.payload.error !== "missing_consent") {
      throw new Error(`missing consent guard mismatch: ${missingConsent.status}`);
    }
    console.log("OK auth write guards through Rust");

    const health = await requestJson(base, "/api/health");
    if (health.status !== 200 || !health.payload.ok) throw new Error(`Node fallback health mismatch: ${health.status}`);
    console.log("OK unrelated API remains Node fallback");
    console.log("Rust auth write cutover smoke passed");
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
  if (routeTarget("/api/auth/login", "node", "rust") !== "rust/rust/auth/login") throw new Error("auth/login should route to Rust");
  if (routeTarget("/api/auth/register", "node", "rust") !== "rust/rust/auth/register") throw new Error("auth/register should route to Rust");
  if (routeTarget("/api/auth/logout", "node", "rust") !== "rust/rust/auth/logout") throw new Error("auth/logout should route to Rust");
  if (routeTarget("/api/orders", "node", "rust") !== "node/api/orders") throw new Error("orders should route to Node in this smoke");
  console.log("Rust auth write cutover smoke self-test passed");
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
