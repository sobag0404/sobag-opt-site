import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { buildCatalogPim } = require("../api/_lib/pim.js");
const { csvForPimView, reportForPimView } = require("../api/_lib/pim-report.js");

const root = process.cwd();
const products = JSON.parse(readFileSync(join(root, "data", "products-live.json"), "utf8")).slice(0, 12);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const importBatch = {
  id: "IB-report-smoke",
  source: "report-smoke",
  status: "applied",
  updateExisting: false,
  createdAt: "2026-06-04T00:00:00.000Z",
  createdBy: "content@example.test",
  appliedAt: "2026-06-04T00:01:00.000Z",
  appliedBy: "content@example.test",
  counts: { created: 2, skipped: 1, updated: 0, errors: 0 },
  rows: [{ row: 1 }, { row: 2 }],
  products: [{ product: products[0] }],
};

const catalog = {
  products,
  updatedAt: "2026-06-04T00:02:00.000Z",
  updatedBy: "content@example.test",
  version: 1,
  pim: buildCatalogPim(products, { source: "report-smoke", importBatches: [importBatch] }),
};

const summary = reportForPimView(catalog, "summary");
assert(summary.view === "summary", "summary view mismatch");
assert(summary.diagnostics.ok, "summary diagnostics should be ok");
assert(summary.counts.products === products.length, "summary product count mismatch");
assert(summary.samples.products.length <= 5, "summary samples should be capped");
assert(summary.samples.importBatches[0].id === importBatch.id, "summary must expose safe import batch summary");

const images = reportForPimView(catalog, "images");
assert(images.count > 0, "images view should include rows");
assert(!("pim" in images), "table views should not include the full PIM object");

const productsCsv = csvForPimView(catalog, "products");
assert(productsCsv.fileName.includes("sobag-pim-products"), "products CSV filename mismatch");
assert(productsCsv.csv.startsWith("id,baseSku,name,status"), "products CSV header mismatch");
assert(productsCsv.rows === products.length, "products CSV row count mismatch");

const batchesCsv = csvForPimView(catalog, "import-batches");
assert(batchesCsv.csv.includes(importBatch.id), "import batch CSV must include batch id");
assert(!batchesCsv.csv.includes("[object Object]"), "CSV must flatten import batch counts");

let rejected = false;
try {
  csvForPimView(catalog, "summary");
} catch (error) {
  rejected = error.code === "unsupported_pim_csv_view";
}
assert(rejected, "summary CSV should be rejected by the helper");

console.log(`PIM report smoke passed: ${summary.counts.products} products, ${images.count} images, ${productsCsv.rows} CSV rows`);
