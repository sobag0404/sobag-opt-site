const { requireUser } = require("../_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { createObjectStorageAdapter, normalizeImageMetadata, objectStorageStatus } = require("../_lib/object-storage");

const MAX_JSON_IMAGE_BYTES = 8 * 1024 * 1024;

function text(value) {
  return String(value || "").trim();
}

function parseUrl(req) {
  return new URL(req.url || "/api/admin/product-images", "http://localhost");
}

function parseImageBody(data = {}) {
  const dataUrl = text(data.dataUrl);
  let mime = text(data.mime || data.contentType);
  let base64 = text(data.base64);

  if (dataUrl) {
    const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
    if (!match) {
      const error = new Error("Invalid dataUrl image payload.");
      error.code = "invalid_image_payload";
      error.statusCode = 400;
      throw error;
    }
    mime = match[1];
    base64 = match[2];
  }

  if (!base64) {
    const error = new Error("Missing base64 image payload.");
    error.code = "missing_image_payload";
    error.statusCode = 400;
    throw error;
  }

  if (!mime.startsWith("image/")) {
    const error = new Error("Only image uploads are allowed.");
    error.code = "unsupported_image_mime";
    error.statusCode = 400;
    throw error;
  }

  const body = Buffer.from(base64, "base64");
  if (!body.length || body.length > MAX_JSON_IMAGE_BYTES) {
    const error = new Error("Image payload is empty or too large for JSON upload.");
    error.code = "invalid_image_size";
    error.statusCode = 400;
    throw error;
  }

  return { body, mime };
}

module.exports = async function handler(req, res) {
  try {
    await requireUser(req, ["admin", "content"]);
    const adapter = createObjectStorageAdapter();

    if (req.method === "GET") {
      const url = parseUrl(req);
      const productKey = text(url.searchParams.get("product") || url.searchParams.get("baseSku"));
      if (!productKey) return sendJson(res, 200, { ...objectStorageStatus(), images: [] });
      const images = await adapter.listByProduct(productKey);
      return sendJson(res, 200, { ...objectStorageStatus(), productKey, images });
    }

    if (req.method === "POST") {
      const data = await readJson(req);
      const action = text(data.action || "upload");

      if (action === "mark-unused") {
        const image = normalizeImageMetadata(data.image || data);
        const result = await adapter.deleteOrMarkUnused(image, { mode: "mark-unused" });
        return sendJson(res, 200, { image: result });
      }

      if (action !== "upload") return sendJson(res, 400, { error: "unknown_action", message: "Unknown image storage action." });
      const productKey = text(data.productKey || data.baseSku || data.productId);
      if (!productKey) return sendJson(res, 400, { error: "missing_product_key", message: "Product key is required for image upload." });
      const { body, mime } = parseImageBody(data);
      const image = await adapter.upload({
        productKey,
        body,
        mime,
        fileName: data.fileName || data.name,
        width: data.width,
        height: data.height,
      });
      return sendJson(res, 200, { image });
    }

    if (req.method === "DELETE") {
      const url = parseUrl(req);
      const body = await readJson(req);
      const data = {
        ...(body && typeof body === "object" ? body : {}),
        url: url.searchParams.get("url") || body?.url,
        storageKey: url.searchParams.get("storageKey") || body?.storageKey,
      };
      const image = normalizeImageMetadata(data.image || data);
      const result = await adapter.deleteOrMarkUnused(image, { mode: data.mode === "mark-unused" ? "mark-unused" : "delete" });
      return sendJson(res, 200, { image: result });
    }

    return methodNotAllowed(res);
  } catch (error) {
    handleError(res, error, req);
  }
};
