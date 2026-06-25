const { checkStoreRateLimit } = require("./_lib/api-security");
const { handleError, methodNotAllowed, readJson, sendJson } = require("./_lib/http");
const { getStoreClient } = require("./_lib/store");

const RUM_KEY = process.env.SOBAG_RUM_KEY || "sobag:rum:v1";
const MAX_EVENTS = 12;
const MAX_VALUE = 120_000;
const MAX_GROUPS = 240;
const MAX_SAMPLES_PER_GROUP = 160;
const VALID_METRICS = new Set(["LCP", "CLS", "INP", "FCP", "TTFB", "NAV_LOAD"]);
const VALID_RATINGS = new Set(["good", "needs-improvement", "poor", "unknown"]);
const VALID_DEVICES = new Set(["mobile", "tablet", "desktop", "unknown"]);
const VALID_CONNECTIONS = new Set(["slow-2g", "2g", "3g", "4g", "wifi", "ethernet", "cellular", "unknown"]);

function publicError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.publicMessage = message;
  return error;
}

function normalizeRoute(value) {
  let pathname = "/";
  try {
    const raw = String(value || "/").trim() || "/";
    pathname = raw.startsWith("http") ? new URL(raw).pathname : new URL(raw, "https://sobag-shop.online").pathname;
  } catch {
    pathname = "/";
  }
  pathname = pathname.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  if (pathname.startsWith("/admin")) return "/admin";
  if (pathname.startsWith("/api")) return "/api";
  if (pathname.startsWith("/account")) return "/account";
  if (pathname.startsWith("/cart")) return "/cart";
  if (pathname.startsWith("/product")) return "/product";
  if (pathname.startsWith("/catalog")) return "/catalog";
  if (pathname.startsWith("/search")) return "/search";
  if (/^\/(?:business|wholesale|delivery|payment|contacts|about|marketplaces|terms|custom|privacy|returns|how-to-order|seller-support|quotes|favorites)(?:\.html)?$/.test(pathname)) {
    return pathname.replace(/\.html$/, "");
  }
  return pathname === "/" ? "/" : "/other";
}

function boundedString(value, fallback, allowed) {
  const prepared = String(value || fallback || "unknown").toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 48) || fallback;
  return allowed && !allowed.has(prepared) ? fallback : prepared;
}

function ratingFor(name, value) {
  if (name === "CLS") return value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor";
  if (name === "INP") return value <= 200 ? "good" : value <= 500 ? "needs-improvement" : "poor";
  if (["LCP", "NAV_LOAD"].includes(name)) return value <= 2500 ? "good" : value <= 4000 ? "needs-improvement" : "poor";
  if (name === "FCP") return value <= 1800 ? "good" : value <= 3000 ? "needs-improvement" : "poor";
  if (name === "TTFB") return value <= 800 ? "good" : value <= 1800 ? "needs-improvement" : "poor";
  return "unknown";
}

function normalizeEvent(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw publicError(400, "invalid_rum_event", "Invalid RUM event.");
  const name = String(input.name || "").toUpperCase();
  if (!VALID_METRICS.has(name)) throw publicError(400, "invalid_rum_metric", "Invalid RUM metric.");
  const value = Number(input.value);
  if (!Number.isFinite(value) || value < 0 || value > MAX_VALUE) throw publicError(400, "invalid_rum_value", "Invalid RUM value.");
  const route = normalizeRoute(input.route);
  const device = boundedString(input.device, "unknown", VALID_DEVICES);
  const connection = boundedString(input.connection, "unknown", VALID_CONNECTIONS);
  const rating = VALID_RATINGS.has(String(input.rating || "").toLowerCase()) ? String(input.rating).toLowerCase() : ratingFor(name, value);
  const appVersion = String(input.appVersion || "").replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 64);
  return {
    name,
    value: Math.round(value * 1000) / 1000,
    rating,
    route,
    device,
    connection,
    appVersion,
  };
}

function normalizePayload(payload) {
  const rawEvents = Array.isArray(payload?.events) ? payload.events : payload?.name ? [payload] : [];
  if (!rawEvents.length || rawEvents.length > MAX_EVENTS) throw publicError(400, "invalid_rum_payload", "Invalid RUM payload.");
  return rawEvents.map(normalizeEvent);
}

function quantile(values, percentile) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1));
  return Math.round(sorted[index] * 1000) / 1000;
}

