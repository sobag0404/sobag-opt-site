const crypto = require("crypto");

const DEFAULT_PROVIDER = "vercel-blob";
const PRODUCT_IMAGE_PREFIX = "products";
const SUPPORTED_PROVIDERS = new Set([DEFAULT_PROVIDER, "s3-compatible"]);

function text(value) {
  return String(value || "").trim();
}

function normalizeProvider(value = process.env.SOBAG_OBJECT_STORAGE_PROVIDER) {
  const provider = text(value || DEFAULT_PROVIDER).toLowerCase();
  if (provider === "blob" || provider === "vercel_blob") return DEFAULT_PROVIDER;
  if (provider === "s3" || provider === "minio" || provider === "r2") return "s3-compatible";
  return SUPPORTED_PROVIDERS.has(provider) ? provider : DEFAULT_PROVIDER;
}

function storageError(message, code = "object_storage_error", statusCode = 500) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function safePathSegment(value, fallback = "item") {
  const cleaned = text(value)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  return cleaned || fallback;
}

function safeFileName(value, fallback = "image.jpg") {
  const cleaned = text(value).replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 160);
  return cleaned || fallback;
}

function extensionFromMime(mime) {
  const normalized = text(mime).toLowerCase();
  if (normalized === "image/png") return ".png";
  if (normalized === "image/webp") return ".webp";
  if (normalized === "image/avif") return ".avif";
  if (normalized === "image/gif") return ".gif";
  return ".jpg";
}

function productImageKey({ productKey, fileName, mime }) {
  const product = safePathSegment(productKey, "unknown-product");
  const preparedName = safeFileName(fileName, `image${extensionFromMime(mime)}`);
  const unique = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  return `${PRODUCT_IMAGE_PREFIX}/${product}/${unique}-${preparedName}`;
}

function normalizeImageMetadata(input = {}) {
  if (!input || typeof input !== "object") return null;
  const url = text(input.url || input.downloadUrl || input.publicUrl);
  const storageKey = text(input.storageKey || input.pathname || input.key);
  if (!url && !storageKey) return null;
  const variants = Array.isArray(input.variants)
    ? input.variants
        .map((variant) => {
          const normalized = normalizeImageMetadata(variant);
          return normalized
            ? {
                ...normalized,
                label: text(variant.label || variant.variantLabel),
                format: text(variant.format || variant.mime).replace(/^image\//, ""),
              }
            : null;
        })
        .filter(Boolean)
    : [];
  return {
    url,
    storageKey,
    provider: text(input.provider) ? normalizeProvider(input.provider) : "",
    width: Number(input.width || 0) || null,
    height: Number(input.height || 0) || null,
    mime: text(input.mime || input.contentType),
    uploadedAt: text(input.uploadedAt) || new Date().toISOString(),
    fileName: text(input.fileName),
    size: Number(input.size || 0) || null,
    etag: text(input.etag),
    status: text(input.status) || "active",
    variants,
  };
}

function blobToImageMetadata(blob, extra = {}) {
  return normalizeImageMetadata({
    ...extra,
    provider: DEFAULT_PROVIDER,
    url: blob.url,
    downloadUrl: blob.downloadUrl,
    storageKey: blob.pathname,
    mime: blob.contentType || extra.mime,
    uploadedAt: blob.uploadedAt || extra.uploadedAt,
    size: blob.size || extra.size,
    etag: blob.etag || extra.etag,
  });
}

function createVercelBlobAdapter() {
  const { del, list, put } = require("@vercel/blob");

  return {
    provider: DEFAULT_PROVIDER,

    async upload(options = {}) {
      const body = options.body;
      if (!body) throw storageError("Missing upload body.", "missing_upload_body", 400);
      const mime = text(options.mime || options.contentType || "application/octet-stream");
      if (!mime.startsWith("image/")) throw storageError("Only image uploads are allowed.", "unsupported_image_mime", 400);
      const storageKey = options.storageKey || productImageKey({ productKey: options.productKey, fileName: options.fileName, mime });
      const blob = await put(storageKey, body, {
        access: "public",
        addRandomSuffix: false,
        contentType: mime,
        multipart: Buffer.isBuffer(body) && body.length > 4 * 1024 * 1024,
      });
      return blobToImageMetadata(blob, {
        width: options.width,
        height: options.height,
        mime,
        fileName: options.fileName,
        size: Buffer.isBuffer(body) ? body.length : Number(options.size || 0),
      });
    },

    getPublicUrl(image) {
      return text(image?.url || image?.publicUrl || image);
    },

    async deleteOrMarkUnused(image, options = {}) {
      const normalized = normalizeImageMetadata(image);
      if (!normalized) throw storageError("Missing image metadata.", "missing_image_metadata", 400);
      if (options.mode === "mark-unused") {
        return { ...normalized, status: "unused", markedUnusedAt: new Date().toISOString() };
      }
      await del(normalized.url || normalized.storageKey);
      return { ...normalized, status: "deleted", deletedAt: new Date().toISOString() };
    },

    async listByProduct(productKey, options = {}) {
      const prefix = `${PRODUCT_IMAGE_PREFIX}/${safePathSegment(productKey, "unknown-product")}/`;
      const result = await list({ prefix, limit: Number(options.limit || 100) });
      return (result.blobs || []).map((blob) => blobToImageMetadata(blob));
    },
  };
}

function createS3PlaceholderAdapter() {
  return {
    provider: "s3-compatible",
    async upload() {
      throw storageError("S3-compatible object storage is not configured yet.", "s3_storage_not_configured", 501);
    },
    getPublicUrl(image) {
      return text(image?.url || image?.publicUrl || image);
    },
    async deleteOrMarkUnused(image) {
      const normalized = normalizeImageMetadata(image);
      if (!normalized) throw storageError("Missing image metadata.", "missing_image_metadata", 400);
      return { ...normalized, status: "unused", markedUnusedAt: new Date().toISOString() };
    },
    async listByProduct() {
      return [];
    },
  };
}

function createObjectStorageAdapter(provider = normalizeProvider()) {
  const normalized = normalizeProvider(provider);
  if (normalized === DEFAULT_PROVIDER) return createVercelBlobAdapter();
  if (normalized === "s3-compatible") return createS3PlaceholderAdapter();
  throw storageError(`Unsupported object storage provider: ${normalized}`, "unsupported_object_storage_provider", 400);
}

module.exports = {
  DEFAULT_PROVIDER,
  normalizeImageMetadata,
  normalizeProvider,
  productImageKey,
  safePathSegment,
  createObjectStorageAdapter,
};
