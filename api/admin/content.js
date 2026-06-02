const { requireUser } = require("../_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { getContent, saveContent } = require("../_lib/store");

const MAX_CONTENT_BYTES = 4 * 1024 * 1024;

module.exports = async function handler(req, res) {
  try {
    const { user } = await requireUser(req, ["admin"]);
    if (req.method === "GET") {
      const content = await getContent();
      return sendJson(res, 200, content || { content: {}, updatedAt: null, source: "empty" });
    }
    if (req.method !== "PUT") return methodNotAllowed(res);

    const data = await readJson(req);
    const content = data.content && typeof data.content === "object" && !Array.isArray(data.content) ? data.content : null;
    if (!content) return sendJson(res, 400, { error: "invalid_content", message: "Некорректные настройки сайта." });
    if (Buffer.byteLength(JSON.stringify(content), "utf8") > MAX_CONTENT_BYTES) {
      return sendJson(res, 400, { error: "content_too_large", message: "Слишком большой объем настроек сайта." });
    }

    const saved = await saveContent(content, user.email);
    sendJson(res, 200, { updatedAt: saved.updatedAt, count: Object.keys(content).length });
  } catch (error) {
    handleError(res, error);
  }
};
