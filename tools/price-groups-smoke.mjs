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
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.origin === false ? {} : { origin: options.origin || baseUrl }),
    },
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

function cookieFrom(response) {
  const value = response.headers.get("set-cookie") || "";
  return value ? value.split(";")[0] : "";
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

  const spacedPrice = parsePriceImportRows(records, [{ sku: records[0].variant.sku, price: "1 250" }]);
  assert.equal(spacedPrice.errors.length, 0);
  assert.equal(spacedPrice.changes[0].newPrice, 1250);

  const invalidPromoPeriod = parsePriceImportRows(records, [{ sku: records[0].variant.sku, promoPrice: "199", promoStart: "2026-02-01", promoEnd: "2026-01-01" }]);
  assert.equal(invalidPromoPeriod.errors[0]?.error, "invalid_promo_period");

  const futurePromoProducts = applyPriceChangesToProducts(products, [
    { ...preview.changes[1], promoStartsAt: "2999-01-01", promoEndsAt: "2999-01-31" },
  ]);
  assert.equal(collectPriceGroupsFromProducts(futurePromoProducts)[0].promoPrice, null);

  const dbClient = fakeDbClient();
  const dbResult = await applyPriceChangesToDb(dbClient, preview.changes);
  assert.equal(dbResult.updatedSkus, 2);
  assert.equal(dbClient.calls[0].sql, "BEGIN");
  assert.equal(dbClient.calls.at(-1).sql, "COMMIT");
  assert.equal(dbClient.calls.some((call) => /UPDATE variants SET price/.test(call.sql)), true);

  const failingDb = {
    calls: [],
    async query(sql) {
      this.calls.push(sql);
      if (/UPDATE variants SET price/.test(sql)) throw new Error("simulated db failure");
      return { rows: [] };
    },
  };
  await assert.rejects(() => applyPriceChangesToDb(failingDb, preview.changes), /simulated db failure/);
  assert.ok(failingDb.calls.includes("ROLLBACK"));

  const tempDir = mkdtempSync(join(tmpdir(), "sobag-price-groups-route-"));
  process.env.SOBAG_STORE_PROVIDER = "file";
  process.env.SOBAG_FILE_STORE_DIR = tempDir;
  process.env.SOBAG_CATALOG_SOURCE = "";
  process.env.SOBAG_ADMIN_EMAIL = "price-admin@example.test";
  process.env.SOBAG_ADMIN_PASSWORD = "price-admin-pass";
  process.env.SOBAG_ADMIN_NAME = "Price Admin";
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

    const adminDenied = await request(baseUrl, "/api/admin/prices", { method: "POST", body: { action: "preview", rows: [] } });
    assert.equal(adminDenied.response.status, 401);
    const login = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "price-admin@example.test", password: "price-admin-pass" },
    });
    const adminCookie = cookieFrom(login.response);
    assert.ok(adminCookie, "admin price login should set a session cookie");
    const template = await fetch(`${baseUrl}/api/admin/prices?template=1`, { headers: { cookie: adminCookie } });
    assert.equal(template.status, 200);
    assert.match(template.headers.get("content-disposition") || "", /sobag-price-import-template\.csv/);
    const targetGroup = publicList.payload.groups[0];
    const safeSamePriceCsv = `"Категория/группа";"Цена"\n"${targetGroup.name}";"${targetGroup.price}"\n`;
    const previewRoute = await request(baseUrl, "/api/admin/prices", {
      method: "POST",
      cookie: adminCookie,
      body: { action: "preview", csv: safeSamePriceCsv },
    });
    assert.equal(previewRoute.response.status, 200);
    assert.equal(previewRoute.payload.errors.length, 0);
    assert.ok(previewRoute.payload.changes.length > 0, "admin price preview should report changes");
    const applyRoute = await request(baseUrl, "/api/admin/prices", {
      method: "POST",
      cookie: adminCookie,
      body: { action: "apply", csv: safeSamePriceCsv },
    });
    assert.equal(applyRoute.response.status, 200);
    assert.equal(applyRoute.payload.history?.type, "price_import");
    const skuOnlyCsv = `"sku";"price"\n"${targetGroup.skus[0]}";"${targetGroup.price}"\n`;
    const skuPreviewRoute = await request(baseUrl, "/api/admin/prices", {
      method: "POST",
      cookie: adminCookie,
      body: { action: "preview", csv: skuOnlyCsv },
    });
    assert.equal(skuPreviewRoute.response.status, 200);
    assert.equal(skuPreviewRoute.payload.errors.length, 0);
    assert.equal(skuPreviewRoute.payload.changes[0]?.skus?.length, 1, "SKU override preview should target exactly one SKU");
    assert.equal(skuPreviewRoute.payload.changes[0]?.skus?.[0], targetGroup.skus[0]);
    const formulaRoute = await request(baseUrl, "/api/admin/prices", {
      method: "POST",
      cookie: adminCookie,
      body: { action: "preview", csv: `"sku";"price"\n"=cmd";"${targetGroup.price}"\n` },
    });
    assert.equal(formulaRoute.response.status, 400);
    assert.equal(formulaRoute.payload.errors.some((error) => error.error === "formula_input_rejected"), true);
    const promoCsv = `"group";"promoPrice";"promoActive";"promoStart";"promoEnd"\n"${targetGroup.name}";"${targetGroup.price}";"true";"2026-01-01";"2099-01-31"\n`;
    const promoApplyRoute = await request(baseUrl, "/api/admin/prices", {
      method: "POST",
      cookie: adminCookie,
      body: { action: "apply", csv: promoCsv },
    });
    assert.equal(promoApplyRoute.response.status, 200);
    assert.ok(Number(promoApplyRoute.payload.history?.promoChangeCount || 0) > 0, "active promo import should be counted in history");
    const duplicateCsv = `"SKU";"Цена"\n"${targetGroup.skus[0]}";"${targetGroup.price}"\n"${targetGroup.skus[0]}";"${targetGroup.price}"\n`;
    const duplicateRoute = await request(baseUrl, "/api/admin/prices", {
      method: "POST",
      cookie: adminCookie,
      body: { action: "preview", csv: duplicateCsv },
    });
    assert.equal(duplicateRoute.response.status, 400);
    assert.equal(duplicateRoute.payload.errors.some((error) => error.error === "duplicate_price_target"), true);
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
