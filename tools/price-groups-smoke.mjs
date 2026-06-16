import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { createSobagServer } from "../server.mjs";

const require = createRequire(import.meta.url);
const {
  applyPriceChangesToDb,
  applyPriceChangesToProducts,
  collectPriceGroupsFromProducts,
  parsePriceImportRows,
  priceListCsv,
  priceListRows,
  productVariantRecords,
} = require("../server-routes/_lib/price-groups.js");

function fixtureProducts() {
  return [
    {
      id: "price-a",
      baseSku: "price_a",
      name: "Design A",
      status: "published",
      types: ["Подушка"],
      sizes: ["40x40"],
      materials: ["Велюр"],
      basePrice: 220,
    },
    {
      id: "price-b",
      baseSku: "price_b",
      name: "Design B",
      status: "published",
      types: ["Подушка"],
      sizes: ["40x40"],
      materials: ["Велюр"],
      basePrice: 220,
    },
  ];
}

async function listen(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }
  return { response, payload };
}

function fakeDbClient() {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      return { rows: [] };
    },
  };
}

async function main() {
  const products = fixtureProducts();
  const groups = collectPriceGroupsFromProducts(products);
  assert.equal(groups.length, 1, "identical product variants should collapse into one price group");
  assert.equal(groups[0].name, "Подушка Велюр 40x40");
  assert.equal(groups[0].price, 220);
  assert.equal(groups[0].skuCount, 2);

  const records = productVariantRecords(products);
  const preview = parsePriceImportRows(records, [{ "Категория/группа": "Подушка Велюр 40x40", "Цена": "250", "Акция цена": "199" }]);
  assert.deepEqual(preview.errors, []);
  assert.equal(preview.changes.length, 2);
  assert.equal(preview.changes[0].skus.length, 2);

  const changed = applyPriceChangesToProducts(products, preview.changes);
  const changedGroups = collectPriceGroupsFromProducts(changed);
  assert.equal(changedGroups[0].price, 250);
  assert.equal(changedGroups[0].promoPrice, 199);
  const rows = priceListRows(changedGroups);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].label, "Акция Подушка Велюр 40x40");
  assert.match(priceListCsv(rows), /Акция Подушка Велюр 40x40/);

  const invalid = parsePriceImportRows(records, [{ "Категория/группа": "Подушка Велюр 40x40", "Цена": "0" }]);
  assert.equal(invalid.errors[0]?.error, "invalid_price");

  const formula = parsePriceImportRows(records, [{ "Категория/группа": "=cmd", "Цена": "250" }]);
  assert.equal(formula.errors[0]?.error, "formula_input_rejected");

  const dbClient = fakeDbClient();
  const dbResult = await applyPriceChangesToDb(dbClient, preview.changes);
  assert.equal(dbResult.updatedSkus, 2);
  assert.equal(dbClient.calls[0].sql, "BEGIN");
  assert.equal(dbClient.calls.at(-1).sql, "COMMIT");
  assert.equal(dbClient.calls.some((call) => /UPDATE variants SET price/.test(call.sql)), true);

  const tempDir = mkdtempSync(join(tmpdir(), "sobag-price-groups-route-"));
  process.env.SOBAG_STORE_PROVIDER = "file";
  process.env.SOBAG_FILE_STORE_DIR = tempDir;
  process.env.SOBAG_CATALOG_SOURCE = "";
  const { server, baseUrl } = await listen(createSobagServer());
  try {
    const publicList = await request(baseUrl, "/api/price-list?format=json");
    assert.equal(publicList.response.status, 200);
    assert.ok(publicList.payload.groups.length > 0);
    assert.ok(publicList.payload.groups.every((group) => Number(group.price) > 0));
    const csv = await request(baseUrl, "/api/price-list");
    assert.equal(csv.response.status, 200);
    assert.match(csv.response.headers.get("content-type") || "", /text\/csv/);
    assert.match(csv.response.headers.get("content-disposition") || "", /sobag-price-list\.csv/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(tempDir, { recursive: true, force: true });
  }

  console.log("price groups smoke passed");
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
