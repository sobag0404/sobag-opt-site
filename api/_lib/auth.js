const crypto = require("crypto");
const { getSession, getStore, saveSession, saveStore } = require("./store");

const SESSION_COOKIE = "sobag_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const ITERATIONS = 310000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email === "admin@sobag";
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
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
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
  if (!email || !password || store.users[email]) return store;
  const passwordData = hashPassword(password);
  store.users[email] = {
    email,
    name: process.env.SOBAG_ADMIN_NAME || "Администратор",
    phone: process.env.SOBAG_ADMIN_PHONE || "",
    role: "admin",
    createdAt: new Date().toISOString(),
    ...passwordData,
  };
  await saveStore(store);
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
  publicUser,
  requireUser,
  verifyPassword,
};
