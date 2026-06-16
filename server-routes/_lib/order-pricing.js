const { loadPublicCatalog } = require("./catalog-source");
const { skuKey } = require("./catalog-query");
const { getCatalogDbClient } = require("./catalog-db-client");
const { findProductDetailFromDb } = require("./catalog-db-source");
const { imageRecordsForProduct, variantRecordsForProduct } = require("./pim");

const MIN_ORDER_TOTAL = 30000;
const BASKET_DISCOUNT_TIERS = [
  { amount: 30000, discount: 5 },
  { amount: 70000, discount: 7 },
  { amount: 150000, discount: 12 },
  { amount: 300000, discount: 18 },
];

function text(value) {
  return String(value || "").trim();
}

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function orderError(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.publicMessage = message;
  return error;
}

function lineQty(value) {
  const qty = Math.round(Number(value || 0));
  if (!Number.isFinite(qty) || qty < 1 || qty > 100000) {
    throw orderError("invalid_quantity", "Invalid order quantity.");
  }
  return qty;
}

function basketDiscount(subtotal) {
  return [...BASKET_DISCOUNT_TIERS].reverse().find((tier) => subtotal >= tier.amount)?.discount || 0;
}

function productImage(product) {
  const images = imageRecordsForProduct(product);
  const image = images.find((item) => item.role === "main") || images[0] || null;
  return image?.url || text(product.image);
}

function lineKey(line, variant) {
  return text(line.key) || text(line.sku) || text(line.variant?.sku) || text(variant.sku);
}

function submittedSku(line) {
  return text(line.variant?.sku || line.sku || line.variantSku || line.key);
}

async function trustedVariantIndex() {
  const catalog = await loadPublicCatalog({ includeReviews: false });
  const variants = new Map();
  catalog.products.forEach((product) => {
    variantRecordsForProduct(product).forEach((variant) => {
      if (!variant.sku) return;
      variants.set(skuKey(variant.sku), { product, variant });
    });
  });
  return variants;
}

async function trustedVariantLookup(staticVariants, sku) {
  const lookup = skuKey(sku);
  if (!lookup) return null;
  const cached = staticVariants.get(lookup);
  if (cached) return cached;
  const dbClient = getCatalogDbClient();
  if (!dbClient) return null;
  const product = await findProductDetailFromDb(dbClient, { sku });
  const variant = product?.variants?.find((item) => skuKey(item.sku) === lookup);
  if (!product || !variant) return null;
  return { product, variant };
}

async function normalizeOrderPricing(payload = {}) {
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  if (!rawItems.length) throw orderError("empty_order", "Order has no items.");
  const variants = await trustedVariantIndex();
  const items = [];
  for (const line of rawItems) {
    const found = await trustedVariantLookup(variants, submittedSku(line));
    if (!found) throw orderError("invalid_sku", "Order item is unavailable or not published.");
    const qty = lineQty(line.qty || line.quantity);
    const price = money(found.variant.price);
    if (price <= 0) throw orderError("invalid_sku", "Order item is unavailable or not orderable.");
    const subtotal = money(price * qty);
    const item = {
      key: lineKey(line, found.variant),
      productId: text(found.product.id || found.variant.productId),
      productName: text(found.product.name),
      productImage: productImage(found.product),
      baseSku: text(found.product.baseSku),
      qty,
      variant: {
        sku: text(found.variant.sku),
        name: text(found.variant.name),
        type: text(found.variant.type),
        size: text(found.variant.size),
        material: text(found.variant.material),
        price,
      },
      subtotal,
    };
    items.push(item);
  }
  const subtotal = money(items.reduce((sum, item) => sum + item.subtotal, 0));
  const discountPercent = basketDiscount(subtotal);
  const discountAmount = money((subtotal * discountPercent) / 100);
  const total = money(subtotal - discountAmount);
  const clientTotal = Number(payload.total || 0);
  if (Number.isFinite(clientTotal) && clientTotal > 0 && Math.abs(money(clientTotal) - total) > 0.01) {
    throw orderError("ORDER_TOTAL_MISMATCH", "Order total does not match current catalog prices.", 409);
  }
  return {
    items,
    subtotal,
    discountPercent,
    discountAmount,
    total,
    clientTotal: Number.isFinite(clientTotal) ? money(clientTotal) : 0,
    minTotal: MIN_ORDER_TOTAL,
  };
}

module.exports = { MIN_ORDER_TOTAL, normalizeOrderPricing };
