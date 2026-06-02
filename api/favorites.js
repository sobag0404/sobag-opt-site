const { requireUser } = require("./_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("./_lib/http");
const { saveStore } = require("./_lib/store");

const MAX_FAVORITES = 5000;

function sanitizeFavorites(items) {
  return [...new Set((Array.isArray(items) ? items : []).map((item) => String(item || "").trim()).filter(Boolean))].slice(0, MAX_FAVORITES);
}

module.exports = async function handler(req, res) {
  try {
    const { store, user } = await requireUser(req, ["admin", "manager", "content", "buyer"]);
    const email = user.email;
    if (req.method === "GET") {
      return sendJson(res, 200, store.favorites[email] || { items: [], updatedAt: null });
    }
    if (req.method !== "PUT" && req.method !== "DELETE") return methodNotAllowed(res);

    if (req.method === "DELETE") {
      delete store.favorites[email];
      await saveStore(store);
      return sendJson(res, 200, { items: [], updatedAt: new Date().toISOString() });
    }

    const data = await readJson(req);
    const items = sanitizeFavorites(data.items || data.favorites || []);
    store.favorites[email] = {
      items,
      updatedAt: new Date().toISOString(),
    };
    await saveStore(store);
    sendJson(res, 200, store.favorites[email]);
  } catch (error) {
    handleError(res, error);
  }
};
