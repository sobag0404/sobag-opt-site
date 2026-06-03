const MIN_CART_TOTAL = 30000;
const CURRENT_USER_KEY = "sobag.currentUser";
const USERS_KEY = "sobag.users";
const ORDERS_KEY = "sobag.orders.v1";
const THEME_KEY = "sobag.theme.v1";
const SAVED_CARTS_GUEST_KEY = "sobag.savedCarts.guest";
const SAVED_CARTS_PREFIX = "sobag.savedCarts.";
function getCartKey() {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return user ? `sobag.cart.${user}` : "sobag.cart.guest";
}
function getSavedCartsKey() {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return user ? `${SAVED_CARTS_PREFIX}${user}` : SAVED_CARTS_GUEST_KEY;
}
const PROTOTYPE_PRODUCT_IDS = new Set([
  "aurora-cats",
  "pixel-quest",
  "winter-gift",
  "brand-line",
  "army-supply",
  "cooler-love",
  "meme-cloud",
  "march-bloom",
  "teacher-pattern",
  "space-luggage",
  "anime-cover",
  "shoe-cyber",
  "shoe-flower",
  "cooler-brand",
  "cooler-newyear",
  "plaid-animal",
  "plaid-meme",
  "name-stars",
]);

const quantityTiers = [
  { qty: 30, discount: 3 },
  { qty: 70, discount: 7 },
  { qty: 150, discount: 12 },
  { qty: 300, discount: 18 },
];
const basketDiscountTiers = [
  { amount: MIN_CART_TOTAL, discount: 5 },
  { amount: 70000, discount: 7 },
  { amount: 150000, discount: 12 },
  { amount: 300000, discount: 18 },
];

const promoCodes = {
  SOBAG5: 5,
  OPT10: 10,
};

const CART_CONTENT_KEY = "sobag.siteContent.v1";
const defaultCartContent = {
  brandName: "Sobag Opt",
  brandLogo: "",
  toplinePrimary: "Оптовые партии от 30 000 ₽",
  toplineSecondary: "Печать и пошив под заказ",
  toplineTertiary: "Каталог для селлеров и магазинов",
  navCatalogButton: "каталог",
  navBusinessButton: "условия для бизнеса",
  navMarketplacesButton: "мы на маркетплейсах",
  navAboutButton: "о компании",
  navContactsButton: "контакты",
  cartButton: "корзина",
  footerBrand: "SOBAG OPT",
  footerText: "Тестовый B2B-каталог для оптовых заказов текстиля с принтами, производства под макет и поставок партиями.",
  footerSalesLabel: "Отдел опта",
  footerEmail: "opt@sobag-shop.online",
  footerPhone: "+7 900 123-45-67",
  footerCompanyTitle: "Компания",
  footerCompanyLinks: "О компании|Контакты|Политика конфиденциальности|Пользовательское соглашение",
  footerClientsTitle: "Клиентам",
  footerClientsLinks: "Как оформить заказ|Доставка товара|Оплата товара|Возврат товара|Изделия с вашим принтом",
  footerPartnersTitle: "Партнерам",
  footerPartnersLinks: "Условия для бизнеса|Мы на маркетплейсах|Поддержка селлеров|Оптовые партии",
  footerContactsTitle: "Контакты",
  footerAddress: "Тестовый адрес: Москва, ул. Текстильщиков, 12, стр. 2",
  cartPageTitle: "Корзина",
  cartPageBackButton: "вернуться в каталог",
  cartPageEmptyTitle: "Корзина пока пустая",
  cartPageEmptyText: "Добавьте товары из каталога, чтобы увидеть расчет оптовой скидки.",
  cartDiscountTitle: "Скидка",
  cartPromoTitle: "Промокод",
  cartPromoPlaceholder: "Введите промокод",
  cartPromoButton: "применить",
  cartCheckoutButton: "оформить заказ",
  checkoutTitle: "Контакты покупателя",
  checkoutSubmitButton: "отправить заказ",
};

const state = {
  cart: new Map(cleanCartEntries(JSON.parse(localStorage.getItem(getCartKey()) || "[]"))),
  promo: "",
};
let cartServerReady = !localStorage.getItem(CURRENT_USER_KEY);

