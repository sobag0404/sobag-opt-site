import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = mkdtempSync(join(tmpdir(), "sobag-vps-write-"));

process.env.SOBAG_STORE_PROVIDER = "file";
process.env.SOBAG_FILE_STORE_DIR = tempDir;
process.env.SOBAG_ADMIN_EMAIL = "admin@sobag";
process.env.SOBAG_ADMIN_PASSWORD = "admin-pass";
process.env.SOBAG_ADMIN_NAME = "VPS Smoke Admin";

const { createSobagServer } = await import("../server.mjs");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address()));
  });
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

function cookieFrom(response) {
  const value = response.headers.get("set-cookie") || "";
  return value ? value.split(";")[0] : "";
}

async function request(baseUrl, path, options = {}) {
  const headers = {
    accept: "application/json",
    ...(options.body ? { "content-type": "application/json" } : {}),
    ...(options.cookie ? { cookie: options.cookie } : {}),
  };
  const response = await fetch(new URL(path, baseUrl), {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${path}: expected JSON, got ${text.slice(0, 160)}`);
  }
  if (!response.ok && !options.allowFailure) {
    throw new Error(`${path}: HTTP ${response.status} ${JSON.stringify(payload).slice(0, 240)}`);
  }
  return { response, payload, cookie: cookieFrom(response) };
}

const server = createSobagServer();

try {
  const address = await listen(server);
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const adminLogin = await request(baseUrl, "/api/auth/login", {
    method: "POST",
    body: { email: "admin@sobag", password: "admin-pass" },
  });
  assert(adminLogin.payload.user?.role === "admin", "bootstrap admin should login");
  assert(adminLogin.cookie, "admin login should set session cookie");

  const contentSave = await request(baseUrl, "/api/admin/content", {
    method: "PUT",
    cookie: adminLogin.cookie,
    body: { content: { brandName: "Sobag Opt VPS Smoke", catalogBackButton: "В каталог" } },
  });
  assert(contentSave.payload.count === 2, "admin content save should persist content");

  const contentRead = await request(baseUrl, "/api/content");
  assert(contentRead.payload.content?.brandName === "Sobag Opt VPS Smoke", "public content should read saved content");

  const buyerRegister = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      email: "buyer-vps-smoke@example.com",
      password: "buyer-pass",
      name: "VPS Smoke Buyer",
      phone: "+79990000000",
      personalDataConsent: true,
    },
  });
  assert(buyerRegister.payload.user?.role === "buyer", "buyer registration should create buyer");
  assert(buyerRegister.cookie, "buyer registration should set session cookie");

  const profileSave = await request(baseUrl, "/api/auth/me", {
    method: "PUT",
    cookie: buyerRegister.cookie,
    body: {
      profile: {
        phone: "+79990000001",
        company: "VPS Smoke Updated Company",
        inn: "1234567890",
        kpp: "123456789",
        city: "Moscow",
        address: "VPS Smoke Address",
      },
    },
  });
  assert(profileSave.payload.user?.company === "VPS Smoke Updated Company", "buyer profile should save on server");
  assert(profileSave.payload.user?.phone === "+7 999 000-00-01", "buyer profile phone should normalize on server");

  const query = await request(baseUrl, "/api/catalog-query?pageSize=1");
  const card = query.payload.items?.[0];
  assert(card?.baseSku, "catalog-query should return a product card");

  const detail = await request(baseUrl, `/api/catalog-detail?baseSku=${encodeURIComponent(card.baseSku)}`);
  const variant = detail.payload.product?.variants?.[0];
  assert(variant?.sku, "catalog-detail should return a generated variant");

  const orderCreate = await request(baseUrl, "/api/orders", {
    method: "POST",
    cookie: buyerRegister.cookie,
    body: {
      source: "vps-write-smoke",
      total: Number(variant.price || 100),
      customer: {
        name: "VPS Smoke Buyer",
        company: "VPS Smoke LLC",
        phone: "+79990000000",
        email: "buyer-vps-smoke@example.com",
        city: "Moscow",
      },
      items: [
        {
          key: variant.sku,
          productId: detail.payload.product.id,
          productName: detail.payload.product.name,
          qty: 1,
          variant,
        },
      ],
    },
  });
  const orderId = orderCreate.payload.order?.id;
  assert(orderId, "buyer order should be created");

  const buyerComment = await request(baseUrl, "/api/orders", {
    method: "PATCH",
    cookie: buyerRegister.cookie,
    body: { id: orderId, commentText: "Buyer VPS smoke message" },
  });
  assert(buyerComment.payload.order?.crmThread?.[0]?.text === "Buyer VPS smoke message", "buyer order comment should persist");

  const adminOrderUpdate = await request(baseUrl, "/api/admin/orders", {
    method: "PATCH",
    cookie: adminLogin.cookie,
    body: { id: orderId, status: "processing", commentText: "Internal VPS smoke note", commentVisibility: "internal" },
  });
  assert(adminOrderUpdate.payload.order?.status === "processing", "admin should update order status");
  assert(adminOrderUpdate.payload.order?.crmThread?.[0]?.visibility === "internal", "admin internal note should persist");

  const buyerMe = await request(baseUrl, "/api/auth/me", { cookie: buyerRegister.cookie });
  assert(buyerMe.payload.user?.orders?.some((order) => order.id === orderId), "buyer account should include created order");
  assert(!JSON.stringify(buyerMe.payload).includes("passwordHash"), "auth/me should not expose password hashes");
  assert(!JSON.stringify(buyerMe.payload).includes("Internal VPS smoke note"), "buyer auth/me should not expose internal notes");

  const adminOrders = await request(baseUrl, "/api/admin/orders", { cookie: adminLogin.cookie });
  assert(adminOrders.payload.orders?.some((order) => order.id === orderId && order.status === "processing"), "admin orders should include updated order");

  const guestOrderCreate = await request(baseUrl, "/api/orders", {
    method: "POST",
    body: {
      source: "guest-vps-write-smoke",
      total: Number(variant.price || 100),
      customer: {
        name: "Guest VPS Smoke",
        phone: "+79990000002",
        email: "guest-vps-smoke@example.com",
        city: "Moscow",
      },
      items: [
        {
          key: `${variant.sku}-guest`,
          productId: detail.payload.product.id,
          productName: detail.payload.product.name,
          qty: 1,
          variant,
        },
      ],
    },
  });
  const guestOrderId = guestOrderCreate.payload.order?.id;
  assert(guestOrderId, "guest order should be created");

  const adminGuestOrders = await request(baseUrl, "/api/admin/orders", { cookie: adminLogin.cookie });
  assert(adminGuestOrders.payload.orders?.some((order) => order.id === guestOrderId), "admin orders should include guest order");

  console.log(`vps-write smoke passed: ${baseUrl}`);
} finally {
  await close(server).catch(() => {});
  rmSync(tempDir, { recursive: true, force: true });
}
