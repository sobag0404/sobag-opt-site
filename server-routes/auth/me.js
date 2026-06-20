const { currentUser, normalizePhone, publicUser } = require("../_lib/auth");
const { checkStoreRateLimit } = require("../_lib/api-security");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { saveStore } = require("../_lib/store");

const MAX_CART_LINES = 500;
const MAX_FAVORITES = 5000;
const MAX_SAVED_CARTS = 50;
const MAX_PROFILE_LIST_ITEMS = 20;
const MAX_REVIEWS = 5000;

function safeCartKey(value, fallback) {
  const prepared = String(value || "").trim().slice(0, 160);
  if (/^[A-Za-z0-9._:-]{1,160}$/.test(prepared)) return prepared;
  const safeFallback = String(fallback || "").trim().slice(0, 160);
  if (/^[A-Za-z0-9._:-]{1,160}$/.test(safeFallback)) return safeFallback;
  return "";
}

function sanitizeCartLine(entry) {
  const key = Array.isArray(entry) ? entry[0] : entry?.key;
  const line = Array.isArray(entry) ? entry[1] : entry;
  if (!line || typeof line !== "object") return null;
  const variant = line.variant || {};
  const sku = String(variant.sku || line.variantSku || "").trim();
  if (!sku) return null;
  const cartKey = safeCartKey(key || line.key, sku);
  if (!cartKey) return null;
  const item = {
    key: cartKey,
    productId: String(line.productId || ""),
    productName: String(line.productName || variant.name || ""),
    productImage: String(line.productImage || ""),
    qty: Math.max(1, Math.min(99999, Math.round(Number(line.qty || 1)))),
    variant: {
      sku,
      name: String(variant.name || ""),
      type: String(variant.type || ""),
      size: String(variant.size || ""),
      material: String(variant.material || ""),
      price: Math.max(0, Number(variant.price || 0)),
    },
  };
  return { key: cartKey, mergeKey: sku.toLowerCase(), item };
}

function sanitizeCart(items) {
  const merged = new Map();
  for (const prepared of (Array.isArray(items) ? items : []).map(sanitizeCartLine).filter(Boolean)) {
    const existing = merged.get(prepared.mergeKey);
    if (existing) {
      existing.item.qty = Math.min(99999, existing.item.qty + prepared.item.qty);
      continue;
    }
    merged.set(prepared.mergeKey, prepared);
    if (merged.size >= MAX_CART_LINES) break;
  }
  return [...merged.values()].map((entry) => [entry.key, entry.item]);
}

function sanitizeFavorites(items) {
  return [...new Set((Array.isArray(items) ? items : []).map((item) => String(item || "").trim()).filter(Boolean))].slice(0, MAX_FAVORITES);
}

function sanitizeTextList(items, limit = MAX_PROFILE_LIST_ITEMS, itemLimit = 240) {
  return [
    ...new Set(
      (Array.isArray(items) ? items : [])
        .map((item) => String(item || "").trim().slice(0, itemLimit))
        .filter(Boolean)
    ),
  ].slice(0, limit);
}