const nodes = {
  count: document.querySelector("#cartPageCount"),
  empty: document.querySelector("#cartPageEmpty"),
  items: document.querySelector("#cartPageItems"),
  scale: document.querySelector("#cartDiscountScale"),
  discountHint: document.querySelector("#cartDiscountHint"),
  subtotal: document.querySelector("#cartSubtotal"),
  qtyDiscount: document.querySelector("#cartQtyDiscount"),
  promoDiscount: document.querySelector("#cartPromoDiscount"),
  grandTotal: document.querySelector("#cartGrandTotal"),
  minHint: document.querySelector("#cartPageMinHint"),
  checkoutButton: document.querySelector("#checkoutButton"),
  checkoutModal: document.querySelector("#checkoutModal"),
  promoInput: document.querySelector("#promoInput"),
  promoHint: document.querySelector("#promoHint"),
  toast: document.querySelector("#toast"),
};

let lastFocusedElement = null;
const focusableSelector =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function formatMoney(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function buttonLabel(text) {
  return String(text || "").trim().toLocaleUpperCase("ru-RU");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function imageAttrs(width, height, loading = "lazy") {
  return `width="${width}" height="${height}" loading="${loading}" decoding="async"`;
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

function navigateWithinSite(url) {
  const targetUrl = new URL(url, window.location.href);
  if (targetUrl.origin !== window.location.origin) {
    window.location.href = targetUrl.href;
    return;
  }
  if (routeKey(targetUrl.pathname) === routeKey(window.location.pathname)) {
    if (targetUrl.hash) document.querySelector(targetUrl.hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  window.location.href = targetUrl.href;
}

function ensureFieldError(field) {
  if (!field) return null;
  const form = field.closest("form");
  const name = field.name || field.id || "field";
  const id = `${form?.id || "form"}-${name}-error`;
  let error = form?.querySelector(`#${CSS.escape(id)}`);
  if (!error) {
    error = document.createElement("span");
    error.className = "field-error";
    error.id = id;
    error.setAttribute("role", "alert");
    const placementTarget = field.type === "checkbox" && field.closest("label") ? field.closest("label") : field;
    placementTarget.insertAdjacentElement("afterend", error);
  }
  field.setAttribute("aria-describedby", id);
  return error;
}

function clearFormErrors(form) {
  if (!form) return;
  form.querySelectorAll("[aria-invalid='true']").forEach((field) => field.removeAttribute("aria-invalid"));
  form.querySelectorAll(".field-error").forEach((error) => {
    error.textContent = "";
    error.hidden = true;
  });
}

function setFieldError(form, name, message) {
  const field = form?.elements?.[name];
  if (!field) return false;
  const error = ensureFieldError(field);
  field.setAttribute("aria-invalid", "true");
  if (error) {
    error.textContent = message;
    error.hidden = false;
  }
  field.classList.remove("is-shaking");
  void field.offsetWidth;
  field.classList.add("is-shaking");
  field.focus();
  return false;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    credentials: "same-origin",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Backend недоступен.");
    error.status = response.status;
    error.code = data.error;
    throw error;
  }
  return data;
}

function isBackendUnavailable(error) {
  return error?.status === 503 || error?.code === "storage_not_configured" || error instanceof TypeError;
}

function initFormEnhancements(root = document) {
  root.querySelectorAll('input[name="name"]').forEach((field) => field.setAttribute("autocomplete", "name"));
  root.querySelectorAll('input[name="email"]').forEach((field) => field.setAttribute("autocomplete", "email"));
  root.querySelectorAll('input[name="phone"]').forEach((field) => field.setAttribute("autocomplete", "tel"));
}

function trapCheckoutFocus(event) {
  if (!nodes.checkoutModal?.classList.contains("is-visible") || event.key !== "Tab") return;
  const focusable = [...nodes.checkoutModal.querySelectorAll(focusableSelector)].filter((node) => node.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function getSiteContent() {
  try {
    return { ...defaultCartContent, ...(JSON.parse(localStorage.getItem(CART_CONTENT_KEY) || "null") || {}) };
  } catch {
    return { ...defaultCartContent };
  }
}

async function loadServerCartContent() {
  try {
    const data = await apiRequest("/api/content");
    if (!data.content || typeof data.content !== "object") return false;
    if (data.source === "server") localStorage.setItem(CART_CONTENT_KEY, JSON.stringify({ ...defaultCartContent, ...data.content }));
    renderCartContent();
    return true;
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 404) console.warn(error);
    return false;
  }
}

function getCurrentUserProfile() {
  const email = localStorage.getItem(CURRENT_USER_KEY);
  if (!email) return null;
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "{}")[email] || null;
  } catch {
    return null;
  }
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveOrderRecord(order) {
  const userKey = localStorage.getItem(CURRENT_USER_KEY) || "";
  const users = getUsers();
  const customer = order.customer || {};
  const record = {
    status: "new",
    source: "cart",
    userEmail: userKey || customer.email || "",
    ...order,
  };
  localStorage.setItem(ORDERS_KEY, JSON.stringify([record, ...getOrders()]));
  if (userKey && users[userKey]) {
    users[userKey].orders = [record, ...(users[userKey].orders || [])];
    users[userKey].company = customer.company || users[userKey].company || "";
    users[userKey].inn = customer.inn || users[userKey].inn || "";
    users[userKey].phone = customer.phone || users[userKey].phone || "";
    users[userKey].city = customer.city || users[userKey].city || "";
    users[userKey].address = customer.address || users[userKey].address || "";
    users[userKey].addresses = [...new Set([customer.address, ...(users[userKey].addresses || [])].filter(Boolean))].slice(0, 10);
    users[userKey].lastCustomer = customer;
    saveUsers(users);
  }
  return record;
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}

function footerLinkUrl(label = "") {
  const prepared = String(label).trim().toLocaleLowerCase("ru-RU");
  if (prepared.includes("о компании")) return "about.html";
  if (prepared.includes("контакт")) return "contacts.html";
  if (prepared.includes("маркетплейс")) return "marketplaces.html";
  if (prepared.includes("свой") || prepared.includes("принт")) return "custom.html";
  if (prepared.includes("услов")) return "business.html";
  if (prepared.includes("политик") || prepared.includes("персональ")) return "assets/legal/personal-data-consent.pdf";
  if (prepared.includes("соглаш")) return "terms.html";
  return "#";
}

function renderFooterLinks(selector, value) {
  document.querySelectorAll(selector).forEach((list) => {
    list.innerHTML = String(value || "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const href = footerLinkUrl(item);
        const externalAttrs = href.endsWith(".pdf") || href === "terms.html" ? ' target="_blank" rel="noopener"' : "";
        return `<a href="${href}"${externalAttrs}>${escapeHtml(item)}</a>`;
      })
      .join("");
  });
}

function setButtonText(selector, value) {
  document.querySelectorAll(selector).forEach((button) => {
    const icon = button.querySelector("i")?.outerHTML || "";
    button.innerHTML = `${icon}${buttonLabel(value)}`;
  });
}

function applyTheme(theme) {
  const isNight = theme === "night";
  document.body.classList.toggle("theme-night", isNight);
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.setAttribute("aria-pressed", String(isNight));
    button.innerHTML = `<span>${isNight ? "дневная тема" : "ночная тема"}</span><b class="theme-toggle__track" aria-hidden="true"></b>`;
  });
  if (window.lucide) window.lucide.createIcons();
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains("theme-night") ? "default" : "night";
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
}

function brandNameHtml(name) {
  const parts = String(name || defaultCartContent.brandName).trim().split(/\s+/);
  if (parts.length < 2) return escapeHtml(parts[0] || defaultCartContent.brandName);
  const last = parts.pop();
  return `${escapeHtml(parts.join(" "))} <b>${escapeHtml(last)}</b>`;
}

function renderCartContent() {
  const content = getSiteContent();
  setText("[data-top-business]", buttonLabel(content.navBusinessButton));
  setText("[data-top-marketplaces]", buttonLabel(content.navMarketplacesButton));
  setText("[data-top-about]", buttonLabel(content.navAboutButton));
  setText("[data-top-contacts]", buttonLabel(content.navContactsButton));
  const brandMark = document.querySelector(".brand__mark");
  const brandName = document.querySelector(".brand__name");
  if (brandMark) {
    brandMark.innerHTML = content.brandLogo
      ? `<img src="${content.brandLogo}" alt="" width="54" height="54" decoding="async" />`
      : String(content.brandName || "S").trim().charAt(0);
  }
  if (brandName) brandName.innerHTML = brandNameHtml(content.brandName);
  setButtonText(".catalog-button", content.navCatalogButton);
  setText("#cartPageLabel", buttonLabel(content.cartButton));
  setText(".cart-page h1", content.cartPageTitle);
  setButtonText(".section-head .ghost-button", content.cartPageBackButton);
  setText("#cartPageEmpty strong", content.cartPageEmptyTitle);
  setText("#cartPageEmpty span", content.cartPageEmptyText);
  setText(".cart-summary__block:first-child h2", content.cartDiscountTitle);
  setText(".cart-summary__block:nth-child(2) h2", content.cartPromoTitle);
  if (nodes.promoInput) nodes.promoInput.placeholder = content.cartPromoPlaceholder;
  setButtonText(".promo-form button", content.cartPromoButton);
  setButtonText("#checkoutButton", content.cartCheckoutButton);
  setText("#checkoutTitle", content.checkoutTitle);
  setButtonText(".checkout-form .primary-button", content.checkoutSubmitButton);
  const footer = document.querySelector(".footer");
  if (footer) {
    setText("[data-footer-brand]", content.footerBrand);
    setText("[data-footer-text]", content.footerText);
    setText("[data-footer-sales-label]", content.footerSalesLabel);
    setText("[data-footer-company-title]", content.footerCompanyTitle);
    setText("[data-footer-clients-title]", content.footerClientsTitle);
    setText("[data-footer-partners-title]", content.footerPartnersTitle);
    setText("[data-footer-contacts-title]", content.footerContactsTitle);
    setText("[data-footer-address]", content.footerAddress);
    renderFooterLinks("[data-footer-company-links]", content.footerCompanyLinks);
    renderFooterLinks("[data-footer-clients-links]", content.footerClientsLinks);
    renderFooterLinks("[data-footer-partners-links]", content.footerPartnersLinks);
    const emails = footer.querySelectorAll("[data-footer-email]");
    const phones = footer.querySelectorAll("[data-footer-phone]");
    emails.forEach((email) => {
      email.textContent = content.footerEmail;
      email.href = `mailto:${content.footerEmail}`;
    });
    phones.forEach((phone) => {
      phone.textContent = content.footerPhone;
      phone.href = `tel:${String(content.footerPhone).replace(/[^\d+]/g, "")}`;
    });
  }
}

function saveCart() {
  localStorage.setItem(getCartKey(), JSON.stringify([...state.cart.entries()]));
  if (cartServerReady) syncCartToBackend();
}

let cartSyncTimer = 0;
let savedCartsSyncTimer = 0;

function totalsFromCartEntries(entries) {
  const lines = cleanCartEntries(entries).map(([, line]) => line);
  const qty = lines.reduce((sum, line) => sum + Number(line.qty || 0), 0);
  const subtotal = lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.variant?.price || 0), 0);
  const discount = getBasketDiscount(subtotal);
  const total = Math.round(subtotal * (1 - discount / 100));
  return { qty, subtotal, discount, total };
}

