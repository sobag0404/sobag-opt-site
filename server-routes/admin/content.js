const { requireUser } = require("../_lib/auth");
const { auditRecord } = require("../_lib/admin-audit");
const { checkStoreRateLimit } = require("../_lib/api-security");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");
const { getContent, saveContent, saveStore } = require("../_lib/store");

const MAX_CONTENT_BYTES = 4 * 1024 * 1024;
const reviewStatuses = new Set(["pending", "approved", "hidden"]);

module.exports = async function handler(req, res) {
  try {
    const { user, store } = await requireUser(req, ["admin", "content"]);
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (req.method === "GET") {
      if (url.searchParams.get("reviews") === "1") {
        return sendJson(res, 200, {
          reviews: (store.reviews || []).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
        });
      }
      const content = await getContent();
      return sendJson(res, 200, content || { content: {}, updatedAt: null, source: "empty" });
    }
    if (req.method === "PATCH" || req.method === "PUT") {
      const limited = await checkStoreRateLimit(req, { key: `admin:content:write:${String(user.email || "").toLowerCase()}`, limit: 80 });
      if (limited) throw limited;
    }
    if (req.method === "PATCH") {
      const data = await readJson(req, { maxBytes: 512 * 1024 });
      const reviewId = String(data.reviewId || "").trim();
      if (!reviewId) return sendJson(res, 400, { error: "invalid_review", message: "Отзыв не найден." });

      let updated = null;
      if (data.delete) {
        const before = (store.reviews || []).length;
        store.reviews = (store.reviews || []).filter((review) => review.id !== reviewId);
        if (store.reviews.length === before) return sendJson(res, 404, { error: "not_found", message: "Отзыв не найден." });
      } else {
        const status = String(data.status || "").trim();
        if (!reviewStatuses.has(status)) return sendJson(res, 400, { error: "invalid_status", message: "Некорректный статус отзыва." });
        store.reviews = (store.reviews || []).map((review) => {
          if (review.id !== reviewId) return review;
          updated = {
            ...review,
            status,
            moderatedBy: user.email,
            moderatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return updated;
        });
        if (!updated) return sendJson(res, 404, { error: "not_found", message: "Отзыв не найден." });
      }

      store.audit = [
        auditRecord(data.delete ? "review_delete" : "review_update", data.delete ? "delete" : "moderate", user, {
          entityType: "review",
          entityId: reviewId.slice(0, 120),
          reviewId: reviewId.slice(0, 120),
          status: String(updated?.status || "deleted").slice(0, 40),
          result: data.delete ? "deleted" : "updated",
        }),
        ...(store.audit || []),
      ].slice(0, 500);
      await saveStore(store);
      return sendJson(res, 200, { review: updated, deleted: Boolean(data.delete) });
    }
    if (req.method !== "PUT") return methodNotAllowed(res);

    const data = await readJson(req, { maxBytes: MAX_CONTENT_BYTES + 128 * 1024 });
    const content = data.content && typeof data.content === "object" && !Array.isArray(data.content) ? data.content : null;
    if (!content) return sendJson(res, 400, { error: "invalid_content", message: "Некорректные настройки сайта." });
    if (Buffer.byteLength(JSON.stringify(content), "utf8") > MAX_CONTENT_BYTES) {
      return sendJson(res, 400, { error: "content_too_large", message: "Слишком большой объем настроек сайта." });
    }

    const saved = await saveContent(content, user.email);
    store.audit = [
      auditRecord("content_update", "save", user, {
        entityType: "content",
        entityId: "site-content",
        result: "updated",
        counts: { sections: Object.keys(content).length },
      }),
      ...(store.audit || []),
    ].slice(0, 500);
    await saveStore(store);
    sendJson(res, 200, { updatedAt: saved.updatedAt, count: Object.keys(content).length });
  } catch (error) {
    handleError(res, error, req);
  }
};
