const { getCatalogDbClient } = require("./_lib/catalog-db-client");
const { loadCatalogProducts } = require("./_lib/catalog-source");
const { handleError, methodNotAllowed, sendJson } = require("./_lib/http");
const { collectPriceGroups, collectPriceGroupsFromProducts, priceListCsv, priceListRows } = require("./_lib/price-groups");

function parseUrl(req) {
  return new URL(req.url || "/api/price-list", `http://${req.headers.host || "localhost"}`);
}

function text(value) {
  return String(value || "").trim();
}

function payload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

async function loadDbRecords(client) {
  const result = await client.query(
    `SELECT
       p.id AS product_id,
       p.base_sku,
       p.name AS product_name,
       p.payload AS product_payload,
       v.id AS variant_id,
       v.sku,
       v.type,
       v.size,
       v.material,
       v.price,
       v.payload AS variant_payload
     FROM products p
     JOIN variants v ON v.product_id = p.id
     WHERE p.status = 'published'
       AND p.hidden = false
       AND v.price > 0
     ORDER BY v.type ASC, v.material ASC, v.size ASC, v.sku ASC`
  );
  return (result.rows || []).map((row) => ({
    product: {
      ...payload(row.product_payload),
      id: text(row.product_id),
      baseSku: text(row.base_sku),
      name: text(row.product_name),
    },
    variant: {
      ...payload(row.variant_payload),
      id: text(row.variant_id),
      productId: text(row.product_id),
      baseSku: text(row.base_sku),
      sku: text(row.sku),
      type: text(row.type),
      size: text(row.size),
      material: text(row.material),
      name: [row.product_name, row.type, row.size, row.material].map(text).filter(Boolean).join(" / "),
      price: Number(row.price || 0),
    },
  }));
}

async function loadPriceGroups() {
  const dbClient = getCatalogDbClient();
  if (dbClient) {
    return { source: "postgres", groups: collectPriceGroups(await loadDbRecords(dbClient)) };
  }
  const catalog = await loadCatalogProducts();
  return { source: catalog.source, updatedAt: catalog.updatedAt, groups: collectPriceGroupsFromProducts(catalog.products) };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  try {
    const url = parseUrl(req);
    const format = text(url.searchParams.get("format") || "csv").toLowerCase();
    const result = await loadPriceGroups();
    const rows = priceListRows(result.groups);
    if (format === "json") {
      return sendJson(
        res,
        200,
        { ...result, rows },
        { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" }
      );
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="sobag-price-list.csv"');
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    res.end(priceListCsv(rows));
  } catch (error) {
    handleError(res, error, req);
  }
};
