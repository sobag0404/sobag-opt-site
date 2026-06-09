const { handleApiRequest } = require("../api-router");

module.exports = async function handler(req, res) {
  return handleApiRequest(req, res);
};
