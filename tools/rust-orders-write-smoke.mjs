#!/usr/bin/env node

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const DEFAULT_RUST_BIN = "rust-server/target/release/sobag-opt-rust";
const SESSION_COOKIE = "sobag_session";

function parseArgs(argv = process.argv.slice(2)) {
  const args = { rustBin: DEFAULT_RUST_BIN, timeout: 20000, selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--rust-bin") args.rustBin = argv[++index] || args.rustBin;
    else if (token === "--timeout") args.timeout = Number(argv[++index] || args.timeout) || args.timeout;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log("Usage: node tools/rust-orders-write-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust");
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
  await writeStoreValue(dir, "sobag:session:buyer", { email: "buyer@example.test", createdAt: "2026-06-11T00:00:00.000Z" }, 3600);
  await writeStoreValue(dir, "sobag:session:admin", { email: "admin@example.test", createdAt: "2026-06-11T00:00:00.000Z" }, 3600);
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

async function requestJson(url, { token = "", method = "GET", body = null } = {}) {
  const headers = token ? { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` } : {};
  if (body) headers["content-type"] = "application/json";
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, payload };
}

async function runSmoke(args) {
  const temp = await mkdtemp(join(tmpdir(), "sobag-rust-orders-write-"));
  const rustPort = 55000 + Math.floor(Math.random() * 1000);
  await createFixtureStore(temp);
  const env = {
    NODE_ENV: "test",
    SOBAG_STORE_PROVIDER: "file",
    SOBAG_FILE_STORE_DIR: temp,
    SOBAG_ADMIN_EMAIL: "",
    SOBAG_ADMIN_PASSWORD: "",
    SOBAG_RUST_BIND: `127.0.0.1:${rustPort}`,
  };
  const rust = startProcess(resolve(args.rustBin), [], env);
  try {
    await waitForJson(`http://127.0.0.1:${rustPort}/api/health-rust`, args.timeout);
    const orderBody = {
      items: [{ key: "sku-1", productName: "Pillow", qty: 0, variant: { sku: "sku-1", price: 520 } }],
      total: 30000,
      customer: { name: "Buyer" },
      source: "rust-write-smoke",
    };
    const created = await requestJson(`http://127.0.0.1:${rustPort}/rust/orders`, {
      token: "buyer",
      method: "POST",
      body: orderBody,
    });
    if (created.status !== 201) throw new Error(`order create status ${created.status}: ${JSON.stringify(created.payload)}`);
    if (created.payload.order?.userEmail !== "buyer@example.test") throw new Error("created order user mismatch");
    if (created.payload.order?.items?.[0]?.qty !== 1) throw new Error("created order qty was not sanitized");

    const belowMinimum = await requestJson(`http://127.0.0.1:${rustPort}/rust/orders`, {
      method: "POST",
      body: { ...orderBody, total: 29999 },
    });
    if (belowMinimum.status !== 400 || belowMinimum.payload.error !== "minimum_total") {
      throw new Error(`minimum check mismatch: ${belowMinimum.status} ${JSON.stringify(belowMinimum.payload)}`);
    }

    const adminOrders = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/orders`, { token: "admin" });
    if (adminOrders.status !== 200) throw new Error(`admin orders status ${adminOrders.status}`);
    if (adminOrders.payload.orders?.[0]?.source !== "rust-write-smoke") throw new Error("created order not visible to admin");
    console.log("Rust orders write smoke passed");
  } catch (error) {
    const output = rust.output().trim();
    if (output) console.error(output.slice(-4000));
    throw error;
  } finally {
    rust.child.kill("SIGTERM");
    await rm(temp, { recursive: true, force: true });
  }
}

function selfTest() {
  if (keyFileName("sobag:store:v1") !== "736f6261673a73746f72653a7631.json") throw new Error("file key mismatch");
  const store = fixtureStore();
  if (!store.users["buyer@example.test"] || store.orders.length !== 0) throw new Error("fixture mismatch");
  console.log("Rust orders write smoke self-test passed");
}

const args = parseArgs();
try {
  if (args.selfTest) selfTest();
  else await runSmoke(args);
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
