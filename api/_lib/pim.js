const PRODUCT_STATUSES = new Set(["draft", "published", "hidden", "archive"]);
const TAXONOMY_BUCKETS = [
  ["category", "categories"],
  ["collection", "collections"],
  ["holiday", "holidays"],
  ["tag", "tags"],
];

function text(value) {
  return String(value || "").trim();
}

function list(value) {
  const items = Array.isArray(value) ? value : text(value).split(text(value).includes(";") ? ";" : ",");
  const seen = new Set();
  return items
    .map((item) => text(item).replace(/\s+/g, " "))
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLocaleLowerCase("ru-RU");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function cleanId(value, fallback = "item") {
  const normalized = text(value)
    .toLocaleLowerCase("ru-RU")
    .replace(/[^\p{L}0-9]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
}

function baseSkuKey(value) {
  return text(value).toLocaleUpperCase("ru-RU");
}

function productStatus(product) {
  const status = text(product?.status).toLocaleLowerCase("ru-RU");
  if (PRODUCT_STATUSES.has(status)) return status;
  return product?.hidden ? "hidden" : "published";
}

function skuPart(value, limit = Infinity) {
  const prepared = text(value)
    .toLocaleUpperCase("ru-RU")
    .replace(/[^\p{L}0-9]+/gu, "");
  return Number.isFinite(limit) ? prepared.slice(0, limit) : prepared;
}

function skuSizePart(value) {
  return text(value)
    .toLocaleUpperCase("ru-RU")
    .replace(/\s+/g, "")
    .replace(/[^\p{L}0-9X,.-]+/gu, "");
}

function productId(product, index = 0) {
  return text(product?.id) || text(product?.baseSku) || `product-${index + 1}`;
}

function optionList(product, key) {
  const items = list(product?.[key]);
  return items.length ? items : [""];
}

function productCategories(product) {
  const categories = list(product?.categories);
  if (categories.length) return categories;
  return list(product?.category);
}

function variantSku(product, type, size, material) {
  return [text(product?.baseSku), skuPart(type, 3), skuSizePart(size), skuPart(material, 3)].filter(Boolean).join("_");
}

function variantName(product, type, size, material) {
  return [text(product?.name), text(type), text(size), text(material)].filter(Boolean).join(" / ");
}

function variantRecordsForProduct(product, index = 0) {
  const id = productId(product, index);
  const baseSku = text(product?.baseSku || id);
  const basePrice = Math.max(0, Number(product?.basePrice || 0));
  const prices = product?.variantPrices && typeof product.variantPrices === "object" && !Array.isArray(product.variantPrices) ? product.variantPrices : {};
  return optionList(product, "types").flatMap((type) =>
    optionList(product, "sizes").flatMap((size) =>
      optionList(product, "materials").map((material) => {
        const sku = variantSku({ ...product, baseSku }, type, size, material);
        const customPrice = Number(prices[sku]);
        const price = Number.isFinite(customPrice) && customPrice > 0 ? customPrice : basePrice;
        return {
          id: `${id}::${sku || "variant"}`,
          productId: id,
          baseSku,
          sku: sku || baseSku,
          type: text(type),
          size: text(size),
          material: text(material),
          name: variantName(product, type, size, material),
          price,
          priceSource: Number.isFinite(customPrice) && customPrice > 0 ? "variantPrices" : "basePrice",
        };
      })
    )
  );
}

function normalizeImage(input, product, role, index = 0, source = "metadata") {
  const raw = typeof input === "string" ? { url: input } : input;
  if (!raw || typeof raw !== "object") return null;
  const url = text(raw.url || raw.publicUrl || raw.downloadUrl || raw.src);
  const storageKey = text(raw.storageKey || raw.pathname || raw.key);
  if (!url && !storageKey) return null;
  const productKey = text(product?.baseSku || product?.id || "product");
  const imageId = storageKey || url || `${productKey}-${role}-${index + 1}`;
  const variants = Array.isArray(raw.variants)
    ? raw.variants
        .map((variant, variantIndex) => normalizeImage(variant, product, "variant", variantIndex, "variant"))
        .filter(Boolean)
        .map((variant, variantIndex) => ({
          ...variant,
          id: `${cleanId(imageId, "image")}::variant-${variantIndex + 1}`,
          parentImageId: cleanId(imageId, "image"),
          label: text(raw.variants[variantIndex]?.label || raw.variants[variantIndex]?.variantLabel),
          format: text(raw.variants[variantIndex]?.format || raw.variants[variantIndex]?.mime).replace(/^image\//, ""),
        }))
    : [];
  return {
    id: cleanId(imageId, `image-${index + 1}`),
    productId: productId(product),
    baseSku: productKey,
    role,
    source,
    url,
    storageKey,
    provider: text(raw.provider),
    width: Number(raw.width || 0) || null,
    height: Number(raw.height || 0) || null,
    mime: text(raw.mime || raw.contentType),
    fileName: text(raw.fileName || raw.name),
    size: Number(raw.size || 0) || null,
    etag: text(raw.etag),
    status: text(raw.status) || "active",
    uploadedAt: text(raw.uploadedAt),
    variants,
  };
}

function imageRecordsForProduct(product, productIndex = 0) {
  const records = [];
  const seen = new Set();
  const add = (image) => {
    if (!image) return;
    const key = image.storageKey || image.url || image.id;
    if (!key || seen.has(key)) return;
    seen.add(key);
    records.push({ ...image, productId: productId(product, productIndex) });
  };
  (Array.isArray(product?.images) ? product.images : []).forEach((image, index) => add(normalizeImage(image, product, index === 0 ? "main" : "gallery", index, "metadata")));
  if (text(product?.image)) add(normalizeImage(product.image, product, records.length ? "legacy-main" : "main", 0, "legacy"));
  list(product?.gallery).forEach((image, index) => add(normalizeImage(image, product, "gallery", index, "legacy")));
  return records;
}

function productRecord(product, index = 0) {
  const id = productId(product, index);
  const categories = productCategories(product);
  const images = imageRecordsForProduct(product, index);
  const variants = variantRecordsForProduct(product, index);
  const status = productStatus(product);
  return {
    id,
    baseSku: text(product?.baseSku || id),
    name: text(product?.name),
    status,
    hidden: status !== "published",
    category: categories[0] || "",
    categories,
    collections: list(product?.collections),
    holidays: list(product?.holidays),
    tags: list(product?.tags),
    basePrice: Number(product?.basePrice || 0) || 0,
    stock: text(product?.stock),
    photoFolder: text(product?.photoFolder),
    imageCount: images.length,
    variantCount: variants.length,
  };
}

function taxonomyId(type, name) {
  return `${type}:${cleanId(name, "unnamed")}`;
}

function taxonomyRecords(products = []) {
  const maps = Object.fromEntries(TAXONOMY_BUCKETS.map(([type]) => [type, new Map()]));
  products.forEach((product, index) => {
    const id = productId(product, index);
    const buckets = {
      category: productCategories(product),
      collection: list(product?.collections),
      holiday: list(product?.holidays),
      tag: list(product?.tags),
    };
    Object.entries(buckets).forEach(([type, values]) => {
      values.forEach((name) => {
        const key = name.toLocaleLowerCase("ru-RU");
        const existing = maps[type].get(key) || { id: taxonomyId(type, name), type, name, productIds: new Set() };
        existing.productIds.add(id);
        maps[type].set(key, existing);
      });
    });
  });
  return Object.fromEntries(
    TAXONOMY_BUCKETS.map(([type, plural]) => [
      plural,
      [...maps[type].values()]
        .map((item) => ({ id: item.id, type: item.type, name: item.name, productCount: item.productIds.size }))
        .sort((a, b) => a.name.localeCompare(b.name, "ru", { sensitivity: "base" })),
    ])
  );
}

function taxonomyAssignmentRecords(products = []) {
  const seen = new Set();
  return (Array.isArray(products) ? products : []).flatMap((product, index) => {
    const id = productId(product, index);
    const buckets = {
      category: productCategories(product),
      collection: list(product?.collections),
      holiday: list(product?.holidays),
      tag: list(product?.tags),
    };
    return Object.entries(buckets).flatMap(([type, values]) =>
      values
        .map((name) => {
          const taxonomyIdValue = taxonomyId(type, name);
          const key = `${id}::${taxonomyIdValue}`;
          if (seen.has(key)) return null;
          seen.add(key);
          return {
            id: key,
            productId: id,
            taxonomyId: taxonomyIdValue,
            type,
            name,
          };
        })
        .filter(Boolean)
    );
  });
}

function cleanCounts(counts = {}) {
  return {
    created: Math.max(0, Number(counts.created || 0)),
    skipped: Math.max(0, Number(counts.skipped || 0)),
    updated: Math.max(0, Number(counts.updated || 0)),
    errors: Math.max(0, Number(counts.errors || 0)),
  };
}

function summarizeImportBatches(batches = []) {
  return (Array.isArray(batches) ? batches : [])
    .filter((batch) => batch && typeof batch === "object")
    .slice(0, 50)
    .map((batch) => ({
      id: text(batch.id),
      source: text(batch.source),
      status: text(batch.status),
      updateExisting: Boolean(batch.updateExisting),
      createdAt: text(batch.createdAt),
      createdBy: text(batch.createdBy),
      appliedAt: text(batch.appliedAt),
      appliedBy: text(batch.appliedBy),
      rejectedAt: text(batch.rejectedAt),
      rejectedBy: text(batch.rejectedBy),
      rolledBackAt: text(batch.rolledBackAt),
      rolledBackBy: text(batch.rolledBackBy),
      counts: cleanCounts(batch.counts),
      rowCount: Array.isArray(batch.rows) ? batch.rows.length : Number(batch.rowCount || 0) || 0,
      productCount: Array.isArray(batch.products) ? batch.products.length : Number(batch.productCount || 0) || 0,
      snapshotProductCount: Array.isArray(batch.snapshot?.products) ? batch.snapshot.products.length : Number(batch.snapshotProductCount || 0) || 0,
    }))
    .filter((batch) => batch.id);
}

function buildCatalogPim(products = [], options = {}) {
  const safeProducts = (Array.isArray(products) ? products : []).filter((product) => product && typeof product === "object");
  const productRecords = safeProducts.map(productRecord);
  const variantRecords = safeProducts.flatMap(variantRecordsForProduct);
  const imageRecords = safeProducts.flatMap(imageRecordsForProduct);
  const taxonomies = taxonomyRecords(safeProducts);
  const taxonomyAssignments = taxonomyAssignmentRecords(safeProducts);
  const importBatches = summarizeImportBatches(options.importBatches);
  const statusCounts = productRecords.reduce((counts, product) => {
    counts[product.status] = (counts[product.status] || 0) + 1;
    return counts;
  }, {});
  return {
    version: 1,
    generatedAt: text(options.generatedAt) || new Date().toISOString(),
    source: text(options.source) || "catalog",
    products: productRecords,
    variants: variantRecords,
    images: imageRecords,
    taxonomies,
    taxonomyAssignments,
    importBatches,
    counts: {
      products: productRecords.length,
      variants: variantRecords.length,
      images: imageRecords.length,
      imageVariants: imageRecords.reduce((count, image) => count + (Array.isArray(image.variants) ? image.variants.length : 0), 0),
      categories: taxonomies.categories?.length || 0,
      collections: taxonomies.collections?.length || 0,
      holidays: taxonomies.holidays?.length || 0,
      tags: taxonomies.tags?.length || 0,
      taxonomyAssignments: taxonomyAssignments.length,
      importBatches: importBatches.length,
      statuses: statusCounts,
    },
  };
}

module.exports = {
  buildCatalogPim,
  imageRecordsForProduct,
  productRecord,
  productStatus,
  summarizeImportBatches,
  taxonomyAssignmentRecords,
  variantRecordsForProduct,
  variantSku,
};
