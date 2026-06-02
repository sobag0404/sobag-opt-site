const { currentUser, publicUser } = require("../_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { saveStore } = require("../_lib/store");

const MAX_CART_LINES = 500;
const MAX_FAVORITES = 5000;

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
      await saveStore(store);
    } else if (req.method !== "GET") {
      return methodNotAllowed(res);
    }

    const orders = store.orders.filter((order) => order.userEmail === user.email);
    sendJson(res, 200, {
      user: { ...publicUser(user), orders },
      cartItems: store.carts[user.email]?.items || [],
      favoriteItems: store.favorites[user.email]?.items || [],
    });
  } catch (error) {
    handleError(res, error);
  }
};
