const { createSession, ensureBootstrapAdmin, normalizeEmail, publicUser, verifyPassword } = require("../_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { getStore } = require("../_lib/store");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);
  try {
    const data = await readJson(req);
    const email = normalizeEmail(data.email);
    const password = String(data.password || "");
    const store = await ensureBootstrapAdmin(await getStore());
    const user = store.users[email];

    if (!user || !verifyPassword(password, user)) {
      return sendJson(res, 401, { error: "invalid_credentials", message: "Проверьте email и пароль." });
    }

    await createSession(res, email);
    sendJson(res, 200, { user: publicUser(user) });
  } catch (error) {
    handleError(res, error, req);
  }
};
