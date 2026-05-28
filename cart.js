const MIN_CART_TOTAL = 30000;
const CURRENT_USER_KEY = "sobag.currentUser";
const USERS_KEY = "sobag.users";
const ORDERS_KEY = "sobag.orders.v1";
const CART_KEY = localStorage.getItem(CURRENT_USER_KEY)
  ? `sobag.cart.${localStorage.getItem(CURRENT_USER_KEY)}`
  : "sobag.cart.guest";
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
  cartButton: "корзина",
  footerBrand: "SOBAG OPT",
  footerText: "Тестовый прототип B2B-сайта для оптовых продаж текстиля с принтами.",
  footerSalesLabel: "Отдел опта",
  footerEmail: "opt@sobag-shop.ru",
  footerPhone: "+7 900 000-00-00",
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
  cart: new Map(cleanCartEntries(JSON.parse(localStorage.getItem(CART_KEY) || "[]"))),
  promo: "",
};

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

function getSiteContent() {
  try {
    return { ...defaultCartContent, ...(JSON.parse(localStorage.getItem(CART_CONTENT_KEY) || "null") || {}) };
  } catch {
    return { ...defaultCartContent };
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
  const record = {
    status: "new",
    source: "cart",
    userEmail: userKey || order.customer?.email || "",
    ...order,
  };
  localStorage.setItem(ORDERS_KEY, JSON.stringify([record, ...getOrders()]));
  if (userKey && users[userKey]) {
    users[userKey].orders = [record, ...(users[userKey].orders || [])];
    saveUsers(users);
  }
  return record;
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}

function setButtonText(selector, value) {
  document.querySelectorAll(selector).forEach((button) => {
    const icon = button.querySelector("i")?.outerHTML || "";
    button.innerHTML = `${icon}${buttonLabel(value)}`;
  });
}

function brandNameHtml(name) {
  const parts = String(name || defaultCartContent.brandName).trim().split(/\s+/);
  if (parts.length < 2) return escapeHtml(parts[0] || defaultCartContent.brandName);
  const last = parts.pop();
  return `${escapeHtml(parts.join(" "))} <b>${escapeHtml(last)}</b>`;
}

function renderCartContent() {
  const content = getSiteContent();
  const toplineItems = document.querySelectorAll(".topline__inner > span");
  [content.toplinePrimary, content.toplineSecondary, content.toplineTertiary].forEach((value, index) => {
    if (toplineItems[index]) toplineItems[index].textContent = value;
  });
  const brandMark = document.querySelector(".brand__mark");
  const brandName = document.querySelector(".brand__name");
  if (brandMark) {
    brandMark.innerHTML = content.brandLogo
      ? `<img src="${content.brandLogo}" alt="" />`
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
    footer.querySelector("strong").textContent = content.footerBrand;
    footer.querySelector("p").textContent = content.footerText;
    footer.querySelector("span").textContent = content.footerSalesLabel;
    const email = footer.querySelector('a[href^="mailto:"]');
    const phone = footer.querySelector('a[href^="tel:"]');
    if (email) {
      email.textContent = content.footerEmail;
      email.href = `mailto:${content.footerEmail}`;
    }
    if (phone) phone.textContent = content.footerPhone;
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify([...state.cart.entries()]));
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

function discountedUnitPrice(price, discount) {
  return Math.round(price * (1 - discount / 100));
}

function getTotals() {
  const lines = [...state.cart.values()];
  const qty = lines.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.qty * line.variant.price, 0);
  const qtyDiscount = getQuantityDiscount(qty);
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

function renderScale(qty) {
  nodes.scale.innerHTML = quantityTiers
    .map(
      (tier) => `
        <div class="cart-scale-step${qty >= tier.qty ? " is-active" : ""}">
          <span>${tier.qty} шт.</span>
          <strong>${tier.discount}%</strong>
        </div>
      `
    )
    .join("");

  const nextTier = quantityTiers.find((tier) => qty < tier.qty);
  const totals = getTotals();
  const averageUnitPrice = totals.qty ? totals.subtotal / totals.qty : 0;
  const remainingAmount = nextTier ? Math.ceil((nextTier.qty - qty) * averageUnitPrice) : 0;
  nodes.discountHint.textContent = nextTier
    ? totals.qty
      ? `До скидки ${nextTier.discount}% осталось примерно ${formatMoney(remainingAmount)} в корзине.`
      : `Добавьте товары, чтобы открыть скидку ${nextTier.discount}%.`
    : "Максимальная скидка по количеству применена.";
}

function renderCart() {
  const totals = getTotals();
  nodes.empty.classList.toggle("is-hidden", totals.lines.length > 0);
  nodes.items.innerHTML = totals.lines
    .map(
      (line) => `
        <article class="cart-page-line">
          <div class="cart-page-line__media">
            <img src="${line.productImage || "assets/production-workshop-1.png"}" alt="${line.productName}" />
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

  nodes.count.textContent = totals.qty;
  nodes.count.closest(".cart-page__header-note")?.classList.toggle("is-empty", totals.qty === 0);
  nodes.count.hidden = totals.qty === 0;
  nodes.subtotal.textContent = formatMoney(totals.subtotal);
  nodes.qtyDiscount.textContent = `${totals.qtyDiscount}%`;
  nodes.promoDiscount.textContent = `${totals.promoDiscount}%`;
  nodes.grandTotal.textContent = formatMoney(totals.total);
  nodes.checkoutButton.disabled = !totals.lines.length || totals.total < MIN_CART_TOTAL;
  setButtonText("#checkoutButton", getSiteContent().cartCheckoutButton);
  nodes.minHint.textContent =
    totals.total >= MIN_CART_TOTAL
      ? "Минимальная сумма набрана, можно оформлять заказ."
      : `До минимальной суммы осталось ${formatMoney(Math.max(MIN_CART_TOTAL - totals.total, 0))}.`;

  renderScale(totals.qty);
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
  form.elements.phone.value = profile.phone || "";
  showToast("Данные профиля подставлены в форму заказа.");
}

function closeCheckout() {
  nodes.checkoutModal.classList.remove("is-visible");
  document.body.classList.remove("modal-open");
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
  if (button.id === "useProfileButton") fillCheckoutFromProfile();
  if (button.dataset.closeCheckout !== undefined) closeCheckout();
});

document.addEventListener("input", (event) => {
  if (event.target.dataset.qtyInput) changeQty(event.target.dataset.qtyInput, Number(event.target.value || 1));
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

document.querySelector("#checkoutForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const totals = getTotals();
  const order = {
    id: `SO-${Date.now().toString().slice(-6)}`,
    date: new Date().toLocaleString("ru-RU"),
    customer: Object.fromEntries(new FormData(event.target).entries()),
    items: totals.lines,
    total: totals.total,
    promo: state.promo,
  };
  localStorage.setItem("sobag.lastOrder", JSON.stringify(order));
  saveOrderRecord(order);
  state.cart.clear();
  closeCheckout();
  event.target.reset();
  renderCart();
  showToast("Заказ отправлен. Менеджер свяжется с покупателем.");
});

renderCartContent();
renderCart();
if (window.lucide) window.lucide.createIcons();