function normalizeSavedCart(item) {
  const items = cleanCartEntries(item?.items || []);
  if (!items.length) return null;
  const totals = totalsFromCartEntries(items);
  return {
    id: String(item.id || `SC-${Date.now().toString(36)}`),
    title: String(item.title || "Сохраненная корзина").trim() || "Сохраненная корзина",
    createdAt: item.createdAt || item.updatedAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    date: item.date || new Date().toLocaleString("ru-RU"),
    items,
    ...totals,
  };
}

function getSavedCarts() {
  const raw = JSON.parse(localStorage.getItem(getSavedCartsKey()) || "[]");
  return (Array.isArray(raw) ? raw : []).map(normalizeSavedCart).filter(Boolean).slice(0, 50);
}

function mergeSavedCarts(serverCarts = [], localCarts = []) {
  const merged = new Map();
  [...serverCarts, ...localCarts].forEach((item) => {
    const normalized = normalizeSavedCart(item);
    if (!normalized) return;
    const existing = merged.get(normalized.id);
    if (!existing || new Date(normalized.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) merged.set(normalized.id, normalized);
  });
  return [...merged.values()].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 50);
}

function saveSavedCarts(carts, options = {}) {
  const normalized = (Array.isArray(carts) ? carts : []).map(normalizeSavedCart).filter(Boolean).slice(0, 50);
  localStorage.setItem(getSavedCartsKey(), JSON.stringify(normalized));
  const userKey = localStorage.getItem(CURRENT_USER_KEY);
  if (userKey) {
    const users = getUsers();
    if (users[userKey]) {
      users[userKey].savedCarts = normalized;
      saveUsers(users);
    }
  }
  if (options.sync !== false && cartServerReady) syncSavedCartsToBackend();
  return normalized;
}

