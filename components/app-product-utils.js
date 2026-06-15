(() => {
  "use strict";

  const { escapeHtml, splitList } = window.SobagAppUtils || {};
  const { TYPE_OPTIONS, SIZE_OPTIONS, MATERIAL_OPTIONS, sizeFactors, materialFactors, typeFactors, taxonomyAliases, PRODUCT_STATUS_LABELS } = window.SobagAppData || {};
  if (!window.SobagAppUtils) throw new Error("components/app-utils.js must load before app-product-utils.js");
  if (!window.SobagAppData) throw new Error("components/app-data.js must load before app-product-utils.js");

function productStatusFromValue(value) {
  const prepared = String(value || "").trim().toLocaleLowerCase("ru-RU");
  const aliases = {
    draft: "draft",
    "черновик": "draft",
    published: "published",
    "опубликован": "published",
    "опубликовано": "published",
    "публикация": "published",
    hidden: "hidden",
    "скрыт": "hidden",
    "скрыто": "hidden",
    archive: "archive",
    archived: "archive",
    "архив": "archive",
    "архивный": "archive",
  };
  return aliases[prepared] || "";
}

function normalizeProductStatus(product) {
  return productStatusFromValue(product?.status) || (product?.hidden ? "hidden" : "published");
}

function productStatusLabel(status) {
  return PRODUCT_STATUS_LABELS[productStatusFromValue(status) || status] || PRODUCT_STATUS_LABELS.published;
}

function isProductPublished(product) {
  return normalizeProductStatus(product) === "published";
}

function createVariants(product) {
  return product.types.flatMap((type) =>
    product.sizes.flatMap((size) =>
      product.materials.map((material) => {
        const sku = [product.baseSku, skuPart(type, 3), skuSizePart(size), skuPart(material, 3)].filter(Boolean).join("_");
        const calculatedPrice =
          product.basePrice + (typeFactors[type] || 0) + (sizeFactors[size] || 0) + (materialFactors[material] || 0);
        const customPrice = Number(product.variantPrices?.[sku]);
        const price = Number.isFinite(customPrice) && customPrice > 0 ? customPrice : calculatedPrice;
        return {
          sku,
          name: variantNameForType(product.name, type, size, material),
          type,
          size,
          material,
          price,
        };
      })
    )
  );
}

function variantNameForType(name, type, size, material) {
  const preparedName = String(name || "").trim();
  const preparedType = String(type || "").trim();
  if (!preparedName || !preparedType) return preparedName;

  const replacements = [
    ["Подушка", "Наволочка"],
    ["Наволочка", "Подушка"],
    ["Плед", "Плед"],
    ["Мешок", "Мешок"],
    ["Чехол", "Чехол"],
    ["Флаг", "Флаг"],
    ["Ремувка", "Ремувка"],
  ];
  const target = replacements.find(([word]) => preparedType.toLocaleLowerCase("ru-RU").includes(word.toLocaleLowerCase("ru-RU")))?.[0];
  if (!target) return preparedName;

  const source = replacements.find(([word]) => startsWithProductWord(preparedName, word))?.[0];
  if (source && source !== target) {
    return variantNameWithSpecs(replaceLeadingProductWord(preparedName, source, target), size, material);
  }
  if (!source && !startsWithProductWord(preparedName, target)) {
    return variantNameWithSpecs(`${target} ${preparedName}`, size, material);
  }
  return variantNameWithSpecs(preparedName, size, material);
}

function startsWithProductWord(text, word) {
  const preparedText = String(text || "").trim().toLocaleLowerCase("ru-RU");
  const preparedWord = String(word || "").trim().toLocaleLowerCase("ru-RU");
  if (!preparedText.startsWith(preparedWord)) return false;
  const nextChar = preparedText.slice(preparedWord.length, preparedWord.length + 1);
  return !nextChar || /[\s"'«».,:;()/-]/.test(nextChar);
}

function replaceLeadingProductWord(text, source, target) {
  return `${target}${String(text || "").trim().slice(String(source || "").length)}`.replace(/\s+/g, " ").trim();
}

function variantNameWithSpecs(name, size, material) {
  const specs = [size, material]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => value.toLocaleLowerCase("ru-RU") !== "стандарт");
  return specs.length ? `${name} ${specs.join(" ")}` : name;
}

function skuPart(value, limit = Infinity) {
  const prepared = String(value)
    .toLocaleUpperCase("ru-RU")
    .replace(/[^A-ZА-ЯЁ0-9]+/g, "");
  return Number.isFinite(limit) ? prepared.slice(0, limit) : prepared;
}

function skuSizePart(value) {
  return String(value)
    .toLocaleUpperCase("ru-RU")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^A-ZА-ЯЁ0-9ХX,.-]+/g, "");
}

