const { methodNotAllowed, sendJson } = require("./api/_lib/http");
const catalog = require("./server-routes/catalog.js");
const catalogQuery = require("./server-routes/catalog-query.js");
const catalogDetail = require("./server-routes/catalog-detail.js");
const content = require("./server-routes/content.js");
const health = require("./server-routes/health.js");
const orders = require("./server-routes/orders.js");
const authLogin = require("./server-routes/auth/login.js");
const authLogout = require("./server-routes/auth/logout.js");
const authMe = require("./server-routes/auth/me.js");
const authRegister = require("./server-routes/auth/register.js");
const adminCatalog = require("./server-routes/admin/catalog.js");
const adminContent = require("./server-routes/admin/content.js");
const adminImportBatches = require("./server-routes/admin/import-batches.js");
const adminOrders = require("./server-routes/admin/orders.js");
const adminPim = require("./server-routes/admin/pim.js");
const adminProductImages = require("./server-routes/admin/product-images.js");
const adminUsers = require("./server-routes/admin/users.js");

const apiRoutes = new Map(
  [
    ["/api/catalog", catalog],
    ["/api/catalog-query", catalogQuery],
    ["/api/catalog-detail", catalogDetail],
    ["/api/content", content],
    ["/api/health", health],
    ["/api/orders", orders],
    ["/api/auth/login", authLogin],
    ["/api/auth/logout", authLogout],
    ["/api/auth/me", authMe],
    ["/api/auth/register", authRegister],
    ["/api/admin/catalog", adminCatalog],
    ["/api/admin/content", adminContent],
    ["/api/admin/import-batches", adminImportBatches],
    ["/api/admin/orders", adminOrders],
    ["/api/admin/pim", adminPim],
    ["/api/admin/product-images", adminProductImages],
    ["/api/admin/users", adminUsers],
  ]
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
