const { randomUUID } = require("node:crypto");
const { checkRateLimit } = require("./_lib/api-security");
const { currentUser, normalizePhone } = require("./_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("./_lib/http");
const { MIN_ORDER_TOTAL, normalizeOrderPricing } = require("./_lib/order-pricing");
const { saveStore } = require("./_lib/store");

function uniqueNonEmpty(items) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
}

function publicOrder(order) {
  return {
    ...order,
    crmThread: (Array.isArray(order.crmThread) ? order.crmThread : []).filter((entry) => entry?.visibility !== "internal"),
  };
}

function normalizeIdempotencyKey(value) {
  const key = String(value || "")
    .trim()
    .slice(0, 120);
  if (!key || !/^[A-Za-z0-9._:-]{8,120}$/.test(key)) return "";
  return key;
}

function idempotencyKeyFromRequest(req, data) {
  return normalizeIdempotencyKey(req.headers["idempotency-key"] || req.headers["x-idempotency-key"] || data.idempotencyKey);
}

function orderIdempotencyScope(user, data) {
  const customer = data.customer || {};
  const email = String(user?.email || customer.email || "").trim().toLowerCase();
  if (email) return `email:${email}`;
  const phone = normalizePhone(customer.phone || "");
  if (phone) return `phone:${phone}`;
  return "";
}

function findIdempotentOrder(store, key, scope) {
  if (!key || !scope) return null;
  return (store.orders || []).find((order) => order?.idempotencyKey === key && order?.idempotencyScope === scope) || null;
}

