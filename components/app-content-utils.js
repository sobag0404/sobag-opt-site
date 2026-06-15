(() => {
  "use strict";

  const { escapeHtml } = window.SobagAppUtils || {};
  const {
    defaultSiteContent,
    actualItems,
    PUBLIC_API_CACHE_PREFIX,
    PUBLIC_API_CACHE_TTL_MS,
    PUBLIC_API_CACHE_MAX_ENTRIES
  } = window.SobagAppData || {};
  if (!window.SobagAppUtils) throw new Error("components/app-utils.js must load before app-content-utils.js");
  if (!window.SobagAppData) throw new Error("components/app-data.js must load before app-content-utils.js");

function normalizeCatalogList(items, fallbackItems, options = {}) {
  const source = Array.isArray(items) && items.length ? items : fallbackItems;
  return source
    .map((item = {}, index) => {
      const fallback = fallbackItems[index] || fallbackItems[0] || {};
      const prepared = {
        name: String(item.name || fallback.name || "").trim(),
        icon: String(item.icon || fallback.icon || "tag").trim(),
        image: String(item.image || "").trim(),
      };
      const description = item.description || fallback.description || "";
      if (options.description || description) {
        prepared.description = String(description).trim();
      }
      return prepared;
    })
    .filter((item) => item.name);
}

function replacePrototypeImage(image, index = 0) {
  const prepared = String(image || "").trim();
  if (!prepared.includes("assets/hero-products-")) return prepared;
  return actualItems[index % actualItems.length]?.image || "assets/production-workshop-1.png";
}

function normalizeActualSlides(items) {
  const source = Array.isArray(items) && items.length ? items : defaultSiteContent.actualSlides;
  return source
    .map((item = {}, index) => {
      const fallback = defaultSiteContent.actualSlides[index % defaultSiteContent.actualSlides.length] || {};
      return {
        label: String(item.label || fallback.label || "").trim(),
        type: item.type === "collection" ? "collection" : "holiday",
        image: replacePrototypeImage(item.image || fallback.image || "assets/production-workshop-1.png", index),
      };
    })
    .filter((item) => item.label);
}

function normalizeSiteContent(content = {}) {
  const heroImages = Array.isArray(content.heroImages) && content.heroImages.length ? content.heroImages : defaultSiteContent.heroImages;
  const migrated = { ...content };
  const benefitReplacements = {
    heroSpecOneText: ["минимальная сумма корзины", defaultSiteContent.heroSpecOneText],
    heroSpecTwoText: [["временный срок запуска партии", "временный запуск партии"], defaultSiteContent.heroSpecTwoText],
    heroSpecThreeValue: ["18%", defaultSiteContent.heroSpecThreeValue],
    heroSpecThreeText: ["максимальная скидка по шкале", defaultSiteContent.heroSpecThreeText],
    benefitOneTitle: ["Скидки по количеству", defaultSiteContent.benefitOneTitle],
    benefitOneText: ["Чем больше штук в корзине, тем ниже цена. Уровень считается сразу.", defaultSiteContent.benefitOneText],
    benefitTwoText: ["Печать, пошив, упаковка и подготовка к отгрузке в одном процессе.", defaultSiteContent.benefitTwoText],
    benefitThreeTitle: ["Под маркетплейсы", defaultSiteContent.benefitThreeTitle],
    benefitThreeText: ["Штрихкоды, упаковка, комплектация и поставки партиями.", defaultSiteContent.benefitThreeText],
    benefitFourTitle: ["Корзина без оплаты", defaultSiteContent.benefitFourTitle],
    benefitFourText: ["Покупатель собирает корзину, менеджер уточняет наличие и условия.", defaultSiteContent.benefitFourText],
    catalogBackButton: [["категории", "Категории"], defaultSiteContent.catalogBackButton],
    marketplaceOneText: ["Ссылка будет добавлена после подключения магазина.", defaultSiteContent.marketplaceOneText],
    marketplaceThreeText: ["Позже добавим прямую ссылку на магазин.", defaultSiteContent.marketplaceThreeText],
    businessPageLead: [
      [
        "Оптовые условия для магазинов, селлеров и корпоративных клиентов: скидка от суммы заказа, производство в одном месте и сопровождение менеджера.",
        "Рабочие условия для магазинов, селлеров и корпоративных клиентов: скидка от суммы заказа, производство в одном месте и сопровождение менеджера.",
      ],
      defaultSiteContent.businessPageLead,
    ],
    businessMinimumText: [
      "Стартовая сумма корзины для оформления оптовой заявки — 30 000 ₽. До этой суммы корзину можно собрать и сохранить, но оформить заказ нельзя.",
      defaultSiteContent.businessMinimumText,
    ],
    businessDiscountText: [
      "Скидка пересчитывается автоматически по общей сумме корзины. Чем больше партия, тем ниже цена за единицу товара.",
      defaultSiteContent.businessDiscountText,
    ],
    businessProductionText: [
      [
        "Печать, пошив, упаковка, маркировка и подготовка к отгрузке выполняются в одном процессе, чтобы партия была готова к продаже.",
        "Печать, раскрой, пошив, упаковка, маркировка и подготовка к отгрузке выполняются в одном процессе. Стандартная партия запускается после согласования состава заказа и материалов.",
      ],
      defaultSiteContent.businessProductionText,
    ],
    businessManagerText: [
      "После отправки корзины менеджер уточняет наличие, сроки, упаковку, город отгрузки и помогает довести заказ до запуска.",
      defaultSiteContent.businessManagerText,
    ],
    businessDocumentsText: [
      "Реквизиты, счета, макеты, штрихкоды и требования к упаковке можно согласовать до запуска партии. Подробные условия будут уточняться в договоре или счете.",
      defaultSiteContent.businessDocumentsText,
    ],
    aboutPageTitle: ["О компании", defaultSiteContent.aboutPageTitle],
    aboutPageLead: [
      [
        "Sobag Opt — B2B-витрина для оптовых продаж текстиля с принтами и заказов на производство под ваш макет.",
        "Sobag Opt — B2B-каталог для оптовых продаж текстиля с принтами и заказов на производство под макет покупателя.",
      ],
      defaultSiteContent.aboutPageLead,
    ],
    aboutPageText: [
      [
        "Здесь позже появится история компании, описание производства, сильные стороны команды и условия работы с оптовыми покупателями.",
        "Мы работаем с магазинами, селлерами и корпоративными клиентами: помогаем подобрать товар, собрать партию, рассчитать скидку, подготовить упаковку и передать заказ в производство.",
      ],
      defaultSiteContent.aboutPageText,
    ],
    aboutPageProductionTitle: ["Производство и опт", defaultSiteContent.aboutPageProductionTitle],
    aboutPageProductionText: [
      [
        "Мы готовим партии для маркетплейсов, магазинов и корпоративных клиентов: печать, пошив, комплектация и подготовка к отгрузке.",
        "Производство включает печать, раскрой, пошив, контроль качества, упаковку, маркировку и подготовку к отгрузке. Один принт можно выпускать в разных изделиях, размерах и материалах.",
      ],
      defaultSiteContent.aboutPageProductionText,
    ],
    contactsPageLead: [
      [
        "Здесь будут контакты отдела опта, адрес производства и карта.",
        "Контакты отдела опта: телефон, почта, адрес производства и карта.",
      ],
      defaultSiteContent.contactsPageLead,
    ],
    contactsAddress: [["Москва, Новоданиловская набережная, 4", "Москва, ул. Текстильщиков, 12, стр. 2"], defaultSiteContent.contactsAddress],
    contactsSchedule: ["Пн-Пт, 10:00-18:00", defaultSiteContent.contactsSchedule],
    footerText: [
      [
        "B2B-сайт для оптовых продаж текстиля с принтами.",
        "B2B-каталог для оптовых заказов текстиля с принтами, производства под макет и поставок партиями.",
      ],
      defaultSiteContent.footerText,
    ],
    footerEmail: ["opt@sobag-shop.ru", defaultSiteContent.footerEmail],
    footerPhone: ["+7 900 000-00-00", defaultSiteContent.footerPhone],
    footerAddress: [["Адрес производства будет уточнен", "Адрес: Москва, ул. Текстильщиков, 12, стр. 2"], defaultSiteContent.footerAddress],
  };
  Object.entries(benefitReplacements).forEach(([key, [oldValue, newValue]]) => {
    const oldValues = Array.isArray(oldValue) ? oldValue : [oldValue];
    if (oldValues.includes(migrated[key])) migrated[key] = newValue;
  });
  return {
    ...defaultSiteContent,
    ...migrated,
    heroImages: [0, 1, 2].map((index) => replacePrototypeImage(heroImages[index] || defaultSiteContent.heroImages[index], index)),
    catalogCategories: normalizeCatalogList(migrated.catalogCategories, defaultSiteContent.catalogCategories, { description: true }),
    catalogCollections: normalizeCatalogList(migrated.catalogCollections, defaultSiteContent.catalogCollections),
    catalogHolidays: normalizeCatalogList(migrated.catalogHolidays, defaultSiteContent.catalogHolidays),
    actualSlides: normalizeActualSlides(migrated.actualSlides),
  };
}

function brandNameHtml(name) {
  const parts = String(name || defaultSiteContent.brandName).trim().split(/\s+/);
  if (parts.length < 2) return escapeHtml(parts[0] || defaultSiteContent.brandName);
  const last = parts.pop();
  return `${escapeHtml(parts.join(" "))} <b>${escapeHtml(last)}</b>`;
}

function renderTextField(field, content) {
  const value = escapeHtml(content[field.key] ?? defaultSiteContent[field.key] ?? "");
  const wide = field.wide || field.multiline ? " admin-content-grid__wide" : "";
  if (field.multiline) {
    return `
      <label class="${wide.trim()}">
        ${field.label}
        <textarea name="${field.key}">${value}</textarea>
      </label>
    `;
  }
  return `
    <label class="${wide.trim()}">
      ${field.label}
      <input name="${field.key}" type="text" value="${value}" />
    </label>
  `;
}

function imageAttrs(width, height, loading = "lazy", fetchPriority = "") {
  const priority = fetchPriority ? ` fetchpriority="${fetchPriority}"` : "";
  return `width="${width}" height="${height}" loading="${loading}" decoding="async"${priority}`;
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function pulseNode(node, className = "is-pop") {
  if (!node || prefersReducedMotion()) return;
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
}

function setTextWithPop(node, value) {
  if (!node) return;
  const next = String(value);
  const changed = node.dataset.motionValue !== undefined && node.dataset.motionValue !== next;
  node.textContent = next;
  node.dataset.motionValue = next;
  if (changed) pulseNode(node);
}

function routeKey(pathname = window.location.pathname) {
  const cleanPath = pathname.replace(/\/+$/, "");
  const lastPart = cleanPath.split("/").filter(Boolean).pop() || "index";
  return lastPart.replace(/\.html$/i, "") || "index";
}

function isPublicApiCacheable(path, options = {}) {
  if ((options.method || "GET").toUpperCase() !== "GET" || options.body) return false;
  return /^\/api\/catalog-(query|detail)\?/.test(String(path || ""));
}

function publicApiCacheKey(path) {
  return `${PUBLIC_API_CACHE_PREFIX}${path}`;
}

function getPublicApiCache(path) {
  if (!isPublicApiCacheable(path)) return null;
  try {
    const cached = JSON.parse(localStorage.getItem(publicApiCacheKey(path)) || "null");
    if (!cached || typeof cached !== "object") return null;
    if (Date.now() - Number(cached.savedAt || 0) > PUBLIC_API_CACHE_TTL_MS) return null;
    return cached.data || null;
  } catch {
    return null;
  }
}

function trimPublicApiCache() {
  try {
    const entries = Object.keys(localStorage)
      .filter((key) => key.startsWith(PUBLIC_API_CACHE_PREFIX))
      .map((key) => {
        const savedAt = Number(JSON.parse(localStorage.getItem(key) || "{}").savedAt || 0);
        return { key, savedAt };
      })
      .sort((left, right) => right.savedAt - left.savedAt);
    entries.slice(PUBLIC_API_CACHE_MAX_ENTRIES).forEach((entry) => localStorage.removeItem(entry.key));
  } catch {
    // Cache cleanup must never affect catalog rendering.
  }
}

function rememberPublicApiCache(path, options = {}, data) {
  if (!isPublicApiCacheable(path, options) || !data) return;
  try {
    localStorage.setItem(publicApiCacheKey(path), JSON.stringify({ savedAt: Date.now(), data }));
    trimPublicApiCache();
  } catch {
    // Browser storage can be full or disabled; the network path remains authoritative.
  }
}

function currentUserEmail() {
  return typeof window.SobagCurrentUserEmail === "function" ? window.SobagCurrentUserEmail() : "";
}

function orderStatusLabel(status) {
  if (status === "new") return "Новый";
  if (status === "processing") return "В работе";
  if (status === "waiting") return "Ждет клиента";
  if (status === "production") return "В производстве";
  if (status === "ready") return "Готов к отгрузке";
  if (status === "shipped") return "Отгружен";
  if (status === "done") return "Выполнен";
  if (status === "canceled") return "Отменен";
  return "Новый";
}

const orderStatusOptions = [
  ["new", "Новый"],
  ["processing", "В работе"],
  ["waiting", "Ждет клиента"],
  ["production", "В производстве"],
  ["ready", "Готов к отгрузке"],
  ["shipped", "Отгружен"],
  ["done", "Выполнен"],
  ["canceled", "Отменен"],
];

function orderHistoryEntry(order, patch, actor = "") {
  const changes = [];
  if (patch.status && patch.status !== order.status) {
    changes.push(`Статус: ${orderStatusLabel(order.status)} -> ${orderStatusLabel(patch.status)}`);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "managerEmail") && patch.managerEmail !== (order.managerEmail || "")) {
    changes.push(`Менеджер: ${patch.managerName || patch.managerEmail || "не назначен"}`);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "managerNote") && patch.managerNote !== (order.managerNote || "")) {
    changes.push("Комментарий менеджера обновлен");
  }
  if (!changes.length) return null;
  return {
    id: `H-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    actor: actor || currentUserEmail() || "local",
    summary: changes.join("; "),
  };
}

function normalizeOrderCommentText(value, limit = 1200) {
  return String(value || "").trim().slice(0, limit);
}

function normalizeOrderThread(items, includeInternal = false) {
  return (Array.isArray(items) ? items : [])
    .map((entry) => ({
      id: String(entry?.id || `CRM-${Date.now().toString(36)}`).slice(0, 80),
      at: String(entry?.at || new Date().toISOString()).slice(0, 40),
      actor: normalizeOrderCommentText(entry?.actor || "", 120),
      role: normalizeOrderCommentText(entry?.role || "buyer", 40),
      visibility: entry?.visibility === "internal" ? "internal" : "customer",
      text: normalizeOrderCommentText(entry?.text || ""),
    }))
    .filter((entry) => entry.text && (includeInternal || entry.visibility !== "internal"))
    .slice(0, 200);
}

function orderThreadEntry({ text, visibility = "customer", actor = "", role = "buyer" }) {
  const prepared = normalizeOrderCommentText(text);
  if (!prepared) return null;
  return {
    id: `CRM-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    actor: normalizeOrderCommentText(actor || currentUserEmail() || "local", 120),
    role: normalizeOrderCommentText(role, 40),
    visibility: visibility === "internal" ? "internal" : "customer",
    text: prepared,
  };
}

  window.SobagContentUtils = {
    normalizeCatalogList,
    replacePrototypeImage,
    normalizeActualSlides,
    normalizeSiteContent,
    routeKey,
    isPublicApiCacheable,
    publicApiCacheKey,
    getPublicApiCache,
    trimPublicApiCache,
    rememberPublicApiCache,
    brandNameHtml,
    renderTextField,
    imageAttrs,
    prefersReducedMotion,
    pulseNode,
    setTextWithPop,
    orderStatusLabel,
    orderStatusOptions,
    orderHistoryEntry,
    normalizeOrderCommentText,
    normalizeOrderThread,
    orderThreadEntry
  };
})();
