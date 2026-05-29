const { currentUser } = require("./_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("./_lib/http");
const { saveStore } = require("./_lib/store");

function sanitizeLine(line) {
  return {
    key: String(line.key || ""),
    productId: String(line.productId || ""),
    productName: String(line.productName || ""),
    productImage: String(line.productImage || ""),
    qty: Math.max(1, Number(line.qty || 1)),
    variant: {
      sku: String(line.variant?.sku || ""),
      name: String(line.variant?.name || ""),
      type: String(line.variant?.type || ""),
      size: String(line.variant?.size || ""),
      material: String(line.variant?.material || ""),
      price: Number(line.variant?.price || 0),
    },
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);
  try {
    const data = await readJson(req);
    const { user, store } = await currentUser(req);
    const items = Array.isArray(data.items) ? data.items.map(sanitizeLine).filter((line) => line.variant.sku) : [];
    const total = Number(data.total || 0);
    const customer = data.customer || {};

    if (!items.length) return sendJson(res, 400, { error: "empty_order", message: "В заказе нет товаров." });
    if (!customer.phone && !user?.phone) return sendJson(res, 400, { error: "missing_phone", message: "Укажите телефон." });

    const record = {
      id: `SO-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleString("ru-RU"),
      createdAt: new Date().toISOString(),
      status: "new",
      userEmail: user?.email || "",
      customer: {
        name: String(customer.name || user?.name || ""),
        company: String(customer.company || ""),
        phone: String(customer.phone || user?.phone || ""),
        email: String(customer.email || user?.email || ""),
        comment: String(customer.comment || ""),
      },
      items,
      total,
      promo: String(data.promo || ""),
      source: String(data.source || "site"),
    };

    store.orders = [record, ...store.orders];
    await saveStore(store);
    sendJson(res, 201, { order: record });
  } catch (error) {
    handleError(res, error);
  }
};
