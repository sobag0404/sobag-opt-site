const SORT_COLUMNS = {
  relevance: "popular DESC, name ASC",
  popular: "popular DESC, name ASC",
  name: "name ASC",
  price_asc: "min_price ASC, name ASC",
  price_desc: "max_price DESC, name ASC",
  sku: "base_sku ASC",
};

const FILTER_COLUMNS = {
  category: "categories",
  collection: "collections",
  holiday: "holidays",
  tag: "tags",
};

const MAX_PAGE_SIZE = 120;
const DEFAULT_PAGE_SIZE = 48;

function text(value) {
  return String(value || "").trim();
}

function list(value) {
  const items = Array.isArray(value) ? value : text(value).split(text(value).includes(";") ? ";" : ",");
  return items.map(text).filter(Boolean);
}

function addParam(params, value) {
  params.push(value);
  return `$${params.length}`;
}

function pageSize(value) {
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Number(value || DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE));
}

function offsetValue(value) {
  return Math.max(0, Number(value || 0) || 0);
}

function buildWhere(query = {}, params = []) {
  const where = [];
  const q = text(query.q);
  if (q) {
    const param = addParam(params, `%${q}%`);
    where.push(`(base_sku ILIKE ${param} OR name ILIKE ${param} OR description ILIKE ${param})`);
  }

  Object.entries(FILTER_COLUMNS).forEach(([key, column]) => {
    const values = list(query.filters?.[key]);
    if (!values.length) return;
    where.push(`${column} && ${addParam(params, values)}::text[]`);
  });

  const minPrice = Number(query.minPrice || 0) || 0;
  const maxPrice = Number(query.maxPrice || 0) || 0;
  if (minPrice > 0) where.push(`max_price >= ${addParam(params, minPrice)}`);
  if (maxPrice > 0) where.push(`min_price <= ${addParam(params, maxPrice)}`);

  return where.length ? `WHERE ${where.join(" AND ")}` : "";
}

function buildCatalogCardsSql(query = {}) {
  const params = [];
  const where = buildWhere(query, params);
  const sort = SORT_COLUMNS[text(query.sort)] || SORT_COLUMNS.relevance;
  const limit = addParam(params, pageSize(query.pageSize));
  const offset = addParam(params, offsetValue(query.offset));
  return {
    sql: [
      "SELECT id, base_sku, name, description, stock, popular, min_price, max_price, variant_count, category, categories, collections, holidays, tags, image, image_meta",
      "FROM public_catalog_cards",
      where,
      `ORDER BY ${sort}`,
      `LIMIT ${limit} OFFSET ${offset}`,
    ]
      .filter(Boolean)
      .join(" "),
    params,
  };
}

function buildCatalogCountSql(query = {}) {
  const params = [];
  const where = buildWhere(query, params);
  return {
    sql: ["SELECT COUNT(*)::int AS total", "FROM public_catalog_cards", where].filter(Boolean).join(" "),
    params,
  };
}

function buildCatalogDetailSql(lookup = {}) {
  const params = [];
  const where = [];
  const id = text(lookup.id);
  const baseSku = text(lookup.baseSku);
  const sku = text(lookup.sku);
  if (id) where.push(`id = ${addParam(params, id)}`);
  if (baseSku) where.push(`base_sku = ${addParam(params, baseSku)}`);
  if (sku) {
    const skuParam = addParam(params, sku);
    where.push(`base_sku = ${skuParam} OR base_sku IN (SELECT base_sku FROM variants WHERE sku = ${skuParam})`);
  }
  if (!where.length) {
    const error = new Error("Missing product lookup");
    error.code = "missing_product_lookup";
    throw error;
  }
  return {
    product: {
      sql: ["SELECT *", "FROM public_catalog_products", `WHERE ${where.map((item) => `(${item})`).join(" OR ")}`, "LIMIT 1"].join(" "),
      params,
    },
    variants: {
      sql: "SELECT * FROM variants WHERE product_id = $1 ORDER BY sku ASC",
      params: ["<product_id>"],
    },
    images: {
      sql: "SELECT * FROM images WHERE product_id = $1 ORDER BY is_primary DESC, id ASC",
      params: ["<product_id>"],
    },
  };
}

module.exports = {
  buildCatalogCardsSql,
  buildCatalogCountSql,
  buildCatalogDetailSql,
  pageSize,
};
