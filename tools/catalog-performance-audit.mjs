import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { auditProducts } from "./image-metadata-audit.mjs";

const require = createRequire(import.meta.url);
const { DEFAULT_PAGE_SIZE, publicProducts, queryCatalog } = require("../server-routes/_lib/catalog-query.js");

const root = process.cwd();
const productsPath = join(root, "data", "products-live.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readProjectFile(file) {
  return readFileSync(join(root, file), "utf8");
}

function largestCategory(products) {
  const counts = new Map();
  products.forEach((product) => {
    const categories = Array.isArray(product.categories) && product.categories.length ? product.categories : [product.category];
    categories.filter(Boolean).forEach((category) => counts.set(category, (counts.get(category) || 0) + 1));
  });
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || "";
}

function auditCatalogPerformance() {
  const products = JSON.parse(readFileSync(productsPath, "utf8"));
  const publicItems = publicProducts(products);
  const category = largestCategory(publicItems);
  const page = queryCatalog(products, { filters: category ? { category: [category] } : {}, sort: "sku" });
  const app = readProjectFile("app.js");
  const css = readProjectFile("styles.css");

  const forbiddenCardFields = ["variants", "images", "gallery", "galleryCount", "detailDescription", "variantPrices"];
  assert(DEFAULT_PAGE_SIZE === 48, "catalog-query default page size must stay 48");
  assert(page.pageInfo.pageSize === 48, "catalog query should default to 48-card pages");
  assert(page.items.length <= 48, "catalog query should not return more than 48 cards by default");
  assert(page.items.every((item) => forbiddenCardFields.every((field) => !(field in item))), "catalog card payload includes detail/gallery fields");
  assert(app.includes("const CATALOG_PAGE_SIZE = 48;"), "frontend catalog page size should stay 48");
  assert(app.includes("const SERVER_CATALOG_PAGE_SIZE = CATALOG_PAGE_SIZE;"), "server catalog page size should follow CATALOG_PAGE_SIZE");
  assert(app.includes("PUBLIC_API_CACHE_PREFIX") && app.includes("getPublicApiCache(path)"), "public catalog query/detail responses should use a bounded browser cache");
  assert(app.includes('insertAdjacentHTML("beforeend"'), "server cursor pagination should append new cards");
  assert(app.includes("dataset.renderKey") && app.includes("dataset.renderedCount"), "product grid render state should guard append-only rendering");
  assert(css.includes("content-visibility: auto;"), "product cards should use content-visibility for long lists");
  assert(css.includes("contain-intrinsic-size:"), "product cards should reserve intrinsic size with rendering containment");

  const imageSummary = auditProducts(products, {});
  const migratedImageReady = imageSummary.metadataImages > 0 && imageSummary.webpVariants > 0 && imageSummary.avifVariants > 0;

  return {
    products: products.length,
    publicProducts: publicItems.length,
    defaultPageSize: page.pageInfo.pageSize,
    sampleCards: page.items.length,
    imageMetadata: imageSummary.metadataImages,
    webpVariants: imageSummary.webpVariants,
    avifVariants: imageSummary.avifVariants,
    legacyOnlyProducts: imageSummary.legacyOnlyProducts,
    migratedImageReady,
  };
}

function main() {
  try {
    const summary = auditCatalogPerformance();
    console.log(
      `Catalog performance audit passed: ${summary.publicProducts}/${summary.products} public products, ${summary.defaultPageSize}-card pages, ${summary.imageMetadata} metadata images, ${summary.webpVariants} WebP sets, ${summary.avifVariants} AVIF sets`
    );
    if (!summary.migratedImageReady) {
      console.log("Catalog performance audit note: real catalog image migration/WebP/AVIF validation is still pending.");
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { auditCatalogPerformance };
