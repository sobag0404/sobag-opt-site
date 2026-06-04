const { requireUser } = require("../_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { normalizeImageMetadata } = require("../_lib/object-storage");
const { getCatalog, saveCatalog } = require("../_lib/store");

const MAX_PRODUCTS = 25000;
const PRODUCT_STATUSES = new Set(["draft", "published", "hidden", "archive"]);

function cleanProductStatus(product) {
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

function cleanProductImages(images) {
  if (!Array.isArray(images)) return [];
  const seen = new Set();
  return images
    .map((image) => (typeof image === "string" ? normalizeImageMetadata({ url: image }) : normalizeImageMetadata(image)))
    .filter(Boolean)
    .filter((image) => {
      const key = image.storageKey || image.url;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function cleanProduct(product) {
  if (!product || typeof product !== "object") return null;
  const { variants, minPrice, maxPrice, ...clean } = product;
  const baseSku = String(clean.baseSku || "").trim();
  const name = String(clean.name || "").trim();
  if (!baseSku || !name) return null;
  const status = cleanProductStatus(clean);
  return {
    ...clean,
    id: String(clean.id || baseSku),
    baseSku,
    name,
    status,
    hidden: status !== "published",
    basePrice: Math.max(1, Number(clean.basePrice || 1)),
    categories: Array.isArray(clean.categories) ? clean.categories : [clean.category].filter(Boolean),
    collections: Array.isArray(clean.collections) ? clean.collections : [],
    holidays: Array.isArray(clean.holidays) ? clean.holidays : [],
    tags: Array.isArray(clean.tags) ? clean.tags : [],
    types: Array.isArray(clean.types) ? clean.types : [],
    sizes: Array.isArray(clean.sizes) ? clean.sizes : [],
    materials: Array.isArray(clean.materials) ? clean.materials : [],
    images: cleanProductImages(clean.images),
    variantPrices: clean.variantPrices && typeof clean.variantPrices === "object" ? clean.variantPrices : {},
  };
}

module.exports = async function handler(req, res) {
  try {
    const { user } = await requireUser(req, ["admin", "content"]);
    if (req.method === "GET") {
      const catalog = await getCatalog();
      return sendJson(res, 200, catalog || { products: [], updatedAt: null, source: "empty" });
    }
    if (req.method !== "PUT") return methodNotAllowed(res);

    const data = await readJson(req);
    const products = Array.isArray(data.products) ? data.products.map(cleanProduct).filter(Boolean) : [];
    if (!products.length) return sendJson(res, 400, { error: "empty_catalog", message: "Каталог не должен быть пустым." });
    if (products.length > MAX_PRODUCTS) return sendJson(res, 400, { error: "catalog_too_large", message: "Слишком много товаров в одном сохранении." });

    const saved = await saveCatalog(products, user.email);
    sendJson(res, 200, { updatedAt: saved.updatedAt, count: products.length });
  } catch (error) {
    handleError(res, error);
  }
};
