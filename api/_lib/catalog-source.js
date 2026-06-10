const staticProducts = require("../../data/products-live.json");
const { publicProducts } = require("./catalog-query");
const { getCatalog, getStore } = require("./store");

function text(value) {
  return String(value || "").trim();
}

function reviewsForProducts(reviews = [], products = []) {
  const productIds = new Set(products.map((product) => text(product.id)).filter(Boolean));
  const baseSkus = new Set(products.map((product) => text(product.baseSku).toLocaleLowerCase("ru-RU")).filter(Boolean));
  if (!productIds.size && !baseSkus.size) return [];
  return reviews.filter((review) => productIds.has(text(review.productId)) || baseSkus.has(text(review.baseSku).toLocaleLowerCase("ru-RU")));
}

function publicReviews(items = []) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item?.status === "approved")
    .map((item) => ({
      id: text(item.id),
      productId: text(item.productId),
      baseSku: text(item.baseSku),
      rating: Math.max(1, Math.min(5, Math.round(Number(item.rating || 0)))),
      text: text(item.text).slice(0, 1000),
      authorName: text(item.authorName || "Покупатель").slice(0, 120),
      createdAt: text(item.createdAt),
    }))
    .filter((item) => item.id && item.productId && item.rating)
    .slice(0, 5000);
}

async function loadPublicReviews() {
  try {
    const store = await getStore();
    return publicReviews(store.reviews);
  } catch (error) {
    if (error.code === "storage_not_configured") return [];
    console.warn(error);
    return [];
  }
}

async function loadCatalogProducts(options = {}) {
  const staticFallback = options.staticFallback !== false;
  try {
    const catalog = await getCatalog();
    if (catalog?.products?.length) {
      return {
        products: catalog.products,
        updatedAt: catalog.updatedAt || null,
        source: "server",
      };
    }
  } catch (error) {
    if (error.code !== "storage_not_configured") throw error;
  }
  if (!staticFallback) return { products: [], updatedAt: null, source: "empty" };
  return { products: staticProducts, updatedAt: null, source: "static" };
}

async function loadPublicCatalog(options = {}) {
  const catalog = await loadCatalogProducts(options);
  const products = publicProducts(catalog.products);
  const reviews = options.includeReviews ? reviewsForProducts(await loadPublicReviews(), products) : [];
  return {
    products,
    reviews,
    updatedAt: catalog.updatedAt,
    source: catalog.source,
  };
}

module.exports = {
  loadCatalogProducts,
  loadPublicCatalog,
  loadPublicReviews,
  publicReviews,
  reviewsForProducts,
};
