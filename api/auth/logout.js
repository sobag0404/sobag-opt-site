const { currentUser, expiredSessionCookie } = require("../_lib/auth");
const { handleError, methodNotAllowed, sendJson } = require("../_lib/http");
const { deleteSession } = require("../_lib/store");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);
  try {
    const { token } = await currentUser(req);
    await deleteSession(token);
    res.setHeader("Set-Cookie", expiredSessionCookie());
    sendJson(res, 200, { ok: true });
  } catch (error) {
    handleError(res, error);
  }
};
