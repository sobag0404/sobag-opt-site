import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildSeedSql } from "./pim-postgres-seed.mjs";

const root = process.cwd();
const DEFAULT_PRODUCTS = join(root, "data", "products-live.json");
const DEFAULT_SCHEMA = join(root, "docs", "pim-postgres-schema.sql");
const DEFAULT_OUT_DIR = join(root, "local-import-output", "pim-postgres-migration");

function text(value) {
  return String(value || "").trim();
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    products: DEFAULT_PRODUCTS,
    schema: DEFAULT_SCHEMA,
    outDir: DEFAULT_OUT_DIR,
    source: "pim-postgres-migration-bundle",
    dryRun: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--products") args.products = resolve(root, argv[++index] || "");
    else if (token === "--schema") args.schema = resolve(root, argv[++index] || "");
    else if (token === "--out-dir") args.outDir = resolve(root, argv[++index] || "");
    else if (token === "--source") args.source = argv[++index] || args.source;
    else if (token === "--dry-run") args.dryRun = true;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/pim-postgres-migration-bundle.mjs

Options:
  --products <path>  Products JSON to bundle. Default: data/products-live.json
  --schema <path>    PostgreSQL schema SQL. Default: docs/pim-postgres-schema.sql
  --out-dir <path>   Ignored output folder. Default: local-import-output/pim-postgres-migration
  --dry-run          Build and validate bundle data without writing files.
  --self-test        Run a temporary fixture bundle.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function insideLocalOutput(outDir) {
  const localRoot = resolve(root, "local-import-output");
  const target = resolve(outDir);
  return target === localRoot || target.startsWith(`${localRoot}\\`) || target.startsWith(`${localRoot}/`);
}

function assertSchemaHasRuntimeContract(schemaSql) {
  const required = [
    "create table if not exists products",
    "create table if not exists variants",
    "create table if not exists images",
    "create table if not exists image_variants",
    "create table if not exists taxonomies",
    "create table if not exists product_taxonomies",
    "create table if not exists import_batches",
    "create table if not exists import_batch_rows",
    "create or replace view public_catalog_products",
    "create or replace view public_catalog_cards",
  ];
  const missing = required.filter((fragment) => !schemaSql.includes(fragment));
  if (missing.length) throw new Error(`Schema is missing migration contract fragments: ${missing.join(", ")}`);
}

async function buildBundle(args) {
  if (!args.dryRun && !insideLocalOutput(args.outDir)) {
    throw new Error("--out-dir must stay inside local-import-output to avoid committing or overwriting migration artifacts");
  }
  const [schemaSql, productsText] = await Promise.all([readFile(args.schema, "utf8"), readFile(args.products, "utf8")]);
  assertSchemaHasRuntimeContract(schemaSql);
  const products = JSON.parse(productsText);
  if (!Array.isArray(products) || !products.length) throw new Error("Products JSON must contain a non-empty array.");
  const seed = buildSeedSql(products, { products: args.products, source: args.source });
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: args.source,
    productsFile: relative(root, args.products).replace(/\\/g, "/"),
    schemaFile: relative(root, args.schema).replace(/\\/g, "/"),
    outputDir: relative(root, args.outDir).replace(/\\/g, "/"),
    files: [
      { path: "00-schema.sql", sha256: hash(schemaSql), bytes: Buffer.byteLength(schemaSql) },
      { path: "01-seed.sql", sha256: hash(seed.sql), bytes: Buffer.byteLength(seed.sql) },
    ],
    counts: seed.counts,
    guardrails: [
      "Generated under local-import-output and ignored by Git.",
      "Review SQL before applying to any database.",
      "Run rehearsal with rollback before any real cutover.",
      "Do not use production DB credentials without explicit approval.",
    ],
  };
  if (!args.dryRun) {
    await mkdir(args.outDir, { recursive: true });
    await Promise.all([
      writeFile(join(args.outDir, "00-schema.sql"), schemaSql, "utf8"),
      writeFile(join(args.outDir, "01-seed.sql"), seed.sql, "utf8"),
      writeFile(join(args.outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
    ]);
  }
  return manifest;
}

async function selfTest() {
  const dir = await mkdtemp(join(tmpdir(), "sobag-pim-postgres-bundle-"));
  try {
    const products = join(dir, "products.json");
    const outDir = join(root, "local-import-output", `pim-postgres-bundle-self-test-${Date.now()}`);
    await writeFile(
      products,
      JSON.stringify([
        {
          id: "bundle-1",
          baseSku: "bundle_1",
          name: "Bundle one",
          status: "published",
          category: "Подушки",
          basePrice: 120,
          variants: [{ sku: "bundle_1_40", type: "Подушка", size: "40x40", material: "Велюр", price: 120 }],
          images: [
            {
              url: "https://cdn.example.test/products/bundle_1/main.webp",
              storageKey: "products/bundle_1/main.webp",
              provider: "s3-compatible",
              width: 900,
              height: 900,
              mime: "image/webp",
            },
          ],
        },
      ])
    );
    const manifest = await buildBundle({ products, schema: DEFAULT_SCHEMA, outDir, source: "self-test", dryRun: false });
    if (manifest.counts.products !== 1 || manifest.files.length !== 2 || !manifest.files.every((file) => file.sha256.length === 64)) {
      throw new Error("PIM PostgreSQL migration bundle self-test counts mismatch");
    }
    await rm(outDir, { recursive: true, force: true });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArgs();
  if (args.selfTest) {
    await selfTest();
    console.log("PIM PostgreSQL migration bundle self-test passed");
    return;
  }
  const manifest = await buildBundle(args);
  console.log(args.dryRun ? "PIM PostgreSQL migration bundle dry-run passed" : `PIM PostgreSQL migration bundle written: ${args.outDir}`);
  console.log(
    `Rows: ${manifest.counts.products} products, ${manifest.counts.variants} variants, ${manifest.counts.images} images, ${manifest.counts.imageVariants} image variants, ${manifest.counts.taxonomyAssignments} taxonomy links`
  );
  console.log(`Files: ${manifest.files.map((file) => `${file.path}:${file.sha256.slice(0, 12)}`).join(", ")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

export { buildBundle };
