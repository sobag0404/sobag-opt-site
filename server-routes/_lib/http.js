const crypto = require("crypto");

function sendJson(res, status, payload, headers = {}) {
  res.statusCode = status;
  Object.entries({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  }).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(payload));
}

function methodNotAllowed(res) {
  sendJson(res, 405, { error: "method_not_allowed", message: "Метод не поддерживается." });
}

const DEFAULT_JSON_MAX_BYTES = Number(process.env.SOBAG_JSON_MAX_BYTES || 256 * 1024);

function payloadTooLarge(maxBytes) {
  const error = new Error("Payload too large.");
  error.statusCode = 413;
  error.code = "payload_too_large";
  error.publicMessage = "Request payload is too large.";
  error.maxBytes = maxBytes;
  return error;
}

async function readJson(req, options = {}) {
  const maxBytes = Math.max(1, Number(options.maxBytes || DEFAULT_JSON_MAX_BYTES));
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    if (Buffer.byteLength(req.body, "utf8") > maxBytes) throw payloadTooLarge(maxBytes);
    try {
      return JSON.parse(req.body);
    } catch {
      const error = new Error("Некорректный JSON.");
      error.statusCode = 400;
      error.code = "invalid_json";
      throw error;
    }
  }
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > maxBytes) throw payloadTooLarge(maxBytes);
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Некорректный JSON.");
    error.statusCode = 400;
    error.code = "invalid_json";
    throw error;
  }
}

function cleanLogText(value, limit = 500) {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, limit);
}

function requestId(req) {
  const headerValue = String(req?.headers?.["x-request-id"] || req?.headers?.["x-vercel-id"] || "").trim();
  const cleaned = headerValue.replace(/[^a-zA-Z0-9:._-]/g, "").slice(0, 120);
  if (cleaned) return cleaned;
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `req-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

function requestPath(req) {
  try {
    return new URL(req?.url || "/", `http://${req?.headers?.host || "localhost"}`).pathname;
  } catch {
    return "";
  }
}

function shouldLogError(status) {
  return status >= 500 || process.env.SOBAG_LOG_CLIENT_ERRORS === "1";
}

function logApiError(error, status, req, id) {
  if (!shouldLogError(status)) return;
  const payload = {
    level: "error",
    event: "api_error",
    at: new Date().toISOString(),
    requestId: id,
    method: String(req?.method || ""),
    path: requestPath(req),
    status,
    code: cleanLogText(error.code || "server_error", 80),
    message: cleanLogText(error.publicMessage || error.message || "Server error"),
  };
  if (process.env.NODE_ENV !== "production" && error.stack) {
    payload.stack = cleanLogText(error.stack, 4000);
  }
  try {
    console.error(JSON.stringify(payload));
  } catch {
    console.error("api_error");
  }
}

function handleError(res, error, req = null) {
  const status = error.statusCode || 500;
  const id = requestId(req);
  logApiError(error, status, req, id);
  res.setHeader("X-Sobag-Request-Id", id);
  sendJson(res, status, {
    error: error.code || "server_error",
    requestId: id,
    message: error.publicMessage || error.message || "Ошибка сервера.",
  });
}

module.exports = { DEFAULT_JSON_MAX_BYTES, handleError, methodNotAllowed, readJson, sendJson };
