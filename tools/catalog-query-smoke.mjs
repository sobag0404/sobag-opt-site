import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { findProductDetail, paramsToQuery, queryCatalog } = require("../api/_lib/catalog-query.js");

const root = process.cwd();
const liveProducts = JSON.parse(readFileSync(join(root, "data", "products-live.json"), "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const first = liveProducts[0];
const hidden = { ...first, id: "hidden-smoke", baseSku: "hidden_smoke", name: "Hidden smoke", status: "hidden", hidden: true };
const draft = { ...first, id: "draft-smoke", baseSku: "draft_smoke", name: "Draft smoke", status: "draft", hidden: true };
const products = [hidden, draft, ...liveProducts.slice(0, 80)];

const exact = queryCatalog(products, { q: first.baseSku, pageSize: 5 });
assert(exact.total >= 1, "exact SKU query should return at least one product");
assert(exact.items[0].baseSku === first.baseSku, "exact SKU query should rank the exact baseSku first");
assert(exact.items.every((item) => item.baseSku !== hidden.baseSku && item.baseSku !== draft.baseSku), "query results must be published-only");
assert(!("variants" in exact.items[0]), "card payload must not include full variants");
assert(exact.items[0].variantCount > 0, "card payload should include variant count");

const category = first.categories?.[0] || first.category;
const filtered = queryCatalog(products, { filters: { category: [category] }, pageSize: 7, sort: "sku" });
assert(filtered.items.length > 0, "category filter should return products");
assert(filtered.items.every((item) => (item.categories || []).includes(category)), "category filter returned an unrelated product");
assert(filtered.facetOptions?.categories?.some((item) => item.value === category), "facet options should include category options for UI filters");
assert(Array.isArray(filtered.facetOptions?.sizes), "facet options should include size options for UI filters");

const firstSize = first.sizes?.[0];
if (firstSize) {
  const sizeFiltered = queryCatalog(products, { filters: { category: [category], size: [firstSize] }, pageSize: 7 });
  assert(sizeFiltered.items.length > 0, "category+size filter should return products");
  assert(sizeFiltered.facetOptions.sizes.some((item) => item.value === firstSize), "size facet options should keep selected size available");
}

const pageOne = queryCatalog(products, { pageSize: 3, sort: "sku" });
assert(pageOne.items.length === 3, "page one should respect pageSize");
assert(pageOne.pageInfo.hasMore, "page one should expose hasMore");
assert(pageOne.pageInfo.nextCursor, "page one should expose nextCursor");
const pageTwoUrl = new URL(`http://localhost/api/catalog-query?cursor=${encodeURIComponent(pageOne.pageInfo.nextCursor)}&pageSize=3&sort=sku`);
const pageTwo = queryCatalog(products, paramsToQuery(pageTwoUrl));
assert(pageTwo.pageInfo.offset === 3, "cursor should continue at the next offset");
assert(pageTwo.items[0].id !== pageOne.items[0].id, "cursor page should not restart from first item");

const detail = findProductDetail(products, { baseSku: first.baseSku });
assert(detail?.baseSku === first.baseSku, "detail lookup by baseSku failed");
assert(Array.isArray(detail.variants) && detail.variants.length > 0, "detail payload must include generated variants");
assert(Array.isArray(detail.images) && detail.images.length > 0, "detail payload must include image records");
const variantDetail = findProductDetail(products, { sku: detail.variants[0].sku });
assert(variantDetail?.id === detail.id, "detail lookup by variant sku failed");
assert(!findProductDetail(products, { baseSku: hidden.baseSku }), "detail lookup must not return hidden products");

console.log(
  `Catalog query smoke passed: ${exact.total} exact results, ${filtered.total} category results, cursor ${pageOne.pageInfo.nextCursor}`
);
