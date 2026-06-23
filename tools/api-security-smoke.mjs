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
const { getStore } = await import("../server-routes/_lib/store.js");

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
    const anonymousCartWrite = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      body: { cartItems: [["anonymous-line", { qty: 1, variant: { sku: "anonymous-cart-sku", price: 10 } }]] },
      allowFailure: true,
    });
    assert(anonymousCartWrite.response.status === 401, "anonymous account/cart write should be rejected");
    const anonymousOrderPatch = await request(baseUrl, "/api/orders", {
      method: "PATCH",
      body: { id: "SO-ANON", commentText: "anonymous update" },
      allowFailure: true,
    });
    assert(anonymousOrderPatch.response.status === 401, "anonymous buyer order patch should be rejected");
    const malformedOrderPatch = await request(baseUrl, "/api/orders", {
      method: "PATCH",
      cookie: buyerCookie,
      body: { id: "../SO-1", commentText: "Bad order id" },
      allowFailure: true,
    });
    assert(
      malformedOrderPatch.response.status === 400 && malformedOrderPatch.payload.error === "invalid_order_id",
      "malformed buyer order id should return 400"
    );
    resetRateLimits();
    const cartMerge = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      cookie: buyerCookie,
      body: {
        cartItems: [
          ["cart-line-a", { qty: 2, variant: { sku: "cart-merge-sku", price: 10 } }],
          ["../../unsafe", { qty: 3, variant: { sku: "cart-merge-sku", price: 10 } }],
        ],
      },
    });
    assert(cartMerge.payload.cartItems?.length === 1, "duplicate cart SKU should merge into one line");
    assert(cartMerge.payload.cartItems?.[0]?.[1]?.qty === 5, "duplicate cart SKU qty should be summed");
    assert(cartMerge.payload.cartItems?.[0]?.[1]?.key === "cart-line-a", "unsafe duplicate cart key should not replace first safe key");
    assert(cartMerge.payload.cartUpdatedAt, "cart response should include cartUpdatedAt for conflict detection");
    const staleCart = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      cookie: buyerCookie,
      body: {
        expectedCartUpdatedAt: "2000-01-01T00:00:00.000Z",
        cartItems: [["cart-line-b", { qty: 1, variant: { sku: "cart-next-sku", price: 10 } }]],
      },
      allowFailure: true,
    });
    assert(staleCart.response.status === 409 && staleCart.payload.error === "cart_conflict", "stale cart write should return 409");
    resetRateLimits();
    const freshCart = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      cookie: buyerCookie,
      body: {
        expectedCartUpdatedAt: cartMerge.payload.cartUpdatedAt,
        cartItems: [["cart-line-b", { qty: 1, variant: { sku: "cart-next-sku", price: 10 } }]],
      },
    });
    assert(freshCart.payload.cartItems?.[0]?.[1]?.variant?.sku === "cart-next-sku", "fresh cart write should be accepted");
    resetRateLimits();
    const favoritesMerge = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      cookie: buyerCookie,
      body: { favoriteItems: ["fav-a", "fav-b", "fav-a"] },
    });
    assert(favoritesMerge.payload.favoriteItems?.length === 2, "favorites should be sanitized and returned");
    assert(favoritesMerge.payload.favoritesUpdatedAt, "favorites response should include favoritesUpdatedAt for conflict detection");
    const staleFavorites = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      cookie: buyerCookie,
      body: { expectedFavoritesUpdatedAt: "2000-01-01T00:00:00.000Z", favoriteItems: ["fav-c"] },
      allowFailure: true,
    });
    assert(staleFavorites.response.status === 409 && staleFavorites.payload.error === "favorites_conflict", "stale favorites write should return 409");
    resetRateLimits();
    const savedCartsMerge = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      cookie: buyerCookie,
      body: {
        savedCarts: [
          {
            id: "saved-security-cart",
            title: "Security cart",
            items: [["saved-line", { qty: 2, variant: { sku: "saved-sku", price: 10 } }]],
            total: 20,
          },
        ],
      },
    });
    assert(savedCartsMerge.payload.savedCarts?.length === 1, "saved cart write should be returned");
    assert(savedCartsMerge.payload.savedCartsUpdatedAt, "saved cart response should include savedCartsUpdatedAt for conflict detection");
    const staleSavedCarts = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      cookie: buyerCookie,
      body: { expectedSavedCartsUpdatedAt: "2000-01-01T00:00:00.000Z", savedCarts: [] },
      allowFailure: true,
    });
    assert(staleSavedCarts.response.status === 409 && staleSavedCarts.payload.error === "saved_carts_conflict", "stale saved-cart write should return 409");

    await request(baseUrl, "/api/admin/users", {
      method: "POST",
      cookie: adminCookie,
      body: { email: "manager-security@example.test", name: "Manager Security", phone: "+79990010001" },
    });
    let currentStore = await getStore();
    assert(
      currentStore.audit?.[0]?.type === "user_admin_update" && currentStore.audit?.[0]?.action === "employee_invite",
      "admin user invite should write a safe audit record"
    );
    assert(!("password" in currentStore.audit[0]) && !("passwordHash" in currentStore.audit[0]), "admin user audit must not include credentials");
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
      currentStore = await getStore();
      assert(
        currentStore.audit?.[0]?.type === "user_admin_update" && currentStore.audit?.[0]?.action === "role_update",
        "admin role update should write a safe audit record"
      );
      const auditSummary = await request(baseUrl, "/api/admin/users?audit=1&limit=10", { cookie: adminCookie });
      assert(auditSummary.payload.audit?.[0]?.type === "user_admin_update", "admin audit summary should expose recent user audit records");
      assert(!("passwordHash" in auditSummary.payload.audit[0]), "admin audit summary must not include password hashes");
      return (
        await request(baseUrl, "/api/auth/login", {
          method: "POST",
          body: { email: "manager-login@example.test", password: "manager-pass" },
        })
      ).cookie;
    })();
    const managerOrders = await request(baseUrl, "/api/admin/orders", { cookie: managerCookie });
    assert(managerOrders.response.status === 200, "manager should read admin orders");
    const managerAudit = await request(baseUrl, "/api/admin/users?audit=1", { cookie: managerCookie, allowFailure: true });
    assert(managerAudit.response.status === 403, "manager should not read admin audit summary");
    const managerContent = await request(baseUrl, "/api/admin/content", { cookie: managerCookie, allowFailure: true });
    assert(managerContent.response.status === 403, "manager should not read admin content");
    resetRateLimits();
    for (let i = 0; i < 3; i += 1) {
      const attempt = await request(baseUrl, "/api/admin/content", {
        method: "PATCH",
        cookie: adminCookie,
        body: { reviewId: "" },
        allowFailure: true,
      });
      assert(attempt.response.status === 400 && attempt.payload.error === "invalid_review", "pre-limit content attempt should keep validation error");
    }
    const contentLimited = await request(baseUrl, "/api/admin/content", {
      method: "PATCH",
      cookie: adminCookie,
      body: { reviewId: "" },
      allowFailure: true,
    });
    assert(contentLimited.response.status === 429 && contentLimited.payload.error === "rate_limited", "admin content burst should return 429");
    resetRateLimits();
    for (let i = 0; i < 3; i += 1) {
      const attempt = await request(baseUrl, "/api/admin/orders", {
        method: "PATCH",
        cookie: adminCookie,
        body: { id: "missing", status: "bad-status" },
        allowFailure: true,
      });
      assert(attempt.response.status === 400 && attempt.payload.error === "invalid_status", "pre-limit admin order attempt should keep validation error");
    }
    const orderLimited = await request(baseUrl, "/api/admin/orders", {
      method: "PATCH",
      cookie: adminCookie,
      body: { id: "missing", status: "bad-status" },
      allowFailure: true,
    });
    assert(orderLimited.response.status === 429 && orderLimited.payload.error === "rate_limited", "admin order burst should return 429");
    resetRateLimits();
    for (let i = 0; i < 3; i += 1) {
      const attempt = await request(baseUrl, "/api/admin/users", {
        method: "POST",
        cookie: adminCookie,
        body: { email: "not-an-email" },
        allowFailure: true,
      });
      assert(attempt.response.status === 400 && attempt.payload.error === "invalid_email", "pre-limit admin user attempt should keep validation error");
    }
    const userLimited = await request(baseUrl, "/api/admin/users", {
      method: "POST",
      cookie: adminCookie,
      body: { email: "not-an-email" },
      allowFailure: true,
    });
    assert(userLimited.response.status === 429 && userLimited.payload.error === "rate_limited", "admin user burst should return 429");
    resetRateLimits();
    const importPreview = await request(baseUrl, "/api/admin/import-batches", {
      method: "POST",
      cookie: adminCookie,
      body: {
        action: "preview",
        source: "api-security-smoke",
        products: [{ baseSku: "AUDIT-IMPORT-1", name: "Audit Import 1", basePrice: 120, categories: ["QA"], types: ["T"], sizes: ["S"], materials: ["M"] }],
      },
    });
    currentStore = await getStore();
    assert(currentStore.audit?.[0]?.type === "catalog_import" && currentStore.audit?.[0]?.action === "preview", "import preview should write safe audit");
    assert(!("products" in currentStore.audit[0]) && !("csv" in currentStore.audit[0]), "import audit must not store raw import payload");
    await request(baseUrl, "/api/admin/import-batches", {
      method: "POST",
      cookie: adminCookie,
      body: { action: "reject", id: importPreview.payload.batch.id },
    });
    currentStore = await getStore();
    assert(currentStore.audit?.[0]?.type === "catalog_import" && currentStore.audit?.[0]?.action === "reject", "import reject should write safe audit");
    resetRateLimits();
    for (let i = 0; i < 3; i += 1) {
      const attempt = await request(baseUrl, "/api/admin/import-batches", {
        method: "POST",
        cookie: adminCookie,
        body: { action: "preview", products: [] },
        allowFailure: true,
      });
      assert(attempt.response.status === 400 && attempt.payload.error === "empty_import", "pre-limit import attempt should keep validation error");
    }
    const importLimited = await request(baseUrl, "/api/admin/import-batches", {
      method: "POST",
      cookie: adminCookie,
      body: { action: "preview", products: [] },
      allowFailure: true,
    });
    assert(importLimited.response.status === 429 && importLimited.payload.error === "rate_limited", "admin import burst should return 429");
    resetRateLimits();
    for (let i = 0; i < 3; i += 1) {
      const attempt = await request(baseUrl, "/api/admin/product-images", {
        method: "POST",
        cookie: adminCookie,
        body: { action: "upload" },
        allowFailure: true,
      });
      assert(attempt.response.status === 400 && attempt.payload.error === "missing_product_key", "pre-limit media attempt should keep validation error");
    }
    const mediaLimited = await request(baseUrl, "/api/admin/product-images", {
      method: "POST",
      cookie: adminCookie,
      body: { action: "upload" },
      allowFailure: true,
    });
    assert(mediaLimited.response.status === 429 && mediaLimited.payload.error === "rate_limited", "admin media burst should return 429");
    resetRateLimits();
    for (let i = 0; i < 3; i += 1) {
      const attempt = await request(baseUrl, "/api/admin/prices", {
        method: "POST",
        cookie: adminCookie,
        body: { action: "not-a-price-action", rows: [] },
        allowFailure: true,
      });
      assert(attempt.response.status === 400 && attempt.payload.error === "unknown_action", "pre-limit admin price attempt should keep validation error");
    }
    const priceLimited = await request(baseUrl, "/api/admin/prices", {
      method: "POST",
      cookie: adminCookie,
      body: { action: "not-a-price-action", rows: [] },
      allowFailure: true,
    });
    assert(priceLimited.response.status === 429 && priceLimited.payload.error === "rate_limited", "admin price import burst should return 429");
    resetRateLimits();

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

    resetRateLimits();
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
    const idempotencyKey = "api-security-order-retry-1";
    const idempotentFirst = await request(baseUrl, "/api/orders", {
      method: "POST",
      headers: { "idempotency-key": idempotencyKey },
      body: {
        total,
        customer: { name: "Idempotent", phone: "+79990010008", email: "idempotent@example.test" },
        items: [{ productId: detail.payload.product.id, qty, variant }],
      },
    });
    const idempotentSecond = await request(baseUrl, "/api/orders", {
      method: "POST",
      headers: { "idempotency-key": idempotencyKey },
      body: {
        total,
        customer: { name: "Idempotent", phone: "+79990010008", email: "idempotent@example.test" },
        items: [{ productId: detail.payload.product.id, qty, variant }],
      },
    });
    assert(idempotentSecond.response.status === 200, "idempotent retry should return 200");
    assert(idempotentSecond.payload.idempotent === true, "idempotent retry should be marked");
    assert(idempotentSecond.payload.order?.id === idempotentFirst.payload.order?.id, "idempotent retry should reuse existing order");
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
    const anonymousReview = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      body: reviewBody,
      allowFailure: true,
    });
    assert(anonymousReview.response.status === 401 && anonymousReview.payload.error === "unauthorized", "anonymous review should be rejected");

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
    const aliasOrder = await request(baseUrl, "/api/orders", {
      method: "POST",
      cookie: buyerCookie,
      body: {
        total,
        customer: { name: "Buyer Alias", phone: "+79990010000", email: "alias-claim@example.test" },
        items: [{ productId: detail.payload.product.id, qty, variant }],
      },
    });
    const buyerOwnOrders = await request(baseUrl, "/api/auth/me", { cookie: buyerCookie });
    assert(
      buyerOwnOrders.payload.user?.orders?.some((order) => order.id === aliasOrder.payload.order.id),
      "authenticated buyer should keep ownership even when customer email differs"
    );
    const aliasUser = await request(baseUrl, "/api/auth/register", {
      method: "POST",
      body: {
        email: "alias-claim@example.test",
        password: "buyer-pass",
        name: "Alias Claim",
        phone: "+79990010009",
        personalDataConsent: true,
      },
    });
    const aliasOrders = await request(baseUrl, "/api/auth/me", { cookie: aliasUser.cookie });
    assert(
      !aliasOrders.payload.user?.orders?.some((order) => order.id === aliasOrder.payload.order.id),
      "customer email alone must not grant order ownership"
    );
    const aliasPatch = await request(baseUrl, "/api/orders", {
      method: "PATCH",
      cookie: aliasUser.cookie,
      body: { id: aliasOrder.payload.order.id, commentText: "Alias account must not claim this order" },
      allowFailure: true,
    });
    assert(aliasPatch.response.status === 404, "customer-email alias must not update another user's order");
    resetRateLimits();
    const allowedReview = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      cookie: buyerCookie,
      body: reviewBody,
    });
    assert(allowedReview.payload.user?.reviews?.some((review) => review.text === "Verified buyer review"), "eligible completed order should allow review");
    const wrongProductReview = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      cookie: buyerCookie,
      body: {
        review: {
          productId: "not-ordered-product",
          baseSku: "not_ordered_sku",
          productName: "Not ordered product",
          rating: 5,
          text: "Should not pass without matching purchased SKU",
        },
      },
      allowFailure: true,
    });
    assert(
      wrongProductReview.response.status === 403 && wrongProductReview.payload.error === "REVIEW_ORDER_REQUIRED",
      "completed order should not allow review for a different product/SKU"
    );

    const otherBuyer = await request(baseUrl, "/api/auth/register", {
      method: "POST",
      body: {
        email: "other-review@example.test",
        password: "buyer-pass",
        name: "Other Buyer",
        phone: "+79990010007",
        personalDataConsent: true,
      },
    });
    const otherBuyerOrders = await request(baseUrl, "/api/auth/me", { cookie: otherBuyer.cookie });
    assert(
      !otherBuyerOrders.payload.user?.orders?.some((order) => order.id === buyerOrder.payload.order.id),
      "account order history must not expose another buyer's order"
    );
    const otherBuyerOrderPatch = await request(baseUrl, "/api/orders", {
      method: "PATCH",
      cookie: otherBuyer.cookie,
      body: { id: buyerOrder.payload.order.id, commentText: "Cross-account update attempt" },
      allowFailure: true,
    });
    assert(otherBuyerOrderPatch.response.status === 404, "buyer must not update another buyer's order");
    resetRateLimits();
    const otherUsersOrderReview = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      cookie: otherBuyer.cookie,
      body: reviewBody,
      allowFailure: true,
    });
    assert(
      otherUsersOrderReview.response.status === 403 && otherUsersOrderReview.payload.error === "REVIEW_ORDER_REQUIRED",
      "user should not be able to review using another user's completed order"
    );

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

    const canceledBuyer = await request(baseUrl, "/api/auth/register", {
      method: "POST",
      body: {
        email: "canceled-review@example.test",
        password: "buyer-pass",
        name: "Canceled Buyer",
        phone: "+79990010008",
        personalDataConsent: true,
      },
    });
    const canceledOrder = await request(baseUrl, "/api/orders", {
      method: "POST",
      cookie: canceledBuyer.cookie,
      body: {
        total,
        customer: { name: "Canceled Buyer", phone: "+79990010008", email: "canceled-review@example.test" },
        items: [{ productId: detail.payload.product.id, qty, variant }],
      },
    });
    await request(baseUrl, "/api/admin/orders", {
      method: "PATCH",
      cookie: adminCookie,
      body: { id: canceledOrder.payload.order.id, status: "canceled" },
    });
    resetRateLimits();
    const canceledReview = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      cookie: canceledBuyer.cookie,
      body: reviewBody,
      allowFailure: true,
    });
    assert(
      canceledReview.response.status === 403 && canceledReview.payload.error === "REVIEW_ORDER_REQUIRED",
      `canceled order should not allow review, got ${canceledReview.response.status} ${JSON.stringify(canceledReview.payload)}`
    );

    const rateBuyer = await request(baseUrl, "/api/auth/register", {
      method: "POST",
      body: {
        email: "review-rate@example.test",
        password: "buyer-pass",
        name: "Review Rate Buyer",
        phone: "+79990010009",
        personalDataConsent: true,
      },
    });
    resetRateLimits();
    for (let i = 0; i < 3; i += 1) {
      const attempt = await request(baseUrl, "/api/auth/me", {
        method: "PUT",
        cookie: rateBuyer.cookie,
        body: reviewBody,
        allowFailure: true,
      });
      assert(attempt.response.status === 403 && attempt.payload.error === "REVIEW_ORDER_REQUIRED", "pre-limit review attempt should keep business error");
    }
    const reviewLimited = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      cookie: rateBuyer.cookie,
      body: reviewBody,
      allowFailure: true,
    });
    assert(reviewLimited.response.status === 429 && reviewLimited.payload.error === "rate_limited", "review write burst should return 429");
    await request(baseUrl, "/api/admin/catalog", {
      method: "PUT",
      cookie: adminCookie,
      body: {
        products: [{ id: "AUDIT-CATALOG-1", baseSku: "AUDIT-CATALOG-1", name: "Audit Catalog 1", basePrice: 140, categories: ["QA"], types: ["T"], sizes: ["S"], materials: ["M"] }],
      },
    });
    currentStore = await getStore();
    assert(currentStore.audit?.[0]?.type === "catalog_update" && currentStore.audit?.[0]?.action === "catalog_save", "catalog save should write safe audit");

    console.log(`api-security smoke passed: ${baseUrl}`);
  } finally {
    await close(server).catch(() => {});
    rmSync(tempDir, { recursive: true, force: true });
  }
}

await securitySmoke();
