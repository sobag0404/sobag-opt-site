const { publicUser, requireUser } = require("../_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { saveStore } = require("../_lib/store");

const allowedRoles = new Set(["buyer", "manager"]);

module.exports = async function handler(req, res) {
  try {
    const { store } = await requireUser(req, ["admin"]);
    if (req.method === "GET") return sendJson(res, 200, { users: Object.values(store.users).map(publicUser) });
    if (req.method !== "PATCH") return methodNotAllowed(res);

    const data = await readJson(req);
    const email = String(data.email || "").trim().toLowerCase();
    const role = String(data.role || "");
    if (!allowedRoles.has(role)) return sendJson(res, 400, { error: "invalid_role", message: "Некорректная роль." });
    if (!store.users[email]) return sendJson(res, 404, { error: "not_found", message: "Пользователь не найден." });
    if (store.users[email].role === "admin") return sendJson(res, 403, { error: "admin_locked", message: "Роль администратора нельзя менять здесь." });

    store.users[email] = { ...store.users[email], role, updatedAt: new Date().toISOString() };
    await saveStore(store);
    sendJson(res, 200, { user: publicUser(store.users[email]) });
  } catch (error) {
    handleError(res, error);
  }
};
