const crypto = require("crypto");

const DEFAULT_PROVIDER = "vercel-blob";
const PRODUCT_IMAGE_PREFIX = "products";
const SUPPORTED_PROVIDERS = new Set([DEFAULT_PROVIDER, "s3-compatible"]);
const EMPTY_SHA256 = crypto.createHash("sha256").update("").digest("hex");

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

function bool(value, fallback = false) {
  const normalized = text(value).toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
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

function envText(env, name) {
  return text(env?.[name]);
}

function s3ConfigFromEnv(env = process.env) {
  const endpoint = envText(env, "SOBAG_S3_ENDPOINT");
  const bucket = envText(env, "SOBAG_S3_BUCKET");
  const accessKeyId = envText(env, "SOBAG_S3_ACCESS_KEY_ID");
  const secretAccessKey = envText(env, "SOBAG_S3_SECRET_ACCESS_KEY");
  const sessionToken = envText(env, "SOBAG_S3_SESSION_TOKEN");
  const region = envText(env, "SOBAG_S3_REGION") || "auto";
  const publicBaseUrl = envText(env, "SOBAG_S3_PUBLIC_BASE_URL");
  const forcePathStyle = bool(env?.SOBAG_S3_FORCE_PATH_STYLE, true);
  return {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    region,
    publicBaseUrl,
    forcePathStyle,
    configured: Boolean(endpoint && bucket && accessKeyId && secretAccessKey),
  };
}

function objectStorageStatus(provider = normalizeProvider()) {
  const normalized = normalizeProvider(provider);
  if (normalized === DEFAULT_PROVIDER) {
    return {
      provider: normalized,
      configured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    };
  }
  const config = s3ConfigFromEnv();
  return {
    provider: normalized,
    configured: config.configured,
    publicUrlConfigured: Boolean(config.publicBaseUrl),
  };
}

function encodeUriSegment(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeKeyPath(key) {
  return text(key)
    .split("/")
    .filter((segment) => segment.length)
    .map(encodeUriSegment)
    .join("/");
}

function decodeKeyPath(pathname) {
  return text(pathname)
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
}

function joinUrlPath(base, key) {
  const preparedBase = text(base).replace(/\/+$/g, "");
  const preparedKey = encodeKeyPath(key);
  return preparedKey ? `${preparedBase}/${preparedKey}` : preparedBase;
}

function hmac(key, value, encoding) {
  return crypto.createHmac("sha256", key).update(value).digest(encoding);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function amzTimestamp(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function normalizeHeaderValue(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function canonicalQuery(params = {}) {
  return Object.entries(params)
    .flatMap(([key, value]) => {
      if (value === undefined || value === null) return [];
      if (Array.isArray(value)) return value.map((item) => [key, item]);
      return [[key, value]];
    })
    .map(([key, value]) => [encodeUriSegment(key), encodeUriSegment(String(value))])
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function buildS3Url(config, key = "", query = {}) {
  const endpoint = new URL(config.endpoint);
  const basePath = endpoint.pathname.replace(/\/+$/g, "");
  const keyPath = encodeKeyPath(key);
  const bucketPath = encodeUriSegment(config.bucket);
  let pathname = "";

  if (config.forcePathStyle) {
    pathname = `${basePath}/${bucketPath}${keyPath ? `/${keyPath}` : ""}`;
  } else {
    endpoint.hostname = `${config.bucket}.${endpoint.hostname}`;
    pathname = `${basePath}${keyPath ? `/${keyPath}` : "/"}`;
  }

  endpoint.pathname = pathname || "/";
  endpoint.search = canonicalQuery(query);
  return endpoint;
}

function signS3Request({ method, url, config, headers = {}, body }) {
  const payloadHash = body ? sha256(body) : EMPTY_SHA256;
  const { amzDate, dateStamp } = amzTimestamp();
  const preparedHeaders = {
    ...headers,
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (config.sessionToken) preparedHeaders["x-amz-security-token"] = config.sessionToken;

  const canonicalHeaders = Object.entries(preparedHeaders)
    .map(([key, value]) => [key.toLowerCase(), normalizeHeaderValue(value)])
    .sort(([left], [right]) => left.localeCompare(right));
  const signedHeaders = canonicalHeaders.map(([key]) => key).join(";");
  const canonicalHeaderText = canonicalHeaders.map(([key, value]) => `${key}:${value}\n`).join("");
  const canonicalRequest = [
    method.toUpperCase(),
    url.pathname || "/",
    url.search ? url.search.slice(1) : "",
    canonicalHeaderText,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256(canonicalRequest)].join("\n");
  const dateKey = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, config.region);
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = hmac(signingKey, stringToSign, "hex");
  return {
    ...preparedHeaders,
    Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

function requireS3Config(config) {
  if (config.configured) return config;
  throw storageError("S3-compatible object storage is not configured.", "s3_storage_not_configured", 503);
}

function xmlDecode(value) {
  return text(value)
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function xmlValue(block, tag) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? xmlDecode(match[1]) : "";
}

function parseS3ListXml(xml) {
  const items = [];
  const blocks = String(xml || "").matchAll(/<Contents>([\s\S]*?)<\/Contents>/g);
  for (const match of blocks) {
    const block = match[1];
    const key = xmlValue(block, "Key");
    if (!key) continue;
    items.push({
      key,
      lastModified: xmlValue(block, "LastModified"),
      etag: xmlValue(block, "ETag").replace(/^"|"$/g, ""),
      size: Number(xmlValue(block, "Size") || 0) || null,
    });
  }
  return items;
}

function publicUrlForS3Key(config, key) {
  if (!key) return "";
  if (config.publicBaseUrl) return joinUrlPath(config.publicBaseUrl, key);
  if (!config.endpoint || !config.bucket) return "";
  return buildS3Url(config, key).toString();
}

function storageKeyFromS3Image(image, config) {
  const normalized = normalizeImageMetadata(image);
  if (!normalized) return "";
  if (normalized.storageKey) return normalized.storageKey;
  const url = text(normalized.url);
  if (!url) return "";

  if (config.publicBaseUrl) {
    const base = text(config.publicBaseUrl).replace(/\/+$/g, "");
    if (url.startsWith(`${base}/`)) return decodeKeyPath(url.slice(base.length + 1));
  }

  try {
    const parsed = new URL(url);
    const endpoint = new URL(config.endpoint);
    const path = decodeKeyPath(parsed.pathname);
    const bucketPrefix = `${config.bucket}/`;
    if (config.forcePathStyle || parsed.hostname === endpoint.hostname) {
      return path.startsWith(bucketPrefix) ? path.slice(bucketPrefix.length) : path;
    }
    return path;
  } catch {
    return "";
  }
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

function s3ObjectMetadata(config, item, extra = {}) {
  return normalizeImageMetadata({
    ...extra,
    provider: "s3-compatible",
    url: publicUrlForS3Key(config, item.key || item.storageKey),
    storageKey: item.key || item.storageKey,
    mime: item.mime || extra.mime,
    uploadedAt: item.lastModified || extra.uploadedAt,
    size: item.size || extra.size,
    etag: item.etag || extra.etag,
    fileName: item.fileName || extra.fileName || text(item.key || item.storageKey).split("/").pop(),
  });
}

async function s3Fetch(config, method, key = "", { query = {}, headers = {}, body } = {}) {
  const readyConfig = requireS3Config(config);
  const url = buildS3Url(readyConfig, key, query);
  const signedHeaders = signS3Request({ method, url, config: readyConfig, headers, body });
  const response = await fetch(url, {
    method,
    headers: signedHeaders,
    body,
  });
  return response;
}

function createS3CompatibleAdapter() {
  const config = s3ConfigFromEnv();
  return {
    provider: "s3-compatible",

    async upload(options = {}) {
      const body = options.body;
      if (!body) throw storageError("Missing upload body.", "missing_upload_body", 400);
      const mime = text(options.mime || options.contentType || "application/octet-stream");
      if (!mime.startsWith("image/")) throw storageError("Only image uploads are allowed.", "unsupported_image_mime", 400);
      const storageKey = options.storageKey || productImageKey({ productKey: options.productKey, fileName: options.fileName, mime });
      const response = await s3Fetch(config, "PUT", storageKey, {
        headers: {
          "content-type": mime,
        },
        body,
      });
      if (!response.ok) {
        throw storageError(`S3 upload failed with HTTP ${response.status}.`, "s3_upload_failed", 502);
      }
      return s3ObjectMetadata(
        config,
        {
          key: storageKey,
          etag: text(response.headers?.get?.("etag")).replace(/^"|"$/g, ""),
          size: Buffer.isBuffer(body) ? body.length : Number(options.size || 0),
        },
        {
          width: options.width,
          height: options.height,
          mime,
          fileName: options.fileName,
          uploadedAt: new Date().toISOString(),
        }
      );
    },

    getPublicUrl(image) {
      const normalized = normalizeImageMetadata(image);
      if (!normalized) return text(image?.url || image?.publicUrl || image);
      return normalized.url || publicUrlForS3Key(config, normalized.storageKey);
    },

    async deleteOrMarkUnused(image, options = {}) {
      const normalized = normalizeImageMetadata(image);
      if (!normalized) throw storageError("Missing image metadata.", "missing_image_metadata", 400);
      if (options.mode === "mark-unused") {
        return { ...normalized, status: "unused", markedUnusedAt: new Date().toISOString() };
      }
      const storageKey = storageKeyFromS3Image(normalized, config);
      if (!storageKey) throw storageError("Missing S3 storage key.", "missing_s3_storage_key", 400);
      const response = await s3Fetch(config, "DELETE", storageKey);
      if (!response.ok && response.status !== 404) {
        throw storageError(`S3 delete failed with HTTP ${response.status}.`, "s3_delete_failed", 502);
      }
      return { ...normalized, status: "deleted", deletedAt: new Date().toISOString() };
    },

    async listByProduct(productKey, options = {}) {
      const prefix = `${PRODUCT_IMAGE_PREFIX}/${safePathSegment(productKey, "unknown-product")}/`;
      const limit = Math.min(1000, Math.max(1, Number(options.limit || 100) || 100));
      const response = await s3Fetch(config, "GET", "", {
        query: {
          "list-type": "2",
          prefix,
          "max-keys": String(limit),
        },
      });
      if (!response.ok) {
        throw storageError(`S3 list failed with HTTP ${response.status}.`, "s3_list_failed", 502);
      }
      const xml = await response.text();
      return parseS3ListXml(xml).map((item) => s3ObjectMetadata(config, item));
    },
  };
}

function createObjectStorageAdapter(provider = normalizeProvider()) {
  const normalized = normalizeProvider(provider);
  if (normalized === DEFAULT_PROVIDER) return createVercelBlobAdapter();
  if (normalized === "s3-compatible") return createS3CompatibleAdapter();
  throw storageError(`Unsupported object storage provider: ${normalized}`, "unsupported_object_storage_provider", 400);
}

module.exports = {
  DEFAULT_PROVIDER,
  normalizeImageMetadata,
  normalizeProvider,
  objectStorageStatus,
  productImageKey,
  safePathSegment,
  createObjectStorageAdapter,
};
