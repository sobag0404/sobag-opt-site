import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { findProductDetailFromDb, queryCatalogFromDb } = require("../api/_lib/catalog-db-source.js");

function decodeCursor(value) {
  return Number(Buffer.from(String(value || ""), "base64url").toString("utf8"));
}

function fakeClient() {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("facet_values")) return { rows: [{ value: "Pillows", count: 51 }] };
      if (sql.includes("COUNT(*)")) return { rows: [{ total: 51 }] };
      if (sql.includes("FROM public_catalog_cards")) {
        return {
          rows: [
            {
              id: "p1",
              base_sku: "OPT_1",
              name: "Catalog item",
              categories: ["Pillows"],
              collections: ["Basic"],
              types: ["Pillow"],
              stock: "В наличии",
              min_price: 220,
              max_price: 260,
              variant_count: 2,
              image_meta: JSON.stringify({ url: "/img/p1.webp", width: 900, height: 900, mime: "image/webp" }),
            },
          ],
        };
      }
      if (sql.includes("FROM public_catalog_products")) {
        return { rows: [{ id: "p1", base_sku: "OPT_1", name: "Catalog item", status: "published", categories: ["Pillows"], types: ["Pillow"] }] };
      }
      if (sql.includes("FROM variants")) {
        return { rows: [{ id: "v1", product_id: "p1", base_sku: "OPT_1", sku: "OPT_1_A", type: "Pillow", price: 220 }] };
      }
      if (sql.includes("FROM images")) {
        return { rows: [{ id: "i1", product_id: "p1", base_sku: "OPT_1", url: "/img/p1.webp", width: 900, height: 900, mime: "image/webp" }] };
      }
      return { rows: [] };
    },
  };
}

async function smokeQuery() {
  const client = fakeClient();
  const result = await queryCatalogFromDb(client, {
    q: "pillow",
    filters: { category: ["Pillows"] },
    sort: "popular",
    pageSize: 999,
    offset: 48,
  });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].baseSku, "OPT_1");
  assert.equal(result.items[0].imageMeta.width, 900);
  assert.equal(result.total, 51);
  assert.equal(result.pageInfo.pageSize, 120);
  assert.equal(result.pageInfo.hasMore, true);
  assert.equal(decodeCursor(result.pageInfo.nextCursor), 49);
  assert.equal(result.facets.categories[0].value, "Pillows");
  assert.equal(result.facetOptions.types[0].count, 51);
  assert.equal(client.calls.length, 18);
  assert.ok(client.calls[0].sql.includes("LIMIT"));
  assert.ok(client.calls[1].sql.includes("COUNT(*)"));
  assert.ok(client.calls.some((call) => call.sql.includes("facet_values")));
}

async function smokeDetail() {
  const client = fakeClient();
  const detail = await findProductDetailFromDb(client, { baseSku: "OPT_1" });
  assert.equal(detail.baseSku, "OPT_1");
  assert.equal(detail.variants.length, 1);
  assert.equal(detail.images.length, 1);
  assert.deepEqual(client.calls.slice(1).map((call) => call.params), [["p1"], ["p1"]]);
}

async function main() {
  await smokeQuery();
  await smokeDetail();
  console.log("catalog DB source smoke passed");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
