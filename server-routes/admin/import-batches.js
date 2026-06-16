const crypto = require("crypto");
const staticProducts = require("../../data/products-live.json");
const { requireUser } = require("../_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { normalizeImageMetadata } = require("../_lib/object-storage");
const { getCatalog, getImportBatches, saveCatalog, saveImportBatches } = require("../_lib/store");

const MAX_BATCH_PRODUCTS = 2000;
const MAX_PRODUCTS = 25000;
const PRODUCT_STATUSES = new Set(["draft", "published", "hidden", "archive"]);

function text(value) {
  return String(value || "").trim();
}

function hasRawValue(source, key) {
  const value = source?.[key];
  if (Array.isArray(value)) return value.length > 0;
  return text(value) !== "";
}

function cleanList(value) {
  const items = Array.isArray(value) ? value : String(value || "").split(value && String(value).includes(";") ? ";" : ",");
  const seen = new Set();
  return items
    .map((item) => text(item).replace(/\s+/g, " "))
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function baseSkuKey(value) {
  return text(value).toUpperCase();
}

function cleanProductStatus(product) {
  const status = text(product?.status).toLowerCase();
  if (PRODUCT_STATUSES.has(status)) return status;
  return product?.hidden ? "hidden" : "draft";
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
  if (!product || typeof product !== "object") return { product: null, error: "invalid_product" };
  const baseSku = text(product.baseSku);
  const name = text(product.name);
  if (!baseSku) return { product: null, error: "missing_base_sku" };
  if (!name) return { product: null, error: "missing_name" };
  const categories = cleanList(product.categories?.length ? product.categories : product.category || "Подушки");
  const status = cleanProductStatus(product);
  return {
    product: {
      ...product,
      id: text(product.id) || `${baseSku}-${crypto.createHash("sha1").update(baseSku).digest("hex").slice(0, 6)}`,
      baseSku,
      name,
      status,
      hidden: status !== "published",
      category: categories[0] || "Подушки",
      categories: categories.length ? categories : ["Подушки"],
      collections: cleanList(product.collections),
      holidays: cleanList(product.holidays),
      tags: cleanList(product.tags),
      types: cleanList(product.types).length ? cleanList(product.types) : ["Стандарт"],
      sizes: cleanList(product.sizes).length ? cleanList(product.sizes) : ["Стандарт"],
      materials: cleanList(product.materials).length ? cleanList(product.materials) : ["Стандарт"],
      basePrice: Math.max(1, Number(product.basePrice || 1)),
      image: text(product.image) || "assets/production-workshop-1.png",
      gallery: cleanList(product.gallery),
      images: cleanProductImages(product.images),
      photoFolder: text(product.photoFolder) || baseSku,
      stock: text(product.stock) || "made",
      badge: text(product.badge),
      description: text(product.description),
      detailDescription: text(product.detailDescription),
      popular: Math.max(0, Number(product.popular || 50)),
      variantPrices: product.variantPrices && typeof product.variantPrices === "object" ? product.variantPrices : {},
    },
    error: "",
  };
}

function skuPart(value, limit = Infinity) {
  const prepared = text(value)
    .toUpperCase()
    .replace(/[^A-ZА-ЯЁ0-9]+/g, "");
  return Number.isFinite(limit) ? prepared.slice(0, limit) : prepared;
}

function skuSizePart(value) {
  return text(value)
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-ZА-ЯЁ0-9ХX,.-]+/g, "");
}

function variantSkus(product) {
  return product.types.flatMap((type) =>
    product.sizes.flatMap((size) =>
      product.materials.map((material) => [product.baseSku, skuPart(type, 3), skuSizePart(size), skuPart(material, 3)].filter(Boolean).join("_"))
    )
  );
}

function variantSkuSet(products) {
  const set = new Set();
  (products || []).forEach((product) => variantSkus(product).forEach((sku) => set.add(baseSkuKey(sku))));
  return set;
}

function latestCatalogProducts(catalog) {
  return catalog?.products?.length ? catalog.products : staticProducts;
}

function batchSummary(batch, includeRows = true) {
  const { products, snapshot, ...safe } = batch;
  return includeRows ? safe : { ...safe, rows: undefined };
}