function createOrderId(store) {
  const existing = new Set((store.orders || []).map((order) => String(order?.id || "")));
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = `SO-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
    if (!existing.has(id)) return id;
  }
  return `SO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function normalizeOrderId(value) {
  const id = String(value || "").trim().slice(0, 120);
  if (!id || !/^[A-Za-z0-9._:-]{2,120}$/.test(id)) return "";
  return id;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "PATCH") {
      const data = await readJson(req);
      const limited = checkRateLimit(req, { key: "orders:comment", limit: 60 });
      if (limited) throw limited;
      const { user, store } = await currentUser(req);
      if (!user) return sendJson(res, 401, { error: "unauthorized", message: "Нужно войти в аккаунт." });
      const orderId = normalizeOrderId(data.id);
      if (!orderId) return sendJson(res, 400, { error: "invalid_order_id", message: "Некорректный номер заказа." });
      const text = String(data.commentText || "").trim().slice(0, 1200);
      if (!text) return sendJson(res, 400, { error: "empty_comment", message: "Напишите сообщение по заказу." });
      let updated = null;
      store.orders = store.orders.map((order) => {
        const customerEmail = String(order.customer?.email || order.userEmail || "").toLowerCase();
        if (order.id !== orderId || customerEmail !== String(user.email || "").toLowerCase()) return order;
        const entry = {
          id: `CRM-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          at: new Date().toISOString(),
          actor: user.name || user.company || user.email,
          role: "buyer",
          visibility: "customer",
          text,
        };
        updated = {
          ...order,
          crmThread: [entry, ...(order.crmThread || [])].slice(0, 200),
          updatedAt: new Date().toISOString(),
          updatedBy: user.email,
        };
        return updated;
      });
      if (!updated) return sendJson(res, 404, { error: "not_found", message: "Заказ не найден." });
      await saveStore(store);
      return sendJson(res, 200, { order: publicOrder(updated) });
    }
    if (req.method !== "POST") return methodNotAllowed(res);

    const data = await readJson(req);
    const limited = checkRateLimit(req, { key: "orders:create", limit: 30 });
    if (limited) throw limited;
    const { user, store } = await currentUser(req);
    const idempotencyKey = idempotencyKeyFromRequest(req, data);
    const idempotencyScope = orderIdempotencyScope(user, data);
    const existing = findIdempotentOrder(store, idempotencyKey, idempotencyScope);
    if (existing) return sendJson(res, 200, { order: publicOrder(existing), idempotent: true });

    const pricing = await normalizeOrderPricing(data);
    const customer = data.customer || {};

    if (pricing.total < MIN_ORDER_TOTAL) {
      return sendJson(res, 400, {
        error: "minimum_total",
        message: `Минимальная сумма заказа ${MIN_ORDER_TOTAL.toLocaleString("ru-RU")} ₽.`,
      });
    }
    const customerPhone = normalizePhone(customer.phone || user?.phone || "");
    if (!customerPhone) return sendJson(res, 400, { error: "missing_phone", message: "Укажите телефон." });

    const record = {
      id: createOrderId(store),
      date: new Date().toLocaleString("ru-RU"),
      createdAt: new Date().toISOString(),
      status: "new",
      userEmail: user?.email || "",
      customer: {
        name: String(customer.name || user?.name || ""),
        company: String(customer.company || ""),
        inn: String(customer.inn || ""),
        kpp: String(customer.kpp || ""),
        phone: customerPhone,
        email: String(customer.email || user?.email || ""),
        city: String(customer.city || ""),
        address: String(customer.address || user?.address || ""),
        legalAddress: String(customer.legalAddress || ""),
        delivery: String(customer.delivery || ""),
        packaging: String(customer.packaging || ""),
        layoutFileName: String(customer.layoutFileName || ""),
        comment: String(customer.comment || ""),
      },
      items: pricing.items,
      subtotal: pricing.subtotal,
      discountPercent: pricing.discountPercent,
      discountAmount: pricing.discountAmount,
      total: pricing.total,
      clientTotal: pricing.clientTotal,
      promo: String(data.promo || ""),
      source: String(data.source || "site"),
      ...(idempotencyKey && idempotencyScope ? { idempotencyKey, idempotencyScope } : {}),
    };

    store.orders = [record, ...store.orders];
    if (user?.email && store.users[user.email]) {
      const existing = store.users[user.email];
      const address = String(record.customer.address || "").trim();
      const primaryCompany = {
        name: record.customer.company || existing.company || "",
        inn: record.customer.inn || existing.inn || "",
        kpp: record.customer.kpp || existing.kpp || "",
        legalAddress: record.customer.legalAddress || existing.legalAddress || "",
      };
      const seenCompanies = new Set();
      const companies = [primaryCompany, ...(existing.companies || [])]
        .filter((company) => company?.name || company?.inn)
        .filter((company) => {
          const key = company.inn || String(company.name || "").toLowerCase();
          if (seenCompanies.has(key)) return false;
          seenCompanies.add(key);
          return true;
        })
        .slice(0, 10);
      store.users[user.email] = {
        ...existing,
        name: existing.name || record.customer.name,
        company: record.customer.company || existing.company || "",
        inn: record.customer.inn || existing.inn || "",
        kpp: record.customer.kpp || existing.kpp || "",
        legalAddress: record.customer.legalAddress || existing.legalAddress || "",
        phone: record.customer.phone || existing.phone || "",
        email: existing.email,
        city: record.customer.city || existing.city || "",
        address: address || existing.address || "",
        addresses: uniqueNonEmpty([address, ...(existing.addresses || [])]).slice(0, 10),
        delivery: record.customer.delivery || existing.delivery || "",
        packaging: record.customer.packaging || existing.packaging || "",
        layoutFiles: uniqueNonEmpty([record.customer.layoutFileName, ...(existing.layoutFiles || [])]).slice(0, 20),
        orderComment: record.customer.comment || existing.orderComment || "",
        orderComments: uniqueNonEmpty([record.customer.comment, ...(existing.orderComments || [])]).slice(0, 10),
        companies,
        lastCustomer: record.customer,
        updatedAt: new Date().toISOString(),
      };
    }
    await saveStore(store);
    sendJson(res, 201, { order: record });
  } catch (error) {
    handleError(res, error, req);
  }
};
