const staticProducts = require("../data/products-live.json");
const { handleError, methodNotAllowed, sendJson } = require("./_lib/http");
const { getCatalog, getStore } = require("./_lib/store");

const PRODUCT_STATUSES = new Set(["draft", "published", "hidden", "archive"]);

function productStatus(product) {
  const status = String(product?.status || "").trim().toLowerCase();
  if (PRODUCT_STATUSES.has(status)) return status;
  const aliases = {
    "черновик": "draft",
    "опубликован": "published",
    "опубликовано": "published",
    "публикация": "published",
    "скрыт": "hidden",
    "скрыто": "hidden",
    "архив": "archive",
    "архивный": "archive",
  };
  if (aliases[status]) return aliases[status];
  return product?.hidden ? "hidden" : "published";
}

function publicProducts(products = []) {
  return (Array.isArray(products) ? products : []).filter((product) => productStatus(product) === "published");
}

function reviewsForProducts(reviews = [], products = []) {
  const productIds = new Set(products.map((product) => String(product.id || "")).filter(Boolean));
  const baseSkus = new Set(products.map((product) => String(product.baseSku || "").trim().toLowerCase()).filter(Boolean));
  if (!productIds.size && !baseSkus.size) return [];
  return reviews.filter((review) => productIds.has(String(review.productId || "")) || baseSkus.has(String(review.baseSku || "").trim().toLowerCase()));
}

function publicReviews(items = []) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item?.status === "approved")
    .map((item) => ({
      id: String(item.id || ""),
      productId: String(item.productId || ""),
      baseSku: String(item.baseSku || ""),
      rating: Math.max(1, Math.min(5, Math.round(Number(item.rating || 0)))),
      text: String(item.text || "").slice(0, 1000),
      authorName: String(item.authorName || "Покупатель").slice(0, 120),
      createdAt: String(item.createdAt || ""),
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

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  try {
    const reviews = await loadPublicReviews();
    const catalog = await getCatalog();
    if (catalog?.products?.length) {
      const products = publicProducts(catalog.products);
      const { pim, ...publicCatalog } = catalog;
      return sendJson(res, 200, { ...publicCatalog, products, reviews: reviewsForProducts(reviews, products), source: "server" });
    }
    const products = publicProducts(staticProducts);
    return sendJson(res, 200, { products, reviews: reviewsForProducts(reviews, products), updatedAt: null, source: "static" });
  } catch (error) {
    if (error.code === "storage_not_configured") {
      return sendJson(res, 200, { products: publicProducts(staticProducts), reviews: [], updatedAt: null, source: "static" });
    }
    return handleError(res, error, req);
  }
};