function sanitizeCompanies(items, primary = {}) {
  const prepared = [
    primary,
    ...(Array.isArray(items) ? items : []),
  ]
    .map((item) => {
      const name = String(item?.name || item?.company || "").trim().slice(0, 180);
      const inn = String(item?.inn || "").replace(/\D/g, "").slice(0, 12);
      const kpp = String(item?.kpp || "").replace(/\D/g, "").slice(0, 9);
      const legalAddress = String(item?.legalAddress || item?.address || "").trim().slice(0, 240);
      if (!name && !inn) return null;
      return { name, inn, kpp, legalAddress };
    })
    .filter(Boolean);
  const seen = new Set();
  return prepared
    .filter((company) => {
      const key = company.inn || company.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

function sanitizeProfile(profile = {}, existing = {}) {
  const text = (value, limit = 160) => String(value || "").trim().slice(0, limit);
  const address = text(profile.address, 240);
  const addresses = [
    address,
    ...(Array.isArray(profile.addresses) ? profile.addresses : []),
    ...(Array.isArray(existing.addresses) ? existing.addresses : []),
  ]
    .map((item) => text(item, 240))
    .filter(Boolean);
  return {
    name: text(profile.name || existing.name, 120),
    phone: normalizePhone(profile.phone || existing.phone).slice(0, 80),
    company: text(profile.company || existing.company, 180),
    inn: text(String(profile.inn || existing.inn || "").replace(/\D/g, ""), 12),
    kpp: text(String(profile.kpp || existing.kpp || "").replace(/\D/g, ""), 9),
    legalAddress: text(profile.legalAddress || existing.legalAddress, 240),
    city: text(profile.city || existing.city, 120),
    address,
    delivery: text(profile.delivery || existing.delivery, 120),
    packaging: text(profile.packaging || existing.packaging, 120),
    orderComment: text(profile.orderComment || existing.orderComment, 500),
    addresses: [...new Set(addresses)].slice(0, 10),
    layoutFiles: sanitizeTextList([...(Array.isArray(profile.layoutFiles) ? profile.layoutFiles : []), ...(Array.isArray(existing.layoutFiles) ? existing.layoutFiles : [])], 20, 240),
    orderComments: sanitizeTextList([profile.orderComment, ...(Array.isArray(profile.orderComments) ? profile.orderComments : []), ...(Array.isArray(existing.orderComments) ? existing.orderComments : [])], 10, 500),
    companies: sanitizeCompanies(profile.companies, {
      name: profile.company || existing.company,
      inn: profile.inn || existing.inn,
      kpp: profile.kpp || existing.kpp,
      legalAddress: profile.legalAddress || existing.legalAddress,
    }),
  };
}

function canUseInternalSavedCartFields(user) {
  return user?.role === "admin" || user?.role === "manager";
}

function sanitizeSavedCarts(items, options = {}) {
  const includeInternal = Boolean(options.includeInternal);
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const entries = sanitizeCart(item.items || []);
      if (!entries.length) return null;
      const id = String(item.id || `SC-${Date.now()}`).slice(0, 80);
      const title = String(item.title || "Сохраненная корзина").trim().slice(0, 120);
      const createdAt = String(item.createdAt || item.updatedAt || new Date().toISOString()).slice(0, 40);
      const updatedAt = String(item.updatedAt || createdAt).slice(0, 40);
      const commentHistory = (Array.isArray(item.commentHistory) ? item.commentHistory : [])
        .map((entry) => ({
          at: String(entry?.at || new Date().toISOString()).slice(0, 40),
          actor: String(entry?.actor || "").trim().slice(0, 120),
          role: String(entry?.role || "").trim().slice(0, 40),
          type: String(entry?.type || "comment").trim().slice(0, 40),
          visibility: entry?.visibility === "internal" ? "internal" : "customer",
          text: String(entry?.text || "").trim().slice(0, 1000),
        }))
        .filter((entry) => entry.text && (includeInternal || entry.visibility !== "internal"))
        .slice(-20);
      const savedCart = {
        id,
        title,
        createdAt,
        updatedAt,
        date: String(item.date || "").slice(0, 80),
        items: entries,
        qty: Math.max(0, Math.round(Number(item.qty || 0))),
        subtotal: Math.max(0, Math.round(Number(item.subtotal || 0))),
        discount: Math.max(0, Math.round(Number(item.discount || 0))),
        total: Math.max(0, Math.round(Number(item.total || 0))),
        status: item.status === "sent" ? "sent" : "draft",
        sentAt: String(item.sentAt || "").slice(0, 40),
        sentOrderId: String(item.sentOrderId || "").slice(0, 80),
        customerComment: String(item.customerComment || item.comment || "").trim().slice(0, 1000),
        commentHistory,
      };
      if (includeInternal) savedCart.managerComment = String(item.managerComment || "").trim().slice(0, 1000);
      return savedCart;
    })
    .filter(Boolean)
    .slice(0, MAX_SAVED_CARTS);
}

function sanitizeReview(input, user) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const productId = String(input.productId || "").trim().slice(0, 120);
  const baseSku = String(input.baseSku || "").trim().slice(0, 120);
  const productName = String(input.productName || "").trim().slice(0, 200);
  const rating = Math.max(1, Math.min(5, Math.round(Number(input.rating || 0))));
  const text = String(input.text || "").trim().slice(0, 1000);
  if (!productId || !baseSku || !rating || text.length < 5) return null;
  return {
    id: `REV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    productId,
    baseSku,
    productName,
    rating,
    text,
    status: "pending",
    userEmail: user.email,
    authorName: String(user.name || user.company || user.email || "Покупатель").trim().slice(0, 120),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const REVIEW_ELIGIBLE_ORDER_STATUSES = new Set(["shipped", "done"]);

function normalized(value) {
  return String(value || "").trim().toLowerCase();
}

function reviewMatchesOrderItem(review, item = {}) {
  const reviewProductId = normalized(review.productId);
  const reviewBaseSku = normalized(review.baseSku);
  const itemProductId = normalized(item.productId);
  const itemBaseSku = normalized(item.baseSku);
  const itemKey = normalized(item.key);
  const variantSku = normalized(item.variant?.sku || item.sku);
  return Boolean(
    (reviewProductId && itemProductId && reviewProductId === itemProductId) ||
      (reviewBaseSku && itemBaseSku && reviewBaseSku === itemBaseSku) ||
      (reviewBaseSku && itemKey && reviewBaseSku === itemKey) ||
      (reviewBaseSku && variantSku && reviewBaseSku === variantSku)
  );
}

function hasEligibleReviewOrder(store, user, review) {
  const email = normalized(user.email);
  return (store.orders || []).some((order) => {
    const orderEmail = normalized(order.userEmail);
    if (!email || orderEmail !== email) return false;
    if (!REVIEW_ELIGIBLE_ORDER_STATUSES.has(normalized(order.status))) return false;
    return (order.items || []).some((item) => reviewMatchesOrderItem(review, item));
  });
}

function hasDuplicateReview(store, user, review) {
  const email = normalized(user.email);
  const reviewProductId = normalized(review.productId);
  const reviewBaseSku = normalized(review.baseSku);
  return (store.reviews || []).some((item) => {
    if (normalized(item.userEmail) !== email) return false;
    return (
      (reviewProductId && normalized(item.productId) === reviewProductId) ||
      (reviewBaseSku && normalized(item.baseSku) === reviewBaseSku)
    );
  });
}

function publicOrder(order) {
  return {
    ...order,
    crmThread: (Array.isArray(order.crmThread) ? order.crmThread : []).filter((entry) => entry?.visibility !== "internal"),
  };
}

module.exports = async function handler(req, res) {
  try {
    const { user, store } = await currentUser(req);
    if (!user) return sendJson(res, req.method === "GET" ? 200 : 401, { user: null, error: req.method === "GET" ? undefined : "unauthorized" });

    if (req.method === "PUT") {
      const data = await readJson(req, { maxBytes: 1024 * 1024 });
      if (Object.prototype.hasOwnProperty.call(data, "cartItems")) {
        const expectedCartUpdatedAt = String(data.expectedCartUpdatedAt || "").trim();
        const currentCart = store.carts[user.email] || null;
        const currentCartUpdatedAt = String(currentCart?.updatedAt || "");
        if (expectedCartUpdatedAt && currentCartUpdatedAt && expectedCartUpdatedAt !== currentCartUpdatedAt) {
          return sendJson(res, 409, { error: "cart_conflict", message: "Cart changed on another device.", cartItems: currentCart.items || [], cartUpdatedAt: currentCartUpdatedAt });
        }
        store.carts[user.email] = {
          items: sanitizeCart(data.cartItems),
          updatedAt: new Date().toISOString(),
        };
      }
      if (Object.prototype.hasOwnProperty.call(data, "favoriteItems")) {
        const expectedFavoritesUpdatedAt = String(data.expectedFavoritesUpdatedAt || "").trim();
        const currentFavorites = store.favorites[user.email] || null;
        const currentFavoritesUpdatedAt = String(currentFavorites?.updatedAt || "");
        if (expectedFavoritesUpdatedAt && currentFavoritesUpdatedAt && expectedFavoritesUpdatedAt !== currentFavoritesUpdatedAt) {
          return sendJson(res, 409, {
            error: "favorites_conflict",
            message: "Favorites changed on another device.",
            favoriteItems: currentFavorites.items || [],
            favoritesUpdatedAt: currentFavoritesUpdatedAt,
          });
        }
        store.favorites[user.email] = {
          items: sanitizeFavorites(data.favoriteItems),
          updatedAt: new Date().toISOString(),
        };
      }
      if (Object.prototype.hasOwnProperty.call(data, "savedCarts")) {
        const expectedSavedCartsUpdatedAt = String(data.expectedSavedCartsUpdatedAt || "").trim();
        const currentSavedCarts = store.savedCarts[user.email] || null;
        const currentSavedCartsUpdatedAt = String(currentSavedCarts?.updatedAt || "");
        if (expectedSavedCartsUpdatedAt && currentSavedCartsUpdatedAt && expectedSavedCartsUpdatedAt !== currentSavedCartsUpdatedAt) {
          return sendJson(res, 409, {
            error: "saved_carts_conflict",
            message: "Saved carts changed on another device.",
            savedCarts: sanitizeSavedCarts(currentSavedCarts.items || [], { includeInternal: canUseInternalSavedCartFields(user) }),
            savedCartsUpdatedAt: currentSavedCartsUpdatedAt,
          });
        }
        store.savedCarts[user.email] = {
          items: sanitizeSavedCarts(data.savedCarts, { includeInternal: canUseInternalSavedCartFields(user) }),
          updatedAt: new Date().toISOString(),
        };
      }
      if (data.profile && typeof data.profile === "object" && !Array.isArray(data.profile)) {
        store.users[user.email] = {
          ...user,
          ...sanitizeProfile(data.profile, user),
          updatedAt: new Date().toISOString(),
        };
      }
      if (Object.prototype.hasOwnProperty.call(data, "review")) {
        const limited = await checkStoreRateLimit(req, { key: `reviews:create:${String(user.email || "").toLowerCase()}`, limit: 12 });
        if (limited) throw limited;
        const review = sanitizeReview(data.review, store.users[user.email] || user);
        if (!review) return sendJson(res, 400, { error: "invalid_review", message: "Поставьте оценку и напишите отзыв от 5 символов." });
        if (!hasEligibleReviewOrder(store, user, review)) {
          return sendJson(res, 403, { error: "REVIEW_ORDER_REQUIRED", message: "Отзыв можно оставить только после подтвержденного заказа этого товара." });
        }
        if (hasDuplicateReview(store, user, review)) {
          return sendJson(res, 409, { error: "REVIEW_ALREADY_EXISTS", message: "Отзыв на этот товар уже отправлен." });
        }
        store.reviews = [review, ...(store.reviews || [])].slice(0, MAX_REVIEWS);
      }
      await saveStore(store);
    } else if (req.method !== "GET") {
      return methodNotAllowed(res);
    }

    const freshUser = store.users[user.email] || user;
    const email = String(freshUser.email || "").toLowerCase();
    const orders = store.orders
      .filter((order) => String(order.userEmail || "").toLowerCase() === email)
      .map(publicOrder);
    const reviews = (store.reviews || []).filter((review) => review.userEmail === freshUser.email);
    const savedCarts = sanitizeSavedCarts(store.savedCarts[freshUser.email]?.items || [], {
      includeInternal: canUseInternalSavedCartFields(freshUser),
    });
    sendJson(res, 200, {
      user: { ...publicUser(freshUser), orders, reviews },
      cartItems: store.carts[freshUser.email]?.items || [],
      cartUpdatedAt: store.carts[freshUser.email]?.updatedAt || null,
      favoriteItems: store.favorites[freshUser.email]?.items || [],
      favoritesUpdatedAt: store.favorites[freshUser.email]?.updatedAt || null,
      savedCarts,
      savedCartsUpdatedAt: store.savedCarts[freshUser.email]?.updatedAt || null,
    });
  } catch (error) {
    handleError(res, error, req);
  }
};
