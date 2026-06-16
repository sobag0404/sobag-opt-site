import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = mkdtempSync(join(tmpdir(), "sobag-api-security-"));
process.env.SOBAG_STORE_PROVIDER = "file";
process.env.SOBAG_FILE_STORE_DIR = tempDir;
process.env.SOBAG_ADMIN_EMAIL = "admin@sobag";
process.env.SOBAG_ADMIN_PASSWORD = "admin-pass";
process.env.SOBAG_ADMIN_NAME = "Security Smoke Admin";
process.env.SOBAG_RATE_LIMIT_TEST = "1";
process.env.SOBAG_RATE_LIMIT_TEST_MAX = "3";

const { createSobagServer } = await import("../server.mjs");
const { resetRateLimits } = await import("../server-routes/_lib/api-security.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address())));
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
    ...(options.rawBody || options.body ? { "content-type": "application/json" } : {}),
    ...(options.cookie ? { cookie: options.cookie } : {}),
    ...(options.origin === false ? {} : { origin: options.origin || baseUrl.replace(/\/$/, "") }),
    ...(options.headers || {}),
  };
  const response = await fetch(new URL(path, baseUrl), {
    method: options.method || "GET",
    headers,
    body: options.rawBody || (options.body ? JSON.stringify(options.body) : undefined),
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

function discountedTotal(unitPrice, qty) {
  const subtotal = unitPrice * qty;
  const discount = subtotal >= 300000 ? 18 : subtotal >= 150000 ? 12 : subtotal >= 70000 ? 7 : subtotal >= 30000 ? 5 : 0;
  return Math.round((subtotal - (subtotal * discount) / 100) * 100) / 100;
}

async function securitySmoke() {
  const server = createSobagServer();
  try {
    const address = await listen(server);
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const invalidJson = await request(baseUrl, "/api/briefs", {
      method: "POST",
      rawBody: "{",
      allowFailure: true,
    });
    assert(invalidJson.response.status === 400 && invalidJson.payload.error === "invalid_json", "malformed JSON should return 400 invalid_json");

    const largeBody = await request(baseUrl, "/api/briefs", {
      method: "POST",
      rawBody: JSON.stringify({ comment: "x".repeat(300 * 1024) }),
      allowFailure: true,
    });
    assert(largeBody.response.status === 413 && largeBody.payload.error === "payload_too_large", "oversized JSON should return 413");

    resetRateLimits();
    for (let i = 0; i < 3; i += 1) {
      await request(baseUrl, "/api/auth/login", {
        method: "POST",
        body: { login: "missing@example.test", password: `bad-${i}` },
        allowFailure: true,
      });
    }
    const limited = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { login: "missing@example.test", password: "bad-final" },
      allowFailure: true,
    });
    assert(limited.response.status === 429 && limited.payload.error === "rate_limited", "login burst should return 429");
    resetRateLimits();

    const adminLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "admin@sobag", password: "admin-pass" },
    });
    const adminCookie = adminLogin.cookie;
    assert(adminCookie, "admin login should set cookie");

    const csrf = await request(baseUrl, "/api/admin/orders", {
      method: "PATCH",
      cookie: adminCookie,
      origin: "https://evil.example",
      body: { id: "missing", status: "processing" },
      allowFailure: true,
    });
    assert(csrf.response.status === 403 && csrf.payload.error === "csrf_origin_forbidden", "foreign-origin admin mutation should be rejected");

    const buyerRegister = await request(baseUrl, "/api/auth/register", {
      method: "POST",
      body: {
        email: "buyer-security@example.test",
        password: "buyer-pass",
        name: "Buyer Security",
        phone: "+79990010000",
        personalDataConsent: true,
      },
    });
    const buyerCookie = buyerRegister.cookie;
    const buyerAdmin = await request(baseUrl, "/api/admin/orders", { cookie: buyerCookie, allowFailure: true });
    assert(buyerAdmin.response.status === 403, "buyer must not access admin orders");

    await request(baseUrl, "/api/admin/users", {
      method: "POST",
      cookie: adminCookie,
      body: { email: "manager-security@example.test", name: "Manager Security", phone: "+79990010001" },
    });
    const managerLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "manager-security@example.test", password: "admin-pass" },
      allowFailure: true,
    });
    assert(managerLogin.response.status === 401, "invited manager without password must not login with admin password");

    const managerCookie = await (async () => {
      await request(baseUrl, "/api/auth/register", {
        method: "POST",
        body: {
          email: "manager-login@example.test",
          password: "manager-pass",
          name: "Manager Login",
          phone: "+79990010002",
          personalDataConsent: true,
        },
      });
      await request(baseUrl, "/api/admin/users", {
        method: "PATCH",
        cookie: adminCookie,
        body: { email: "manager-login@example.test", role: "manager" },
      });
      return (
        await request(baseUrl, "/api/auth/login", {
          method: "POST",
          body: { email: "manager-login@example.test", password: "manager-pass" },
        })
      ).cookie;
    })();
    const managerOrders = await request(baseUrl, "/api/admin/orders", { cookie: managerCookie });
    assert(managerOrders.response.status === 200, "manager should read admin orders");
    const managerContent = await request(baseUrl, "/api/admin/content", { cookie: managerCookie, allowFailure: true });
    assert(managerContent.response.status === 403, "manager should not read admin content");

    const query = await request(baseUrl, "/api/catalog-query?pageSize=1");
    const card = query.payload.items?.[0];
    const detail = await request(baseUrl, `/api/catalog-detail?baseSku=${encodeURIComponent(card.baseSku)}`);
    const variant = detail.payload.product?.variants?.[0];
    const unitPrice = Number(variant.price);
    const qty = Math.ceil(32000 / unitPrice);
    const total = discountedTotal(unitPrice, qty);

    const tampered = await request(baseUrl, "/api/orders", {
      method: "POST",
      body: {
        total: 1,
        customer: { name: "Tamper", phone: "+79990010003", email: "tamper@example.test" },
        items: [{ productId: detail.payload.product.id, qty, variant: { ...variant, price: 1 } }],
      },
      allowFailure: true,
    });
    assert(tampered.response.status === 409 && tampered.payload.error === "ORDER_TOTAL_MISMATCH", "tampered order total should be rejected");

    const invalidSku = await request(baseUrl, "/api/orders", {
      method: "POST",
      body: {
        total: 30000,
        customer: { name: "Invalid", phone: "+79990010004", email: "invalid@example.test" },
        items: [{ qty: 200, variant: { sku: "NO_SUCH_SKU", price: 1 } }],
      },
      allowFailure: true,
    });
    assert(invalidSku.response.status === 400 && invalidSku.payload.error === "invalid_sku", "invalid SKU should be rejected");

    const valid = await request(baseUrl, "/api/orders", {
      method: "POST",
      body: {
        total,
        customer: { name: "Valid", phone: "+79990010005", email: "valid@example.test" },
        items: [{ productId: detail.payload.product.id, qty, variant: { ...variant, price: 1 } }],
      },
    });
    assert(valid.payload.order?.total === total, "valid order should store server-calculated total");
    assert(valid.payload.order?.items?.[0]?.variant?.price === unitPrice, "valid order should store trusted unit price");
    resetRateLimits();

    const reviewBody = {
      review: {
        productId: detail.payload.product.id,
        baseSku: detail.payload.product.baseSku,
        productName: detail.payload.product.name,
        rating: 5,
        text: "Verified buyer review",
      },
    };
    const noOrderReview = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      cookie: buyerCookie,
      body: reviewBody,
      allowFailure: true,
    });
    assert(noOrderReview.response.status === 403 && noOrderReview.payload.error === "REVIEW_ORDER_REQUIRED", "review without eligible order should be rejected");

    const buyerOrder = await request(baseUrl, "/api/orders", {
      method: "POST",
      cookie: buyerCookie,
      body: {
        total,
        customer: { name: "Buyer Security", phone: "+79990010000", email: "buyer-security@example.test" },
        items: [{ productId: detail.payload.product.id, qty, variant }],
      },
    });
    await request(baseUrl, "/api/admin/orders", {
      method: "PATCH",
      cookie: adminCookie,
      body: { id: buyerOrder.payload.order.id, status: "done" },
    });
    const allowedReview = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      cookie: buyerCookie,
      body: reviewBody,
    });
    assert(allowedReview.payload.user?.reviews?.some((review) => review.text === "Verified buyer review"), "eligible completed order should allow review");
    const duplicateReview = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      cookie: buyerCookie,
      body: reviewBody,
      allowFailure: true,
    });
    assert(duplicateReview.response.status === 409 && duplicateReview.payload.error === "REVIEW_ALREADY_EXISTS", "duplicate review should be rejected");

    const pendingBuyer = await request(baseUrl, "/api/auth/register", {
      method: "POST",
      body: {
        email: "pending-review@example.test",
        password: "buyer-pass",
        name: "Pending Buyer",
        phone: "+79990010006",
        personalDataConsent: true,
      },
    });
    await request(baseUrl, "/api/orders", {
      method: "POST",
      cookie: pendingBuyer.cookie,
      body: {
        total,
        customer: { name: "Pending Buyer", phone: "+79990010006", email: "pending-review@example.test" },
        items: [{ productId: detail.payload.product.id, qty, variant }],
      },
    });
    resetRateLimits();
    const pendingReview = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      cookie: pendingBuyer.cookie,
      body: reviewBody,
      allowFailure: true,
    });
    assert(
      pendingReview.response.status === 403 && pendingReview.payload.error === "REVIEW_ORDER_REQUIRED",
      `pending order should not allow review, got ${pendingReview.response.status} ${JSON.stringify(pendingReview.payload)}`
    );

    console.log(`api-security smoke passed: ${baseUrl}`);
  } finally {
    await close(server).catch(() => {});
    rmSync(tempDir, { recursive: true, force: true });
  }
}

await securitySmoke();
