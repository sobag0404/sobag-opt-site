const { currentUser, publicUser } = require("../_lib/auth");
const { handleError, methodNotAllowed, sendJson } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  try {
    const { user, store } = await currentUser(req);
    if (!user) return sendJson(res, 200, { user: null });
    const orders = store.orders.filter((order) => order.userEmail === user.email);
    sendJson(res, 200, { user: { ...publicUser(user), orders } });
  } catch (error) {
    handleError(res, error);
  }
};
