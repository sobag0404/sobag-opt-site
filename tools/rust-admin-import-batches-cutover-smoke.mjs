#!/usr/bin/env node

function routeTarget(pathname, nodeBase, rustBase) {
  if (pathname === "/api/admin/import-batches") return `${rustBase}/rust/admin/import-batches`;
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
  if (routeTarget("/api/admin/product-images", "node", "rust") !== "node/api/admin/product-images") throw new Error("admin product images should stay Node");
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
