const staticProducts = require("../data/products-live.json");
const { handleError, methodNotAllowed, sendJson } = require("./_lib/http");
const { getCatalog, getStore } = require("./_lib/store");

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
      return sendJson(res, 200, { ...catalog, reviews, source: "server" });
    }
    return sendJson(res, 200, { products: staticProducts, reviews, updatedAt: null, source: "static" });
  } catch (error) {
    if (error.code === "storage_not_configured") {
      return sendJson(res, 200, { products: staticProducts, reviews: [], updatedAt: null, source: "static" });
    }
    return handleError(res, error);
  }
};
