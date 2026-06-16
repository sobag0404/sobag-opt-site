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
  type: "types",
  size: "sizes",
  material: "materials",
};

const MAX_PAGE_SIZE = 120;
const DEFAULT_PAGE_SIZE = 48;
const CATALOG_CARDS_SOURCE_SQL = `(
  SELECT
    c.id,
    c.base_sku,
    c.name,
    c.description,
    c.stock,
    c.popular,
    COALESCE(NULLIF(vp.min_price, 0), NULLIF(c.min_price, 0), 0) AS min_price,
    COALESCE(NULLIF(vp.max_price, 0), NULLIF(c.max_price, 0), NULLIF(vp.min_price, 0), NULLIF(c.min_price, 0), 0) AS max_price,
    GREATEST(COALESCE(vp.variant_count, 0), COALESCE(c.variant_count, 0)) AS variant_count,
    c.category,
    c.categories,
    c.collections,
    c.holidays,
    c.tags,
    c.types,
    c.sizes,
    c.materials,
    COALESCE(vp.variant_skus, c.variant_skus, ARRAY[]::text[]) AS variant_skus,
    c.image,
    c.image_meta
  FROM public_catalog_cards c
  LEFT JOIN LATERAL (
    SELECT
      MIN(v.price)::int AS min_price,
      MAX(v.price)::int AS max_price,
      COUNT(*)::int AS variant_count,
      ARRAY_AGG(v.sku ORDER BY v.sku)::text[] AS variant_skus
    FROM variants v
    WHERE v.product_id = c.id AND v.price > 0
  ) vp ON true
) public_catalog_cards`;
const FACET_BUCKETS = {
  category: { bucket: "categories", column: "categories", array: true },
  collection: { bucket: "collections", column: "collections", array: true },
  holiday: { bucket: "holidays", column: "holidays", array: true },
  tag: { bucket: "tags", column: "tags", array: true },
  type: { bucket: "types", column: "types", array: true },
  size: { bucket: "sizes", column: "sizes", array: true },
  material: { bucket: "materials", column: "materials", array: true },
  stock: { bucket: "stock", column: "stock", array: false },
};

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

function filtersForQuery(query = {}, options = {}) {
  const filters = { ...(query.filters || {}) };
  if (options.omitFilterGroup) filters[options.omitFilterGroup] = [];
  return filters;
}

function buildWhere(query = {}, params = [], options = {}) {
  const where = [];
  const q = text(query.q);
  if (q) {
    const param = addParam(params, `%${q}%`);
    where.push(`(base_sku ILIKE ${param} OR name ILIKE ${param} OR description ILIKE ${param} OR EXISTS (SELECT 1 FROM unnest(variant_skus) variant_sku WHERE variant_sku ILIKE ${param}))`);
  }

  const filters = filtersForQuery(query, options);
  Object.entries(FILTER_COLUMNS).forEach(([key, column]) => {
    const values = list(filters?.[key]);
    if (!values.length) return;
    where.push(`${column} && ${addParam(params, values)}::text[]`);
  });
  const stockValues = list(filters?.stock);
  if (stockValues.length) where.push(`stock = ANY(${addParam(params, stockValues)}::text[])`);

  const minPrice = Number(query.minPrice || 0) || 0;
  const maxPrice = Number(query.maxPrice || 0) || 0;
  if (minPrice > 0) where.push(`max_price >= ${addParam(params, minPrice)}`);
  if (maxPrice > 0) where.push(`min_price <= ${addParam(params, maxPrice)}`);

  return where.length ? `WHERE ${where.join(" AND ")}` : "";
}

function facetValueSql(config) {
  if (config.array) return `unnest(${config.column})`;
  return config.column;
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
      `FROM ${CATALOG_CARDS_SOURCE_SQL}`,
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
    sql: ["SELECT COUNT(*)::int AS total", `FROM ${CATALOG_CARDS_SOURCE_SQL}`, where].filter(Boolean).join(" "),
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

function buildCatalogFacetSql(query = {}, group, options = {}) {
  const config = FACET_BUCKETS[text(group)];
  if (!config) {
    const error = new Error(`Unknown facet group: ${group}`);
    error.code = "unknown_facet_group";
    throw error;
  }
  const params = [];
  const where = buildWhere(query, params, { omitFilterGroup: options.omitFilterGroup ? group : "" });
  const valueSql = facetValueSql(config);
  return {
    bucket: config.bucket,
    sql: [
      `SELECT value, COUNT(*)::int AS count FROM (SELECT ${valueSql} AS value FROM ${CATALOG_CARDS_SOURCE_SQL}`,
      where,
      ") facet_values",
      "WHERE value IS NOT NULL AND btrim(value) <> ''",
      "GROUP BY value",
      "ORDER BY value ASC",
    ]
      .filter(Boolean)
      .join(" "),
    params,
  };
}

module.exports = {
  buildCatalogCardsSql,
  buildCatalogCountSql,
  buildCatalogDetailSql,
  buildCatalogFacetSql,
  CATALOG_CARDS_SOURCE_SQL,
  FACET_BUCKETS,
  pageSize,
};
