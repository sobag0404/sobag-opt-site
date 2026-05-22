const products = [
  {
    id: "plaid-anime-001",
    name: "Плед флисовый Anime Mix",
    category: "Пледы",
    print: "Аниме",
    price: 690,
    minQty: 30,
    stock: "ready",
    spec: "130x170 см, флис, индивидуальная упаковка",
    image: "https://images.pexels.com/photos/4614119/pexels-photo-4614119.jpeg?auto=compress&cs=tinysrgb&w=900",
    badge: "Хит опта",
    popular: 98,
  },
  {
    id: "pillow-game-002",
    name: "Подушка декоративная Game Art",
    category: "Подушки",
    print: "Игры",
    price: 410,
    minQty: 50,
    stock: "ready",
    spec: "40x40 см, габардин, наполнитель холлофайбер",
    image: "https://images.pexels.com/photos/4622202/pexels-photo-4622202.jpeg?auto=compress&cs=tinysrgb&w=900",
    badge: "В наличии",
    popular: 86,
  },
  {
    id: "case-holiday-003",
    name: "Наволочка праздничная Gift Line",
    category: "Наволочки",
    print: "Праздники",
    price: 190,
    minQty: 100,
    stock: "made",
    spec: "40x40 см, сатен, печать по готовому макету",
    image: "https://images.pexels.com/photos/12008104/pexels-photo-12008104.jpeg?auto=compress&cs=tinysrgb&w=900",
    badge: "Под заказ",
    popular: 76,
  },
  {
    id: "dakimakura-004",
    name: "Дакимакура с полноразмерным принтом",
    category: "Дакимакуры",
    print: "Аниме",
    price: 980,
    minQty: 20,
    stock: "ready",
    spec: "150x50 см, съемная наволочка, яркая печать",
    image: "https://images.pexels.com/photos/20531149/pexels-photo-20531149.jpeg?auto=compress&cs=tinysrgb&w=900",
    badge: "Маркетплейсы",
    popular: 92,
  },
  {
    id: "shopper-brand-005",
    name: "Шоппер брендированный",
    category: "Шопперы",
    print: "Бренд",
    price: 260,
    minQty: 100,
    stock: "made",
    spec: "Хлопок 240 г/м2, печать логотипа, бирка",
    image: "https://images.pexels.com/photos/236748/pexels-photo-236748.jpeg?auto=compress&cs=tinysrgb&w=900",
    badge: "Ваш принт",
    popular: 74,
  },
  {
    id: "notebook-game-006",
    name: "Тетрадь с игровой обложкой",
    category: "Канцелярия",
    print: "Игры",
    price: 84,
    minQty: 200,
    stock: "ready",
    spec: "48 листов, клетка, партия для витрины",
    image: "https://images.pexels.com/photos/31090827/pexels-photo-31090827.jpeg?auto=compress&cs=tinysrgb&w=900",
    badge: "Быстрая отгрузка",
    popular: 65,
  },
  {
    id: "blanket-brand-007",
    name: "Плед корпоративный Premium",
    category: "Пледы",
    print: "Бренд",
    price: 1190,
    minQty: 25,
    stock: "made",
    spec: "150x200 см, мягкий флис, полноцветный принт",
    image: "https://images.pexels.com/photos/4614119/pexels-photo-4614119.jpeg?auto=compress&cs=tinysrgb&w=900",
    badge: "Премиум",
    popular: 81,
  },
  {
    id: "pillow-holiday-008",
    name: "Подушка сезонная Winter Set",
    category: "Подушки",
    print: "Праздники",
    price: 450,
    minQty: 40,
    stock: "ready",
    spec: "45x45 см, съемная наволочка, подарочная линейка",
    image: "https://images.pexels.com/photos/12008104/pexels-photo-12008104.jpeg?auto=compress&cs=tinysrgb&w=900",
    badge: "Сезон",
    popular: 70,
  },
  {
    id: "case-anime-009",
    name: "Наволочка Anime Drop",
    category: "Наволочки",
    print: "Аниме",
    price: 220,
    minQty: 80,
    stock: "ready",
    spec: "50x70 см, полиэстер, несколько дизайнов в коробе",
    image: "https://images.pexels.com/photos/4622202/pexels-photo-4622202.jpeg?auto=compress&cs=tinysrgb&w=900",
    badge: "Набор",
    popular: 88,
  },
];

const discountTiers = [
  { amount: 30000, discount: 3 },
  { amount: 70000, discount: 7 },
  { amount: 150000, discount: 12 },
  { amount: 300000, discount: 18 },
];

