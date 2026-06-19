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

function cleanFixtureProduct(product = {}) {
  const baseSku = String(product.baseSku || "").trim();
  const name = String(product.name || "").trim();
  if (!baseSku || !name) throw new Error("fixture product must have baseSku and name");
  const basePrice = Math.max(1, Number(product.basePrice || 1));
  return {
    ...product,
    id: String(product.id || baseSku),
    baseSku,
    name,
    status: product.status || "published",
    hidden: product.status ? product.status !== "published" : false,
    basePrice,
    categories: Array.isArray(product.categories) ? [...new Set(product.categories.filter(Boolean))] : [product.category].filter(Boolean),
    variantPrices: product.variantPrices && typeof product.variantPrices === "object" ? product.variantPrices : {},
  };
}

function selfTest() {
  if (routeTarget("/api/admin/catalog", "node", "rust") !== "rust/rust/admin/catalog") throw new Error("admin catalog should route to Rust");
  if (routeTarget("/api/admin/import-batches", "node", "rust") !== "rust/rust/admin/import-batches") throw new Error("admin import batches should route to Rust after final cutover");
  if (routeTarget("/api/admin/product-images", "node", "rust") !== "rust/rust/admin/product-images") throw new Error("admin product images should route to Rust after final cutover");
  const product = cleanFixtureProduct({ baseSku: "TEST-1", name: "Test", basePrice: 0, category: "Test", variantPrices: { SKU: 250 } });
  if (product.basePrice !== 1) throw new Error("catalog smoke fixture must clamp missing price above zero");
  if (product.variantPrices.SKU !== 250) throw new Error("catalog smoke fixture must preserve variant prices");
  console.log("Rust admin catalog cutover smoke self-test passed");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    return;
  }
  console.log("Use --self-test locally; live admin catalog cutover is verified by the VPS-side temporary-session smoke.");
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

export { routeTarget, cleanFixtureProduct };
