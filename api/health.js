const { sendJson } = require("./_lib/http");
const { getStore } = require("./_lib/store");

module.exports = async function handler(req, res) {
  try {
    await getStore();
    sendJson(res, 200, { ok: true, storage: "ready" });
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      ok: false,
      storage: "not_configured",
      message: error.publicMessage || error.message,
    });
  }
};
