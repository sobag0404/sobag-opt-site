function text(value) {
  return String(value || "").trim();
}

function number(value) {
  const prepared = Number(value || 0);
  return Number.isFinite(prepared) ? prepared : 0;
}

function bool(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function jsonValue(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === "object")) return value;
  if (!text(value)) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function list(value) {
  const parsed = jsonValue(value, null);
  const items = Array.isArray(parsed) ? parsed : text(value).split(text(value).includes(";") ? ";" : ",");
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

function imageMetaFromRow(row = {}) {
  const meta = jsonValue(row.image_meta ?? row.payload, null);
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return {
      url: text(meta.url),
      storageKey: text(meta.storageKey || meta.storage_key),
      provider: text(meta.provider),
      width: number(meta.width) || null,
      height: number(meta.height) || null,
      mime: text(meta.mime || meta.contentType || meta.content_type),
      variants: Array.isArray(meta.variants) ? meta.variants : [],
    };
  }
  const url = text(row.url || row.image);
  const storageKey = text(row.storage_key || row.storageKey);
  if (!url && !storageKey) return null;
  return {
    url,
    storageKey,
    provider: text(row.provider),
    width: number(row.width) || null,
    height: number(row.height) || null,
    mime: text(row.mime || row.content_type),
    variants: jsonValue(row.variants, []),
  };
}

function cardFromDbRow(row = {}) {
  const categories = list(row.categories);
  const imageMeta = imageMetaFromRow(row);
  return {
    id: text(row.id),
    baseSku: text(row.base_sku || row.baseSku),
    name: text(row.name),
    category: text(row.category) || categories[0] || "",
    categories,
    collections: list(row.collections),
    holidays: list(row.holidays),
    tags: list(row.tags),
    badge: text(row.badge),
    description: text(row.description),
    stock: text(row.stock),
    image: imageMeta?.url || text(row.image),
    imageMeta,
    minPrice: number(row.min_price ?? row.minPrice),
    maxPrice: number(row.max_price ?? row.maxPrice),
    variantCount: number(row.variant_count ?? row.variantCount),
    popular: number(row.popular),
  };
}

function variantFromDbRow(row = {}) {
  return {
    id: text(row.id),
    productId: text(row.product_id || row.productId),
    baseSku: text(row.base_sku || row.baseSku),
    sku: text(row.sku),
    type: text(row.type),
    size: text(row.size),
    material: text(row.material),
    name: text(row.name),
    price: number(row.price),
    priceSource: text(row.price_source || row.priceSource),
  };
}

function imageFromDbRow(row = {}) {
  return {
    id: text(row.id),
    productId: text(row.product_id || row.productId),
    baseSku: text(row.base_sku || row.baseSku),
    role: text(row.role || (bool(row.is_primary) ? "main" : "gallery")),
    source: text(row.source || "postgres"),
    url: text(row.url),
    storageKey: text(row.storage_key || row.storageKey),
    provider: text(row.provider),
    width: number(row.width) || null,
    height: number(row.height) || null,
    mime: text(row.mime || row.content_type),
    fileName: text(row.file_name || row.fileName),
    size: number(row.size) || null,
    etag: text(row.etag),
    status: text(row.status || "active"),
    uploadedAt: text(row.uploaded_at || row.uploadedAt),
    variants: jsonValue(row.variants, []),
  };
}

function detailFromDbRows(productRow = {}, variantRows = [], imageRows = []) {
  const categories = list(productRow.categories);
  return {
    id: text(productRow.id),
    baseSku: text(productRow.base_sku || productRow.baseSku),
    name: text(productRow.name),
    status: text(productRow.status || "published"),
    hidden: bool(productRow.hidden),
    category: text(productRow.category) || categories[0] || "",
    categories,
    collections: list(productRow.collections),
    holidays: list(productRow.holidays),
    tags: list(productRow.tags),
    description: text(productRow.description),
    detailDescription: text(productRow.detail_description || productRow.detailDescription),
    basePrice: number(productRow.base_price || productRow.basePrice),
    minPrice: number(productRow.min_price ?? productRow.minPrice),
    maxPrice: number(productRow.max_price ?? productRow.maxPrice),
    popular: number(productRow.popular),
    stock: text(productRow.stock),
    variants: variantRows.map(variantFromDbRow).filter((variant) => variant.id && variant.sku),
    images: imageRows.map(imageFromDbRow).filter((image) => image.id && (image.url || image.storageKey)),
  };
}

module.exports = {
  cardFromDbRow,
  detailFromDbRows,
  imageFromDbRow,
  imageMetaFromRow,
  variantFromDbRow,
};