function normalizeTaxonomyItem(value) {
  const prepared = String(value || "").trim().replace(/\s+/g, " ");
  if (!prepared) return "";
  const key = prepared.toLocaleLowerCase("ru-RU");
  if (taxonomyAliases[key]) return taxonomyAliases[key];
  return prepared[0].toLocaleUpperCase("ru-RU") + prepared.slice(1);
}

function uniqueList(items, normalizer = (item) => String(item || "").trim()) {
  const seen = new Set();
  return items
    .map(normalizer)
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLocaleLowerCase("ru-RU");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeListField(product, key, fallback = []) {
  const value = product[key];
  const raw = Array.isArray(value) ? value : splitList(value);
  const backup = Array.isArray(fallback) ? fallback : splitList(fallback);
  return uniqueList(raw.length ? raw : backup, normalizeTaxonomyItem);
}

function normalizeTags(product) {
  const rawTags = Array.isArray(product.tags) ? product.tags : splitList(product.tags);
  return uniqueList([product.theme, ...normalizeListField(product, "collections"), ...normalizeListField(product, "holidays"), ...rawTags], normalizeTaxonomyItem);
}

function productHasCollection(product, collection) {
  return product.collections.includes(collection);
}

function productHasHoliday(product, holiday) {
  return product.holidays.includes(holiday);
}

function productHasCategory(product, category) {
  return (product.categories || [product.category]).includes(category);
}

function normalizeProductImageMetadata(item) {
  if (!item) return null;
  if (typeof item === "string") {
    const url = item.trim();
    return url ? { url, storageKey: "", provider: "", width: null, height: null, mime: "", uploadedAt: "", status: "active" } : null;
  }
  if (typeof item !== "object") return null;
  const url = String(item.url || item.publicUrl || item.downloadUrl || "").trim();
  const storageKey = String(item.storageKey || item.pathname || item.key || "").trim();
  if (!url && !storageKey) return null;
  const variants = Array.isArray(item.variants)
    ? item.variants
        .map((variant) => {
          const normalized = normalizeProductImageMetadata(variant);
          return normalized
            ? {
                ...normalized,
                label: String(variant.label || variant.variantLabel || "").trim(),
                format: String(variant.format || variant.mime || "").replace(/^image\//, "").trim(),
              }
            : null;
        })
        .filter(Boolean)
    : [];
  return {
    url,
    storageKey,
    provider: String(item.provider || "").trim(),
    width: Number(item.width || 0) || null,
    height: Number(item.height || 0) || null,
    mime: String(item.mime || item.contentType || "").trim(),
    uploadedAt: String(item.uploadedAt || "").trim(),
    fileName: String(item.fileName || "").trim(),
    size: Number(item.size || 0) || null,
    etag: String(item.etag || "").trim(),
    status: String(item.status || "active").trim(),
    variants,
  };
}

function normalizeProductImages(images) {
  if (!Array.isArray(images)) return [];
  const seen = new Set();
  return images
    .map(normalizeProductImageMetadata)
    .filter(Boolean)
    .filter((image) => {
      const key = image.storageKey || image.url;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function productImageMetadataUrl(image) {
  return String(image?.url || image?.publicUrl || "").trim();
}

function productImageMetadataForUrl(product, url) {
  const target = String(url || "").trim();
  if (!target) return null;
  return (product?.images || []).find(
    (image) => productImageMetadataUrl(image) === target || (image.variants || []).some((variant) => productImageMetadataUrl(variant) === target)
  );
}

const PRODUCT_IMAGE_SIZES = "(max-width: 720px) 92vw, 640px";

function productImageVariantCandidates(product, url) {
  const image = productImageMetadataForUrl(product, url);
  return (image?.variants || [])
    .map((variant) => ({
      url: productImageMetadataUrl(variant),
      width: Number(variant.width || 0),
      format: String(variant.format || variant.mime || "").replace(/^image\//, "").toLowerCase(),
    }))
    .filter((variant) => variant.url && variant.width > 0);
}

function srcsetFromImageVariants(variants) {
  return variants
    .sort((left, right) => left.width - right.width)
    .map((variant) => `${variant.url} ${variant.width}w`)
    .join(", ");
}

function productImageVariantSrcsetForFormat(product, url, preferredFormat = "webp") {
  const format = String(preferredFormat || "").toLowerCase();
  const variants = productImageVariantCandidates(product, url).filter((variant) => variant.format === format);
  return srcsetFromImageVariants(variants);
}

function productImageVariantSrcsetValue(product, url, preferredFormat = "webp") {
  const format = String(preferredFormat || "").toLowerCase();
  const variants = productImageVariantCandidates(product, url);
  const preferred = variants.filter((variant) => variant.format === format);
  const selected = preferred.length ? preferred : variants;
  return srcsetFromImageVariants(selected);
}

function productImageVariantSourceData(product, url) {
  return ["avif", "webp"]
    .map((format) => ({
      format,
      type: `image/${format}`,
      srcset: productImageVariantSrcsetForFormat(product, url, format),
    }))
    .filter((source) => source.srcset);
}

function productImageSourcesHtml(product, url) {
  return productImageVariantSourceData(product, url)
    .map(
      (source) =>
        `<source data-product-source="${source.format}" type="${source.type}" srcset="${escapeHtml(source.srcset)}" sizes="${PRODUCT_IMAGE_SIZES}" />`
    )
    .join("");
}

function productPictureHtml(product, url, alt, attrs = "") {
  const src = String(url || "").trim() || "assets/production-workshop-1.png";
  const img = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt || "")}" ${attrs} />`;
  const sources = productImageSourcesHtml(product, src);
  return sources ? `<picture>${sources}${img}</picture>` : img;
}

function applyProductImageVariantSrcset(node, product, url) {
  const picture = node?.closest?.("picture");
  if (picture) {
    picture.querySelectorAll("source[data-product-source]").forEach((source) => source.remove());
    productImageVariantSourceData(product, url).forEach((sourceData) => {
      const source = document.createElement("source");
      source.dataset.productSource = sourceData.format;
      source.type = sourceData.type;
      source.srcset = sourceData.srcset;
      source.sizes = PRODUCT_IMAGE_SIZES;
      picture.insertBefore(source, node);
    });
    node.removeAttribute("srcset");
    node.removeAttribute("sizes");
    return;
  }
  const srcset = productImageVariantSrcsetValue(product, url);
  if (srcset) {
    node.setAttribute("srcset", srcset);
    node.setAttribute("sizes", PRODUCT_IMAGE_SIZES);
  } else {
    node.removeAttribute("srcset");
    node.removeAttribute("sizes");
  }
}

function normalizeProduct(product) {
  const categories = normalizeListField(product, "categories", splitList(product.category || ""));
  const normalizedCategories = categories.length ? categories : [product.category || "Подушки"];
  const status = normalizeProductStatus(product);
  const imageMetadata = normalizeProductImages(product.images);
  const metadataUrls = imageMetadata.map(productImageMetadataUrl).filter(Boolean);
  const primaryImage = String(product.image || metadataUrls[0] || "assets/production-workshop-1.png").trim();
  const normalized = {
    ...product,
    status,
    hidden: status !== "published",
    image: primaryImage,
    images: imageMetadata,
    categories: normalizedCategories,
    category: normalizedCategories[0],
    types: product.types?.length ? product.types : TYPE_OPTIONS,
    sizes: product.sizes?.length ? product.sizes : SIZE_OPTIONS,
    materials: product.materials?.length ? product.materials : MATERIAL_OPTIONS,
    collections: normalizeListField(product, "collections", product.theme ? [product.theme] : []),
    holidays: normalizeListField(product, "holidays"),
    tags: normalizeTags(product),
    gallery: [...new Set([primaryImage, ...(product.gallery || []), ...metadataUrls])].filter(Boolean),
    detailDescription:
      product.detailDescription ||
      "Карточка показывает товар с несколькими фотографиями, быстрыми тегами и настройкой варианта под оптовую заявку.",
    stock: product.stock || "made",
    popular: product.popular || 50,
    basePrice: Number(product.basePrice || 200),
    variantPrices: product.variantPrices && typeof product.variantPrices === "object" ? product.variantPrices : {},
  };
  normalized.variants = createVariants(normalized);
  normalized.minPrice = Math.min(...normalized.variants.map((variant) => variant.price));
  normalized.maxPrice = Math.max(...normalized.variants.map((variant) => variant.price));
  return normalized;
}

  window.SobagProductUtils = {
    productStatusFromValue,
    normalizeProductStatus,
    productStatusLabel,
    isProductPublished,
    createVariants,
    variantNameForType,
    startsWithProductWord,
    replaceLeadingProductWord,
    variantNameWithSpecs,
    skuPart,
    skuSizePart,
    normalizeTaxonomyItem,
    uniqueList,
    normalizeListField,
    normalizeTags,
    productHasCollection,
    productHasHoliday,
    productHasCategory,
    normalizeProductImageMetadata,
    normalizeProductImages,
    productImageMetadataUrl,
    productImageMetadataForUrl,
    PRODUCT_IMAGE_SIZES,
    productImageVariantCandidates,
    srcsetFromImageVariants,
    productImageVariantSrcsetForFormat,
    productImageVariantSrcsetValue,
    productImageVariantSourceData,
    productImageSourcesHtml,
    productPictureHtml,
    applyProductImageVariantSrcset,
    normalizeProduct
  };
})();
