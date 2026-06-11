#!/usr/bin/env node

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const DEFAULT_NODE_ENTRY = "server.mjs";
const DEFAULT_RUST_BIN = "rust-server/target/release/sobag-opt-rust";
const SESSION_COOKIE = "sobag_session";

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    nodeEntry: DEFAULT_NODE_ENTRY,
    rustBin: DEFAULT_RUST_BIN,
    timeout: 20000,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--node-entry") args.nodeEntry = argv[++index] || args.nodeEntry;
    else if (token === "--rust-bin") args.rustBin = argv[++index] || args.rustBin;
    else if (token === "--timeout") args.timeout = Number(argv[++index] || args.timeout) || args.timeout;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log("Usage: node tools/rust-auth-me-shadow-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust");
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
  const customerThread = [
    { at: "2026-06-11T00:00:00.000Z", visibility: "customer", text: "visible" },
    { at: "2026-06-11T00:01:00.000Z", visibility: "internal", text: "hidden" },
  ];
  return {
    users: {
      "buyer@example.test": { email: "buyer@example.test", name: "Buyer", role: "buyer", passwordHash: "hidden", passwordSalt: "hidden" },
      "manager@example.test": { email: "manager@example.test", name: "Manager", role: "manager", passwordHash: "hidden", passwordSalt: "hidden" },
      "content@example.test": { email: "content@example.test", name: "Content", role: "content", passwordHash: "hidden", passwordSalt: "hidden" },
      "admin@example.test": { email: "admin@example.test", name: "Admin", role: "admin", owner: true, passwordHash: "hidden", passwordSalt: "hidden" },
    },
    orders: [
      { id: "SO-1", userEmail: "buyer@example.test", total: 30000, customer: { email: "buyer@example.test" }, crmThread: customerThread },
      { id: "SO-2", userEmail: "other@example.test", total: 40000, customer: { email: "other@example.test" }, crmThread: [] },
    ],
    carts: { "buyer@example.test": { items: [{ key: "sku-1", variant: { sku: "sku-1" }, qty: 3 }] } },
    favorites: { "buyer@example.test": { items: ["p1", "p2"] } },
    savedCarts: {},
    reviews: [{ id: "REV-1", userEmail: "buyer@example.test", text: "ok", status: "approved" }],
    briefs: [],
    audit: [],
    version: 1,
  };
}

