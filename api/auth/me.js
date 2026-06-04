const { currentUser, publicUser } = require("../_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { saveStore } = require("../_lib/store");

const MAX_CART_LINES = 500;
const MAX_FAVORITES = 5000;
const MAX_SAVED_CARTS = 50;
const MAX_PROFILE_LIST_ITEMS = 20;
const MAX_REVIEWS = 5000;

function sanitizeCartLine(entry) {
  const key = Array.isArray(entry) ? entry[0] : entry?.key;
  const line = Array.isArray(entry) ? entry[1] : entry;
  if (!line || typeof line !== "object") return null;
  const variant = line.variant || {};
  const sku = String(variant.sku || line.variantSku || "").trim();
  if (!sku) return null;
  return [
    String(key || line.key || sku),
    {
      key: String(line.key || key || sku),
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
    },
  ];
}

function sanitizeCart(items) {
  return (Array.isArray(items) ? items : []).map(sanitizeCartLine).filter(Boolean).slice(0, MAX_CART_LINES);
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
    phone: text(profile.phone || existing.phone, 80),
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

module.exports = async function handler(req, res) {
  try {
    const { user, store } = await currentUser(req);
    if (!user) return sendJson(res, req.method === "GET" ? 200 : 401, { user: null, error: req.method === "GET" ? undefined : "unauthorized" });

    if (req.method === "PUT") {
      const data = await readJson(req);
      if (Object.prototype.hasOwnProperty.call(data, "cartItems")) {
        store.carts[user.email] = {
          items: sanitizeCart(data.cartItems),
          updatedAt: new Date().toISOString(),
        };
      }
      if (Object.prototype.hasOwnProperty.call(data, "favoriteItems")) {
        store.favorites[user.email] = {
          items: sanitizeFavorites(data.favoriteItems),
          updatedAt: new Date().toISOString(),
        };
      }
      if (Object.prototype.hasOwnProperty.call(data, "savedCarts")) {
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
        const review = sanitizeReview(data.review, store.users[user.email] || user);
        if (!review) return sendJson(res, 400, { error: "invalid_review", message: "Поставьте оценку и напишите отзыв от 5 символов." });
        store.reviews = [review, ...(store.reviews || [])].slice(0, MAX_REVIEWS);
      }
      await saveStore(store);
    } else if (req.method !== "GET") {
      return methodNotAllowed(res);
    }

    const freshUser = store.users[user.email] || user;
    const orders = store.orders.filter((order) => order.userEmail === freshUser.email);
    const reviews = (store.reviews || []).filter((review) => review.userEmail === freshUser.email);
    const savedCarts = sanitizeSavedCarts(store.savedCarts[freshUser.email]?.items || [], {
      includeInternal: canUseInternalSavedCartFields(freshUser),
    });
    sendJson(res, 200, {
      user: { ...publicUser(freshUser), orders, reviews },
      cartItems: store.carts[freshUser.email]?.items || [],
      favoriteItems: store.favorites[freshUser.email]?.items || [],
      savedCarts,
    });
  } catch (error) {
    handleError(res, error);
  }
};
