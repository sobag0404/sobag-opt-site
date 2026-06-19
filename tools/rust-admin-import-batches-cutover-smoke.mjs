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

function previewFixture(products = []) {
  if (!Array.isArray(products) || !products.length) throw new Error("import preview fixture needs products");
  const rows = products.map((product, index) => {
    const baseSku = String(product.baseSku || "").trim();
    const name = String(product.name || "").trim();
    if (!baseSku || !name) throw new Error("fixture import product must have baseSku and name");
    return { row: index + 1, baseSku, name, status: "created", action: "created", reason: "" };
  });
  return { status: "preview", rows, products: products.map((product) => ({ action: "created", product })) };
}

function selfTest() {
  if (routeTarget("/api/admin/import-batches", "node", "rust") !== "rust/rust/admin/import-batches") throw new Error("admin import batches should route to Rust");
  if (routeTarget("/api/admin/product-images", "node", "rust") !== "rust/rust/admin/product-images") throw new Error("admin product images should route to Rust after final cutover");
  const preview = previewFixture([{ baseSku: "IMPORT-1", name: "Import product", basePrice: 220 }]);
  if (preview.rows.length !== 1 || preview.products.length !== 1) throw new Error("import preview fixture must preserve rows and products");
  console.log("Rust admin import batches cutover smoke self-test passed");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    return;
  }
  console.log("Use --self-test locally; live admin import cutover must use temporary import with rollback.");
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

export { routeTarget, previewFixture };
