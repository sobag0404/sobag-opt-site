const { requireUser } = require("../_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { saveStore } = require("../_lib/store");

const allowedStatuses = new Set(["new", "processing", "waiting", "done", "canceled"]);

module.exports = async function handler(req, res) {
  try {
    const { store, user } = await requireUser(req, ["admin", "manager"]);
    if (req.method === "GET") return sendJson(res, 200, { orders: store.orders });
    if (req.method !== "PATCH") return methodNotAllowed(res);

    const data = await readJson(req);
    const status = String(data.status || "");
    if (status && !allowedStatuses.has(status)) return sendJson(res, 400, { error: "invalid_status", message: "Некорректный статус." });

    const managerEmail = String(data.managerEmail || "").trim().toLowerCase();
    let managerName = String(data.managerName || "").trim();
    if (managerEmail) {
      const manager = store.users[managerEmail];
      if (!manager || !["admin", "manager"].includes(manager.role)) {
        return sendJson(res, 400, { error: "invalid_manager", message: "Выберите администратора или менеджера." });
      }
      managerName = manager.name || manager.email;
    }

    let updated = null;
    store.orders = store.orders.map((order) => {
      if (order.id !== data.id) return order;
      updated = {
        ...order,
        ...(status ? { status } : {}),
        ...(Object.prototype.hasOwnProperty.call(data, "managerEmail") ? { managerEmail, managerName } : {}),
        ...(Object.prototype.hasOwnProperty.call(data, "managerNote") ? { managerNote: String(data.managerNote || "").trim() } : {}),
        updatedAt: new Date().toISOString(),
        updatedBy: user.email,
      };
      return updated;
    });
    if (!updated) return sendJson(res, 404, { error: "not_found", message: "Заказ не найден." });

    store.audit = [
      {
        id: `AUD-${Date.now().toString(36)}`,
        type: "order_update",
        orderId: updated.id,
        actor: user.email,
        status: updated.status,
        managerEmail: updated.managerEmail || "",
        createdAt: new Date().toISOString(),
      },
      ...(store.audit || []),
    ].slice(0, 500);

    await saveStore(store);
    sendJson(res, 200, { order: updated });
  } catch (error) {
    handleError(res, error);
  }
};
