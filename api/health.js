const { methodNotAllowed, sendJson } = require("./_lib/http");
const { objectStorageStatus } = require("./_lib/object-storage");
const { getStore } = require("./_lib/store");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
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
