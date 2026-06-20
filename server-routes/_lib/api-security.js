const SESSION_COOKIE = "sobag_session";
const DEFAULT_ROUTE_LIMIT = Number(process.env.SOBAG_RATE_LIMIT_ROUTE_MAX || 120);
const DEFAULT_WINDOW_MS = Number(process.env.SOBAG_RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_KEY_PREFIX = process.env.SOBAG_RATE_LIMIT_KEY_PREFIX || "sobag:rate-limit:v1";

const { getStoreClient } = require("./store");

const buckets = new Map();
let rateLimitGeneration = 0;

function requestIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim()
    .slice(0, 80);
}

function hasSessionCookie(req) {
  return String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .includes(SESSION_COOKIE);
}

function isUnsafeMethod(method) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "").toUpperCase());
}

function isLocalHostname(hostname) {
  return ["localhost", "127.0.0.1", "::1"].includes(String(hostname || "").toLowerCase());
}

function requestOrigin(req) {
  const host = String(req.headers.host || "localhost").toLowerCase();
  const proto = String(req.headers["x-forwarded-proto"] || (isLocalHostname(host.split(":")[0]) ? "http" : "https")).split(",")[0];
  return new URL(`${proto}://${host}`);
}

function sourceOrigin(req) {
  const value = String(req.headers.origin || req.headers.referer || "").trim();
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function sameOrigin(req) {
  const expected = requestOrigin(req);
  const source = sourceOrigin(req);
  if (!source) return null;
  return source.protocol === expected.protocol && source.host === expected.host;
}

function enforceSameOriginForCookieMutation(req) {
  if (!isUnsafeMethod(req.method) || !hasSessionCookie(req)) return null;
  const expected = requestOrigin(req);
  const local = isLocalHostname(expected.hostname);
  const matched = sameOrigin(req);
  if (matched === true || (matched === null && local)) return null;
  const error = new Error("Cross-origin authenticated mutation is not allowed.");
  error.statusCode = 403;
  error.code = "csrf_origin_forbidden";
  error.publicMessage = "Cross-origin request is not allowed.";
  return error;
}

function rateLimitMax(kind, fallback) {
  if (process.env.SOBAG_RATE_LIMIT_TEST === "1") return Math.min(fallback, Number(process.env.SOBAG_RATE_LIMIT_TEST_MAX || 3));
  return fallback;
}

function checkRateLimit(req, { key, limit = DEFAULT_ROUTE_LIMIT, windowMs = DEFAULT_WINDOW_MS } = {}) {
  const now = Date.now();
  const bucketKey = `${key || "global"}:${requestIp(req)}`;
  const current = buckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return null;
  }
  current.count += 1;
  if (current.count <= rateLimitMax("route", limit)) return null;
  const error = new Error("Too many requests.");
  error.statusCode = 429;
  error.code = "rate_limited";
  error.publicMessage = "Too many requests. Try again later.";
  error.retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return error;
}

function rateLimitStoreMode() {
  return String(process.env.SOBAG_RATE_LIMIT_STORE || "store").trim().toLowerCase();
}

function rateLimitStoreKey(bucketKey) {
  return `${RATE_LIMIT_KEY_PREFIX}:${rateLimitGeneration}:${Buffer.from(bucketKey, "utf8").toString("base64url")}`;
}

function rateLimitError(resetAt) {
  const error = new Error("Too many requests.");
  error.statusCode = 429;
  error.code = "rate_limited";
  error.publicMessage = "Too many requests. Try again later.";
  error.retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return error;
}

async function checkStoreRateLimit(req, { key, limit = DEFAULT_ROUTE_LIMIT, windowMs = DEFAULT_WINDOW_MS } = {}) {
  if (rateLimitStoreMode() === "memory") return checkRateLimit(req, { key, limit, windowMs });
  const now = Date.now();
  const bucketKey = `${key || "global"}:${requestIp(req)}`;
  const resetAt = now + windowMs;
  try {
    const store = getStoreClient();
    const storeKey = rateLimitStoreKey(bucketKey);
    const current = await store.get(storeKey);
    const record = current && typeof current === "object" && Number(current.resetAt) > now ? current : { count: 0, resetAt };
    const next = { count: Number(record.count || 0) + 1, resetAt: Number(record.resetAt || resetAt) };
    await store.set(storeKey, next, { ex: Math.max(1, Math.ceil((next.resetAt - now) / 1000)) });
    if (next.count <= rateLimitMax("route", limit)) return null;
    return rateLimitError(next.resetAt);
  } catch (error) {
    if (process.env.SOBAG_RATE_LIMIT_FAIL_CLOSED === "1") {
      error.statusCode = error.statusCode || 503;
      error.code = error.code || "rate_limit_store_unavailable";
      error.publicMessage = "Rate limit storage is unavailable.";
      return error;
    }
    return checkRateLimit(req, { key, limit, windowMs });
  }
}

function resetRateLimits() {
  buckets.clear();
  rateLimitGeneration += 1;
}

module.exports = {
  checkRateLimit,
  checkStoreRateLimit,
  enforceSameOriginForCookieMutation,
  isUnsafeMethod,
  rateLimitMax,
  requestIp,
  resetRateLimits,
};
