import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { buildCatalogCardsSql, buildCatalogCountSql, buildCatalogDetailSql, buildCatalogFacetSql, pageSize } = require("../api/_lib/catalog-db-query.js");

function assertParameterized(query) {
  assert.equal(/'[^']*\$\d+[^']*'/.test(query.sql), false, "placeholder must not be quoted as a literal");
  assert.equal(query.sql.includes(";"), false, "query must be a single statement");
}

function smokeCards() {
  const query = buildCatalogCardsSql({
    q: "pillow",
    filters: { category: ["pillows"], collection: ["patterns"] },
    minPrice: 200,
    maxPrice: 500,
    sort: "price_asc",
    pageSize: 999,
    offset: 48,
  });
  assert.ok(query.sql.includes("FROM public_catalog_cards"));
  assert.ok(query.sql.includes("ILIKE $1"));
  assert.ok(query.sql.includes("unnest(variant_skus)"));
  assert.ok(query.sql.includes("categories && $2::text[]"));
  assert.ok(query.sql.includes("collections && $3::text[]"));
  assert.ok(query.sql.includes("ORDER BY min_price ASC, name ASC"));
  assert.equal(query.params.at(-2), 120);
  assert.equal(query.params.at(-1), 48);
  assertParameterized(query);
}

function smokeCount() {
  const query = buildCatalogCountSql({ filters: { holiday: ["march"] } });
  assert.ok(query.sql.startsWith("SELECT COUNT(*)::int AS total"));
  assert.ok(query.sql.includes("FROM public_catalog_cards"));
  assert.ok(query.sql.includes("holidays && $1::text[]"));
  assert.deepEqual(query.params, [["march"]]);
}

function smokeDetail() {
  const query = buildCatalogDetailSql({ baseSku: "OPT_1" });
  assert.ok(query.product.sql.includes("FROM public_catalog_products"));
  assert.ok(query.product.sql.includes("base_sku = $1"));
  assert.deepEqual(query.product.params, ["OPT_1"]);
  assert.ok(query.variants.sql.includes("FROM variants"));
  assert.ok(query.images.sql.includes("FROM images"));
}

function smokeDetailBySku() {
  const query = buildCatalogDetailSql({ sku: "OPT_1_RED" });
  assert.ok(query.product.sql.includes("base_sku = $1"));
  assert.ok(query.product.sql.includes("variants WHERE sku = $1"));
  assert.deepEqual(query.product.params, ["OPT_1_RED"]);
}

function smokeFacets() {
  const query = buildCatalogFacetSql(
    {
      q: "pillow",
      filters: { category: ["Pillows"], type: ["Pillow"], stock: ["В наличии"] },
      minPrice: 200,
    },
    "category",
    { omitFilterGroup: true }
  );
  assert.equal(query.bucket, "categories");
  assert.ok(query.sql.includes("unnest(categories) AS value"));
  assert.ok(query.sql.includes("types && $"));
  assert.ok(query.sql.includes("stock = ANY($"));
  assert.equal(query.sql.includes("categories &&"), false);
  assertParameterized(query);
}

function main() {
  assert.equal(pageSize(0), 48);
  assert.equal(pageSize(999), 120);
  smokeCards();
  smokeCount();
  smokeDetail();
  smokeDetailBySku();
  smokeFacets();
  console.log("catalog DB query builder smoke passed");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
