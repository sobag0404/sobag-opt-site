#!/usr/bin/env node

function routeTarget(pathname, nodeBase, rustBase) {
  if (pathname === "/api/admin/prices") return `${rustBase}/rust/admin/prices`;
  return `${nodeBase}${pathname}`;
}

function selfTest() {
  if (routeTarget("/api/admin/prices", "node", "rust") !== "rust/rust/admin/prices") throw new Error("admin prices should route to Rust");
  if (routeTarget("/api/admin/catalog", "node", "rust") !== "node/api/admin/catalog") throw new Error("admin catalog should stay Node");
  if (routeTarget("/api/admin/import-batches", "node", "rust") !== "node/api/admin/import-batches") throw new Error("admin import batches should stay Node");
  if (routeTarget("/api/admin/product-images", "node", "rust") !== "node/api/admin/product-images") throw new Error("admin product images should stay Node");

  const row = { sku: "SKU-1", price: 230, promoPrice: 199 };
  if (Number(row.price) <= 0 || Number(row.promoPrice) <= 0) throw new Error("fixture prices must be positive");
  console.log("Rust admin prices cutover smoke self-test passed");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    return;
  }
  console.log("Use --self-test locally; live admin price cutover is verified by the VPS-side temporary-session smoke.");
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

export { routeTarget };