async function createFixtureStore(dir) {
  await writeStoreValue(dir, "sobag:store:v1", fixtureStore());
  const sessions = {
    buyer: "buyer@example.test",
    manager: "manager@example.test",
    content: "content@example.test",
    admin: "admin@example.test",
  };
  for (const [token, email] of Object.entries(sessions)) {
    await writeStoreValue(dir, `sobag:session:${token}`, { email, createdAt: "2026-06-11T00:00:00.000Z" }, 3600);
  }
  await writeStoreValue(dir, "sobag:session:expired", { email: "buyer@example.test", createdAt: "2026-06-11T00:00:00.000Z" }, -60);
  return { ...sessions, expired: "buyer@example.test" };
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

async function getJson(url, token = "") {
  const result = await getJsonResponse(url, token);
  if (!result.ok) throw new Error(`${url} -> HTTP ${result.status}`);
  return result.payload;
}

async function getJsonResponse(url, token = "") {
  const headers = token ? { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` } : {};
  const response = await fetch(url, { headers });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex").slice(0, 12);
}

function assertSame(label, nodePayload, rustPayload) {
  const left = JSON.stringify(stable(nodePayload));
  const right = JSON.stringify(stable(rustPayload));
  if (left !== right) {
    throw new Error(`${label} mismatch\nnode=${left}\nrust=${right}`);
  }
}

async function runSmoke(args) {
  const temp = await mkdtemp(join(tmpdir(), "sobag-rust-auth-shadow-"));
  const nodePort = 53000 + Math.floor(Math.random() * 1000);
  const rustPort = nodePort + 1000;
  const sessions = await createFixtureStore(temp);
  const env = {
    NODE_ENV: "test",
    SOBAG_STORE_PROVIDER: "file",
    SOBAG_FILE_STORE_DIR: temp,
    SOBAG_ADMIN_EMAIL: "",
    SOBAG_ADMIN_PASSWORD: "",
  };
  const node = startProcess(process.execPath, [resolve(args.nodeEntry)], { ...env, PORT: String(nodePort), HOST: "127.0.0.1" });
  const rust = startProcess(resolve(args.rustBin), [], { ...env, SOBAG_RUST_BIND: `127.0.0.1:${rustPort}` });
  try {
    await waitForJson(`http://127.0.0.1:${nodePort}/api/health`, args.timeout);
    await waitForJson(`http://127.0.0.1:${rustPort}/api/health-rust`, args.timeout);
    const checks = [["anonymous", ""], ...Object.entries(sessions)];
    for (const [label, token] of checks) {
      const nodePayload = await getJson(`http://127.0.0.1:${nodePort}/api/auth/me`, token);
      const rustPayload = await getJson(`http://127.0.0.1:${rustPort}/rust/auth/me`, token);
      assertSame(label, nodePayload, rustPayload);
      if (JSON.stringify(rustPayload).includes("passwordHash") || JSON.stringify(rustPayload).includes("passwordSalt")) {
        throw new Error(`${label} leaked password fields`);
      }
      console.log(`OK ${label} ${digest(rustPayload)}`);
    }
    for (const [label, token] of [
      ["admin orders admin", "admin"],
      ["admin orders manager", "manager"],
    ]) {
      const nodePayload = await getJson(`http://127.0.0.1:${nodePort}/api/admin/orders`, token);
      const rustPayload = await getJson(`http://127.0.0.1:${rustPort}/rust/admin/orders`, token);
      assertSame(label, nodePayload, rustPayload);
      console.log(`OK ${label} ${digest(rustPayload)}`);
    }
    for (const [label, token, status, code] of [
      ["admin orders anonymous", "", 401, "unauthorized"],
      ["admin orders buyer", "buyer", 403, "forbidden"],
      ["admin orders expired", "expired", 401, "unauthorized"],
    ]) {
      const nodeResult = await getJsonResponse(`http://127.0.0.1:${nodePort}/api/admin/orders`, token);
      const rustResult = await getJsonResponse(`http://127.0.0.1:${rustPort}/rust/admin/orders`, token);
      if (nodeResult.status !== status || rustResult.status !== status) {
        throw new Error(`${label} status mismatch: node=${nodeResult.status} rust=${rustResult.status}`);
      }
      if (nodeResult.payload.error !== code || rustResult.payload.error !== code) {
        throw new Error(`${label} error mismatch: node=${nodeResult.payload.error} rust=${rustResult.payload.error}`);
      }
      console.log(`OK ${label} ${status}`);
    }
    console.log("Rust auth/me and admin/orders shadow smoke passed");
  } catch (error) {
    const output = `${node.output()}\n${rust.output()}`.trim();
    if (output) console.error(output.slice(-4000));
    throw error;
  } finally {
    node.child.kill("SIGTERM");
    rust.child.kill("SIGTERM");
    await rm(temp, { recursive: true, force: true });
  }
}

function selfTest() {
  if (keyFileName("sobag:store:v1") !== "736f6261673a73746f72653a7631.json") throw new Error("file key mismatch");
  const store = fixtureStore();
  if (!store.users["buyer@example.test"] || store.orders.length !== 2) throw new Error("fixture mismatch");
  if (!wrap({ ok: true }, -60).expiresAt) throw new Error("expired wrapper mismatch");
  if (!store.orders[0].crmThread.some((entry) => entry.visibility === "internal")) throw new Error("admin orders fixture mismatch");
  console.log("Rust auth/me and admin/orders shadow smoke self-test passed");
}

const args = parseArgs();
try {
  if (args.selfTest) selfTest();
  else await runSmoke(args);
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
