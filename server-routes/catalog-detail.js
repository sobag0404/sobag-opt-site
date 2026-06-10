const { findProductDetail } = require("./_lib/catalog-query");
const { loadCatalogProducts } = require("./_lib/catalog-source");
const { handleError, methodNotAllowed, sendJson } = require("./_lib/http");

function text(value) {
  return String(value || "").trim();
}

function parseUrl(req) {
  return new URL(req.url || "/api/catalog-detail", `http://${req.headers.host || "localhost"}`);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  try {
    const url = parseUrl(req);
    const lookup = {
      id: text(url.searchParams.get("id")),
      baseSku: text(url.searchParams.get("baseSku")),
      sku: text(url.searchParams.get("sku")),
    };
    if (!lookup.id && !lookup.baseSku && !lookup.sku) {
      return sendJson(res, 400, { error: "missing_product_lookup", message: "Provide id, baseSku, or sku." });
    }

    const catalog = await loadCatalogProducts();
    const product = findProductDetail(catalog.products, lookup);
    if (!product) return sendJson(res, 404, { error: "product_not_found", message: "Product not found." });
    return sendJson(res, 200, {
      product,
      updatedAt: catalog.updatedAt,
      source: catalog.source,
    }, { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" });
  } catch (error) {
    return handleError(res, error, req);
  }
};
