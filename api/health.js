const { sendJson } = require("./_lib/http");
const { normalizeProvider } = require("./_lib/object-storage");
const { getStore } = require("./_lib/store");

function objectStorageStatus() {
  const provider = normalizeProvider();
  return {
    provider,
    configured: provider === "vercel-blob" ? Boolean(process.env.BLOB_READ_WRITE_TOKEN) : false,
  };
}

module.exports = async function handler(req, res) {
  try {
    await getStore();
    sendJson(res, 200, { ok: true, storage: "ready", objectStorage: objectStorageStatus() });
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      ok: false,
      storage: "not_configured",
      objectStorage: objectStorageStatus(),
      message: error.publicMessage || error.message,
    });
  }
};
