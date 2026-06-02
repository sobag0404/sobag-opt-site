const { requireUser } = require("./_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("./_lib/http");
const { saveStore } = require("./_lib/store");

const MAX_CART_LINES = 500;

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

module.exports = async function handler(req, res) {
  try {
    const { store, user } = await requireUser(req, ["admin", "manager", "content", "buyer"]);
    const email = user.email;
    if (req.method === "GET") {
      return sendJson(res, 200, store.carts[email] || { items: [], updatedAt: null });
    }
    if (req.method !== "PUT" && req.method !== "DELETE") return methodNotAllowed(res);

    if (req.method === "DELETE") {
      delete store.carts[email];
      await saveStore(store);
      return sendJson(res, 200, { items: [], updatedAt: new Date().toISOString() });
    }

    const data = await readJson(req);
    const items = sanitizeCart(data.items || data.cart || []);
    store.carts[email] = {
      items,
      updatedAt: new Date().toISOString(),
    };
    await saveStore(store);
    sendJson(res, 200, store.carts[email]);
  } catch (error) {
    handleError(res, error);
  }
};
