const { buildCatalogCardsSql, buildCatalogCountSql, buildCatalogDetailSql } = require("./catalog-db-query");
const { cardFromDbRow, detailFromDbRows } = require("./catalog-db-rows");
const { encodeCursor, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } = require("./catalog-query");

const FACET_BUCKET_KEYS = ["categories", "collections", "holidays", "tags", "types", "sizes", "materials", "stock"];

function number(value) {
  const prepared = Number(value || 0);
  return Number.isFinite(prepared) ? prepared : 0;
}

function clampPageSize(value) {
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Number(value || DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE));
}

function offsetValue(value) {
  return Math.max(0, Number(value || 0) || 0);
}

function emptyFacetBuckets() {
  return Object.fromEntries(FACET_BUCKET_KEYS.map((key) => [key, []]));
}

async function runQuery(client, statement) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL catalog source needs a query(sql, params) client");
  const result = await client.query(statement.sql, statement.params);
  return Array.isArray(result?.rows) ? result.rows : [];
}

async function queryCatalogFromDb(client, options = {}) {
  const query = {
    ...options,
    pageSize: clampPageSize(options.pageSize),
    offset: offsetValue(options.offset),
  };
  const [cardRows, countRows] = await Promise.all([
    runQuery(client, buildCatalogCardsSql(query)),
    runQuery(client, buildCatalogCountSql(query)),
  ]);
  const total = number(countRows[0]?.total);
  const items = cardRows.map(cardFromDbRow).filter((item) => item.id && item.baseSku);
  const nextOffset = query.offset + items.length;
  return {
    items,
    total,
    facets: emptyFacetBuckets(),
    facetOptions: emptyFacetBuckets(),
    pageInfo: {
      page: Math.floor(query.offset / query.pageSize) + 1,
      pageSize: query.pageSize,
      offset: query.offset,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      hasMore: nextOffset < total,
      nextCursor: nextOffset < total ? encodeCursor(nextOffset) : "",
    },
    applied: {
      q: String(query.q || "").trim(),
      filters: query.filters || {},
      minPrice: number(query.minPrice),
      maxPrice: number(query.maxPrice),
      sort: String(query.sort || "relevance").trim() || "relevance",
    },
  };
}

async function findProductDetailFromDb(client, lookup = {}) {
  const statements = buildCatalogDetailSql(lookup);
  const productRows = await runQuery(client, statements.product);
  const product = productRows[0];
  if (!product) return null;
  const productId = product.id;
  const [variantRows, imageRows] = await Promise.all([
    runQuery(client, { ...statements.variants, params: [productId] }),
    runQuery(client, { ...statements.images, params: [productId] }),
  ]);
  const detail = detailFromDbRows(product, variantRows, imageRows);
  return detail.id && detail.baseSku ? detail : null;
}

module.exports = {
  emptyFacetBuckets,
  findProductDetailFromDb,
  queryCatalogFromDb,
};
