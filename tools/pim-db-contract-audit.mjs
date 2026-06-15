import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildCatalogPim } = require("../server-routes/_lib/pim.js");

const PRODUCT_STATUSES = new Set(["draft", "published", "hidden", "archive"]);
const TAXONOMY_TYPES = new Set(["category", "collection", "holiday", "tag"]);
const root = process.cwd();

function text(value) {
  return String(value || "").trim();
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    products: join(root, "data", "products-live.json"),
    json: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--products") args.products = resolve(root, argv[++index] || "");
    else if (token === "--json") args.json = true;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/pim-db-contract-audit.mjs [--products data/products-live.json]

Options:
  --json       Print machine-readable report.
  --self-test  Run fixture checks.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function loadProducts(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed) || !parsed.length) throw new Error("Products JSON must contain a non-empty array.");
  return parsed;
}

function assertUnique(rows, key, label, errors) {
  const seen = new Set();
  rows.forEach((row, index) => {
    const value = text(row?.[key]);
    if (!value) errors.push(`${label}[${index}] missing ${key}`);
    else if (seen.has(value)) errors.push(`${label} duplicate ${key}: ${value}`);
    else seen.add(value);
  });
  return seen;
}

function flatTaxonomies(taxonomies = {}) {
  return ["categories", "collections", "holidays", "tags"].flatMap((bucket) => (Array.isArray(taxonomies[bucket]) ? taxonomies[bucket] : []));
}

function auditPimDbContract(products) {
  const pim = buildCatalogPim(products, { source: "pim-db-contract-audit", includeImportBatchRows: true });
  const errors = [];
  const warnings = [];
  const productIds = assertUnique(pim.products, "id", "products", errors);
  assertUnique(pim.products, "baseSku", "products", errors);
  assertUnique(pim.variants, "id", "variants", errors);
  assertUnique(pim.variants, "sku", "variants", errors);
  assertUnique(pim.images, "id", "images", errors);
  const taxonomies = flatTaxonomies(pim.taxonomies);
  const taxonomyIds = assertUnique(taxonomies, "id", "taxonomies", errors);
  assertUnique(pim.taxonomyAssignments || [], "id", "taxonomyAssignments", errors);

  pim.products.forEach((product) => {
    if (!PRODUCT_STATUSES.has(product.status)) errors.push(`product ${product.id} has unsupported status ${product.status}`);
    if (product.hidden !== (product.status !== "published")) errors.push(`product ${product.id} hidden flag does not match status`);
  });

  pim.variants.forEach((variant) => {
    if (!productIds.has(variant.productId)) errors.push(`variant ${variant.id} references missing product ${variant.productId}`);
    if (!variant.sku.startsWith(variant.baseSku)) warnings.push(`variant ${variant.id} SKU does not start with baseSku`);
    if (!(Number(variant.price) > 0)) errors.push(`variant ${variant.id} price must be positive`);
  });

  pim.images.forEach((image) => {
    if (!productIds.has(image.productId)) errors.push(`image ${image.id} references missing product ${image.productId}`);
    if (!image.url && !image.storageKey) errors.push(`image ${image.id} must have url or storageKey`);
  });

  taxonomies.forEach((taxonomy) => {
    if (!TAXONOMY_TYPES.has(taxonomy.type)) errors.push(`taxonomy ${taxonomy.id} has unsupported type ${taxonomy.type}`);
    if (!text(taxonomy.name)) errors.push(`taxonomy ${taxonomy.id} has empty name`);
  });

  (pim.taxonomyAssignments || []).forEach((assignment) => {
    if (!productIds.has(assignment.productId)) errors.push(`taxonomy assignment ${assignment.id} references missing product ${assignment.productId}`);
    if (!taxonomyIds.has(assignment.taxonomyId)) errors.push(`taxonomy assignment ${assignment.id} references missing taxonomy ${assignment.taxonomyId}`);
    if (!TAXONOMY_TYPES.has(assignment.type)) errors.push(`taxonomy assignment ${assignment.id} has unsupported type ${assignment.type}`);
  });

  if (!pim.taxonomyAssignments?.length) warnings.push("taxonomy assignment table is empty");
  if (!pim.importBatches?.length) warnings.push("import batch table is empty in static catalog export; server storage may still contain batches");
  if (!pim.importBatchRows?.length) warnings.push("import batch row table is empty in static catalog export; server storage may still contain row reports");

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    counts: {
      products: pim.products.length,
      variants: pim.variants.length,
      images: pim.images.length,
      taxonomies: taxonomies.length,
      taxonomyAssignments: pim.taxonomyAssignments?.length || 0,
      importBatches: pim.importBatches?.length || 0,
      importBatchRows: pim.importBatchRows?.length || 0,
      statuses: pim.counts.statuses || {},
    },
    contractVersion: 1,
    targetTables: ["products", "variants", "images", "taxonomies", "product_taxonomies", "import_batches", "import_batch_rows"],
  };
}

function selfTest() {
  const report = auditPimDbContract([
    {
      id: "db-audit-1",
      baseSku: "db_audit_1",
      name: "DB audit one",
      status: "published",
      categories: ["Подушки"],
      collections: ["Audit"],
      types: ["Подушка"],
      sizes: ["40x40"],
      materials: ["Велюр"],
      basePrice: 120,
      image: "assets/production-workshop-1.png",
    },
  ]);
  if (!report.ok || report.counts.taxonomyAssignments < 2) throw new Error("PIM DB contract audit self-test failed");
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("PIM DB contract audit self-test passed");
    return;
  }
  const report = auditPimDbContract(loadProducts(args.products));
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(
      `PIM DB contract audit ${report.ok ? "passed" : "failed"}: ${report.counts.products} products, ${report.counts.variants} variants, ${report.counts.images} images, ${report.counts.taxonomies} taxonomies, ${report.counts.taxonomyAssignments} product-taxonomy links`
    );
    if (report.warnings.length) console.log(`Warnings: ${report.warnings.join("; ")}`);
    if (report.errors.length) console.log(`Errors: ${report.errors.slice(0, 20).join("; ")}`);
  }
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export { auditPimDbContract };
