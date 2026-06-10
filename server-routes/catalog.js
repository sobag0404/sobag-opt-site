const { loadPublicCatalog } = require("./_lib/catalog-source");
const { handleError, methodNotAllowed, sendJson } = require("./_lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  try {
    return sendJson(res, 200, await loadPublicCatalog({ includeReviews: true }));
  } catch (error) {
    if (error.code === "storage_not_configured") {
      return sendJson(res, 200, await loadPublicCatalog({ includeReviews: false }));
    }
    return handleError(res, error, req);
  }
};
