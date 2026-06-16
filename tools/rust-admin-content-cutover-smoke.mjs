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
      console.log("Usage: node tools/rust-admin-content-cutover-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust");
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
      "buyer@example.test": { email: "buyer@example.test", name: "Buyer", role: "buyer" },
      "content@example.test": { email: "content@example.test", name: "Content", role: "content" },
      "admin@example.test": { email: "admin@example.test", name: "Admin", role: "admin", owner: true },
    },
    orders: [],
    carts: {},
    favorites: {},
    savedCarts: {},
    reviews: [
      {
        id: "REV-1",
        productId: "p1",
        baseSku: "opt_1",
        rating: 5,
        text: "Visible review",
        status: "approved",
        userEmail: "buyer@example.test",
        createdAt: "2026-06-12T09:00:00.000Z",
      },
      {
        id: "REV-2",
        productId: "p2",
        baseSku: "opt_2",
        rating: 4,
        text: "Second review",
        status: "pending",
        userEmail: "buyer@example.test",
        createdAt: "2026-06-12T08:00:00.000Z",
      },
    ],
    briefs: [],
    audit: [],
    version: 1,
  };
}

async function createFixtureStore(dir) {
  await writeStoreValue(dir, "sobag:store:v1", fixtureStore());
  await writeStoreValue(dir, "sobag:content:v1", { content: { brandName: "Sobag Initial" }, updatedAt: "2026-06-12T00:00:00.000Z", version: 1 });
  await writeStoreValue(dir, "sobag:session:buyer", { email: "buyer@example.test", createdAt: "2026-06-12T00:00:00.000Z" }, 3600);
  await writeStoreValue(dir, "sobag:session:content", { email: "content@example.test", createdAt: "2026-06-12T00:00:00.000Z" }, 3600);
  await writeStoreValue(dir, "sobag:session:admin", { email: "admin@example.test", createdAt: "2026-06-12T00:00:00.000Z" }, 3600);
}

function routeTarget(pathname, nodeBase, rustBase) {
  if (pathname === "/api/admin/content") return `${rustBase}/rust/admin/content`;
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
  const temp = await mkdtemp(join(tmpdir(), "sobag-rust-admin-content-cutover-"));
  const nodePort = 61000 + Math.floor(Math.random() * 1000);
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

    const readContent = await requestJson(base, "/api/admin/content", { token: "content" });
    if (readContent.status !== 200 || readContent.payload.content?.brandName !== "Sobag Initial") {
      throw new Error(`admin content read through Rust failed: ${readContent.status} ${JSON.stringify(readContent.payload)}`);
    }
    console.log("OK GET /api/admin/content through Rust");

    const saved = await requestJson(base, "/api/admin/content", {
      token: "content",
      method: "PUT",
      body: { content: { brandName: "Sobag Cutover", footerPhone: "+7 900 000-00-00" } },
    });
    if (saved.status !== 200 || saved.payload.count !== 2 || !saved.payload.updatedAt) {
      throw new Error(`admin content update through Rust failed: ${saved.status} ${JSON.stringify(saved.payload)}`);
    }
    const publicContent = await requestJson(base, "/api/content");
    if (publicContent.status !== 200 || publicContent.payload.content?.brandName !== "Sobag Cutover") {
      throw new Error(`Node content fallback cannot see Rust content update: ${publicContent.status} ${JSON.stringify(publicContent.payload)}`);
    }
    console.log("OK Node content fallback sees Rust content update");

    const reviews = await requestJson(base, "/api/admin/content?reviews=1", { token: "admin" });
    if (reviews.status !== 200 || reviews.payload.reviews?.[0]?.id !== "REV-1" || reviews.payload.reviews?.length !== 2) {
      throw new Error(`admin content reviews through Rust failed: ${reviews.status} ${JSON.stringify(reviews.payload)}`);
    }
    const hidden = await requestJson(base, "/api/admin/content", { token: "content", method: "PATCH", body: { reviewId: "REV-1", status: "hidden" } });
    if (hidden.status !== 200 || hidden.payload.review?.status !== "hidden" || hidden.payload.review?.moderatedBy !== "content@example.test") {
      throw new Error(`admin review patch through Rust failed: ${hidden.status} ${JSON.stringify(hidden.payload)}`);
    }
    const deleted = await requestJson(base, "/api/admin/content", { token: "admin", method: "PATCH", body: { reviewId: "REV-2", delete: true } });
    if (deleted.status !== 200 || deleted.payload.deleted !== true || deleted.payload.review !== null) {
      throw new Error(`admin review delete through Rust failed: ${deleted.status} ${JSON.stringify(deleted.payload)}`);
    }
    const afterReviews = await requestJson(base, "/api/admin/content?reviews=1", { token: "admin" });
    if (afterReviews.status !== 200 || afterReviews.payload.reviews?.length !== 1 || afterReviews.payload.reviews?.[0]?.status !== "hidden") {
      throw new Error(`admin reviews after Rust patch mismatch: ${afterReviews.status} ${JSON.stringify(afterReviews.payload)}`);
    }
    console.log("OK PATCH /api/admin/content reviews through Rust");

    const invalidContent = await requestJson(base, "/api/admin/content", { token: "content", method: "PUT", body: { content: [] } });
    if (invalidContent.status !== 400 || invalidContent.payload.error !== "invalid_content") throw new Error(`invalid content guard mismatch: ${invalidContent.status}`);
    const invalidReview = await requestJson(base, "/api/admin/content", { token: "content", method: "PATCH", body: { reviewId: "REV-1", status: "deleted" } });
    if (invalidReview.status !== 400 || invalidReview.payload.error !== "invalid_status") throw new Error(`invalid review status guard mismatch: ${invalidReview.status}`);
    const buyerRead = await requestJson(base, "/api/admin/content", { token: "buyer" });
    if (buyerRead.status !== 403 || buyerRead.payload.error !== "forbidden") throw new Error(`buyer admin content mismatch: ${buyerRead.status}`);
    const guestRead = await requestJson(base, "/api/admin/content");
    if (guestRead.status !== 401 || guestRead.payload.error !== "unauthorized") throw new Error(`guest admin content mismatch: ${guestRead.status}`);
    console.log("OK admin content guards through Rust");

    const health = await requestJson(base, "/api/health");
    if (health.status !== 200 || !health.payload.ok) throw new Error(`Node fallback health mismatch: ${health.status}`);
    console.log("OK unrelated API remains Node fallback");
    console.log("Rust admin content cutover smoke passed");
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
  if (routeTarget("/api/admin/content", "node", "rust") !== "rust/rust/admin/content") throw new Error("admin content should route to Rust");
  if (routeTarget("/api/admin/users", "node", "rust") !== "node/api/admin/users") throw new Error("admin users should route to Node in this smoke");
  if (routeTarget("/api/content", "node", "rust") !== "node/api/content") throw new Error("public content should route to Node fallback");
  const store = fixtureStore();
  if (!store.reviews.some((review) => review.id === "REV-1")) throw new Error("fixture should include reviews");
  console.log("Rust admin content cutover smoke self-test passed");
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
