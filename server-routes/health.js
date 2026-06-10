const { catalogDbStatus } = require("./_lib/catalog-db-client");
const { methodNotAllowed, sendJson } = require("./_lib/http");
const { objectStorageStatus } = require("./_lib/object-storage");
const { getStore, storeStatus } = require("./_lib/store");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  try {
    await getStore();
    sendJson(res, 200, { ok: true, storage: "ready", store: storeStatus(), objectStorage: objectStorageStatus(), catalogDb: catalogDbStatus() });
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      ok: false,
      storage: "not_configured",
      store: storeStatus(),
      objectStorage: objectStorageStatus(),
      catalogDb: catalogDbStatus(),
      message: error.publicMessage || error.message,
    });
  }
};
