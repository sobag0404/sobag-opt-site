const { isValidEmail, normalizeEmail, normalizePhone, publicUser, requireUser } = require("../_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { saveStore } = require("../_lib/store");

const allowedRoles = new Set(["buyer", "manager", "content"]);
const MAX_AUDIT_RECORDS = 500;

function auditId() {
  return `AUD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function pushUserAudit(store, { action, actor, targetEmail, previousRole, role }) {
  const record = {
    id: auditId(),
    type: "user_admin_update",
    action,
    actor: String(actor || "").trim().toLowerCase().slice(0, 180),
    targetEmail: String(targetEmail || "").trim().toLowerCase().slice(0, 180),
    previousRole: String(previousRole || "").trim().slice(0, 40),
    role: String(role || "").trim().slice(0, 40),
    createdAt: new Date().toISOString(),
  };
  store.audit = [record, ...(Array.isArray(store.audit) ? store.audit : [])].slice(0, MAX_AUDIT_RECORDS);
  return record;
}

function auditSummary(records = [], limit = 100) {
  return (Array.isArray(records) ? records : []).slice(0, limit).map((record) => ({
    id: String(record?.id || "").slice(0, 80),
    type: String(record?.type || "").slice(0, 80),
    action: String(record?.action || "").slice(0, 80),
    actor: String(record?.actor || "").trim().toLowerCase().slice(0, 180),
    targetEmail: String(record?.targetEmail || record?.userEmail || "").trim().toLowerCase().slice(0, 180),
    orderId: String(record?.orderId || "").slice(0, 80),
    reviewId: String(record?.reviewId || "").slice(0, 80),
    status: String(record?.status || "").slice(0, 80),
    role: String(record?.role || "").slice(0, 40),
    previousRole: String(record?.previousRole || "").slice(0, 40),
    createdAt: String(record?.createdAt || record?.at || "").slice(0, 40),
  }));
}

module.exports = async function handler(req, res) {
  try {
    const { store, user } = await requireUser(req, ["admin", "manager"]);
    if (req.method === "GET") {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      if (url.searchParams.get("audit") === "1") {
        if (user.role !== "admin") return sendJson(res, 403, { error: "forbidden", message: "Audit is available to admins only." });
        const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || 100) || 100));
        return sendJson(res, 200, { audit: auditSummary(store.audit, limit) });
      }
      const email = String(url.searchParams.get("email") || "").trim().toLowerCase();
      if (email) {
        const found = store.users[email];
        const orders = store.orders.filter(
          (order) => String(order.userEmail || "").toLowerCase() === email || String(order.customer?.email || "").toLowerCase() === email
        );
        if (!found && !orders.length) return sendJson(res, 404, { error: "not_found", message: "Пользователь не найден." });
        if (!found) {
          const latestCustomer = orders[0]?.customer || {};
          return sendJson(res, 200, {
            user: {
              email,
              name: latestCustomer.name || latestCustomer.company || email,
              phone: latestCustomer.phone || "",
              role: "buyer",
              address: latestCustomer.address || "",
              addresses: [...new Set(orders.map((order) => order.customer?.address).filter(Boolean))],
              lastCustomer: latestCustomer,
              orders,
            },
          });
        }
        return sendJson(res, 200, { user: { ...publicUser(found), orders } });
      }
      return sendJson(res, 200, { users: Object.values(store.users).map(publicUser) });
    }
    if (req.method === "POST") {
      if (user.role !== "admin") return sendJson(res, 403, { error: "forbidden", message: "Сотрудников может добавлять только администратор." });
      const data = await readJson(req);
      const email = normalizeEmail(data.email);
      if (!isValidEmail(email) || email === "admin@sobag") return sendJson(res, 400, { error: "invalid_email", message: "Проверьте email сотрудника." });
      const existing = store.users[email] || {};
      if (existing.role === "admin") return sendJson(res, 403, { error: "admin_locked", message: "Администратора нельзя изменить здесь." });
      store.users[email] = {
        ...existing,
        email,
        name: String(data.name || existing.name || email).trim().slice(0, 120),
        phone: normalizePhone(data.phone || existing.phone || ""),
        role: "manager",
        employee: true,
        invitedAt: existing.invitedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      pushUserAudit(store, {
        action: existing.email ? "employee_update" : "employee_invite",
        actor: user.email,
        targetEmail: email,
        previousRole: existing.role || "",
        role: store.users[email].role,
      });
      await saveStore(store);
      return sendJson(res, 201, { user: publicUser(store.users[email]) });
    }

    if (req.method === "DELETE") {
      if (user.role !== "admin") return sendJson(res, 403, { error: "forbidden", message: "Сотрудников может удалять только администратор." });
      const data = await readJson(req);
      const email = normalizeEmail(data.email);
      const existing = store.users[email];
      if (!existing) return sendJson(res, 404, { error: "not_found", message: "Пользователь не найден." });
      if (existing.role === "admin") return sendJson(res, 403, { error: "admin_locked", message: "Администратора нельзя удалить здесь." });
      store.users[email] = {
        ...existing,
        role: "buyer",
        employee: false,
        managerRemovedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      pushUserAudit(store, {
        action: "employee_remove",
        actor: user.email,
        targetEmail: email,
        previousRole: existing.role || "",
        role: store.users[email].role,
      });
      await saveStore(store);
      return sendJson(res, 200, { user: publicUser(store.users[email]) });
    }

    if (req.method !== "PATCH") return methodNotAllowed(res);
    if (user.role !== "admin") return sendJson(res, 403, { error: "forbidden", message: "Роли может менять только администратор." });

    const data = await readJson(req);
    const email = String(data.email || "").trim().toLowerCase();
    const role = String(data.role || "");
    if (!allowedRoles.has(role)) return sendJson(res, 400, { error: "invalid_role", message: "Некорректная роль." });
    if (!store.users[email]) return sendJson(res, 404, { error: "not_found", message: "Пользователь не найден." });
    if (store.users[email].role === "admin") return sendJson(res, 403, { error: "admin_locked", message: "Роль администратора нельзя менять здесь." });

    const previousRole = store.users[email].role || "";
    store.users[email] = { ...store.users[email], role, updatedAt: new Date().toISOString() };
    pushUserAudit(store, {
      action: "role_update",
      actor: user.email,
      targetEmail: email,
      previousRole,
      role,
    });
    await saveStore(store);
    sendJson(res, 200, { user: publicUser(store.users[email]) });
  } catch (error) {
    handleError(res, error, req);
  }
};
