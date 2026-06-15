import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { auditCandidateProducts } from "./photo-migration-candidate-audit.mjs";
import { auditProducts } from "./image-metadata-audit.mjs";

const require = createRequire(import.meta.url);
const { buildCatalogPim } = require("../server-routes/_lib/pim.js");
const { buildCatalogWriteStatements } = require("../server-routes/_lib/catalog-db-write.js");

const root = process.cwd();

function text(value) {
  return String(value || "").trim();
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    current: resolve(root, "data/products-live.json"),
    candidate: "",
    backupOut: "local-import-output/catalog-db-photo-backup.json",
    databaseUrlEnv: "SOBAG_CATALOG_DATABASE_URL",
    execute: false,
    json: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--current") args.current = resolve(root, argv[++index] || "");
    else if (token === "--candidate") args.candidate = resolve(root, argv[++index] || "");
    else if (token === "--backup-out") args.backupOut = argv[++index] || args.backupOut;
    else if (token === "--database-url-env") args.databaseUrlEnv = argv[++index] || args.databaseUrlEnv;
    else if (token === "--execute") args.execute = true;
    else if (token === "--json") args.json = true;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/catalog-db-photo-apply.mjs --candidate local-import-output/products-with-object-images.json
  node tools/catalog-db-photo-apply.mjs --candidate /tmp/sobag-products-with-object-images.json --backup-out /tmp/sobag-catalog-db-photo-backup.json --execute

Default mode connects through an env var but rolls back. --execute commits.
The script backs up current catalog product/image rows, deletes image rows for candidate products to avoid stale legacy images, then upserts product/image metadata.
It prints only counts, never database URLs or secret values.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

async function readProducts(path) {
  const parsed = JSON.parse(await readFile(path, "utf8"));
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.products)) return parsed.products;
  throw new Error(`${path} must be an array or an object with products[].`);
}

function productIds(products) {
  return products.map((product, index) => text(product.id || product.baseSku || `product-${index + 1}`)).filter(Boolean);
}

function photoStatementsForProducts(products) {
  const pim = buildCatalogPim(products, { source: "catalog-db-photo-apply", includeImportBatchRows: false });
  const statements = buildCatalogWriteStatements(pim).filter((statement) => ["products", "images", "image_variants"].includes(statement.table));
  return { pim, statements };
}

async function writeBackup(path, backup) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(backup, null, 2)}\n`, "utf8");
}

async function backupCatalogRows(client, ids) {
  const products = await client.query("SELECT * FROM products WHERE id = ANY($1::text[]) ORDER BY id", [ids]);
  const images = await client.query("SELECT * FROM images WHERE product_id = ANY($1::text[]) ORDER BY product_id, sort_order, id", [ids]);
  const imageVariants = await client.query(
    "SELECT iv.* FROM image_variants iv JOIN images i ON i.id = iv.image_id WHERE i.product_id = ANY($1::text[]) ORDER BY i.product_id, iv.id",
    [ids]
  );
  return {
    generatedAt: new Date().toISOString(),
    products: products.rows,
    images: images.rows,
    imageVariants: imageVariants.rows,
  };
}

async function runPhotoApply(client, products, args) {
  const ids = productIds(products);
  if (!ids.length) throw new Error("Candidate has no product ids.");
  const backup = await backupCatalogRows(client, ids);
  if (args.backupOut) await writeBackup(args.backupOut, backup);

  const { pim, statements } = photoStatementsForProducts(products);
  await client.query("BEGIN");
  try {
    const deleted = await client.query("DELETE FROM images WHERE product_id = ANY($1::text[])", [ids]);
    for (const statement of statements) {
      await client.query(statement.sql, statement.params);
    }
    await client.query(args.execute ? "COMMIT" : "ROLLBACK");
    return {
      ok: true,
      committed: args.execute,
      products: pim.counts.products,
      images: pim.counts.images,
      imageVariants: pim.counts.imageVariants,
      statements: statements.length,
      deletedImages: Number(deleted.rowCount || 0),
      backup: args.backupOut || "",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

function databaseUrlFromEnv(name) {
  const url = text(process.env[name]);
  if (!url) throw new Error(`${name} is not configured`);
  return url;
}

async function run(args) {
  if (!args.candidate) throw new Error("--candidate is required");
  const [current, candidate] = await Promise.all([readProducts(args.current), readProducts(args.candidate)]);
  const candidateAudit = auditCandidateProducts(current, candidate, { requireProvider: "s3-compatible", requireResponsive: true });
  if (!candidateAudit.ok) throw new Error(`photo candidate is not safe to apply: ${candidateAudit.errors.slice(0, 10).join("; ")}`);
  auditProducts(candidate, { requireMetadata: true, requireResponsive: true, requireSquare: true, publishedOnly: true });

  const { Client } = require("pg");
  const client = new Client({ connectionString: databaseUrlFromEnv(args.databaseUrlEnv), connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    return await runPhotoApply(client, candidate, args);
  } finally {
    await client.end();
  }
}

function fakeClient() {
  const calls = [];
  const rows = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.startsWith("SELECT")) return { rows };
      if (sql.startsWith("DELETE")) return { rowCount: 2, rows: [] };
      return { rows: [] };
    },
  };
}

async function selfTest() {
  const products = [
    {
      id: "photo-apply-1",
      baseSku: "photo_apply_1",
      name: "Photo apply",
      status: "published",
      basePrice: 100,
      images: [
        {
          url: "https://cdn.example/products/photo-apply-1.webp",
          storageKey: "products/photo-apply-1/main.webp",
          provider: "s3-compatible",
          width: 480,
          height: 480,
          mime: "image/webp",
          uploadedAt: "2026-06-15T00:00:00.000Z",
          variants: [
            { url: "https://cdn.example/products/photo-apply-1-480w.webp", storageKey: "products/photo-apply-1/main-480w.webp", provider: "s3-compatible", width: 480, height: 480, mime: "image/webp", format: "webp" },
            { url: "https://cdn.example/products/photo-apply-1-480w.avif", storageKey: "products/photo-apply-1/main-480w.avif", provider: "s3-compatible", width: 480, height: 480, mime: "image/avif", format: "avif" },
          ],
        },
      ],
    },
  ];
  const client = fakeClient();
  const report = await runPhotoApply(client, products, { execute: false, backupOut: "" });
  assert.equal(report.committed, false);
  assert.equal(report.deletedImages, 2);
  assert.equal(client.calls[3].sql, "BEGIN");
  assert.equal(client.calls.at(-1).sql, "ROLLBACK");
  assert.ok(client.calls.some((call) => call.sql.startsWith("DELETE FROM images")));
  assert.ok(client.calls.some((call) => call.sql.startsWith("INSERT INTO image_variants")));
}

async function main() {
  const args = parseArgs();
  if (args.selfTest) {
    await selfTest();
    console.log("catalog DB photo apply self-test passed");
    return;
  }
  const report = await run(args);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`catalog DB photo apply ${report.committed ? "committed" : "rolled back"}: ${report.products} products, ${report.images} images, ${report.imageVariants} image variants, ${report.deletedImages} previous image rows deleted`);
    if (report.backup) console.log(`Backup: ${report.backup}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

export { runPhotoApply, photoStatementsForProducts };
