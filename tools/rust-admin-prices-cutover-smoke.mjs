#!/usr/bin/env node

const FINAL_ADMIN_RUST_ROUTES = new Map([
  ["/api/admin/prices", "/rust/admin/prices"],
  ["/api/admin/catalog", "/rust/admin/catalog"],
  ["/api/admin/import-batches", "/rust/admin/import-batches"],
  ["/api/admin/product-images", "/rust/admin/product-images"],
]);

function routeTarget(pathname, nodeBase, rustBase) {
  if (FINAL_ADMIN_RUST_ROUTES.has(pathname)) return `${rustBase}${FINAL_ADMIN_RUST_ROUTES.get(pathname)}`;
  return `${nodeBase}${pathname}`;
}

function selfTest() {
  if (routeTarget("/api/admin/prices", "node", "rust") !== "rust/rust/admin/prices") throw new Error("admin prices should route to Rust");
  if (routeTarget("/api/admin/import-batches", "node", "rust") !== "rust/rust/admin/import-batches") throw new Error("admin import batches should route to Rust after final cutover");
  if (routeTarget("/api/admin/product-images", "node", "rust") !== "rust/rust/admin/product-images") throw new Error("admin product images should route to Rust after final cutover");

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
