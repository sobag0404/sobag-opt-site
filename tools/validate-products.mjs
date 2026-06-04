import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const productsPath = join(root, "data", "products-live.json");

const typeFactors = {
  Подушка: 0,
  Наволочка: -20,
};

const sizeFactors = {
  "30x30": -40,
  "35x35": -20,
  "40x40": 0,
  "45x45": 25,
  "50x50": 55,
  "70x70": 160,
};

const materialFactors = {
  Велюр: 0,
  Габардин: -30,
};

const prototypePatterns = ["assets/hero-products-", "SB-PIL-", "SB-CSH-", "SB-PLD-"];
const requiredArrays = ["categories", "types", "sizes", "materials"];
const optionalUniqueArrays = ["collections", "holidays", "tags", "gallery"];
const productStatuses = new Set(["draft", "published", "hidden", "archive"]);

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeBaseSku(value) {
  return normalizeText(value).toLocaleUpperCase("ru-RU");
}

function normalizeProductStatus(product) {
  const status = normalizeText(product.status).toLocaleLowerCase("ru-RU");
  if (productStatuses.has(status)) return status;
  return product.hidden ? "hidden" : "published";
}

function skuPart(value, limit = Infinity) {
  const prepared = String(value || "")
    .toLocaleUpperCase("ru-RU")
    .replace(/[^A-ZА-ЯЁ0-9]+/g, "");
  return Number.isFinite(limit) ? prepared.slice(0, limit) : prepared;
}

function skuSizePart(value) {
  return String(value || "")
    .toLocaleUpperCase("ru-RU")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^A-ZА-ЯЁ0-9ХX,.-]+/g, "");
}

function hasCaseInsensitiveDuplicates(items) {
  const seen = new Set();
  for (const item of items || []) {
    const key = normalizeText(item).toLocaleLowerCase("ru-RU");
    if (!key) continue;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function isRemoteImage(value) {
  return /^https?:\/\//i.test(normalizeText(value)) || /^data:image\//i.test(normalizeText(value));
}

function variantSkusFor(product) {
  return (product.types || []).flatMap((type) =>
    (product.sizes || []).flatMap((size) =>
      (product.materials || []).map((material) => ({
        sku: [product.baseSku, skuPart(type, 3), skuSizePart(size), skuPart(material, 3)].filter(Boolean).join("_"),
        price:
          Number(product.basePrice || 0) +
          (typeFactors[type] || 0) +
          (sizeFactors[size] || 0) +
          (materialFactors[material] || 0),
      }))
    )
  );
}

function assertProducts() {
  const products = JSON.parse(readFileSync(productsPath, "utf8"));
  const errors = [];
  const baseSkus = new Set();
  const variantSkus = new Set();

  if (!Array.isArray(products) || !products.length) {
    throw new Error("data/products-live.json must contain a non-empty product array");
  }

  products.forEach((product, index) => {
    const label = product.baseSku || product.id || `row-${index + 1}`;
    const baseSkuKey = normalizeBaseSku(product.baseSku);

    if (!baseSkuKey) errors.push(`${label}: missing baseSku`);
    if (baseSkus.has(baseSkuKey)) errors.push(`${label}: duplicate baseSku`);
    baseSkus.add(baseSkuKey);

    if (!normalizeText(product.id)) errors.push(`${label}: missing id`);
    if (!normalizeText(product.name)) errors.push(`${label}: missing name`);
    if (product.status !== undefined && !productStatuses.has(normalizeText(product.status).toLocaleLowerCase("ru-RU"))) {
      errors.push(`${label}: invalid product status: ${product.status}`);
    }
    if (product.hidden !== undefined && Boolean(product.hidden) !== (normalizeProductStatus(product) !== "published")) {
      errors.push(`${label}: hidden must match product status`);
    }
    if (!Number.isFinite(Number(product.basePrice)) || Number(product.basePrice) <= 0) {
      errors.push(`${label}: basePrice must be a positive number`);
    }

    requiredArrays.forEach((key) => {
      if (!Array.isArray(product[key]) || !product[key].length) errors.push(`${label}: ${key} must be a non-empty array`);
      if (hasCaseInsensitiveDuplicates(product[key])) errors.push(`${label}: ${key} has duplicate values`);
    });

    optionalUniqueArrays.forEach((key) => {
      if (product[key] !== undefined && !Array.isArray(product[key])) errors.push(`${label}: ${key} must be an array`);
      if (hasCaseInsensitiveDuplicates(product[key])) errors.push(`${label}: ${key} has duplicate values`);
    });

    if (product.images !== undefined) {
      if (!Array.isArray(product.images)) {
        errors.push(`${label}: images must be an array`);
      } else {
        product.images.forEach((image, imageIndex) => {
          if (!image || typeof image !== "object") errors.push(`${label}: images[${imageIndex}] must be an object`);
          if (image && typeof image === "object") {
            if (!normalizeText(image.url) && !normalizeText(image.storageKey)) errors.push(`${label}: images[${imageIndex}] needs url or storageKey`);
            if (image.provider && !["vercel-blob", "s3-compatible"].includes(normalizeText(image.provider))) errors.push(`${label}: images[${imageIndex}] has unsupported provider`);
            if (image.width !== undefined && image.width !== null && Number(image.width) <= 0) errors.push(`${label}: images[${imageIndex}] width must be positive`);
            if (image.height !== undefined && image.height !== null && Number(image.height) <= 0) errors.push(`${label}: images[${imageIndex}] height must be positive`);
          }
        });
      }
    }

    const images = [product.image, ...(product.gallery || [])].filter(Boolean);
    if (!product.image) errors.push(`${label}: missing main image`);
    images.forEach((image) => {
      if (prototypePatterns.some((pattern) => String(image).includes(pattern))) errors.push(`${label}: prototype image still referenced: ${image}`);
      if (!isRemoteImage(image) && !existsSync(join(root, image))) errors.push(`${label}: image file not found: ${image}`);
    });

    const generatedVariants = variantSkusFor(product);
    if (!generatedVariants.length) errors.push(`${label}: generated variants are empty`);
    generatedVariants.forEach((variant) => {
      const skuKey = normalizeBaseSku(variant.sku);
      if (!skuKey) errors.push(`${label}: generated empty variant sku`);
      if (variantSkus.has(skuKey)) errors.push(`${label}: duplicate generated variant sku: ${variant.sku}`);
      variantSkus.add(skuKey);
      if (!Number.isFinite(variant.price) || variant.price <= 0) errors.push(`${label}: generated variant price is invalid for ${variant.sku}`);
    });
  });

  if (errors.length) {
    throw new Error(`Product data validation failed:\n${errors.slice(0, 40).join("\n")}${errors.length > 40 ? `\n...and ${errors.length - 40} more` : ""}`);
  }

  console.log(`Product data validation passed: ${products.length} products, ${variantSkus.size} generated variants`);
}

try {
  assertProducts();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
