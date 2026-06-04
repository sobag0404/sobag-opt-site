const { requireUser } = require("../_lib/auth");
const { handleError, methodNotAllowed, sendJson } = require("../_lib/http");
const { csvForPimView, reportForPimView } = require("../_lib/pim-report");
const { getCatalog } = require("../_lib/store");

function text(value) {
  return String(value || "").trim();
}

function parseUrl(req) {
  return new URL(req.url || "/api/admin/pim", `http://${req.headers.host || "localhost"}`);
}

function sendCsv(res, result) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  res.end(result.csv);
}

module.exports = async function handler(req, res) {
  try {
    await requireUser(req, ["admin", "content"]);
    if (req.method !== "GET") return methodNotAllowed(res);

    const url = parseUrl(req);
    const catalog = await getCatalog();
    if (!catalog?.products?.length) return sendJson(res, 200, { view: "summary", source: "empty", counts: { products: 0 }, diagnostics: { ok: true, warnings: [] } });

    const requestedView = text(url.searchParams.get("view"));
    const view = requestedView || "summary";
    const format = text(url.searchParams.get("format")).toLowerCase();
    if (format === "csv") return sendCsv(res, csvForPimView(catalog, requestedView || "products"));
    if (format && format !== "json") return sendJson(res, 400, { error: "unsupported_format", message: "PIM export format must be json or csv." });

    return sendJson(res, 200, reportForPimView(catalog, view));
  } catch (error) {
    handleError(res, error, req);
  }
};