function makeBatch(products, currentProducts, user, options = {}) {
  const existingSkus = new Set(currentProducts.map((product) => baseSkuKey(product.baseSku)));
  const existingBySku = new Map(currentProducts.map((product) => [baseSkuKey(product.baseSku), product]));
  const existingVariantSkus = variantSkuSet(currentProducts.map((item) => cleanProduct(item).product).filter(Boolean));
  const seenSkus = new Set();
  const seenVariantSkus = new Set();
  const batchProducts = [];
  const rows = [];
  const counts = { created: 0, skipped: 0, updated: 0, errors: 0 };
  const updateExisting = Boolean(options.updateExisting);

  products.slice(0, MAX_BATCH_PRODUCTS).forEach((raw, index) => {
    const { product, error } = cleanProduct(raw);
    if (!product) {
      counts.errors += 1;
      rows.push({ row: index + 1, baseSku: text(raw?.baseSku), name: text(raw?.name), status: "error", action: "error", reason: error });
      return;
    }
    const sku = baseSkuKey(product.baseSku);
    if (seenSkus.has(sku)) {
      counts.skipped += 1;
      rows.push({ row: index + 1, baseSku: product.baseSku, name: product.name, status: "duplicate_skipped", action: "skipped", reason: "base_sku_repeated_in_batch" });
      return;
    }
    const exists = existingSkus.has(sku);
    if (exists && !updateExisting) {
      counts.skipped += 1;
      rows.push({ row: index + 1, baseSku: product.baseSku, name: product.name, status: "duplicate_skipped", action: "skipped", reason: "base_sku_exists" });
      seenSkus.add(sku);
      return;
    }

    const existingProduct = exists ? cleanProduct(existingBySku.get(sku)).product : null;
    if (exists && updateExisting && existingProduct) {
      product.id = text(existingProduct.id) || product.id;
      if (!hasRawValue(raw, "status")) {
        product.status = existingProduct.status;
        product.hidden = product.status !== "published";
      }
      if (!hasRawValue(raw, "image") && existingProduct.image) product.image = existingProduct.image;
      if (!hasRawValue(raw, "gallery") && existingProduct.gallery?.length) product.gallery = existingProduct.gallery;
      if (!hasRawValue(raw, "images") && existingProduct.images?.length) product.images = existingProduct.images;
    }

    const ownVariantSkus = existingProduct ? variantSkuSet([existingProduct]) : new Set();
    const productVariantSkus = new Set(variantSkus(product).map(baseSkuKey));
    const collisions = [...productVariantSkus].filter((variantSku) => (existingVariantSkus.has(variantSku) && !ownVariantSkus.has(variantSku)) || seenVariantSkus.has(variantSku));
    if (collisions.length) {
      counts.skipped += 1;
      rows.push({
        row: index + 1,
        baseSku: product.baseSku,
        name: product.name,
        status: "variant_duplicate_skipped",
        action: "skipped",
        reason: "variant_sku_collision",
        warnings: collisions.slice(0, 5).join(", "),
      });
      seenSkus.add(sku);
      return;
    }

    const action = exists ? "updated" : "created";
    if (exists) {
      product.id = text(existingBySku.get(sku)?.id) || product.id;
      counts.updated += 1;
    } else {
      counts.created += 1;
    }
    rows.push({
      row: index + 1,
      baseSku: product.baseSku,
      name: product.name,
      status: action,
      action,
      reason: "",
      variantCount: productVariantSkus.size,
      warnings: product.image === "assets/production-workshop-1.png" ? "fallback_image" : "",
    });
    batchProducts.push({ action, product });
    seenSkus.add(sku);
    productVariantSkus.forEach((variantSku) => seenVariantSkus.add(variantSku));
  });

  if (products.length > MAX_BATCH_PRODUCTS) {
    counts.errors += 1;
    rows.push({ row: MAX_BATCH_PRODUCTS + 1, baseSku: "", name: "", status: "error", action: "error", reason: "batch_too_large" });
  }

  return {
    id: `IB-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    source: text(options.source) || "admin-import",
    status: "preview",
    updateExisting,
    createdAt: new Date().toISOString(),
    createdBy: user.email,
    counts,
    rows,
    products: batchProducts,
  };
}

function applyBatchProducts(currentProducts, batch) {
  const bySku = new Map(currentProducts.map((product) => [baseSkuKey(product.baseSku), product]));
  const created = [];
  (batch.products || []).forEach((entry) => {
    const product = cleanProduct(entry.product).product;
    if (!product) return;
    const sku = baseSkuKey(product.baseSku);
    if (entry.action === "updated" && bySku.has(sku)) {
      bySku.set(sku, product);
    } else if (entry.action === "created" && !bySku.has(sku)) {
      created.push(product);
      bySku.set(sku, product);
    }
  });
  const updatedExisting = currentProducts.map((product) => bySku.get(baseSkuKey(product.baseSku)) || product);
  const existingSkuSet = new Set(currentProducts.map((product) => baseSkuKey(product.baseSku)));
  return [...created.filter((product) => !existingSkuSet.has(baseSkuKey(product.baseSku))), ...updatedExisting];
}

module.exports = async function handler(req, res) {
  try {
    const { user } = await requireUser(req, ["admin", "content"]);
    const batches = await getImportBatches();
    if (req.method === "GET") {
      return sendJson(res, 200, { batches: batches.map((batch) => batchSummary(batch, true)) });
    }
    if (req.method !== "POST") return methodNotAllowed(res);

    const data = await readJson(req, { maxBytes: 6 * 1024 * 1024 });
    const action = text(data.action || "preview");
    const catalog = await getCatalog();
    const currentProducts = latestCatalogProducts(catalog);

    if (action === "preview") {
      const inputProducts = Array.isArray(data.products) ? data.products : [];
      if (!inputProducts.length) return sendJson(res, 400, { error: "empty_import", message: "Нет товаров для предпросмотра." });
      const batch = makeBatch(inputProducts, currentProducts, user, { source: data.source, updateExisting: data.updateExisting });
      const saved = await saveImportBatches([batch, ...batches]);
      return sendJson(res, 200, { batch: batchSummary(saved[0], true) });
    }

    const batchIndex = batches.findIndex((batch) => batch.id === data.id);
    if (batchIndex < 0) return sendJson(res, 404, { error: "batch_not_found", message: "Партия импорта не найдена." });
    const batch = batches[batchIndex];

    if (action === "reject") {
      if (batch.status !== "preview") return sendJson(res, 400, { error: "invalid_batch_status", message: "Отклонить можно только партию в предпросмотре." });
      batches[batchIndex] = { ...batch, status: "rejected", rejectedAt: new Date().toISOString(), rejectedBy: user.email };
      const saved = await saveImportBatches(batches);
      return sendJson(res, 200, { batch: batchSummary(saved[batchIndex], true) });
    }

    if (action === "apply") {
      if (batch.status !== "preview") return sendJson(res, 400, { error: "invalid_batch_status", message: "Применить можно только партию в предпросмотре." });
      const nextProducts = applyBatchProducts(currentProducts, batch);
      if (!nextProducts.length || nextProducts.length > MAX_PRODUCTS) return sendJson(res, 400, { error: "invalid_catalog_size", message: "После импорта каталог имеет некорректный размер." });
      const snapshot = { products: currentProducts, updatedAt: catalog?.updatedAt || null, updatedBy: catalog?.updatedBy || "" };
      const appliedAt = new Date().toISOString();
      const nextBatches = batches.slice();
      nextBatches[batchIndex] = { ...batch, status: "applied", appliedAt, appliedBy: user.email, snapshot };
      const savedCatalog = await saveCatalog(nextProducts, user.email, { source: "import-batch-apply", importBatches: nextBatches, updatedAt: appliedAt });
      const saved = await saveImportBatches(nextBatches);
      return sendJson(res, 200, { batch: batchSummary(saved[batchIndex], true), count: nextProducts.length, updatedAt: savedCatalog.updatedAt });
    }

    if (action === "rollback") {
      const applied = batches
        .filter((item) => item.status === "applied" && item.snapshot?.products?.length)
        .sort((a, b) => text(b.appliedAt || b.createdAt).localeCompare(text(a.appliedAt || a.createdAt)));
      if (!applied.length || applied[0].id !== batch.id) return sendJson(res, 400, { error: "not_latest_applied_batch", message: "Откат доступен только для последней примененной партии." });
      const rolledBackAt = new Date().toISOString();
      const nextBatches = batches.slice();
      nextBatches[batchIndex] = { ...batch, status: "rolled_back", rolledBackAt, rolledBackBy: user.email };
      const savedCatalog = await saveCatalog(batch.snapshot.products, user.email, { source: "import-batch-rollback", importBatches: nextBatches, updatedAt: rolledBackAt });
      const saved = await saveImportBatches(nextBatches);
      return sendJson(res, 200, { batch: batchSummary(saved[batchIndex], true), count: batch.snapshot.products.length, updatedAt: savedCatalog.updatedAt });
    }

    return sendJson(res, 400, { error: "unknown_action", message: "Неизвестное действие партии импорта." });
  } catch (error) {
    handleError(res, error, req);
  }
};