function saveCurrentCartDraft(title = "") {
  const items = [...state.cart.entries()];
  if (!items.length) {
    showToast("Корзина пока пустая.");
    return null;
  }
  const now = new Date();
  const draft = normalizeSavedCart({
    id: `SC-${now.getTime().toString(36)}`,
    title: title || `Корзина от ${now.toLocaleDateString("ru-RU")}`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    date: now.toLocaleString("ru-RU"),
    items,
  });
  const saved = saveSavedCarts([draft, ...getSavedCarts()]);
  showToast("Черновик корзины сохранен.");
  return saved[0];
}

function syncCartToBackend() {
  if (!localStorage.getItem(CURRENT_USER_KEY)) return;
  window.clearTimeout(cartSyncTimer);
  const items = [...state.cart.entries()];
  cartSyncTimer = window.setTimeout(() => {
    apiRequest("/api/auth/me", { method: "PUT", body: { cartItems: items } }).catch((error) => {
      if (!isBackendUnavailable(error)) console.warn(error);
    });
  }, 250);
}

function syncSavedCartsToBackend() {
  if (!localStorage.getItem(CURRENT_USER_KEY)) return;
  window.clearTimeout(savedCartsSyncTimer);
  const savedCarts = getSavedCarts();
  savedCartsSyncTimer = window.setTimeout(() => {
    apiRequest("/api/auth/me", { method: "PUT", body: { savedCarts } }).catch((error) => {
      if (!isBackendUnavailable(error)) console.warn(error);
    });
  }, 250);
}

