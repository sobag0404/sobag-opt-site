const { checkStoreRateLimit } = require("../_lib/api-security");
const { createSession, ensureBootstrapAdmin, normalizeEmail, normalizePhone, publicUser, verifyPassword } = require("../_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { getStore } = require("../_lib/store");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);
  try {
    const data = await readJson(req);
    const login = String(data.login || data.email || "").trim();
    const limited = await checkStoreRateLimit(req, { key: `auth:login:${normalizeEmail(login) || normalizePhone(login)}`, limit: 8, windowMs: 5 * 60_000 });
    if (limited) throw limited;
    let email = normalizeEmail(login);
    const password = String(data.password || "");
    const store = await ensureBootstrapAdmin(await getStore());
    let user = store.users[email];

    if (!user) {
      const phone = normalizePhone(login);
      const found = Object.entries(store.users).find(([, item]) => normalizePhone(item.phone) === phone);
      if (found) {
        email = found[0];
        user = found[1];
      }
    }

    if (!user || !verifyPassword(password, user)) {
      return sendJson(res, 401, { error: "invalid_credentials", message: "Проверьте логин и пароль." });
    }

    await createSession(res, email);
    sendJson(res, 200, { user: publicUser(user) });
  } catch (error) {
    handleError(res, error, req);
  }
};
