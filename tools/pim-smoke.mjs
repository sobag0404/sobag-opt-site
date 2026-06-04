import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { buildCatalogPim } = require("../api/_lib/pim.js");

const root = process.cwd();
const products = JSON.parse(readFileSync(join(root, "data", "products-live.json"), "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sampleBatch = {
  id: "IB-smoke",
  source: "pim-smoke",
  status: "applied",
  updateExisting: true,
  createdAt: "2026-06-04T00:00:00.000Z",
  createdBy: "content@example.test",
  appliedAt: "2026-06-04T00:01:00.000Z",
  appliedBy: "content@example.test",
  counts: { created: 1, skipped: 2, updated: 3, errors: 4 },
  rows: [{ row: 1, status: "created" }],
  products: [{ product: products[0] }],
  snapshot: { products: products.slice(0, 2) },
};

const pim = buildCatalogPim(products, { source: "pim-smoke", importBatches: [sampleBatch] });

assert(pim.version === 1, "PIM version must be 1");
assert(pim.products.length === products.length, "PIM product count must match catalog product count");
assert(pim.variants.length > products.length, "PIM must include generated variants");
assert(pim.images.length >= products.length, "PIM must include product images");
assert(pim.taxonomies.categories.length > 0, "PIM must include categories taxonomy");
assert(pim.counts.products === pim.products.length, "PIM product count metadata is wrong");
assert(pim.counts.variants === pim.variants.length, "PIM variant count metadata is wrong");
assert(pim.importBatches.length === 1, "PIM must include import batch summaries");
assert(!("products" in pim.importBatches[0]), "PIM import summary must not include batch products");
assert(!("snapshot" in pim.importBatches[0]), "PIM import summary must not include snapshots");
assert(pim.importBatches[0].snapshotProductCount === 2, "PIM import summary must keep snapshot count");

console.log(
  `PIM smoke passed: ${pim.products.length} products, ${pim.variants.length} variants, ${pim.images.length} images, ${pim.taxonomies.categories.length} categories`
);
