const { currentUser, normalizePhone } = require("./_lib/auth");
const { handleError, methodNotAllowed, readJson, sendJson } = require("./_lib/http");
const { saveStore } = require("./_lib/store");

function cleanText(value, limit = 500) {
  return String(value || "").trim().slice(0, limit);
}

function validEmail(value) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") return methodNotAllowed(res);

    const data = await readJson(req);
    const { user, store } = await currentUser(req);
    const product = cleanText(data.product, 120);
    const quantity = Math.max(0, Math.round(Number(data.quantity || 0)));
    const name = cleanText(data.name || user?.name, 160);
    const contact = cleanText(data.contact, 180);
    const email = cleanText(data.email || user?.email, 180).toLowerCase();
    const comment = cleanText(data.comment, 1200);
    const layoutReference = cleanText(data.layoutReference, 500);
    const phone = normalizePhone(data.phone || contact);

    if (!product) return sendJson(res, 400, { error: "missing_product", message: "Выберите изделие." });
    if (quantity < 1) return sendJson(res, 400, { error: "missing_quantity", message: "Укажите тираж." });
    if (!contact && !phone && !email) return sendJson(res, 400, { error: "missing_contact", message: "Укажите контакт для связи." });
    if (!validEmail(email)) return sendJson(res, 400, { error: "invalid_email", message: "Проверьте формат email." });

    const now = new Date().toISOString();
    const id = `BR-${Date.now().toString().slice(-6)}`;
    const brief = {
      id,
      type: "custom_print",
      source: "custom",
      status: "new",
      createdAt: now,
      userEmail: user?.email || email || "",
      product,
      quantity,
      name,
      contact,
      phone,
      email,
      layoutReference,
      comment,
    };
    const record = {
      id,
      date: new Date().toLocaleString("ru-RU"),
      createdAt: now,
      status: "new",
      userEmail: brief.userEmail,
      requestType: "custom_print",
      source: "custom_brief",
      customer: {
        name,
        company: "",
        inn: "",
        kpp: "",
        phone,
        email,
        city: "",
        address: "",
        legalAddress: "",
        delivery: "",
        packaging: "",
        layoutFileName: layoutReference,
        comment: [contact ? `Контакт: ${contact}` : "", comment].filter(Boolean).join("\n"),
      },
      customBrief: brief,
      items: [],
      total: 0,
      promo: "",
      crmThread: [
        {
          id: `CRM-${Date.now().toString(36)}`,
          at: now,
          actor: name || email || contact || "Покупатель",
          role: "buyer",
          visibility: "customer",
          text: `Заявка на изделие с принтом: ${product}, тираж ${quantity} шт.${layoutReference ? ` Макет/ссылка: ${layoutReference}.` : ""}${comment ? ` Комментарий: ${comment}` : ""}`,
        },
      ],
    };

    store.briefs = [brief, ...(store.briefs || [])].slice(0, 500);
    store.orders = [record, ...(store.orders || [])].slice(0, 1000);
    await saveStore(store);
    return sendJson(res, 201, { brief, order: record });
  } catch (error) {
    handleError(res, error, req);
  }
};
