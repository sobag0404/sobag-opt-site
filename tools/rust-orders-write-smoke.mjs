#!/usr/bin/env node

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const DEFAULT_RUST_BIN = "rust-server/target/release/sobag-opt-rust";
const DEFAULT_NODE_ENTRY = "server.mjs";
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

function assertSame(label, actual, expected) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${label} mismatch\nactual: ${actualJson}\nexpected: ${expectedJson}`);
  }
}

function discountedTotal(unitPrice, qty) {
  const subtotal = unitPrice * qty;
  const discount = subtotal >= 300000 ? 18 : subtotal >= 150000 ? 12 : subtotal >= 70000 ? 7 : subtotal >= 30000 ? 5 : 0;
  return Math.round((subtotal - (subtotal * discount) / 100) * 100) / 100;
}

async function loadOrderFixture(baseUrl) {
  const query = await requestJson(`${baseUrl}/api/catalog-query?pageSize=1`);
  const card = query.payload.items?.[0];
  if (!card?.baseSku) throw new Error("catalog-query did not return a product card");
  const detail = await requestJson(`${baseUrl}/api/catalog-detail?baseSku=${encodeURIComponent(card.baseSku)}`);
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
    source: "rust-write-smoke",
  };
}

function orderCreateSlice(response) {
  const order = response.payload.order || {};
  return {
    status: response.status,
    error: response.payload.error,
    order: response.status === 201 ? {
      status: order.status,
      userEmail: order.userEmail,
      customer: customerSlice(order.customer),
      items: (order.items || []).map(orderItemSlice),
      total: order.total,
      promo: order.promo,
      source: order.source,
    } : null,
  };
}

function customerSlice(customer = {}) {
  return {
    name: customer.name || "",
    company: customer.company || "",
    inn: customer.inn || "",
    kpp: customer.kpp || "",
    phone: customer.phone || "",
    email: customer.email || "",
    city: customer.city || "",
    address: customer.address || "",
    legalAddress: customer.legalAddress || "",
    delivery: customer.delivery || "",
    packaging: customer.packaging || "",
    layoutFileName: customer.layoutFileName || "",
    comment: customer.comment || "",
  };
}

function orderItemSlice(item = {}) {
  const variant = item.variant || {};
  return {
    key: item.key || "",
    productId: item.productId || "",
    productName: item.productName || "",
    productImage: item.productImage || "",
    qty: item.qty,
    variant: {
      sku: variant.sku || "",
      name: variant.name || "",
      type: variant.type || "",
      size: variant.size || "",
      material: variant.material || "",
      price: variant.price,
    },
  };
}

function accountAfterOrderSlice(response) {
  const user = response.payload.user || {};
  const lastCustomer = user.lastCustomer || {};
  return {
    status: response.status,
    user: {
      email: user.email,
      company: user.company || "",
      inn: user.inn || "",
      phone: user.phone || "",
      city: user.city || "",
      address: user.address || "",
      addresses: user.addresses || [],
      layoutFiles: user.layoutFiles || [],
      orderComments: user.orderComments || [],
      lastCustomer: user.lastCustomer ? {
        name: lastCustomer.name,
        company: lastCustomer.company,
        inn: lastCustomer.inn,
        phone: lastCustomer.phone,
        email: lastCustomer.email,
        city: lastCustomer.city,
        address: lastCustomer.address,
        layoutFileName: lastCustomer.layoutFileName,
        comment: lastCustomer.comment,
      } : null,
    },
    orders: (response.payload.orders || []).map((order) => ({
      status: order.status,
      userEmail: order.userEmail,
      source: order.source,
      total: order.total,
      customer: customerSlice(order.customer),
      items: (order.items || []).map(orderItemSlice),
    })),
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

function briefCreateSlice(response) {
  const brief = response.payload.brief || {};
  const order = response.payload.order || {};
  return {
    status: response.status,
    error: response.payload.error,
    brief: response.status === 201 ? {
      type: brief.type,
      source: brief.source,
      status: brief.status,
      userEmail: brief.userEmail,
      product: brief.product,
      quantity: brief.quantity,
      name: brief.name,
      contact: brief.contact,
      phone: brief.phone,
      email: brief.email,
      layoutReference: brief.layoutReference,
      comment: brief.comment,
    } : null,
    order: response.status === 201 ? {
      status: order.status,
      userEmail: order.userEmail,
      requestType: order.requestType,
      source: order.source,
      customer: customerSlice(order.customer),
      items: (order.items || []).map(orderItemSlice),
      total: order.total,
      promo: order.promo,
      customBrief: {
        type: order.customBrief?.type,
        source: order.customBrief?.source,
        status: order.customBrief?.status,
        userEmail: order.customBrief?.userEmail,
        product: order.customBrief?.product,
        quantity: order.customBrief?.quantity,
        name: order.customBrief?.name,
        contact: order.customBrief?.contact,
        phone: order.customBrief?.phone,
        email: order.customBrief?.email,
        layoutReference: order.customBrief?.layoutReference,
        comment: order.customBrief?.comment,
      },
    } : null,
  };
}

async function runSmoke(args) {
  const temp = await mkdtemp(join(tmpdir(), "sobag-rust-orders-write-"));
  const nodePort = 54000 + Math.floor(Math.random() * 1000);
  const rustPort = 55000 + Math.floor(Math.random() * 1000);
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
  try {
    await waitForJson(`http://127.0.0.1:${nodePort}/api/health`, args.timeout);
    await waitForJson(`http://127.0.0.1:${rustPort}/api/health-rust`, args.timeout);
    const orderFixture = await loadOrderFixture(`http://127.0.0.1:${nodePort}`);
    const nodeCreated = await requestJson(`http://127.0.0.1:${nodePort}/api/orders`, {
      token: "buyer",
      method: "POST",
      body: orderBody(orderFixture),
    });
    const nodeAccountAfterOrder = await requestJson(`http://127.0.0.1:${nodePort}/api/auth/me`, { token: "buyer" });
    await createFixtureStore(temp);
    const created = await requestJson(`http://127.0.0.1:${rustPort}/rust/orders`, {
      token: "buyer",
      method: "POST",
      body: orderBody(orderFixture),
    });
    const rustAccountAfterOrder = await requestJson(`http://127.0.0.1:${rustPort}/rust/auth/me`, { token: "buyer" });
    assertSame("order create", orderCreateSlice(created), orderCreateSlice(nodeCreated));
    assertSame("account after order create", accountAfterOrderSlice(rustAccountAfterOrder), accountAfterOrderSlice(nodeAccountAfterOrder));
    if (created.status !== 201) throw new Error(`order create status ${created.status}: ${JSON.stringify(created.payload)}`);
    if (created.payload.order?.userEmail !== "buyer@example.test") throw new Error("created order user mismatch");
    if (created.payload.order?.items?.[0]?.qty !== orderFixture.qty) {
      throw new Error(`created order qty mismatch: ${created.payload.order?.items?.[0]?.qty} !== ${orderFixture.qty}`);
    }

    const patched = await requestJson(`http://127.0.0.1:${rustPort}/rust/orders`, {
      token: "buyer",
      method: "PATCH",
      body: { id: created.payload.order.id, commentText: "Need invoice" },
    });
    if (patched.status !== 200) throw new Error(`buyer order patch status ${patched.status}: ${JSON.stringify(patched.payload)}`);
    if (patched.payload.order?.crmThread?.[0]?.text !== "Need invoice") throw new Error("buyer message not saved");
    if (patched.payload.order?.crmThread?.some((entry) => entry.visibility === "internal")) {
      throw new Error("buyer order patch leaked internal CRM entries");
    }

    const emptyPatch = await requestJson(`http://127.0.0.1:${rustPort}/rust/orders`, {
      token: "buyer",
      method: "PATCH",
      body: { id: created.payload.order.id, commentText: " " },
    });
    if (emptyPatch.status !== 400 || emptyPatch.payload.error !== "empty_comment") {
      throw new Error(`buyer empty patch mismatch: ${emptyPatch.status} ${JSON.stringify(emptyPatch.payload)}`);
    }

    const guestPatch = await requestJson(`http://127.0.0.1:${rustPort}/rust/orders`, {
      method: "PATCH",
      body: { id: created.payload.order.id, commentText: "Guest message" },
    });
    if (guestPatch.status !== 401) throw new Error(`guest patch status ${guestPatch.status}`);

    const belowMinimumFixture = {
      ...orderFixture,
      qty: 1,
      total: discountedTotal(Number(orderFixture.variant.price || 0), 1),
    };
    const belowMinimum = await requestJson(`http://127.0.0.1:${rustPort}/rust/orders`, {
      method: "POST",
      body: orderBody(belowMinimumFixture),
    });
    if (belowMinimum.status !== 400 || belowMinimum.payload.error !== "minimum_total") {
      throw new Error(`minimum check mismatch: ${belowMinimum.status} ${JSON.stringify(belowMinimum.payload)}`);
    }

    const adminOrders = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/orders`, { token: "admin" });
    if (adminOrders.status !== 200) throw new Error(`admin orders status ${adminOrders.status}`);
    if (adminOrders.payload.orders?.[0]?.source !== "rust-write-smoke") throw new Error("created order not visible to admin");

    await createFixtureStore(temp);
    const nodeBrief = await requestJson(`http://127.0.0.1:${nodePort}/api/briefs`, {
      token: "buyer",
      method: "POST",
      body: briefBody(),
    });
    await createFixtureStore(temp);
    const rustBriefParity = await requestJson(`http://127.0.0.1:${rustPort}/rust/briefs`, {
      token: "buyer",
      method: "POST",
      body: briefBody(),
    });
    assertSame("brief create", briefCreateSlice(rustBriefParity), briefCreateSlice(nodeBrief));

    await createFixtureStore(temp);
    const brief = await requestJson(`http://127.0.0.1:${rustPort}/rust/briefs`, {
      token: "buyer",
      method: "POST",
      body: {
        product: "Подушка",
        quantity: 100,
        phone: "89689593254",
        comment: "Need sample",
      },
    });
    if (brief.status !== 201) throw new Error(`brief create status ${brief.status}: ${JSON.stringify(brief.payload)}`);
    if (brief.payload.brief?.type !== "custom_print") throw new Error("brief type mismatch");
    if (brief.payload.order?.source !== "custom_brief") throw new Error("brief order mirror mismatch");

    const invalidBrief = await requestJson(`http://127.0.0.1:${rustPort}/rust/briefs`, {
      method: "POST",
      body: { product: "Подушка", quantity: 100, email: "bad-email" },
    });
    if (invalidBrief.status !== 400 || invalidBrief.payload.error !== "invalid_email") {
      throw new Error(`brief validation mismatch: ${invalidBrief.status} ${JSON.stringify(invalidBrief.payload)}`);
    }

    const adminBriefOrders = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/orders`, { token: "admin" });
    if (!adminBriefOrders.payload.orders?.some((order) => order.source === "custom_brief" && order.customBrief?.product === "Подушка")) {
      throw new Error("custom brief not visible to admin orders");
    }
    console.log("Rust orders/briefs write smoke passed");
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
  if (!store.users["buyer@example.test"] || store.orders.length !== 0) throw new Error("fixture mismatch");
  console.log("Rust orders/briefs write smoke self-test passed");
}

const args = parseArgs();
try {
  if (args.selfTest) selfTest();
  else await runSmoke(args);
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