function emptySummary() {
  return {
    version: 1,
    updatedAt: "",
    totalEvents: 0,
    groups: {},
  };
}

function normalizeSummary(value) {
  const summary = value && typeof value === "object" && !Array.isArray(value) ? value : emptySummary();
  return {
    version: 1,
    updatedAt: String(summary.updatedAt || ""),
    totalEvents: Number(summary.totalEvents || 0),
    groups: summary.groups && typeof summary.groups === "object" && !Array.isArray(summary.groups) ? summary.groups : {},
  };
}

function compactGroup(group) {
  const samples = Array.isArray(group.samples) ? group.samples.filter((value) => Number.isFinite(Number(value))).map(Number).slice(-MAX_SAMPLES_PER_GROUP) : [];
  return {
    count: Number(group.count || 0),
    sum: Math.round(Number(group.sum || 0) * 1000) / 1000,
    min: Number.isFinite(Number(group.min)) ? Number(group.min) : 0,
    max: Number.isFinite(Number(group.max)) ? Number(group.max) : 0,
    p75: quantile(samples, 75),
    good: Number(group.good || 0),
    needsImprovement: Number(group.needsImprovement || 0),
    poor: Number(group.poor || 0),
    samples,
  };
}

function mergeEvents(summary, events) {
  const next = normalizeSummary(summary);
  next.updatedAt = new Date().toISOString();
  next.totalEvents += events.length;
  for (const event of events) {
    const key = [event.route, event.device, event.connection, event.name].join("|");
    const group = compactGroup(next.groups[key] || {});
    group.count += 1;
    group.sum = Math.round((group.sum + event.value) * 1000) / 1000;
    group.min = group.count === 1 || group.min === 0 ? event.value : Math.min(group.min, event.value);
    group.max = Math.max(group.max, event.value);
    if (event.rating === "good") group.good += 1;
    else if (event.rating === "needs-improvement") group.needsImprovement += 1;
    else if (event.rating === "poor") group.poor += 1;
    group.samples.push(event.value);
    group.samples = group.samples.slice(-MAX_SAMPLES_PER_GROUP);
    group.p75 = quantile(group.samples, 75);
    next.groups[key] = group;
  }
  const entries = Object.entries(next.groups);
  if (entries.length > MAX_GROUPS) {
    next.groups = Object.fromEntries(entries.sort((a, b) => Number(b[1].count || 0) - Number(a[1].count || 0)).slice(0, MAX_GROUPS));
  }
  return next;
}

function safePublicSummary(summary) {
  const normalized = normalizeSummary(summary);
  const groups = Object.entries(normalized.groups)
    .map(([key, group]) => {
      const [route, device, connection, name] = key.split("|");
      const compact = compactGroup(group);
      return {
        route,
        device,
        connection,
        name,
        count: compact.count,
        p75: compact.p75,
        avg: compact.count ? Math.round((compact.sum / compact.count) * 1000) / 1000 : 0,
        good: compact.good,
        needsImprovement: compact.needsImprovement,
        poor: compact.poor,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 40);
  return {
    version: normalized.version,
    updatedAt: normalized.updatedAt,
    totalEvents: normalized.totalEvents,
    groups,
  };
}

async function saveRumEvents(events) {
  const store = getStoreClient();
  const current = normalizeSummary(await store.get(RUM_KEY));
  const next = mergeEvents(current, events);
  await store.set(RUM_KEY, next);
  return safePublicSummary(next);
}

async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);
  try {
    const rateError = await checkStoreRateLimit(req, { key: "route:/api/rum:public", limit: Number(process.env.SOBAG_RUM_RATE_LIMIT_MAX || 60), windowMs: 60_000 });
    if (rateError) throw rateError;
    const payload = await readJson(req, { maxBytes: Number(process.env.SOBAG_RUM_MAX_BYTES || 4096) });
    const events = normalizePayload(payload);
    await saveRumEvents(events);
    return sendJson(res, 202, { ok: true, accepted: events.length });
  } catch (error) {
    return handleError(res, error, req);
  }
}

module.exports = handler;
module.exports.RUM_KEY = RUM_KEY;
module.exports.mergeEvents = mergeEvents;
module.exports.normalizeEvent = normalizeEvent;
module.exports.normalizePayload = normalizePayload;
module.exports.safePublicSummary = safePublicSummary;
