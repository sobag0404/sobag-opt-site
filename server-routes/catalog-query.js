const { queryCatalog, paramsToQuery } = require("./_lib/catalog-query");
const { getCatalogDbClient } = require("./_lib/catalog-db-client");
const { queryCatalogFromDb } = require("./_lib/catalog-db-source");
const { loadCatalogProducts } = require("./_lib/catalog-source");
const { handleError, methodNotAllowed, sendJson } = require("./_lib/http");

function parseUrl(req) {
  return new URL(req.url || "/api/catalog-query", `http://${req.headers.host || "localhost"}`);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  try {
    const url = parseUrl(req);
    const dbClient = getCatalogDbClient();
    if (dbClient) {
      const result = await queryCatalogFromDb(dbClient, paramsToQuery(url));
      return sendJson(res, 200, {
        ...result,
        updatedAt: null,
        source: "postgres",
      }, { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" });
    }
    const catalog = await loadCatalogProducts();
    const result = queryCatalog(catalog.products, paramsToQuery(url));
    return sendJson(res, 200, {
      ...result,
      updatedAt: catalog.updatedAt,
      source: catalog.source,
    }, { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" });
  } catch (error) {
    return handleError(res, error, req);
  }
};
