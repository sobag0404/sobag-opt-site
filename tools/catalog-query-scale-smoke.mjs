import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

const require = createRequire(import.meta.url);
const { findProductDetail, paramsToQuery, queryCatalog } = require("../api/_lib/catalog-query.js");

const root = process.cwd();
const liveProducts = JSON.parse(readFileSync(join(root, "data", "products-live.json"), "utf8"));
const PRODUCT_COUNT = 10000;
const PAGE_SIZE = 48;
const SCALE_CATEGORY = "Scale smoke";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pad(value) {
  return String(value).padStart(5, "0");
}

function cloneProduct(template, index) {
  const baseSku = `scale_${pad(index + 1)}`;
  const category = template.categories?.[0] || template.category || SCALE_CATEGORY;
  return {
    ...template,
    id: `scale-product-${pad(index + 1)}`,
    baseSku,
    name: `${template.name || "Товар"} scale ${pad(index + 1)}`,
    status: "published",
    hidden: false,
    category: SCALE_CATEGORY,
    categories: [SCALE_CATEGORY, category].filter(Boolean),
    collections: [...new Set([...(template.collections || []), index % 2 === 0 ? "Scale collection" : "Scale alternate"])],
    holidays: [...new Set([...(template.holidays || []), index % 3 === 0 ? "Scale holiday" : ""])].filter(Boolean),
    tags: [...new Set([...(template.tags || []), `scale-${index % 10}`])],
    stock: index % 4 === 0 ? "stock" : "made",
    popular: PRODUCT_COUNT - index,
  };
}

const templates = liveProducts.slice(0, 80);
const products = Array.from({ length: PRODUCT_COUNT }, (_, index) => cloneProduct(templates[index % templates.length], index));
const hidden = { ...products[0], id: "scale-hidden", baseSku: "scale_hidden", name: "Scale hidden", status: "hidden", hidden: true };
const draft = { ...products[1], id: "scale-draft", baseSku: "scale_draft", name: "Scale draft", status: "draft", hidden: true };
const catalog = [hidden, draft, ...products];

const started = performance.now();
const pageOne = queryCatalog(catalog, { filters: { category: [SCALE_CATEGORY] }, pageSize: PAGE_SIZE, sort: "sku" });
const pageOneMs = Math.round(performance.now() - started);

assert(pageOne.total === PRODUCT_COUNT, "10k category query should return only published synthetic products");
assert(pageOne.items.length === PAGE_SIZE, "10k category page should respect 48-card page size");
assert(pageOne.pageInfo.pageSize === PAGE_SIZE, "pageInfo should keep 48-card page size");
assert(pageOne.pageInfo.hasMore, "10k category query should expose a next page");
assert(pageOne.pageInfo.nextCursor, "10k category query should expose a cursor");
assert(pageOne.items.every((item) => item.baseSku !== hidden.baseSku && item.baseSku !== draft.baseSku), "list payload must be published-only");
assert(pageOne.items.every((item) => !("variants" in item) && !("variantPrices" in item) && !("images" in item)), "card payload must stay compact");
assert(pageOne.items.every((item) => !("galleryCount" in item) && !("detailDescription" in item) && !("gallery" in item)), "card payload must not include detail/gallery fields");
assert(pageOne.items.every((item) => item.variantCount > 0), "card payload should include variant counts");
assert(pageOne.facetOptions?.categories?.some((item) => item.value === SCALE_CATEGORY), "facetOptions should include the scale category");

const pageTwoUrl = new URL(
  `http://localhost/api/catalog-query?category=${encodeURIComponent(SCALE_CATEGORY)}&cursor=${encodeURIComponent(pageOne.pageInfo.nextCursor)}&pageSize=${PAGE_SIZE}&sort=sku`
);
const pageTwo = queryCatalog(catalog, paramsToQuery(pageTwoUrl));
assert(pageTwo.pageInfo.offset === PAGE_SIZE, "cursor should continue from the next 48-card offset");
assert(pageTwo.items.length === PAGE_SIZE, "cursor page should keep 48-card page size");
assert(pageTwo.items[0].id !== pageOne.items[0].id, "cursor page should not restart from first item");

const exactSku = products[1234].baseSku;
const exact = queryCatalog(catalog, { q: exactSku, pageSize: 5 });
assert(exact.total === 1, "exact SKU query should find one synthetic product");
assert(exact.items[0].baseSku === exactSku, "exact SKU query should rank the exact baseSku first");

const detail = findProductDetail(catalog, { baseSku: exactSku });
assert(detail?.baseSku === exactSku, "detail lookup should find a published synthetic product");
assert(Array.isArray(detail.variants) && detail.variants.length > 0, "detail payload must include variants");
assert(Array.isArray(detail.images) && detail.images.length > 0, "detail payload must include images");
assert(!findProductDetail(catalog, { baseSku: hidden.baseSku }), "detail lookup must not return hidden products");

console.log(`Catalog query scale smoke passed: ${PRODUCT_COUNT} products, ${PAGE_SIZE}-card pages, first query ${pageOneMs}ms`);
