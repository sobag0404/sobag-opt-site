const { requireUser } = require("../_lib/auth");
const { auditRecord } = require("../_lib/admin-audit");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { saveStore } = require("../_lib/store");

const allowedStatuses = new Set(["new", "processing", "waiting", "production", "ready", "shipped", "done", "canceled"]);
const allowedCommentVisibility = new Set(["internal", "customer"]);

function orderStatusLabel(status) {
  if (status === "new") return "Новый";
  if (status === "processing") return "В работе";
  if (status === "waiting") return "Ждет клиента";
  if (status === "production") return "В производстве";
  if (status === "ready") return "Готов к отгрузке";
  if (status === "shipped") return "Отгружен";
  if (status === "done") return "Выполнен";
  if (status === "canceled") return "Отменен";
  return "Новый";
}

function historyEntry(order, patch, actor) {
  const changes = [];
  if (patch.status && patch.status !== order.status) {
    changes.push(`Статус: ${orderStatusLabel(order.status)} -> ${orderStatusLabel(patch.status)}`);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "managerEmail") && patch.managerEmail !== (order.managerEmail || "")) {
    changes.push(`Менеджер: ${patch.managerName || patch.managerEmail || "не назначен"}`);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "managerNote") && patch.managerNote !== (order.managerNote || "")) {
    changes.push("Комментарий менеджера обновлен");
  }
  if (!changes.length) return null;
  return {
    id: `H-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    actor,
    summary: changes.join("; "),
  };
}

function sanitizeCommentText(value) {
  return String(value || "").trim().slice(0, 1200);
}

function crmThreadEntry({ text, visibility, actor, role }) {
  const prepared = sanitizeCommentText(text);
  if (!prepared) return null;
  return {
    id: `CRM-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    actor: String(actor || "").slice(0, 120),
    role: String(role || "").slice(0, 40),
    visibility: allowedCommentVisibility.has(visibility) ? visibility : "internal",
    text: prepared,
  };
}

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
      const patch = {
        ...(status ? { status } : {}),
        ...(Object.prototype.hasOwnProperty.call(data, "managerEmail") ? { managerEmail, managerName } : {}),
        ...(Object.prototype.hasOwnProperty.call(data, "managerNote") ? { managerNote: String(data.managerNote || "").trim() } : {}),
      };
      const crmEntry = crmThreadEntry({
        text: data.commentText,
        visibility: data.commentVisibility,
        actor: user.name || user.email,
        role: user.role || "manager",
      });
      const entry = historyEntry(order, patch, user.email);
      updated = {
        ...order,
        ...patch,
        crmThread: crmEntry ? [crmEntry, ...(order.crmThread || [])].slice(0, 200) : order.crmThread || [],
        statusHistory: entry ? [entry, ...(order.statusHistory || [])].slice(0, 100) : order.statusHistory || [],
        updatedAt: new Date().toISOString(),
        updatedBy: user.email,
      };
      return updated;
    });
    if (!updated) return sendJson(res, 404, { error: "not_found", message: "Заказ не найден." });

    store.audit = [
      auditRecord("order_update", "patch", user, {
        entityType: "order",
        entityId: String(updated.id || "").slice(0, 80),
        orderId: String(updated.id || "").slice(0, 80),
        status: String(updated.status || "").slice(0, 40),
        result: "updated",
        managerAssigned: Boolean(updated.managerEmail),
      }),
      ...(store.audit || []),
    ].slice(0, 500);

    await saveStore(store);
    sendJson(res, 200, { order: updated });
  } catch (error) {
    handleError(res, error, req);
  }
};
