import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { buildCatalogPim } = require("../api/_lib/pim.js");
const { buildCatalogWriteStatements } = require("../api/_lib/catalog-db-write.js");

const root = process.cwd();
const TABLES = ["products", "variants", "images", "image_variants", "taxonomies", "product_taxonomies", "import_batches", "import_batch_rows"];
const FORBIDDEN_SQL = /\b(delete|truncate|drop|alter)\b/i;
const LOCAL_PATH = /(^[a-z]:[\\/]|^\\\\|^\/users\/|^\/home\/|^file:)/i;

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
  node tools/catalog-db-write-plan-audit.mjs [--products data/products-live.json]

Builds the future PostgreSQL write statement plan for the current catalog and validates table coverage.
It does not connect to PostgreSQL, upload files, or touch production data.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function flatTaxonomies(taxonomies = {}) {
  return ["categories", "collections", "holidays", "tags"].flatMap((bucket) => (Array.isArray(taxonomies[bucket]) ? taxonomies[bucket] : []));
}

function countByTable(statements) {
  return statements.reduce((counts, statement) => {
    counts[statement.table] = (counts[statement.table] || 0) + 1;
    return counts;
  }, {});
}

function placeholderCount(sql) {
  const matches = sql.match(/\$(\d+)/g) || [];
  return matches.length ? Math.max(...matches.map((match) => Number(match.slice(1)))) : 0;
}

function expectedCounts(pim) {
  return {
    products: pim.products.length,
    variants: pim.variants.length,
    images: pim.images.length,
    image_variants: pim.counts.imageVariants || 0,
    taxonomies: flatTaxonomies(pim.taxonomies).length,
    product_taxonomies: pim.taxonomyAssignments?.length || 0,
    import_batches: pim.importBatches?.length || 0,
    import_batch_rows: pim.importBatchRows?.length || 0,
  };
}

function auditStatements(statements, counts) {
  const errors = [];
  statements.forEach((statement, index) => {
    if (!TABLES.includes(statement.table)) errors.push(`statement ${index} targets unsupported table ${statement.table}`);
    if (!statement.sql.startsWith(`INSERT INTO ${statement.table} `)) errors.push(`statement ${index} is not an upsert into ${statement.table}`);
    if (FORBIDDEN_SQL.test(statement.sql)) errors.push(`statement ${index} contains forbidden SQL`);
    if (statement.sql.includes(";")) errors.push(`statement ${index} contains a statement separator`);
    if (placeholderCount(statement.sql) !== statement.params.length) errors.push(`statement ${index} placeholder/param mismatch`);
    for (const param of statement.params) {
      if (typeof param === "string" && LOCAL_PATH.test(param)) errors.push(`statement ${index} contains a local path param`);
    }
  });
  const actual = countByTable(statements);
  for (const table of TABLES) {
    if ((actual[table] || 0) !== (counts[table] || 0)) errors.push(`${table} count mismatch: expected ${counts[table] || 0}, got ${actual[table] || 0}`);
  }
  return { actual, errors };
}

function auditCatalogDbWritePlan(products) {
  if (!Array.isArray(products) || !products.length) throw new Error("Products JSON must contain a non-empty array.");
  const pim = buildCatalogPim(products, { source: "catalog-db-write-plan-audit", includeImportBatchRows: true });
  const statements = buildCatalogWriteStatements(pim);
  const counts = expectedCounts(pim);
  const { actual, errors } = auditStatements(statements, counts);
  return {
    ok: errors.length === 0,
    errors,
    counts,
    actual,
    statements: statements.length,
    tables: TABLES.filter((table) => (actual[table] || 0) > 0),
  };
}

function selfTest() {
  const report = auditCatalogDbWritePlan([
    {
      id: "write-plan-1",
      baseSku: "write_plan_1",
      name: "Write plan one",
      status: "published",
      categories: ["Pillows"],
      collections: ["Audit"],
      holidays: ["New year"],
      tags: ["Soft"],
      types: ["Pillow"],
      sizes: ["40x40"],
      materials: ["Velour"],
      basePrice: 100,
      images: [
        {
          id: "write-plan-image-1",
          url: "https://cdn.example.test/products/write-plan-1.webp",
          storageKey: "products/write-plan-1/main.webp",
          provider: "s3-compatible",
          width: 900,
          height: 900,
          mime: "image/webp",
          variants: [
            {
              id: "write-plan-image-1-avif",
              url: "https://cdn.example.test/products/write-plan-1.avif",
              storageKey: "products/write-plan-1/main.avif",
              provider: "s3-compatible",
              width: 900,
              height: 900,
              mime: "image/avif",
              format: "avif",
            },
          ],
        },
      ],
    },
  ]);
  assert.equal(report.ok, true);
  assert.equal(report.counts.products, 1);
  assert.equal(report.counts.image_variants, 1);
  assert.equal(report.actual.product_taxonomies, 4);
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("catalog DB write plan audit self-test passed");
    return;
  }
  const report = auditCatalogDbWritePlan(JSON.parse(readFileSync(args.products, "utf8")));
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`catalog DB write plan audit ${report.ok ? "passed" : "failed"}: ${report.statements} upsert statements, ${report.tables.length} active tables`);
    if (report.errors.length) console.log(`Errors: ${report.errors.slice(0, 20).join("; ")}`);
  }
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

export { auditCatalogDbWritePlan };
