import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { buildSeedSql } from "./pim-postgres-seed.mjs";

const require = createRequire(import.meta.url);
const root = process.cwd();

function text(value) {
  return String(value || "").trim();
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    products: resolve(root, "data/products-live.json"),
    schema: resolve(root, "docs/pim-postgres-schema.sql"),
    source: "pim-postgres-rehearsal",
    execute: false,
    allowRemoteTest: false,
    selfTest: false,
    databaseUrlEnv: "SOBAG_CATALOG_DATABASE_URL",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--products") args.products = resolve(root, argv[++index] || "");
    else if (token === "--schema") args.schema = resolve(root, argv[++index] || "");
    else if (token === "--source") args.source = argv[++index] || args.source;
    else if (token === "--database-url-env") args.databaseUrlEnv = argv[++index] || args.databaseUrlEnv;
    else if (token === "--execute") args.execute = true;
    else if (token === "--allow-remote-test") args.allowRemoteTest = true;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/pim-postgres-rehearsal.mjs
  node tools/pim-postgres-rehearsal.mjs --execute --database-url-env SOBAG_CATALOG_DATABASE_URL

Default mode builds schema + seed SQL and does not connect to a database.
Execute mode connects only through an env var, runs inside one transaction, and always rolls back.
Remote DB URLs require --allow-remote-test. Never use production DB credentials.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function stripSeedTransaction(sql) {
  return text(sql)
    .split(/\r?\n/)
    .filter((line) => !/^\s*(begin|commit)\s*;\s*$/i.test(line))
    .join("\n");
}

function assertSafeDatabaseUrl(value, args) {
  const url = text(value);
  if (!url) throw new Error(`${args.databaseUrlEnv} is not configured`);
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${args.databaseUrlEnv} is not a valid URL`);
  }
  const host = parsed.hostname.toLowerCase();
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!local && !args.allowRemoteTest) {
    throw new Error("Remote PostgreSQL rehearsal requires --allow-remote-test and must not target production data");
  }
  return url;
}

async function buildRehearsal(args) {
  const [schema, productsRaw] = await Promise.all([readFile(args.schema, "utf8"), readFile(args.products, "utf8")]);
  const products = JSON.parse(productsRaw);
  if (!Array.isArray(products) || !products.length) throw new Error("Products JSON must contain a non-empty array.");
  const seed = buildSeedSql(products, args);
  const sql = ["begin;", schema, stripSeedTransaction(seed.sql), "rollback;", ""].join("\n\n");
  return { sql, counts: seed.counts };
}

async function executeRehearsal(args, sql) {
  const databaseUrl = assertSafeDatabaseUrl(process.env[args.databaseUrlEnv], args);
  const { Client } = require("pg");
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function selfTest() {
  const args = { products: resolve(root, "data/products-live.json"), schema: resolve(root, "docs/pim-postgres-schema.sql"), source: "self-test" };
  const rehearsal = await buildRehearsal(args);
  assert.ok(rehearsal.sql.includes("create table if not exists products"));
  assert.ok(rehearsal.sql.includes("insert into products"));
  assert.ok(rehearsal.sql.includes("create or replace view public_catalog_cards"));
  assert.ok(/^\s*begin\s*;/im.test(rehearsal.sql));
  assert.ok(/^\s*rollback\s*;/im.test(rehearsal.sql));
  assert.equal(/^\s*commit\s*;/im.test(stripSeedTransaction(rehearsal.sql)), false);
  assert.ok(rehearsal.counts.products > 0);
}

async function main() {
  const args = parseArgs();
  if (args.selfTest) {
    await selfTest();
    console.log("PIM PostgreSQL rehearsal self-test passed");
    return;
  }
  const rehearsal = await buildRehearsal(args);
  if (args.execute) await executeRehearsal(args, rehearsal.sql);
  console.log(args.execute ? "PIM PostgreSQL rehearsal executed and rolled back" : "PIM PostgreSQL rehearsal dry-run passed");
  console.log(
    `Rows: ${rehearsal.counts.products} products, ${rehearsal.counts.variants} variants, ${rehearsal.counts.images} images, ${rehearsal.counts.imageVariants} image variants, ${rehearsal.counts.taxonomies} taxonomies, ${rehearsal.counts.taxonomyAssignments} product-taxonomy links, ${rehearsal.counts.importBatchRows} import batch rows`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
