const { requireUser } = require("../_lib/auth");
const { getCatalogDbClient } = require("../_lib/catalog-db-client");
const { loadCatalogProducts } = require("../_lib/catalog-source");
const { saveCatalog } = require("../_lib/store");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const {
  applyPriceChangesToDb,
  applyPriceChangesToProducts,
  collectPriceGroups,
  collectPriceGroupsFromProducts,
  parsePriceImportRows,
  priceListCsv,
  priceListRows,
  productVariantRecords,
} = require("../_lib/price-groups");

function text(value) {
  return String(value || "").trim();
}

function parseUrl(req) {
  return new URL(req.url || "/api/admin/prices", `http://${req.headers.host || "localhost"}`);
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

async function loadPriceContext() {
  const dbClient = getCatalogDbClient();
  if (dbClient) {
    const records = await loadDbRecords(dbClient);
    return { source: "postgres", dbClient, records, groups: collectPriceGroups(records) };
  }
  const catalog = await loadCatalogProducts();
  const products = catalog.products;
  const records = productVariantRecords(products);
  return { source: catalog.source, products, records, groups: collectPriceGroupsFromProducts(products), updatedAt: catalog.updatedAt };
}

function importRows(data = {}) {
  if (Array.isArray(data.rows)) return data.rows;
  if (typeof data.csv === "string") return data.csv;
  return [];
}

function templateCsv() {
  return priceListCsv([
    {
      type: "base",
      label: "Подушка Велюр 40x40",
      price: 220,
      skuCount: "",
      productCount: "",
      skus: "",
      promoStartsAt: "",
      promoEndsAt: "",
    },
    {
      type: "promo",
      label: "Акция Подушка Велюр 40x40",
      price: 199,
      skuCount: "",
      productCount: "",
      skus: "",
      promoStartsAt: "2026-01-01",
      promoEndsAt: "2026-01-31",
    },
  ]);
}

function sendCsv(res, filename, csv) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
  res.end(csv);
}

module.exports = async function handler(req, res) {
  try {
    const { user } = await requireUser(req, ["admin", "content"]);
    const url = parseUrl(req);
    if (req.method === "GET") {
      if (url.searchParams.get("template") === "1") return sendCsv(res, "sobag-price-import-template.csv", templateCsv());
      const context = await loadPriceContext();
      const rows = priceListRows(context.groups);
      if (text(url.searchParams.get("format")).toLowerCase() === "csv") return sendCsv(res, "sobag-admin-price-groups.csv", priceListCsv(rows));
      return sendJson(res, 200, { source: context.source, updatedAt: context.updatedAt || null, groups: context.groups, rows });
    }
    if (req.method !== "POST") return methodNotAllowed(res);

    const data = await readJson(req, { maxBytes: 2 * 1024 * 1024 });
    const action = text(data.action || "preview").toLowerCase();
    const context = await loadPriceContext();
    const preview = parsePriceImportRows(context.records, importRows(data));
    if (action === "preview") {
      return sendJson(res, preview.errors.length ? 400 : 200, { ...preview, source: context.source });
    }
    if (action !== "apply") return sendJson(res, 400, { error: "unknown_action", message: "Unknown admin price action." });
    if (preview.errors.length) return sendJson(res, 400, { ...preview, source: context.source });
    if (!preview.changes.length) return sendJson(res, 400, { error: "empty_price_import", message: "No price changes to apply." });
    if (context.dbClient) {
      const applied = await applyPriceChangesToDb(context.dbClient, preview.changes);
      return sendJson(res, 200, { source: "postgres", applied, changes: preview.changes.length, updatedBy: user.email });
    }
    const products = context.products;
    const nextProducts = applyPriceChangesToProducts(products, preview.changes);
    const saved = await saveCatalog(nextProducts, user.email, { source: "admin-price-import", updatedAt: new Date().toISOString() });
    return sendJson(res, 200, { source: context.source, count: nextProducts.length, updatedAt: saved.updatedAt, changes: preview.changes.length });
  } catch (error) {
    handleError(res, error, req);
  }
};