async function loadServerCart() {
  if (!localStorage.getItem(CURRENT_USER_KEY)) return false;
  try {
    const data = await apiRequest("/api/auth/me");
    const serverCart = cleanCartEntries(data.cartItems || []);
    const localCart = cleanCartEntries([...state.cart.entries()]);
    const merged = new Map(serverCart);
    localCart.forEach(([key, line]) => merged.set(key, line));
    state.cart = merged;
    localStorage.setItem(getCartKey(), JSON.stringify([...state.cart.entries()]));
    const mergedSavedCarts = mergeSavedCarts(data.savedCarts || [], getSavedCarts());
    saveSavedCarts(mergedSavedCarts, { sync: false });
    cartServerReady = true;
    syncCartToBackend();
    syncSavedCartsToBackend();
    renderCart();
    return true;
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 401) console.warn(error);
    cartServerReady = true;
    return false;
  }
}

function isPrototypeCartLine(line) {
  const productId = String(line?.productId || "");
  const sku = String(line?.variant?.sku || line?.variantSku || "");
  const image = String(line?.productImage || "");
  return PROTOTYPE_PRODUCT_IDS.has(productId) || sku.startsWith("SB-") || image.includes("assets/hero-products-");
}

function cleanCartEntries(entries) {
  return (Array.isArray(entries) ? entries : []).filter(([, line]) => !isPrototypeCartLine(line));
}

function getQuantityDiscount(qty) {
  return quantityTiers.reduce((current, tier) => (qty >= tier.qty ? tier.discount : current), 0);
}

function getBasketDiscount(amount) {
  return basketDiscountTiers.reduce((current, tier) => (amount >= tier.amount ? tier.discount : current), 0);
}

function discountedUnitPrice(price, discount) {
  return Math.round(price * (1 - discount / 100));
}

function getBasketDiscountHint(amount) {
  const nextTier = basketDiscountTiers.find((tier) => amount < tier.amount);
  if (!nextTier) return "Максимальная скидка по корзине применена";
  return `${formatMoney(Math.max(nextTier.amount - amount, 0))} до скидки ${nextTier.discount}%`;
}

function getTotals() {
  const lines = [...state.cart.values()];
  const qty = lines.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.qty * line.variant.price, 0);
  const qtyDiscount = getBasketDiscount(subtotal);
  const afterQtyDiscount = Math.round(subtotal * (1 - qtyDiscount / 100));
  const promoDiscount = promoCodes[state.promo] || 0;
  const total = Math.round(afterQtyDiscount * (1 - promoDiscount / 100));
  return { lines, qty, subtotal, qtyDiscount, promoDiscount, total };
}

function showToast(message) {
  nodes.toast.textContent = message;
  nodes.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => nodes.toast.classList.remove("is-visible"), 3000);
}

