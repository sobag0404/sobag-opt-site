const { currentUser, normalizePhone } = require("./_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("./_lib/http");
const { saveStore } = require("./_lib/store");

function sanitizeLine(line) {
  return {
    key: String(line.key || ""),
    productId: String(line.productId || ""),
    productName: String(line.productName || ""),
    productImage: String(line.productImage || ""),
    qty: Math.max(1, Number(line.qty || 1)),
    variant: {
      sku: String(line.variant?.sku || ""),
      name: String(line.variant?.name || ""),
      type: String(line.variant?.type || ""),
      size: String(line.variant?.size || ""),
      material: String(line.variant?.material || ""),
      price: Number(line.variant?.price || 0),
    },
  };
}

function uniqueNonEmpty(items) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
}

function publicOrder(order) {
  return {
    ...order,
    crmThread: (Array.isArray(order.crmThread) ? order.crmThread : []).filter((entry) => entry?.visibility !== "internal"),
  };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "PATCH") {
      const data = await readJson(req);
      const { user, store } = await currentUser(req);
      if (!user) return sendJson(res, 401, { error: "unauthorized", message: "Нужно войти в аккаунт." });
      const text = String(data.commentText || "").trim().slice(0, 1200);
      if (!text) return sendJson(res, 400, { error: "empty_comment", message: "Напишите сообщение по заказу." });
      let updated = null;
      store.orders = store.orders.map((order) => {
        const customerEmail = String(order.customer?.email || order.userEmail || "").toLowerCase();
        if (order.id !== data.id || customerEmail !== String(user.email || "").toLowerCase()) return order;
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
    const { user, store } = await currentUser(req);
    const items = Array.isArray(data.items) ? data.items.map(sanitizeLine).filter((line) => line.variant.sku) : [];
    const total = Number(data.total || 0);
    const customer = data.customer || {};

    if (!items.length) return sendJson(res, 400, { error: "empty_order", message: "В заказе нет товаров." });
    const customerPhone = normalizePhone(customer.phone || user?.phone || "");
    if (!customerPhone) return sendJson(res, 400, { error: "missing_phone", message: "Укажите телефон." });

    const record = {
      id: `SO-${Date.now().toString().slice(-6)}`,
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
      items,
      total,
      promo: String(data.promo || ""),
      source: String(data.source || "site"),
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
