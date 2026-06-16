import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSobagServer } from "../server.mjs";

const tempDir = mkdtempSync(join(tmpdir(), "sobag-price-integrity-"));
process.env.SOBAG_STORE_PROVIDER = "file";
process.env.SOBAG_FILE_STORE_DIR = tempDir;

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
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function discountedTotal(unitPrice, qty) {
  const subtotal = unitPrice * qty;
  const discount = subtotal >= 300000 ? 18 : subtotal >= 150000 ? 12 : subtotal >= 70000 ? 7 : subtotal >= 30000 ? 5 : 0;
  return Math.round((subtotal - (subtotal * discount) / 100) * 100) / 100;
}

async function main() {
  const { server, baseUrl } = await listen(createSobagServer());
  try {
    const query = await request(baseUrl, "/api/catalog-query?pageSize=6&sort=popular");
    assert.equal(query.response.status, 200, "catalog-query should return 200");
    assert.ok(Array.isArray(query.payload.items) && query.payload.items.length, "catalog-query should return items");
    const pricedCard = query.payload.items.find((item) => Number(item.minPrice) > 0 && Number(item.maxPrice) > 0);
    assert.ok(pricedCard, "catalog cards must expose positive min/max prices");
    assert.ok(!query.payload.items.some((item) => Number(item.minPrice) <= 0 || Number(item.maxPrice) <= 0), "catalog card prices must not be zero");

    const detail = await request(baseUrl, `/api/catalog-detail?baseSku=${encodeURIComponent(pricedCard.baseSku)}`);
    assert.equal(detail.response.status, 200, "catalog-detail should return 200");
    const variant = detail.payload.product?.variants?.find((item) => Number(item.price) > 0);
    assert.ok(variant, "catalog detail must expose a positive variant price");
    let qty = Math.max(1, Math.ceil(30000 / Number(variant.price)));
    while (discountedTotal(Number(variant.price), qty) < 30000) qty += 1;
    const expectedTotal = discountedTotal(Number(variant.price), qty);

    const tampered = await request(baseUrl, "/api/orders", {
      method: "POST",
      body: {
        customer: { name: "Price smoke", phone: "+70000000000" },
        items: [{ productId: detail.payload.product.id, qty, variant: { ...variant, price: 0 } }],
        total: 0,
      },
    });
    assert.equal(tampered.response.status, 409, "tampered zero total should be rejected");
    assert.equal(tampered.payload.error, "ORDER_TOTAL_MISMATCH");

    const valid = await request(baseUrl, "/api/orders", {
      method: "POST",
      body: {
        customer: { name: "Price smoke", phone: "+70000000000" },
        items: [{ productId: detail.payload.product.id, qty, variant: { ...variant, price: 0 } }],
        total: expectedTotal,
      },
    });
    assert.equal(valid.response.status, 201, "server-calculated positive total should be accepted");
    assert.equal(valid.payload.order?.items?.[0]?.variant?.price, Number(variant.price), "order snapshot should store trusted positive price");
    assert.ok(Number(valid.payload.order?.total) > 0, "order total must be positive");
    console.log(`price-integrity smoke passed: ${baseUrl}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
