import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildCatalogPim } = require("../api/_lib/pim.js");
const { buildCatalogWriteStatements, runCatalogWriteTransaction } = require("../api/_lib/catalog-db-write.js");

function fixturePim() {
  return buildCatalogPim(
    [
      {
        id: "db-write-1",
        baseSku: "db_write_1",
        name: "DB write one",
        status: "published",
        category: "Подушки",
        collections: ["Паттерны"],
        tags: ["Опт"],
        basePrice: 250,
        description: "Future DB write fixture",
        variants: [
          {
            sku: "db_write_1_40",
            type: "Подушка",
            size: "40x40",
            material: "Велюр",
            price: 250,
            qtyStep: 5,
          },
        ],
        images: [
          {
            url: "https://cdn.example.test/products/db_write_1/main.webp",
            storageKey: "products/db_write_1/main.webp",
            provider: "s3-compatible",
            width: 900,
            height: 900,
            mime: "image/webp",
            variants: [
              {
                url: "https://cdn.example.test/products/db_write_1/main-480.avif",
                storageKey: "products/db_write_1/main-480.avif",
                provider: "s3-compatible",
                width: 480,
                height: 480,
                mime: "image/avif",
                format: "avif",
              },
            ],
          },
        ],
      },
    ],
    {
      source: "db-write-smoke",
      includeImportBatchRows: true,
      importBatches: [
        {
          id: "IB-db-write-smoke",
          source: "smoke",
          status: "applied",
          rows: [{ row: 1, baseSku: "db_write_1", name: "DB write one", status: "created", action: "created", variantCount: 1 }],
        },
      ],
    }
  );
}

function assertStatement(statement) {
  assert.match(statement.sql, /^INSERT INTO [a-z_]+ \(/);
  assert.match(statement.sql, /ON CONFLICT \(id\) DO UPDATE SET/);
  assert.equal(/DELETE\s+FROM/i.test(statement.sql), false);
  assert.equal(/DROP\s+/i.test(statement.sql), false);
  assert.equal(Array.isArray(statement.params), true);
  assert.ok(statement.params.length > 0);
  const placeholders = [...statement.sql.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]));
  assert.equal(Math.max(...placeholders), statement.params.length);
}

function fakeClient(failAtTable = "") {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (failAtTable && sql.startsWith(`INSERT INTO ${failAtTable} `)) throw new Error(`planned ${failAtTable} failure`);
      return { rows: [] };
    },
  };
}

async function main() {
  const statements = buildCatalogWriteStatements(fixturePim());
  const tables = new Set(statements.map((statement) => statement.table));
  for (const expected of ["products", "variants", "images", "image_variants", "taxonomies", "product_taxonomies", "import_batches", "import_batch_rows"]) {
    assert.equal(tables.has(expected), true, `missing ${expected} write statement`);
  }
  statements.forEach(assertStatement);
  const product = statements.find((statement) => statement.table === "products");
  assert.equal(product.params.includes("db_write_1"), true);
  const imageVariant = statements.find((statement) => statement.table === "image_variants");
  assert.equal(imageVariant.params.includes("avif"), true);

  const dryClient = fakeClient();
  const dryResult = await runCatalogWriteTransaction(dryClient, fixturePim());
  assert.equal(dryResult.dryRun, true);
  assert.equal(dryClient.calls[0].sql, "BEGIN");
  assert.equal(dryClient.calls.at(-1).sql, "ROLLBACK");

  const commitClient = fakeClient();
  const commitResult = await runCatalogWriteTransaction(commitClient, fixturePim(), { dryRun: false });
  assert.equal(commitResult.dryRun, false);
  assert.equal(commitClient.calls.at(-1).sql, "COMMIT");

  const failingClient = fakeClient("variants");
  await assert.rejects(() => runCatalogWriteTransaction(failingClient, fixturePim(), { dryRun: false }), /planned variants failure/);
  assert.equal(failingClient.calls.at(-1).sql, "ROLLBACK");

  console.log(`catalog DB write smoke passed: ${statements.length} upsert statements, ${tables.size} tables`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
