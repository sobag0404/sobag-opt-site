import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { buildCatalogPim } = require("../api/_lib/pim.js");

const root = process.cwd();
const DEFAULT_OUT = "local-import-output/pim-postgres-seed.sql";
const TAXONOMY_BUCKETS = ["categories", "collections", "holidays", "tags"];

function text(value) {
  return String(value || "").trim();
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    products: join(root, "data", "products-live.json"),
    out: join(root, DEFAULT_OUT),
    source: "pim-postgres-seed",
    dryRun: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--products") args.products = resolve(root, argv[++index] || "");
    else if (token === "--out") args.out = resolve(root, argv[++index] || "");
    else if (token === "--source") args.source = argv[++index] || args.source;
    else if (token === "--dry-run") args.dryRun = true;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/pim-postgres-seed.mjs --products data/products-live.json --out local-import-output/pim-postgres-seed.sql

Options:
  --source <name>  Source label in the generated manifest comments.
  --dry-run        Build and validate SQL without writing a file.
  --self-test      Run a temporary fixture export.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function flattenTaxonomies(taxonomies = {}) {
  return TAXONOMY_BUCKETS.flatMap((bucket) => (Array.isArray(taxonomies[bucket]) ? taxonomies[bucket] : []));
}

function flattenImageVariants(images = []) {
  return images.flatMap((image) =>
    (Array.isArray(image.variants) ? image.variants : []).map((variant, index) => ({
      ...variant,
      id: text(variant.id) || `${image.id}::variant-${index + 1}`,
      imageId: text(variant.parentImageId) || image.id,
    }))
  );
}

function sqlString(value) {
  return `'${text(value).replace(/'/g, "''")}'`;
}

function sqlNullableString(value) {
  const prepared = text(value);
  return prepared ? sqlString(prepared) : "null";
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value || {}))}::jsonb`;
}

function sqlInteger(value, fallback = 0) {
  const number = Number(value);
  return String(Number.isFinite(number) ? Math.trunc(number) : fallback);
}

function sqlBoolean(value) {
  return value ? "true" : "false";
}

function taxonomySlug(row) {
  const id = text(row.id);
  return id.includes(":") ? id.split(":").slice(1).join(":") : id;
}

function onConflict(columns) {
  return `on conflict (id) do update set ${columns.filter((column) => column !== "id").map((column) => `${column} = excluded.${column}`).join(", ")};`;
}

function insertStatement(table, columns, values) {
  return `insert into ${table} (${columns.join(", ")}) values (${values.join(", ")}) ${onConflict(columns)}`;
}

function productSql(row) {
  const columns = [
    "id",
    "base_sku",
    "name",
    "status",
    "hidden",
    "description",
    "detail_description",
    "stock",
    "popular",
    "min_price",
    "max_price",
    "variant_count",
    "payload",
  ];
  return insertStatement("products", columns, [
    sqlString(row.id),
    sqlString(row.baseSku),
    sqlString(row.name),
    sqlString(row.status || "draft"),
    sqlBoolean(row.hidden),
    sqlString(row.description),
    sqlString(row.detailDescription),
    sqlString(row.stock),
    sqlInteger(row.popular),
    sqlInteger(row.minPrice || row.basePrice),
    sqlInteger(row.maxPrice || row.basePrice),
    sqlInteger(row.variantCount),
    sqlJson(row),
  ]);
}

function variantSql(row) {
  const columns = ["id", "product_id", "base_sku", "sku", "type", "size", "material", "price", "qty_step", "min_qty", "payload"];
  return insertStatement("variants", columns, [
    sqlString(row.id),
    sqlString(row.productId),
    sqlString(row.baseSku),
    sqlString(row.sku),
    sqlString(row.type),
    sqlString(row.size),
    sqlString(row.material),
    sqlInteger(row.price),
    sqlInteger(row.qtyStep, 1),
    sqlInteger(row.minQty),
    sqlJson(row),
  ]);
}

function imageSql(row, indexByProduct) {
  const productIndex = indexByProduct.get(row.productId) || 0;
  indexByProduct.set(row.productId, productIndex + 1);
  const columns = ["id", "product_id", "url", "storage_key", "provider", "width", "height", "mime", "uploaded_at", "sort_order", "is_primary", "payload"];
  return insertStatement("images", columns, [
    sqlString(row.id),
    sqlString(row.productId),
    sqlString(row.url),
    sqlString(row.storageKey),
    sqlString(row.provider),
    sqlInteger(row.width),
    sqlInteger(row.height),
    sqlString(row.mime),
    sqlNullableString(row.uploadedAt),
    sqlInteger(productIndex),
    sqlBoolean(["main", "legacy-main"].includes(row.role)),
    sqlJson(row),
  ]);
}

function imageVariantSql(row) {
  const columns = ["id", "image_id", "url", "storage_key", "provider", "width", "height", "mime", "format", "uploaded_at", "payload"];
  return insertStatement("image_variants", columns, [
    sqlString(row.id),
    sqlString(row.imageId),
    sqlString(row.url),
    sqlString(row.storageKey),
    sqlString(row.provider),
    sqlInteger(row.width),
    sqlInteger(row.height),
    sqlString(row.mime),
    sqlString(row.format || text(row.mime).replace(/^image\//, "")),
    sqlNullableString(row.uploadedAt),
    sqlJson(row),
  ]);
}

function taxonomySql(row) {
  const columns = ["id", "type", "name", "slug", "description", "icon", "payload"];
  return insertStatement("taxonomies", columns, [
    sqlString(row.id),
    sqlString(row.type),
    sqlString(row.name),
    sqlString(taxonomySlug(row)),
    sqlString(row.description),
    sqlString(row.icon),
    sqlJson(row),
  ]);
}

function assignmentSql(row) {
  const columns = ["id", "product_id", "taxonomy_id", "type"];
  return insertStatement("product_taxonomies", columns, [
    sqlString(row.id),
    sqlString(row.productId),
    sqlString(row.taxonomyId),
    sqlString(row.type),
  ]);
}

function importBatchSql(row) {
  const counts = row.counts || {};
  const columns = [
    "id",
    "source",
    "status",
    "update_existing",
    "created_at",
    "created_by",
    "applied_at",
    "applied_by",
    "rejected_at",
    "rejected_by",
    "rolled_back_at",
    "rolled_back_by",
    "created",
    "skipped",
    "updated",
    "errors",
    "row_count",
    "product_count",
    "snapshot_product_count",
    "payload",
  ];
  return insertStatement("import_batches", columns, [
    sqlString(row.id),
    sqlString(row.source),
    sqlString(row.status),
    sqlBoolean(row.updateExisting),
    sqlNullableString(row.createdAt),
    sqlString(row.createdBy),
    sqlNullableString(row.appliedAt),
    sqlString(row.appliedBy),
    sqlNullableString(row.rejectedAt),
    sqlString(row.rejectedBy),
    sqlNullableString(row.rolledBackAt),
    sqlString(row.rolledBackBy),
    sqlInteger(counts.created),
    sqlInteger(counts.skipped),
    sqlInteger(counts.updated),
    sqlInteger(counts.errors),
    sqlInteger(row.rowCount),
    sqlInteger(row.productCount),
    sqlInteger(row.snapshotProductCount),
    sqlJson(row),
  ]);
}

function buildSeedSql(products, args) {
  const pim = buildCatalogPim(products, { source: args.source });
  const taxonomies = flattenTaxonomies(pim.taxonomies);
  const imageVariants = flattenImageVariants(pim.images);
  const imageIndexByProduct = new Map();
  const lines = [
    "-- Sobag Opt PIM PostgreSQL seed.",
    "-- Generated for the future DB split. Review before applying to any database.",
    `-- Source: ${args.source}`,
    `-- Products file: ${basename(args.products)}`,
    `-- Counts: ${pim.products.length} products, ${pim.variants.length} variants, ${pim.images.length} images, ${imageVariants.length} image variants, ${taxonomies.length} taxonomies, ${pim.taxonomyAssignments.length} product-taxonomy links`,
    "begin;",
    "set constraints all deferred;",
    "",
    ...pim.products.map(productSql),
    ...pim.variants.map(variantSql),
    ...pim.images.map((row) => imageSql(row, imageIndexByProduct)),
    ...imageVariants.map(imageVariantSql),
    ...taxonomies.map(taxonomySql),
    ...pim.taxonomyAssignments.map(assignmentSql),
    ...pim.importBatches.map(importBatchSql),
    "",
    "commit;",
    "",
  ];
  return { sql: lines.join("\n"), counts: { ...pim.counts, taxonomies: taxonomies.length, imageVariants: imageVariants.length } };
}

async function writeSeed(args) {
  const products = JSON.parse(readFileSync(args.products, "utf8"));
  if (!Array.isArray(products) || !products.length) throw new Error("Products JSON must contain a non-empty array.");
  const result = buildSeedSql(products, args);
  if (!args.dryRun) {
    await mkdir(dirname(args.out), { recursive: true });
    await writeFile(args.out, result.sql, "utf8");
  }
  return result;
}

async function selfTest() {
  const dir = await mkdtemp(join(tmpdir(), "sobag-pim-postgres-seed-"));
  try {
    const productsPath = join(dir, "products.json");
    const out = join(dir, "seed.sql");
    await writeFile(
      productsPath,
      JSON.stringify([
        {
          id: "seed-1",
          baseSku: "seed_1",
          name: "Seed one",
          status: "published",
          category: "Подушки",
          tags: ["Подушка"],
          types: ["Подушка"],
          sizes: ["40x40"],
          materials: ["Велюр"],
          basePrice: 100,
          image: "assets/product-preview-live/seed/1.webp",
        },
      ])
    );
    const result = await writeSeed({ products: productsPath, out, source: "self-test" });
    const sql = await readFile(out, "utf8");
    for (const expected of ["insert into products", "insert into variants", "insert into images", "insert into taxonomies", "insert into product_taxonomies", "commit;"]) {
      if (!sql.includes(expected)) throw new Error(`PIM PostgreSQL seed self-test missing ${expected}`);
    }
    if (sql.includes("undefined") || result.counts.products !== 1 || result.counts.variants !== 1) throw new Error("PIM PostgreSQL seed self-test counts mismatch");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArgs();
  if (args.selfTest) {
    await selfTest();
    console.log("PIM PostgreSQL seed self-test passed");
    return;
  }
  const result = await writeSeed(args);
  console.log(args.dryRun ? "PIM PostgreSQL seed dry-run passed" : `PIM PostgreSQL seed written: ${args.out}`);
  console.log(
    `Rows: ${result.counts.products} products, ${result.counts.variants} variants, ${result.counts.images} images, ${result.counts.imageVariants} image variants, ${result.counts.taxonomies} taxonomies, ${result.counts.taxonomyAssignments} product-taxonomy links`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

export { buildSeedSql };
