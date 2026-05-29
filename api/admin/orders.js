const { requireUser } = require("../_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { saveStore } = require("../_lib/store");

const allowedStatuses = new Set(["new", "processing", "done"]);

module.exports = async function handler(req, res) {
  try {
    const { store } = await requireUser(req, ["admin", "manager"]);
    if (req.method === "GET") return sendJson(res, 200, { orders: store.orders });
    if (req.method !== "PATCH") return methodNotAllowed(res);

    const data = await readJson(req);
    const status = String(data.status || "");
    if (!allowedStatuses.has(status)) return sendJson(res, 400, { error: "invalid_status", message: "Некорректный статус." });

    let updated = null;
    store.orders = store.orders.map((order) => {
      if (order.id !== data.id) return order;
      updated = { ...order, status, updatedAt: new Date().toISOString() };
      return updated;
    });
    if (!updated) return sendJson(res, 404, { error: "not_found", message: "Заказ не найден." });

    await saveStore(store);
    sendJson(res, 200, { order: updated });
  } catch (error) {
    handleError(res, error);
  }
};
