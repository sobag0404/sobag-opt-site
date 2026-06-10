const { createSession, hashPassword, isValidEmail, normalizeEmail, normalizePhone, publicUser } = require("../_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { getStore, saveStore } = require("../_lib/store");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);
  try {
    const data = await readJson(req);
    const email = normalizeEmail(data.email);
    const password = String(data.password || "");
    const name = String(data.name || "").trim();
    const phone = normalizePhone(data.phone);

    if (!isValidEmail(email)) return sendJson(res, 400, { error: "invalid_email", message: "Проверьте email." });
    if (!password || password.length < 6) return sendJson(res, 400, { error: "weak_password", message: "Пароль должен быть не короче 6 символов." });
    if (!name || !phone) return sendJson(res, 400, { error: "missing_profile", message: "Укажите имя и телефон." });
    if (!data.personalDataConsent) {
      return sendJson(res, 400, { error: "missing_consent", message: "Подтвердите согласие на обработку персональных данных." });
    }

    const store = await getStore();
    if (store.users[email]?.passwordHash) {
      return sendJson(res, 409, { error: "email_exists", message: "Этот email уже зарегистрирован в системе." });
    }

    store.users[email] = {
      ...(store.users[email] || {}),
      email,
      name,
      phone,
      role: store.users[email]?.role || "buyer",
      createdAt: store.users[email]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      personalDataConsent: true,
      consentAt: new Date().toISOString(),
      consentTextVersion: "personal-data-consent-2026-05-29",
      ...hashPassword(password),
    };

    await saveStore(store);
    await createSession(res, email);
    sendJson(res, 201, { user: publicUser(store.users[email]) });
  } catch (error) {
    handleError(res, error, req);
  }
};
