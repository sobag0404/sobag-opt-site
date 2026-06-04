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

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
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
  for await (const chunk of req) chunks.push(chunk);
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

function handleError(res, error) {
  const status = error.statusCode || 500;
  sendJson(res, status, {
    error: error.code || "server_error",
    message: error.publicMessage || error.message || "Ошибка сервера.",
  });
}

module.exports = { handleError, methodNotAllowed, readJson, sendJson };
