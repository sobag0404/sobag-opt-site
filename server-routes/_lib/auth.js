const crypto = require("crypto");
const { getSession, getStore, saveSession, saveStore } = require("./store");

const SESSION_COOKIE = "sobag_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const ITERATIONS = 310000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";
const BOOTSTRAP_OWNER_EMAIL = "admin@sobag";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email === BOOTSTRAP_OWNER_EMAIL;
}

function normalizePhone(phone) {
  const raw = String(phone || "").trim();
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("8") && digits.length === 11) digits = `7${digits.slice(1)}`;
  if (digits.startsWith("7")) {
    const main = digits.slice(1, 11);
    let formatted = "+7";
    if (main.length) formatted += ` ${main.slice(0, 3)}`;
    if (main.length > 3) formatted += ` ${main.slice(3, 6)}`;
    if (main.length > 6) formatted += `-${main.slice(6, 8)}`;
    if (main.length > 8) formatted += `-${main.slice(8, 10)}`;
    if (main.length > 10) formatted += ` ${main.slice(10)}`;
    return formatted;
  }
  const countryLength = ["1", "7"].includes(digits[0]) ? 1 : digits.length > 11 ? 3 : digits.length > 10 ? 2 : 1;
  const country = digits.slice(0, countryLength);
  const groups = digits.slice(countryLength).match(/\d{1,3}/g) || [];
  return [`+${country}`, ...groups].join(" ");
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, passwordSalt, ...safe } = user;
  return safe;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return { passwordHash: hash, passwordSalt: salt };
}

function verifyPassword(password, user) {
  if (!user?.passwordHash || !user?.passwordSalt) return false;
  const next = hashPassword(password, user.passwordSalt).passwordHash;
  return crypto.timingSafeEqual(Buffer.from(next, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function parseCookies(req) {
  const cookies = {};
  String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const index = part.indexOf("=");
      if (index <= 0) return;
      try {
        cookies[decodeURIComponent(part.slice(0, index))] = decodeURIComponent(part.slice(index + 1));
      } catch {
        // Ignore malformed cookie fragments and continue with the rest.
      }
    });
  return cookies;
}

function sessionCookie(token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

function expiredSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

async function createSession(res, email) {
  const token = crypto.randomBytes(32).toString("hex");
  await saveSession(token, { email, createdAt: new Date().toISOString() }, SESSION_TTL_SECONDS);
  res.setHeader("Set-Cookie", sessionCookie(token));
}

async function currentUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  const session = await getSession(token);
  if (!session?.email) return { token, user: null, store: await getStore() };
  const store = await ensureBootstrapAdmin(await getStore());
  return { token, store, user: store.users[session.email] || null };
}

async function requireUser(req, roles = []) {
  const context = await currentUser(req);
  if (!context.user) {
    const error = new Error("Нужно войти в аккаунт.");
    error.statusCode = 401;
    error.code = "unauthorized";
    throw error;
  }
  if (roles.length && !roles.includes(context.user.role)) {
    const error = new Error("Недостаточно прав.");
    error.statusCode = 403;
    error.code = "forbidden";
    throw error;
  }
  return context;
}

async function ensureBootstrapAdmin(store) {
  const email = normalizeEmail(process.env.SOBAG_ADMIN_EMAIL);
  const password = process.env.SOBAG_ADMIN_PASSWORD;
  if (!email || !password) return store;
  const now = new Date().toISOString();
  const passwordData = hashPassword(password);
  let changed = false;

  [email, BOOTSTRAP_OWNER_EMAIL].forEach((targetEmail) => {
    const existing = store.users[targetEmail] || {};
    const next = {
      ...existing,
      email: targetEmail,
      name: existing.name || process.env.SOBAG_ADMIN_NAME || "Администратор",
      phone: normalizePhone(existing.phone || process.env.SOBAG_ADMIN_PHONE || ""),
      role: "admin",
      owner: Boolean(existing.owner || targetEmail === BOOTSTRAP_OWNER_EMAIL),
      createdAt: existing.createdAt || now,
      ...(existing.passwordHash && existing.passwordSalt ? {} : passwordData),
    };
    if (JSON.stringify(existing) !== JSON.stringify(next)) {
      store.users[targetEmail] = next;
      changed = true;
    }
  });

  if (changed) await saveStore(store);
  return store;
}

module.exports = {
  createSession,
  currentUser,
  expiredSessionCookie,
  hashPassword,
  ensureBootstrapAdmin,
  isValidEmail,
  normalizeEmail,
  normalizePhone,
  publicUser,
  requireUser,
  verifyPassword,
};
