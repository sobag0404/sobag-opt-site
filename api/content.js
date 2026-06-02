const { handleError, methodNotAllowed, sendJson } = require("./_lib/http");
const { getContent } = require("./_lib/store");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  try {
    const content = await getContent();
    if (content?.content) return sendJson(res, 200, { ...content, source: "server" });
    return sendJson(res, 200, { content: {}, updatedAt: null, source: "default" });
  } catch (error) {
    if (error.code === "storage_not_configured") {
      return sendJson(res, 200, { content: {}, updatedAt: null, source: "default" });
    }
    return handleError(res, error);
  }
};
