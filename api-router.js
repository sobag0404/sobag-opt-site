const { methodNotAllowed, sendJson } = require("./api/_lib/http");

const apiRoutes = new Map(
  [
    ["/api/catalog", "./server-routes/catalog.js"],
    ["/api/catalog-query", "./server-routes/catalog-query.js"],
    ["/api/catalog-detail", "./server-routes/catalog-detail.js"],
    ["/api/content", "./server-routes/content.js"],
    ["/api/health", "./server-routes/health.js"],
    ["/api/orders", "./server-routes/orders.js"],
    ["/api/auth/login", "./server-routes/auth/login.js"],
    ["/api/auth/logout", "./server-routes/auth/logout.js"],
    ["/api/auth/me", "./server-routes/auth/me.js"],
    ["/api/auth/register", "./server-routes/auth/register.js"],
    ["/api/admin/catalog", "./server-routes/admin/catalog.js"],
    ["/api/admin/content", "./server-routes/admin/content.js"],
    ["/api/admin/import-batches", "./server-routes/admin/import-batches.js"],
    ["/api/admin/orders", "./server-routes/admin/orders.js"],
    ["/api/admin/pim", "./server-routes/admin/pim.js"],
    ["/api/admin/product-images", "./server-routes/admin/product-images.js"],
    ["/api/admin/users", "./server-routes/admin/users.js"],
  ].map(([route, file]) => [route, require(file)])
);

function routeKey(pathname) {
  const normalized = String(pathname || "").length > 1 ? String(pathname || "").replace(/\/+$/, "") : pathname;
  return normalized || "/";
}

function requestPath(req) {
  return new URL(req.url || "/", `http://${req.headers.host || "localhost"}`).pathname;
}

async function handleApiRequest(req, res, pathname = requestPath(req)) {
  const handler = apiRoutes.get(routeKey(pathname));
  if (!handler) {
    if (req.method && req.method !== "GET") return methodNotAllowed(res);
    return sendJson(res, 404, { error: "not_found", message: "API route not found." });
  }
  return handler(req, res);
}

module.exports = { apiRoutes, handleApiRequest, routeKey };
