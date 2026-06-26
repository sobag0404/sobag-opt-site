const { getCatalogDbClient } = require("./_lib/catalog-db-client");
const { loadCatalogProducts } = require("./_lib/catalog-source");
const { handleError, methodNotAllowed, sendJson } = require("./_lib/http");
const { collectPriceGroups, collectPriceGroupsFromProducts, priceListCsv, priceListRows, publicPriceGroup } = require("./_lib/price-groups");

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

function compactPayload(fields = {}) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function optionalBoolean(value) {
  const prepared = text(value).toLowerCase();
  if (!prepared) return undefined;
  return prepared !== "false";
}

async function loadDbRecords(client) {
  const result = await client.query(
    `SELECT
       p.id AS product_id,
       p.base_sku,
       p.name AS product_name,
       p.payload->>'priceGroup' AS product_price_group,
       p.payload->>'priceGroupName' AS product_price_group_name,
       p.payload->'pricePromos' AS product_price_promos,
       p.payload->'promoPrices' AS product_promo_prices,
       p.payload->'promos' AS product_promos,
       v.id AS variant_id,
       v.sku,
       v.type,
       v.size,
       v.material,
       v.price,
       v.payload->>'priceGroup' AS variant_price_group,
       v.payload->>'promoPrice' AS variant_promo_price,
       v.payload->>'salePrice' AS variant_sale_price,
       v.payload->>'actionPrice' AS variant_action_price,
       v.payload->>'promoActive' AS variant_promo_active,
       v.payload->>'saleActive' AS variant_sale_active,
       v.payload->>'active' AS variant_active,
       v.payload->>'promoStart' AS variant_promo_start,
       v.payload->>'saleStart' AS variant_sale_start,
       v.payload->>'startsAt' AS variant_starts_at,
       v.payload->>'promoEnd' AS variant_promo_end,
       v.payload->>'saleEnd' AS variant_sale_end,
       v.payload->>'endsAt' AS variant_ends_at
      FROM products p
      JOIN variants v ON v.product_id = p.id
      WHERE p.status = 'published'
       AND p.hidden = false
       AND v.price > 0
     ORDER BY v.type ASC, v.material ASC, v.size ASC, v.sku ASC`
  );
  return (result.rows || []).map((row) => ({
    product: {
      ...compactPayload({
        priceGroup: row.product_price_group,
        priceGroupName: row.product_price_group_name,
        pricePromos: payload(row.product_price_promos),
        promoPrices: payload(row.product_promo_prices),
        promos: payload(row.product_promos),
      }),
      id: text(row.product_id),
      baseSku: text(row.base_sku),
      name: text(row.product_name),
    },
    variant: {
      ...compactPayload({
        priceGroup: row.variant_price_group,
        promoPrice: row.variant_promo_price,
        salePrice: row.variant_sale_price,
        actionPrice: row.variant_action_price,
        promoActive: optionalBoolean(row.variant_promo_active),
        saleActive: optionalBoolean(row.variant_sale_active),
        active: optionalBoolean(row.variant_active),
        promoStart: row.variant_promo_start,
        saleStart: row.variant_sale_start,
        startsAt: row.variant_starts_at,
        promoEnd: row.variant_promo_end,
        saleEnd: row.variant_sale_end,
        endsAt: row.variant_ends_at,
      }),
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
    const includeSkus = url.searchParams.get("includeSkus") === "1";
    const result = await loadPriceGroups();
    const rows = priceListRows(result.groups, { includeSkus });
    const groups = includeSkus ? result.groups : result.groups.map(publicPriceGroup);
    if (format === "json") {
      return sendJson(
        res,
        200,
        { ...result, groups, rows },
        { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" }
      );
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="sobag-price-list.csv"');
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    res.end(priceListCsv(rows, { includeSkus }));
  } catch (error) {
    handleError(res, error, req);
  }
};
