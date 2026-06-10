import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadCatalogProducts, loadPublicCatalog, publicReviews, reviewsForProducts } = require("../api/_lib/catalog-source.js");

async function smokeStaticFallback() {
  const catalog = await loadCatalogProducts();
  assert.equal(catalog.source, "static");
  assert.ok(catalog.products.length > 0);

  const publicCatalog = await loadPublicCatalog({ includeReviews: true });
  assert.equal(publicCatalog.source, "static");
  assert.ok(publicCatalog.products.length > 0);
  assert.equal(publicCatalog.products.some((product) => product.status === "draft" || product.hidden), false);
}

function smokeReviewFiltering() {
  const reviews = publicReviews([
    { id: "r1", productId: "p1", baseSku: "SKU_1", status: "approved", rating: 5, text: "ok", authorName: "Buyer" },
    { id: "r2", productId: "p2", baseSku: "SKU_2", status: "pending", rating: 5, text: "wait" },
    { id: "r3", productId: "p3", baseSku: "SKU_3", status: "approved", rating: 7, text: "ok" },
  ]);
  assert.equal(reviews.length, 2);
  assert.equal(reviews[1].rating, 5);
  assert.deepEqual(
    reviewsForProducts(reviews, [{ id: "p1", baseSku: "SKU_1" }]).map((review) => review.id),
    ["r1"]
  );
}

async function main() {
  smokeReviewFiltering();
  await smokeStaticFallback();
  console.log("catalog-source smoke passed");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
