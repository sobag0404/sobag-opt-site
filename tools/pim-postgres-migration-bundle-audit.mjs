import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildBundle } from "./pim-postgres-migration-bundle.mjs";

const root = process.cwd();
const DEFAULT_BUNDLE_DIR = join(root, "local-import-output", "pim-postgres-migration");
const SECRET_PATTERNS = [
  /postgres(?:ql)?:\/\/[^/\s]+:[^@\s]+@/i,
  /SOBAG_[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|KEY)/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

function text(value) {
  return String(value || "").trim();
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    bundleDir: DEFAULT_BUNDLE_DIR,
    dryRun: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--bundle-dir") args.bundleDir = resolve(root, argv[++index] || "");
    else if (token === "--dry-run") args.dryRun = true;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/pim-postgres-migration-bundle-audit.mjs

Options:
  --bundle-dir <path>  Bundle folder. Default: local-import-output/pim-postgres-migration
  --dry-run            Build the bundle in memory and audit that output.
  --self-test          Generate a temporary fixture bundle and audit it.`);
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

function assertPortableRelativePath(value, label) {
  const prepared = text(value);
  assert.ok(prepared, `${label} is required`);
  assert.equal(prepared.includes(".."), false, `${label} must not include parent traversal`);
  assert.equal(/^[a-z]:/i.test(prepared), false, `${label} must not be an absolute Windows path`);
  assert.equal(prepared.startsWith("/") || prepared.startsWith("\\"), false, `${label} must be relative`);
}

function assertNoSecrets(label, value) {
  const hit = SECRET_PATTERNS.find((pattern) => pattern.test(value));
  assert.equal(hit, undefined, `${label} contains a secret-like value`);
}

function auditBundleParts({ manifest, schemaSql, seedSql }) {
  assert.equal(typeof manifest, "object", true, "manifest must be an object");
  assertPortableRelativePath(manifest.productsFile, "productsFile");
  assertPortableRelativePath(manifest.schemaFile, "schemaFile");
  assertPortableRelativePath(manifest.outputDir, "outputDir");
  assert.ok(manifest.outputDir.startsWith("local-import-output/"), "outputDir must stay under local-import-output");
  assert.equal(Array.isArray(manifest.files), true, "manifest.files must be an array");
  assert.equal(manifest.files.length, 2, "bundle must have schema and seed file entries");
  const files = Object.fromEntries(manifest.files.map((file) => [file.path, file]));
  assert.equal(files["00-schema.sql"]?.sha256, hash(schemaSql), "schema hash mismatch");
  assert.equal(files["01-seed.sql"]?.sha256, hash(seedSql), "seed hash mismatch");
  assert.equal(files["00-schema.sql"]?.bytes, Buffer.byteLength(schemaSql), "schema byte count mismatch");
  assert.equal(files["01-seed.sql"]?.bytes, Buffer.byteLength(seedSql), "seed byte count mismatch");
  assert.ok(Number(manifest.counts?.products) > 0, "bundle must contain products");
  assert.ok(Number(manifest.counts?.variants) > 0, "bundle must contain variants");
  assert.ok(Number(manifest.counts?.images) >= 0, "bundle image count must be present");
  assert.equal(schemaSql.includes("create table if not exists products"), true, "schema must contain products table");
  assert.equal(schemaSql.includes("create or replace view public_catalog_cards"), true, "schema must contain public catalog cards view");
  assert.equal(seedSql.includes("insert into products"), true, "seed must contain products insert");
  assert.equal(/^\s*begin\s*;/im.test(seedSql), true, "seed must open a transaction");
  assert.equal(/^\s*commit\s*;/im.test(seedSql), true, "seed must commit in standalone bundle mode");
  assertNoSecrets("manifest", JSON.stringify(manifest));
  assertNoSecrets("schema", schemaSql);
  assertNoSecrets("seed", seedSql);
  return {
    ok: true,
    counts: manifest.counts,
    hashes: manifest.files.map((file) => `${file.path}:${file.sha256.slice(0, 12)}`),
  };
}

async function auditBundleDir(bundleDir) {
  const [manifestRaw, schemaSql, seedSql] = await Promise.all([
    readFile(join(bundleDir, "manifest.json"), "utf8"),
    readFile(join(bundleDir, "00-schema.sql"), "utf8"),
    readFile(join(bundleDir, "01-seed.sql"), "utf8"),
  ]);
  return auditBundleParts({ manifest: JSON.parse(manifestRaw), schemaSql, seedSql });
}

async function auditDryRun() {
  const manifest = await buildBundle({
    products: join(root, "data", "products-live.json"),
    schema: join(root, "docs", "pim-postgres-schema.sql"),
    outDir: DEFAULT_BUNDLE_DIR,
    source: "audit-dry-run",
    dryRun: true,
  });
  const [schemaSql, productsRaw] = await Promise.all([readFile(join(root, "docs", "pim-postgres-schema.sql"), "utf8"), readFile(join(root, "data", "products-live.json"), "utf8")]);
  const { buildSeedSql } = await import("./pim-postgres-seed.mjs");
  const seed = buildSeedSql(JSON.parse(productsRaw), { products: join(root, "data", "products-live.json"), source: "audit-dry-run" });
  return auditBundleParts({ manifest, schemaSql, seedSql: seed.sql });
}

async function selfTest() {
  const scratch = join(root, "local-import-output", `pim-postgres-bundle-audit-self-test-${Date.now()}`);
  const outDir = join(scratch, "bundle");
  try {
    await mkdir(scratch, { recursive: true });
    const products = join(scratch, "products.json");
    await writeFile(
      products,
      JSON.stringify([
        {
          id: "audit-1",
          baseSku: "audit_1",
          name: "Audit product",
          status: "published",
          basePrice: 100,
          category: "Audit",
          variants: [{ sku: "audit_1_40", type: "Pillow", size: "40x40", material: "Velour", price: 100 }],
        },
      ]),
      "utf8"
    );
    await mkdir(outDir, { recursive: true });
    await buildBundle({ products, schema: join(root, "docs", "pim-postgres-schema.sql"), outDir, source: "audit-self-test", dryRun: false });
    const report = await auditBundleDir(outDir);
    assert.equal(report.ok, true);
    const bad = await readFile(join(outDir, "manifest.json"), "utf8");
    await writeFile(join(outDir, "manifest.json"), bad.replace(/"products": 1/, '"products": 0'), "utf8");
    await assert.rejects(() => auditBundleDir(outDir), /bundle must contain products/);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArgs();
  if (args.selfTest) {
    await selfTest();
    console.log("PIM PostgreSQL migration bundle audit self-test passed");
    return;
  }
  const report = args.dryRun ? await auditDryRun() : await auditBundleDir(args.bundleDir);
  console.log(`PIM PostgreSQL migration bundle audit passed: ${report.counts.products} products, ${report.counts.variants} variants`);
  console.log(`Files: ${report.hashes.join(", ")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

export { auditBundleParts };