function downloadCsv(fileName, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

function cartQuoteRows() {
  const totals = getTotals();
  return [
    ["Коммерческое предложение Sobag Opt"],
    ["Дата", new Date().toLocaleString("ru-RU")],
    ["Сумма товаров", totals.subtotal],
    ["Скидка по корзине", `${totals.qtyDiscount}%`],
    ["Промокод", state.promo || ""],
    ["Итого", totals.total],
    [],
    ["Артикул", "Наименование", "Тип", "Размер", "Материал", "Количество", "Цена до скидки", "Цена со скидкой", "Сумма"],
    ...totals.lines.map((line) => {
      const unit = discountedUnitPrice(line.variant.price, totals.qtyDiscount);
      return [
        line.variant.sku,
        line.productName,
        line.variant.type,
        line.variant.size,
        line.variant.material,
        line.qty,
        line.variant.price,
        unit,
        unit * line.qty,
      ];
    }),
  ];
}

function downloadCartQuote() {
  if (!state.cart.size) {
    showToast("Корзина пока пустая.");
    return;
  }
  downloadCsv(`sobag-quote-${Date.now()}.csv`, cartQuoteRows());
}

function printCartQuote() {
  const totals = getTotals();
  if (!totals.lines.length) {
    showToast("Корзина пока пустая.");
    return;
  }
  const rows = totals.lines
    .map((line) => {
      const unit = discountedUnitPrice(line.variant.price, totals.qtyDiscount);
      return `<tr><td>${escapeHtml(line.variant.sku)}</td><td>${escapeHtml(line.productName)}</td><td>${escapeHtml([line.variant.type, line.variant.size, line.variant.material].join(", "))}</td><td>${line.qty}</td><td>${formatMoney(unit)}</td><td>${formatMoney(unit * line.qty)}</td></tr>`;
    })
    .join("");
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Sobag Opt КП</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{font-size:28px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}.total{font-size:22px;font-weight:800;margin-top:18px}</style></head><body><h1>Коммерческое предложение Sobag Opt</h1><p>Дата: ${new Date().toLocaleString("ru-RU")}</p><p>Скидка по корзине: ${totals.qtyDiscount}%</p><table><thead><tr><th>Артикул</th><th>Наименование</th><th>Параметры</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Итого: ${formatMoney(totals.total)}</p><script>window.print();</script></body></html>`);
  win.document.close();
}

function renderScale(amount) {
  nodes.scale.innerHTML = basketDiscountTiers
    .map(
      (tier) => `
        <div class="cart-scale-step${amount >= tier.amount ? " is-active" : ""}">
          <span>${formatMoney(tier.amount)}</span>
          <strong>${tier.discount}%</strong>
        </div>
      `
    )
    .join("");

  const totals = getTotals();
  nodes.discountHint.textContent = getBasketDiscountHint(totals.subtotal);
}

function renderCart() {
  const totals = getTotals();
  nodes.empty.classList.toggle("is-hidden", totals.lines.length > 0);
  nodes.items.innerHTML = totals.lines
    .map(
      (line) => `
        <article class="cart-page-line">
          <div class="cart-page-line__media">
            <img src="${line.productImage || "assets/production-workshop-1.png"}" alt="${line.productName}" ${imageAttrs(180, 180)} />
          </div>
          <div class="cart-page-line__body">
            <span>${line.variant.sku}</span>
            <h2>${line.productName}</h2>
            <p>${line.variant.type}, ${line.variant.size}, ${line.variant.material}</p>
          </div>
          <div class="cart-page-line__qty">
            <button type="button" data-qty-minus="${line.key}" aria-label="Уменьшить количество">
              <i data-lucide="minus"></i>
            </button>
            <input type="number" min="1" step="1" value="${line.qty}" data-qty-input="${line.key}" aria-label="Количество" />
            <button type="button" data-qty-plus="${line.key}" aria-label="Увеличить количество">
              <i data-lucide="plus"></i>
            </button>
          </div>
          <div class="cart-page-line__price">
            <strong>${formatMoney(discountedUnitPrice(line.variant.price, totals.qtyDiscount) * line.qty)}</strong>
            <span>${formatMoney(discountedUnitPrice(line.variant.price, totals.qtyDiscount))} / шт.</span>
          </div>
          <button class="cart-page-line__remove" type="button" data-remove-line="${line.key}" aria-label="Удалить">
            <i data-lucide="trash-2"></i>
          </button>
        </article>
      `
    )
    .join("");

  setTextWithPop(nodes.count, totals.qty);
  nodes.count.closest(".cart-page__header-note")?.classList.toggle("is-empty", totals.qty === 0);
  nodes.count.hidden = totals.qty === 0;
  setTextWithPop(nodes.subtotal, formatMoney(totals.subtotal));
  nodes.qtyDiscount.textContent = getBasketDiscountHint(totals.subtotal);
  if (nodes.qtyDiscount.previousElementSibling) nodes.qtyDiscount.previousElementSibling.hidden = true;
  nodes.promoDiscount.textContent = `${totals.promoDiscount}%`;
  setTextWithPop(nodes.grandTotal, formatMoney(totals.total));
  nodes.checkoutButton.disabled = !totals.lines.length || totals.total < MIN_CART_TOTAL;
  setButtonText("#checkoutButton", getSiteContent().cartCheckoutButton);
  nodes.minHint.textContent =
    totals.total >= MIN_CART_TOTAL
      ? "Минимальная сумма набрана, можно оформлять заказ."
      : `До минимальной суммы осталось ${formatMoney(Math.max(MIN_CART_TOTAL - totals.total, 0))}.`;

  renderScale(totals.subtotal);
  saveCart();
  if (window.lucide) window.lucide.createIcons();
}

function changeQty(key, qty) {
  const line = state.cart.get(key);
  if (!line) return;
  line.qty = Math.max(1, qty);
  state.cart.set(key, line);
  renderCart();
}

function openCheckout() {
  const totals = getTotals();
  if (!totals.lines.length) {
    showToast("Корзина пока пустая.");
    return;
  }
  if (totals.total < MIN_CART_TOTAL) {
    showToast(`Минимальная сумма заказа ${formatMoney(MIN_CART_TOTAL)}.`);
    return;
  }
  nodes.checkoutModal.classList.add("is-visible");
  document.body.classList.add("modal-open");
  lastFocusedElement = document.activeElement;
  initFormEnhancements(nodes.checkoutModal);
  requestAnimationFrame(() => {
    nodes.checkoutModal.querySelector("input, button")?.focus();
  });
}

function fillCheckoutFromProfile() {
  const profile = getCurrentUserProfile();
  const form = document.querySelector("#checkoutForm");
  if (!form || !profile) {
    showToast("Войдите или зарегистрируйтесь, чтобы использовать данные профиля.");
    return;
  }
  form.elements.name.value = profile.name || "";
  form.elements.email.value = profile.email || "";
  if (form.elements.company) form.elements.company.value = profile.company || profile.lastCustomer?.company || "";
  if (form.elements.inn) form.elements.inn.value = profile.inn || profile.lastCustomer?.inn || "";
  form.elements.phone.value = profile.phone || "";
  if (form.elements.city) form.elements.city.value = profile.city || profile.lastCustomer?.city || "";
  if (form.elements.address) form.elements.address.value = profile.address || profile.lastCustomer?.address || profile.addresses?.[0] || "";
  if (form.elements.delivery) form.elements.delivery.value = profile.lastCustomer?.delivery || "";
  if (form.elements.packaging) form.elements.packaging.value = profile.lastCustomer?.packaging || "";
  if (form.elements.comment) form.elements.comment.value = profile.lastCustomer?.comment || "";
  showToast("Данные профиля подставлены в форму заказа.");
}

function closeCheckout() {
  const modal = nodes.checkoutModal;
  if (!modal?.classList.contains("is-visible")) return;
  const finish = () => {
    modal.classList.remove("is-visible", "is-closing");
    document.body.classList.remove("modal-open");
    clearFormErrors(document.querySelector("#checkoutForm"));
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") lastFocusedElement.focus();
    lastFocusedElement = null;
  };
  if (prefersReducedMotion()) {
    finish();
    return;
  }
  modal.classList.add("is-closing");
  window.setTimeout(finish, 220);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.qtyMinus) changeQty(button.dataset.qtyMinus, (state.cart.get(button.dataset.qtyMinus)?.qty || 1) - 1);
  if (button.dataset.qtyPlus) changeQty(button.dataset.qtyPlus, (state.cart.get(button.dataset.qtyPlus)?.qty || 1) + 1);
  if (button.dataset.removeLine) {
    state.cart.delete(button.dataset.removeLine);
    renderCart();
    showToast("Позиция удалена из корзины.");
  }
  if (button.id === "checkoutButton") openCheckout();
  if (button.id === "saveCartDraftButton") {
    const title = window.prompt("Название черновика корзины", `Корзина от ${new Date().toLocaleDateString("ru-RU")}`) || "";
    saveCurrentCartDraft(title.trim());
  }
  if (button.id === "downloadCartQuoteButton") downloadCartQuote();
  if (button.id === "printCartQuoteButton") printCartQuote();
  if (button.id === "useProfileButton") fillCheckoutFromProfile();
  if (button.dataset.closeCheckout !== undefined) closeCheckout();
  if (button.dataset.themeToggle !== undefined) toggleTheme();
});

document.addEventListener("click", (event) => {
  const link = event.target.closest?.("a[href]");
  if (!link) return;
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (link.target && link.target !== "_self") return;
  const href = link.getAttribute("href") || "";
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.endsWith(".pdf")) return;
  if (href === "#") {
    event.preventDefault();
    return;
  }
  const targetUrl = new URL(href, window.location.href);
  if (targetUrl.origin !== window.location.origin) return;
  if (routeKey(targetUrl.pathname) !== routeKey(window.location.pathname)) return;
  event.preventDefault();
  navigateWithinSite(targetUrl.href);
});

document.addEventListener("input", (event) => {
  if (event.target.dataset.qtyInput) changeQty(event.target.dataset.qtyInput, Number(event.target.value || 1));
});

document.addEventListener("keydown", (event) => {
  if (!nodes.checkoutModal?.classList.contains("is-visible")) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeCheckout();
    return;
  }
  trapCheckoutFocus(event);
});

document.querySelector("#promoForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const code = nodes.promoInput.value.trim().toUpperCase();
  if (!code) {
    state.promo = "";
    nodes.promoHint.textContent = "Промокод очищен.";
    renderCart();
    return;
  }
  if (!promoCodes[code]) {
    state.promo = "";
    nodes.promoHint.textContent = "Промокод не найден.";
    renderCart();
    return;
  }
  state.promo = code;
  nodes.promoHint.textContent = `Промокод ${code} применен: скидка ${promoCodes[code]}%.`;
  renderCart();
});

document.querySelector("#checkoutForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFormErrors(event.target);
  const totals = getTotals();
  const data = Object.fromEntries(new FormData(event.target).entries());
  if (!String(data.name || "").trim()) {
    setFieldError(event.target, "name", "Укажите имя.");
    return;
  }
  if (!String(data.email || "").trim()) {
    setFieldError(event.target, "email", "Укажите email.");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email || "").trim())) {
    setFieldError(event.target, "email", "Проверьте формат email.");
    return;
  }
  if (!String(data.phone || "").trim()) {
    setFieldError(event.target, "phone", "Укажите телефон.");
    return;
  }
  const inn = String(data.inn || "").replace(/\D/g, "");
  if (inn && ![10, 12].includes(inn.length)) {
    setFieldError(event.target, "inn", "ИНН должен содержать 10 или 12 цифр.");
    return;
  }
  if (data.consent !== "on") {
    setFieldError(event.target, "consent", "Подтвердите согласие на обработку персональных данных.");
    return;
  }
  const layoutFile = event.target.elements.layoutFile?.files?.[0] || null;
  const customer = {
    name: String(data.name || "").trim(),
    email: String(data.email || "").trim(),
    company: String(data.company || "").trim(),
    inn,
    phone: String(data.phone || "").trim(),
    city: String(data.city || "").trim(),
    address: String(data.address || "").trim(),
    delivery: String(data.delivery || "").trim(),
    packaging: String(data.packaging || "").trim(),
    layoutFileName: layoutFile ? layoutFile.name : "",
    comment: String(data.comment || "").trim(),
  };
  const order = {
    id: `SO-${Date.now().toString().slice(-6)}`,
    date: new Date().toLocaleString("ru-RU"),
    customer,
    items: totals.lines,
    total: totals.total,
    promo: state.promo,
  };
  try {
    const result = await apiRequest("/api/orders", {
      method: "POST",
      body: {
        customer: order.customer,
        items: totals.lines,
        total: totals.total,
        promo: state.promo,
        source: "cart",
      },
    });
    if (result.order) {
      localStorage.setItem("sobag.lastOrder", JSON.stringify(result.order));
      saveOrderRecord(result.order);
    }
    state.cart.clear();
    closeCheckout();
    event.target.reset();
    renderCart();
    showToast("Заказ отправлен и сохранен на сервере.");
    return;
  } catch (error) {
    if (!isBackendUnavailable(error)) {
      showToast(error.message || "Не удалось отправить заказ.");
      return;
    }
  }
  localStorage.setItem("sobag.lastOrder", JSON.stringify(order));
  saveOrderRecord(order);
  state.cart.clear();
  closeCheckout();
  event.target.reset();
  renderCart();
  showToast("Заказ отправлен. Менеджер свяжется с покупателем.");
});

renderCartContent();
loadServerCartContent();
initFormEnhancements();
applyTheme(localStorage.getItem(THEME_KEY) || "default");
renderCart();
loadServerCart();
if (window.lucide) window.lucide.createIcons();
