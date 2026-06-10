const staticProducts = require("../data/products-live.json");
const { findProductDetail } = require("./_lib/catalog-query");
const { handleError, methodNotAllowed, sendJson } = require("./_lib/http");
const { getCatalog } = require("./_lib/store");

function text(value) {
  return String(value || "").trim();
}

function parseUrl(req) {
  return new URL(req.url || "/api/catalog-detail", `http://${req.headers.host || "localhost"}`);
}

async function loadCatalogProducts() {
  try {
    const catalog = await getCatalog();
    if (catalog?.products?.length) return { products: catalog.products, updatedAt: catalog.updatedAt || null, source: "server" };
  } catch (error) {
    if (error.code !== "storage_not_configured") throw error;
  }
  return { products: staticProducts, updatedAt: null, source: "static" };
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
