const staticProducts = require("../data/products-live.json");
const { handleError, methodNotAllowed, sendJson } = require("./_lib/http");
const { getCatalog } = require("./_lib/store");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  try {
    const catalog = await getCatalog();
    if (catalog?.products?.length) {
      return sendJson(res, 200, { ...catalog, source: "server" });
    }
    return sendJson(res, 200, { products: staticProducts, updatedAt: null, source: "static" });
  } catch (error) {
    if (error.code === "storage_not_configured") {
      return sendJson(res, 200, { products: staticProducts, updatedAt: null, source: "static" });
    }
    return handleError(res, error);
  }
};
