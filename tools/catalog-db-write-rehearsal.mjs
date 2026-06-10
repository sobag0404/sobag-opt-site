import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { buildCatalogPim } = require("../api/_lib/pim.js");
const { buildCatalogWriteStatements, runCatalogWriteTransaction } = require("../api/_lib/catalog-db-write.js");

const root = process.cwd();

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
  node tools/catalog-db-write-rehearsal.mjs [--products data/products-live.json]

Runs the current catalog through the future PostgreSQL write transaction interface using a fake client.
It always rehearses rollback behavior and never connects to PostgreSQL or touches production data.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function fakeClient(options = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (options.failAtTable && sql.startsWith(`INSERT INTO ${options.failAtTable} `)) throw new Error(`planned ${options.failAtTable} failure`);
      return { rows: [] };
    },
  };
}

function countTables(calls) {
  return calls.reduce((counts, call) => {
    const match = /^INSERT INTO ([a-z_]+) /.exec(call.sql);
    if (match) counts[match[1]] = (counts[match[1]] || 0) + 1;
    return counts;
  }, {});
}

async function rehearseCatalogDbWrite(products) {
  if (!Array.isArray(products) || !products.length) throw new Error("Products JSON must contain a non-empty array.");
  const pim = buildCatalogPim(products, { source: "catalog-db-write-rehearsal", includeImportBatchRows: true });
  const statements = buildCatalogWriteStatements(pim);
  const client = fakeClient();
  const result = await runCatalogWriteTransaction(client, pim);
  const first = client.calls[0]?.sql;
  const last = client.calls.at(-1)?.sql;
  if (first !== "BEGIN") throw new Error("write rehearsal did not start with BEGIN");
  if (last !== "ROLLBACK") throw new Error("write rehearsal must end with ROLLBACK");
  if (client.calls.some((call) => call.sql === "COMMIT")) throw new Error("write rehearsal unexpectedly committed");
  if (result.statements !== statements.length) throw new Error("write rehearsal statement count mismatch");
  return { ok: true, statements: statements.length, calls: client.calls.length, tables: countTables(client.calls), dryRun: result.dryRun };
}

async function selfTest() {
  const products = [
    {
      id: "write-rehearsal-1",
      baseSku: "write_rehearsal_1",
      name: "Write rehearsal one",
      status: "published",
      categories: ["Pillows"],
      collections: ["Audit"],
      types: ["Pillow"],
      sizes: ["40x40"],
      materials: ["Velour"],
      basePrice: 100,
      image: "assets/product-preview-live/write-rehearsal/1.webp",
    },
  ];
  const report = await rehearseCatalogDbWrite(products);
  assert.equal(report.ok, true);
  assert.equal(report.dryRun, true);
  assert.equal(report.tables.products, 1);
  assert.equal(report.tables.variants, 1);
  const failing = fakeClient({ failAtTable: "variants" });
  const pim = buildCatalogPim(products, { source: "catalog-db-write-rehearsal-self-test" });
  await assert.rejects(() => runCatalogWriteTransaction(failing, pim, { dryRun: false }), /planned variants failure/);
  assert.equal(failing.calls.at(-1).sql, "ROLLBACK");
  assert.equal(failing.calls.some((call) => call.sql === "COMMIT"), false);
}

async function main() {
  const args = parseArgs();
  if (args.selfTest) {
    await selfTest();
    console.log("catalog DB write rehearsal self-test passed");
    return;
  }
  const report = await rehearseCatalogDbWrite(JSON.parse(readFileSync(args.products, "utf8")));
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else console.log(`catalog DB write rehearsal passed: ${report.statements} upsert statements, rollback verified`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

export { rehearseCatalogDbWrite };
