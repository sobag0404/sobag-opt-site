const { handleError, methodNotAllowed, sendJson } = require("./_lib/http");
const { getContent } = require("./_lib/store");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  try {
    const content = await getContent();
    const cacheHeaders = { "Cache-Control": "public, max-age=60, stale-while-revalidate=600" };
    if (content?.content) return sendJson(res, 200, { ...content, source: "server" }, cacheHeaders);
    return sendJson(res, 200, { content: {}, updatedAt: null, source: "default" }, cacheHeaders);
  } catch (error) {
    if (error.code === "storage_not_configured") {
      return sendJson(res, 200, { content: {}, updatedAt: null, source: "default" }, { "Cache-Control": "public, max-age=60, stale-while-revalidate=600" });
    }
    return handleError(res, error, req);
  }
};
