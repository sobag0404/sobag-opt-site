const { currentUser, publicUser } = require("../_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { saveStore } = require("../_lib/store");

const MAX_CART_LINES = 500;
const MAX_FAVORITES = 5000;
const MAX_SAVED_CARTS = 50;

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
    city: text(profile.city || existing.city, 120),
    address,
    addresses: [...new Set(addresses)].slice(0, 10),
  };
}

function sanitizeSavedCarts(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const entries = sanitizeCart(item.items || []);
      if (!entries.length) return null;
      const id = String(item.id || `SC-${Date.now()}`).slice(0, 80);
      const title = String(item.title || "Сохраненная корзина").trim().slice(0, 120);
      const createdAt = String(item.createdAt || item.updatedAt || new Date().toISOString()).slice(0, 40);
      const updatedAt = String(item.updatedAt || createdAt).slice(0, 40);
      return {
        id,
        title,
        createdAt,
        updatedAt,
        date: String(item.date || "").slice(0, 80),
        items: entries,
        qty: Math.max(0, Math.round(Number(item.qty || 0))),
        subtotal: Math.max(0, Math.round(Number(item.subtotal || 0))),
        total: Math.max(0, Math.round(Number(item.total || 0))),
      };
    })
    .filter(Boolean)
    .slice(0, MAX_SAVED_CARTS);
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
          items: sanitizeSavedCarts(data.savedCarts),
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
      await saveStore(store);
    } else if (req.method !== "GET") {
      return methodNotAllowed(res);
    }

    const freshUser = store.users[user.email] || user;
    const orders = store.orders.filter((order) => order.userEmail === freshUser.email);
    sendJson(res, 200, {
      user: { ...publicUser(freshUser), orders },
      cartItems: store.carts[freshUser.email]?.items || [],
      favoriteItems: store.favorites[freshUser.email]?.items || [],
      savedCarts: store.savedCarts[freshUser.email]?.items || [],
    });
  } catch (error) {
    handleError(res, error);
  }
};
