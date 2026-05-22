const MIN_CART_TOTAL = 30000;
const CART_KEY = localStorage.getItem("sobag.currentUser")
  ? `sobag.cart.${localStorage.getItem("sobag.currentUser")}`
  : "sobag.cart.guest";

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

const state = {
  cart: new Map(JSON.parse(localStorage.getItem(CART_KEY) || "[]")),
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

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify([...state.cart.entries()]));
}

function getQuantityDiscount(qty) {
  return quantityTiers.reduce((current, tier) => (qty >= tier.qty ? tier.discount : current), 0);
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
  nodes.discountHint.textContent = nextTier
    ? `До скидки ${nextTier.discount}% осталось ${nextTier.qty - qty} шт.`
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
            <img src="${line.productImage || "assets/hero-products-1.png"}" alt="${line.productName}" />
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
            <strong>${formatMoney(line.variant.price * line.qty)}</strong>
            <span>${formatMoney(line.variant.price)} / шт.</span>
          </div>
          <button class="cart-page-line__remove" type="button" data-remove-line="${line.key}" aria-label="Удалить">
            <i data-lucide="trash-2"></i>
          </button>
        </article>
      `
    )
    .join("");

  nodes.count.textContent = totals.qty;
  nodes.subtotal.textContent = formatMoney(totals.subtotal);
  nodes.qtyDiscount.textContent = `${totals.qtyDiscount}%`;
  nodes.promoDiscount.textContent = `${totals.promoDiscount}%`;
  nodes.grandTotal.textContent = formatMoney(totals.total);
  nodes.checkoutButton.disabled = !totals.lines.length || totals.total < MIN_CART_TOTAL;
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
  state.cart.clear();
  closeCheckout();
  event.target.reset();
  renderCart();
  showToast("Заказ отправлен. Менеджер свяжется с покупателем.");
});

renderCart();
if (window.lucide) window.lucide.createIcons();