const state = {
  category: "Все",
  stock: "all",
  prints: new Set(),
  search: "",
  sort: "popular",
  cart: new Map(),
  favorites: new Set(),
};

const productGrid = document.querySelector("#productGrid");
const productCount = document.querySelector("#productCount");
const categoryFilters = document.querySelector("#categoryFilters");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const cartItems = document.querySelector("#cartItems");
const cartEmpty = document.querySelector("#cartEmpty");
const cartCount = document.querySelector("#cartCount");
const favoriteCount = document.querySelector("#favoriteCount");
const subtotalNode = document.querySelector("#subtotal");
const discountValue = document.querySelector("#discountValue");
const grandTotal = document.querySelector("#grandTotal");
const discountProgress = document.querySelector("#discountProgress");
const discountHint = document.querySelector("#discountHint");
const toast = document.querySelector("#toast");

function formatMoney(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function getSubtotal() {
  return [...state.cart.values()].reduce((sum, line) => sum + line.product.price * line.qty, 0);
}

function getDiscount(subtotal) {
  return discountTiers.reduce((current, tier) => (subtotal >= tier.amount ? tier.discount : current), 0);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function getFilteredProducts() {
  const query = state.search.trim().toLowerCase();
  const activePrints = [...state.prints];
  const filtered = products.filter((product) => {
    const byCategory = state.category === "Все" || product.category === state.category;
    const byStock = state.stock === "all" || product.stock === state.stock;
    const byPrint = activePrints.length === 0 || activePrints.includes(product.print);
    const bySearch =
      !query ||
      [product.name, product.category, product.print, product.spec].some((value) => value.toLowerCase().includes(query));
    return byCategory && byStock && byPrint && bySearch;
  });

  return filtered.sort((a, b) => {
    if (state.sort === "priceAsc") return a.price - b.price;
    if (state.sort === "priceDesc") return b.price - a.price;
    if (state.sort === "minQty") return a.minQty - b.minQty;
    return b.popular - a.popular;
  });
}

function renderCategories() {
  const categories = ["Все", ...new Set(products.map((product) => product.category))];
  categoryFilters.innerHTML = categories
    .map((category) => {
      const count = category === "Все" ? products.length : products.filter((product) => product.category === category).length;
      const active = category === state.category ? " is-active" : "";
      return `<button class="category-pill${active}" type="button" data-category="${category}"><span>${category}</span><b>${count}</b></button>`;
    })
    .join("");
}

function renderProducts() {
  const list = getFilteredProducts();
  productCount.textContent = `${list.length} ${list.length === 1 ? "товар" : "товаров"}`;
  productGrid.innerHTML = list
    .map((product) => {
      const inCart = state.cart.get(product.id)?.qty ?? product.minQty;
      const favorite = state.favorites.has(product.id) ? " is-active" : "";
      const stockText = product.stock === "ready" ? "В наличии" : "Под заказ";
      return `
        <article class="product-card">
          <div class="product-card__image">
            <img src="${product.image}" alt="${product.name}" loading="lazy" />
            <span class="product-card__badge">${product.badge}</span>
            <button class="favorite-button${favorite}" type="button" title="В избранное" data-favorite="${product.id}">
              <i data-lucide="heart"></i>
            </button>
          </div>
          <div class="product-card__body">
            <div class="product-card__meta">
              <span>${product.category}</span>
              <span>${product.print}</span>
              <span>${stockText}</span>
            </div>
            <h3>${product.name}</h3>
            <p class="product-card__spec">${product.spec}</p>
            <div class="product-card__bottom">
              <div class="price">
                <strong>${formatMoney(product.price)}</strong>
                <span>за шт., от ${product.minQty} шт.</span>
              </div>
              <div class="qty-control" aria-label="Количество">
                <button type="button" data-qty-minus="${product.id}">−</button>
                <span id="qty-${product.id}">${inCart}</span>
                <button type="button" data-qty-plus="${product.id}">+</button>
              </div>
              <button class="add-button" type="button" data-add="${product.id}">Добавить в заявку</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  if (window.lucide) window.lucide.createIcons();
}

function renderCart() {
  const subtotal = getSubtotal();
  const discount = getDiscount(subtotal);
  const finalTotal = Math.round(subtotal * (1 - discount / 100));
  const lines = [...state.cart.values()];

  cartItems.innerHTML = lines
    .map(
      ({ product, qty }) => `
        <div class="cart-line">
          <div>
            <strong>${product.name}</strong>
            <span>${qty} шт. × ${formatMoney(product.price)} = ${formatMoney(qty * product.price)}</span>
          </div>
          <button type="button" title="Удалить" data-remove="${product.id}">
            <i data-lucide="x"></i>
          </button>
        </div>
      `
    )
    .join("");

  cartEmpty.classList.toggle("is-hidden", lines.length > 0);
  cartCount.textContent = lines.reduce((sum, line) => sum + line.qty, 0);
  favoriteCount.textContent = state.favorites.size;
  subtotalNode.textContent = formatMoney(subtotal);
  discountValue.textContent = `${discount}%`;
  grandTotal.textContent = formatMoney(finalTotal);

  const nextTier = discountTiers.find((tier) => subtotal < tier.amount);
  const maxTier = discountTiers[discountTiers.length - 1];
  discountProgress.style.width = `${Math.min((subtotal / maxTier.amount) * 100, 100)}%`;
  discountHint.textContent = nextTier
    ? `До скидки ${nextTier.discount}% осталось ${formatMoney(nextTier.amount - subtotal)}.`
    : "Максимальная тестовая скидка применена.";

  if (window.lucide) window.lucide.createIcons();
}

function setProductQty(productId, nextQty) {
  const product = products.find((item) => item.id === productId);
  const safeQty = Math.max(product.minQty, nextQty);
  const qtyNode = document.querySelector(`#qty-${CSS.escape(productId)}`);
  if (qtyNode) qtyNode.textContent = safeQty;
  return safeQty;
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  const qtyNode = document.querySelector(`#qty-${CSS.escape(productId)}`);
  const qty = Number(qtyNode?.textContent || product.minQty);
  state.cart.set(productId, { product, qty });
  renderCart();
  showToast("Товар добавлен в заявку. Скидка пересчитана.");
}

function boot() {
  renderCategories();
  renderProducts();
  renderCart();

  document.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;

    const scrollTarget = target.dataset.scroll;
    if (scrollTarget) {
      document.querySelector(scrollTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (target.dataset.category) {
      state.category = target.dataset.category;
      renderCategories();
      renderProducts();
    }

    if (target.dataset.stock) {
      state.stock = target.dataset.stock;
      document.querySelectorAll("[data-stock]").forEach((node) => node.classList.toggle("is-active", node === target));
      renderProducts();
    }

    if (target.dataset.qtyPlus) {
      const product = products.find((item) => item.id === target.dataset.qtyPlus);
      const current = Number(document.querySelector(`#qty-${CSS.escape(product.id)}`)?.textContent || product.minQty);
      setProductQty(product.id, current + product.minQty);
    }

    if (target.dataset.qtyMinus) {
      const product = products.find((item) => item.id === target.dataset.qtyMinus);
      const current = Number(document.querySelector(`#qty-${CSS.escape(product.id)}`)?.textContent || product.minQty);
      setProductQty(product.id, current - product.minQty);
    }

    if (target.dataset.add) addToCart(target.dataset.add);

    if (target.dataset.favorite) {
      const productId = target.dataset.favorite;
      if (state.favorites.has(productId)) state.favorites.delete(productId);
      else state.favorites.add(productId);
      renderProducts();
      renderCart();
    }

    if (target.dataset.remove) {
      state.cart.delete(target.dataset.remove);
      renderCart();
      showToast("Товар удален из заявки.");
    }
  });

  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderProducts();
  });

  sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderProducts();
  });

  document.querySelectorAll("[data-print]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.prints.add(checkbox.value);
      else state.prints.delete(checkbox.value);
      renderProducts();
    });
  });

  document.querySelector("#clearCart").addEventListener("click", () => {
    state.cart.clear();
    renderCart();
    showToast("Заявка очищена.");
  });

  document.querySelector("#requestForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.cart.size === 0) {
      showToast("Сначала добавьте товары в заявку.");
      return;
    }
    event.currentTarget.reset();
    state.cart.clear();
    renderCart();
    showToast("Тестовая заявка отправлена. В реальной версии уйдет менеджеру и в CRM.");
  });

  document.querySelector("#briefForm").addEventListener("submit", (event) => {
    event.preventDefault();
    event.currentTarget.reset();
    showToast("Бриф принят. В реальной версии прикрепим загрузку макета и расчет тиража.");
  });

  if (window.lucide) window.lucide.createIcons();
}

boot();
