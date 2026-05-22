const TYPE_OPTIONS = ["Подушка", "Наволочка"];
const SIZE_OPTIONS = ["30x30", "35x35", "40x40", "45x45", "50x50"];
const MATERIAL_OPTIONS = ["Велюр", "Габардин"];

const typeCodes = {
  Подушка: "POD",
  Наволочка: "NAV",
};

const materialCodes = {
  Велюр: "VEL",
  Габардин: "GAB",
};

const sizeFactors = {
  "30x30": 0,
  "35x35": 35,
  "40x40": 70,
  "45x45": 115,
  "50x50": 160,
};

const materialFactors = {
  Габардин: 0,
  Велюр: 90,
};

const typeFactors = {
  Наволочка: 0,
  Подушка: 180,
};

const quantityTiers = [
  { qty: 30, discount: 3 },
  { qty: 70, discount: 7 },
  { qty: 150, discount: 12 },
  { qty: 300, discount: 18 },
];

const productDrafts = [
  {
    id: "aurora-cats",
    baseSku: "SB-PIL-AUR",
    name: "Коллекция Aurora Cats",
    category: "Подушки и наволочки",
    theme: "Аниме",
    stock: "ready",
    badge: "Хит опта",
    image: "https://images.pexels.com/photos/4622202/pexels-photo-4622202.jpeg?auto=compress&cs=tinysrgb&w=900",
    description: "Один принт, разные комплектации: подушка с наполнителем или наволочка для готовой линейки.",
    types: TYPE_OPTIONS,
    sizes: SIZE_OPTIONS,
    materials: MATERIAL_OPTIONS,
    basePrice: 210,
    popular: 98,
  },
  {
    id: "pixel-quest",
    baseSku: "SB-PIL-PXQ",
    name: "Коллекция Pixel Quest",
    category: "Подушки и наволочки",
    theme: "Игры",
    stock: "ready",
    badge: "Маркетплейсы",
    image: "https://images.pexels.com/photos/20531149/pexels-photo-20531149.jpeg?auto=compress&cs=tinysrgb&w=900",
    description: "Игровая тематика для селлеров: размеры от 30 до 50 см, два материала на выбор.",
    types: TYPE_OPTIONS,
    sizes: SIZE_OPTIONS,
    materials: MATERIAL_OPTIONS,
    basePrice: 230,
    popular: 92,
  },
  {
    id: "winter-gift",
    baseSku: "SB-PIL-WIN",
    name: "Коллекция Winter Gift",
    category: "Подушки и наволочки",
    theme: "Праздники",
    stock: "made",
    badge: "Под заказ",
    image: "https://images.pexels.com/photos/12008104/pexels-photo-12008104.jpeg?auto=compress&cs=tinysrgb&w=900",
    description: "Сезонный принт для подарочных витрин, корпоративных наборов и новогодних поставок.",
    types: TYPE_OPTIONS,
    sizes: SIZE_OPTIONS,
    materials: MATERIAL_OPTIONS,
    basePrice: 205,
    popular: 84,
  },
  {
    id: "brand-line",
    baseSku: "SB-PIL-BRN",
    name: "Коллекция Brand Line",
    category: "Корпоративный текстиль",
    theme: "Бренд",
    stock: "made",
    badge: "Ваш принт",
    image: "https://images.pexels.com/photos/236748/pexels-photo-236748.jpeg?auto=compress&cs=tinysrgb&w=900",
    description: "База для клиентских макетов: логотипы, фирменные паттерны, упаковка под конкретный бренд.",
    types: TYPE_OPTIONS,
    sizes: SIZE_OPTIONS,
    materials: MATERIAL_OPTIONS,
    basePrice: 240,
    popular: 80,
  },
];

const STORAGE = {
  user: "sobag.currentUser",
  users: "sobag.users",
  products: "sobag.products",
  guestCart: "sobag.cart.guest",
};

let products = loadProducts();

const state = {
  filters: {
    category: new Set(),
    theme: new Set(),
    type: new Set(),
    size: new Set(),
    material: new Set(),
    stock: new Set(),
  },
  filterSearch: {},
  search: "",
  sort: "popular",
  cart: new Map(),
  favorites: new Set(JSON.parse(localStorage.getItem("sobag.favorites") || "[]")),
  currentUser: localStorage.getItem(STORAGE.user) || "",
  activeProductId: null,
  activeVariant: {
    type: "Подушка",
    size: "40x40",
    material: "Габардин",
    qty: 30,
  },
  adminPreview: [],
};

const productGrid = document.querySelector("#productGrid");
const productCount = document.querySelector("#productCount");
const filterGroups = document.querySelector("#filterGroups");
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

function createVariants(product) {
  return product.types.flatMap((type) =>
    product.sizes.flatMap((size) =>
      product.materials.map((material) => {
        const price = product.basePrice + typeFactors[type] + sizeFactors[size] + materialFactors[material];
        return {
          sku: `${product.baseSku}-${typeCodes[type]}-${size.replace("x", "")}-${materialCodes[material]}`,
          type,
          size,
          material,
          price,
        };
      })
    )
  );
}

function normalizeProduct(product) {
  const normalized = {
    ...product,
    types: product.types?.length ? product.types : TYPE_OPTIONS,
    sizes: product.sizes?.length ? product.sizes : SIZE_OPTIONS,
    materials: product.materials?.length ? product.materials : MATERIAL_OPTIONS,
    stock: product.stock || "made",
    popular: product.popular || 50,
    basePrice: Number(product.basePrice || 200),
  };
  normalized.variants = createVariants(normalized);
  normalized.minPrice = Math.min(...normalized.variants.map((variant) => variant.price));
  normalized.maxPrice = Math.max(...normalized.variants.map((variant) => variant.price));
  return normalized;
}

function loadProducts() {
  const saved = JSON.parse(localStorage.getItem(STORAGE.products) || "null");
  const source = saved?.length ? saved : productDrafts;
  return source.map(normalizeProduct);
}

function saveProducts() {
  const clean = products.map(({ variants, minPrice, maxPrice, ...product }) => product);
  localStorage.setItem(STORAGE.products, JSON.stringify(clean));
}

function seedUsers() {
  const users = JSON.parse(localStorage.getItem(STORAGE.users) || "null");
  if (users) return users;
  const seeded = {
    "admin@sobag.local": {
      email: "admin@sobag.local",
      password: "admin",
      name: "Администратор",
      role: "admin",
      orders: [],
    },
  };
  localStorage.setItem(STORAGE.users, JSON.stringify(seeded));
  return seeded;
}

function getUsers() {
  return seedUsers();
}

function saveUsers(users) {
  localStorage.setItem(STORAGE.users, JSON.stringify(users));
}

function getCartKey() {
  return state.currentUser ? `sobag.cart.${state.currentUser}` : STORAGE.guestCart;
}

function loadCart() {
  state.cart = new Map(JSON.parse(localStorage.getItem(getCartKey()) || "[]"));
}

function saveCart() {
  localStorage.setItem(getCartKey(), JSON.stringify([...state.cart.entries()]));
}

function formatMoney(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function getQuantityDiscount(qty) {
  return quantityTiers.reduce((current, tier) => (qty >= tier.qty ? tier.discount : current), 0);
}

function lineTotals(line) {
  const subtotal = line.variant.price * line.qty;
  const discount = getQuantityDiscount(line.qty);
  const total = Math.round(subtotal * (1 - discount / 100));
  return { subtotal, discount, total };
}

function getCartTotals() {
  return [...state.cart.values()].reduce(
    (sum, line) => {
      const totals = lineTotals(line);
      sum.subtotal += totals.subtotal;
      sum.total += totals.total;
      sum.qty += line.qty;
      return sum;
    },
    { subtotal: 0, total: 0, qty: 0 }
  );
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 3000);
}

function stockLabel(stock) {
  return stock === "ready" ? "В наличии" : "Под заказ";
}

function uniqueOptions(key) {
  if (key === "type" || key === "size" || key === "material") {
    return [...new Set(products.flatMap((product) => product.variants.map((variant) => variant[key])))];
  }
  if (key === "stock") return ["ready", "made"];
  return [...new Set(products.map((product) => product[key]))];
}

function productMatchesFilters(product) {
  const filters = state.filters;
  if (filters.category.size && !filters.category.has(product.category)) return false;
  if (filters.theme.size && !filters.theme.has(product.theme)) return false;
  if (filters.stock.size && !filters.stock.has(product.stock)) return false;

  const variantFilters = ["type", "size", "material"];
  return product.variants.some((variant) =>
    variantFilters.every((key) => !filters[key].size || filters[key].has(variant[key]))
  );
}

function searchScore(product) {
  const query = state.search.trim().toLowerCase();
  if (!query) return 1;

  const variantSkus = product.variants.map((variant) => variant.sku.toLowerCase());
  const baseSku = product.baseSku.toLowerCase();
  const exactSku = baseSku === query || variantSkus.includes(query);
  if (exactSku) return 10000;
  if (baseSku.startsWith(query) || variantSkus.some((sku) => sku.startsWith(query))) return 7000;
  if (baseSku.includes(query) || variantSkus.some((sku) => sku.includes(query))) return 5000;

  const name = product.name.toLowerCase();
  if (name.includes(query)) return 3000;
  const text = [product.theme, product.category, product.description].join(" ").toLowerCase();
  if (text.includes(query)) return 1000;
  return 0;
}

function getFilteredProducts() {
  return products
    .map((product) => ({ product, score: searchScore(product) }))
    .filter(({ product, score }) => productMatchesFilters(product) && (state.search.trim() ? score > 0 : true))
    .sort((a, b) => {
      if (state.search.trim() && b.score !== a.score) return b.score - a.score;
      if (state.sort === "priceAsc") return a.product.minPrice - b.product.minPrice;
      if (state.sort === "priceDesc") return b.product.maxPrice - a.product.maxPrice;
      if (state.sort === "minQty") return 30 - 30;
      return b.product.popular - a.product.popular;
    })
    .map(({ product }) => product);
}

function renderFilters() {
  const groups = [
    { key: "category", title: "Категории", label: (value) => value },
    { key: "theme", title: "Тематика", label: (value) => value },
    { key: "type", title: "Тип товара", label: (value) => value },
    { key: "size", title: "Размер", label: (value) => value },
    { key: "material", title: "Материал", label: (value) => value },
    { key: "stock", title: "Наличие", label: stockLabel },
  ];

  filterGroups.innerHTML = groups
    .map((group) => {
      const query = (state.filterSearch[group.key] || "").toLowerCase();
      const options = uniqueOptions(group.key).filter((value) => group.label(value).toLowerCase().includes(query));
      return `
        <div class="filters__block filter-group" data-filter-group="${group.key}">
          <h3>${group.title}</h3>
          <label class="filter-search">
            <i data-lucide="search"></i>
            <input type="search" value="${state.filterSearch[group.key] || ""}" placeholder="Поиск в фильтре" data-filter-search="${group.key}" />
          </label>
          <div class="filter-options">
            ${options
              .map((value) => {
                const checked = state.filters[group.key].has(value) ? "checked" : "";
                return `<label><input type="checkbox" value="${value}" data-filter="${group.key}" ${checked} /> ${group.label(value)}</label>`;
              })
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");

  if (window.lucide) window.lucide.createIcons();
}

function renderProducts() {
  const list = getFilteredProducts();
  productCount.textContent = `${list.length} ${list.length === 1 ? "товар" : "товаров"}`;
  productGrid.innerHTML = list
    .map((product) => {
      const favorite = state.favorites.has(product.id) ? " is-active" : "";
      const variantCount = product.variants.length;
      return `
        <article class="product-card">
          <button class="product-card__open" type="button" data-open-product="${product.id}" aria-label="Открыть ${product.name}"></button>
          <div class="product-card__image">
            <img src="${product.image}" alt="${product.name}" loading="lazy" />
            <span class="product-card__badge">${product.badge}</span>
            <button class="favorite-button${favorite}" type="button" title="В избранное" data-favorite="${product.id}">
              <i data-lucide="heart"></i>
            </button>
          </div>
          <div class="product-card__body">
            <div class="product-card__meta">
              <span>${product.baseSku}</span>
              <span>${product.theme}</span>
              <span>${stockLabel(product.stock)}</span>
            </div>
            <h3>${product.name}</h3>
            <p class="product-card__spec">${product.description}</p>
            <div class="variant-summary">
              <span>${variantCount} вариантов</span>
              <span>${product.types.join(" / ")}</span>
            </div>
            <div class="product-card__bottom">
              <div class="price">
                <strong>от ${formatMoney(product.minPrice)}</strong>
                <span>зависит от типа, размера и материала</span>
              </div>
              <button class="add-button" type="button" data-open-product="${product.id}">Настроить</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  if (window.lucide) window.lucide.createIcons();
}

function renderCart() {
  const totals = getCartTotals();
  const lines = [...state.cart.values()];
  const averageDiscount = totals.subtotal ? Math.round((1 - totals.total / totals.subtotal) * 100) : 0;

  cartItems.innerHTML = lines
    .map((line) => {
      const totals = lineTotals(line);
      return `
        <div class="cart-line">
          <div>
            <strong>${line.productName}</strong>
            <span>${line.variant.sku}</span>
            <span>${line.variant.type}, ${line.variant.size}, ${line.variant.material}</span>
            <span>${line.qty} шт. × ${formatMoney(line.variant.price)} · скидка ${totals.discount}%</span>
          </div>
          <button type="button" title="Удалить" data-remove="${line.key}">
            <i data-lucide="x"></i>
          </button>
        </div>
      `;
    })
    .join("");

  cartEmpty.classList.toggle("is-hidden", lines.length > 0);
  cartCount.textContent = totals.qty;
  favoriteCount.textContent = state.favorites.size;
  subtotalNode.textContent = formatMoney(totals.subtotal);
  discountValue.textContent = `${averageDiscount}%`;
  grandTotal.textContent = formatMoney(totals.total);

  const nextTier = quantityTiers.find((tier) => totals.qty < tier.qty);
  const maxTier = quantityTiers[quantityTiers.length - 1];
  discountProgress.style.width = `${Math.min((totals.qty / maxTier.qty) * 100, 100)}%`;
  discountHint.textContent = nextTier
    ? `До скидки ${nextTier.discount}% осталось ${nextTier.qty - totals.qty} шт. в заявке.`
    : "Максимальная скидка по количеству применена.";

  saveCart();
  if (window.lucide) window.lucide.createIcons();
}

function renderAccountButton() {
  const button = document.querySelector("#accountButton");
  if (!button) return;
  const users = getUsers();
  const user = users[state.currentUser];
  button.title = user ? `${user.name || user.email}` : "Войти или зарегистрироваться";
  button.innerHTML = user?.role === "admin" ? '<i data-lucide="shield"></i>' : '<i data-lucide="user"></i>';
  if (window.lucide) window.lucide.createIcons();
}

function findVariant(product, selection = state.activeVariant) {
  return (
    product.variants.find(
      (variant) =>
        variant.type === selection.type && variant.size === selection.size && variant.material === selection.material
    ) || product.variants[0]
  );
}

function productModalHtml(product) {
  const variant = findVariant(product);
  const discount = getQuantityDiscount(state.activeVariant.qty);
  const total = Math.round(variant.price * state.activeVariant.qty * (1 - discount / 100));
  return `
    <div class="modal is-visible" id="productModal" role="dialog" aria-modal="true">
      <div class="modal__backdrop" data-close-modal></div>
      <section class="modal__panel product-detail">
        <button class="modal__close" type="button" data-close-modal><i data-lucide="x"></i></button>
        <div class="product-detail__media">
          <img src="${product.image}" alt="${product.name}" />
        </div>
        <div class="product-detail__content">
          <p class="eyebrow">${product.baseSku}</p>
          <h2>${product.name}</h2>
          <p>${product.description}</p>
          <div class="sku-line">
            <span>Выбранный артикул</span>
            <strong id="selectedSku">${variant.sku}</strong>
          </div>
          ${variantControls("type", "Тип товара", product.types)}
          ${variantControls("size", "Размер", product.sizes)}
          ${variantControls("material", "Материал", product.materials)}
          <div class="detail-qty">
            <label>
              Количество, шт.
              <input id="detailQty" type="number" min="1" step="1" value="${state.activeVariant.qty}" />
            </label>
            <div class="detail-price">
              <span>Цена за шт.</span>
              <strong id="detailPrice">${formatMoney(variant.price)}</strong>
              <small id="detailDiscount">Скидка ${discount}% от количества</small>
            </div>
          </div>
          <div class="detail-total">
            <span>Итого по позиции</span>
            <strong id="detailTotal">${formatMoney(total)}</strong>
          </div>
          <button class="primary-button" type="button" data-add-variant="${product.id}">
            <i data-lucide="shopping-cart"></i>
            Добавить выбранный вариант
          </button>
        </div>
      </section>
    </div>
  `;
}

function variantControls(key, title, options) {
  return `
    <fieldset class="variant-group">
      <legend>${title}</legend>
      <div class="variant-options">
        ${options
          .map((option) => {
            const active = state.activeVariant[key] === option ? " is-active" : "";
            return `<button class="variant-option${active}" type="button" data-variant-key="${key}" data-variant-value="${option}">${option}</button>`;
          })
          .join("")}
      </div>
    </fieldset>
  `;
}

function openProduct(productId) {
  const product = products.find((item) => item.id === productId);
  state.activeProductId = productId;
  state.activeVariant = {
    type: product.types[0],
    size: product.sizes.includes("40x40") ? "40x40" : product.sizes[0],
    material: product.materials[0],
    qty: 30,
  };
  document.body.insertAdjacentHTML("beforeend", productModalHtml(product));
  if (window.lucide) window.lucide.createIcons();
}

function refreshProductModal() {
  const modal = document.querySelector("#productModal");
  if (!modal) return;
  const product = products.find((item) => item.id === state.activeProductId);
  const variant = findVariant(product);
  const qty = Math.max(1, Number(document.querySelector("#detailQty")?.value || state.activeVariant.qty));
  state.activeVariant.qty = qty;
  const discount = getQuantityDiscount(qty);
  document.querySelector("#selectedSku").textContent = variant.sku;
  document.querySelector("#detailPrice").textContent = formatMoney(variant.price);
  document.querySelector("#detailDiscount").textContent = `Скидка ${discount}% от количества`;
  document.querySelector("#detailTotal").textContent = formatMoney(Math.round(variant.price * qty * (1 - discount / 100)));
  modal.querySelectorAll(".variant-option").forEach((button) => {
    button.classList.toggle("is-active", state.activeVariant[button.dataset.variantKey] === button.dataset.variantValue);
  });
}

function addVariantToCart(productId) {
  const product = products.find((item) => item.id === productId);
  const variant = findVariant(product);
  const qty = Math.max(1, Number(document.querySelector("#detailQty")?.value || state.activeVariant.qty));
  const key = `${product.id}:${variant.sku}`;
  const existing = state.cart.get(key);
  state.cart.set(key, {
    key,
    productId: product.id,
    productName: product.name,
    variant,
    qty: existing ? existing.qty + qty : qty,
  });
  renderCart();
  closeModal();
  showToast("Вариант добавлен в корзину и сохранен за текущим пользователем.");
}

function accountModalHtml() {
  const users = getUsers();
  const user = users[state.currentUser];
  const orders = user?.orders || [];
  return `
    <div class="modal is-visible" id="accountModal" role="dialog" aria-modal="true">
      <div class="modal__backdrop" data-close-modal></div>
      <section class="modal__panel account-panel">
        <button class="modal__close" type="button" data-close-modal><i data-lucide="x"></i></button>
        <div>
          <p class="eyebrow">Account</p>
          <h2>${user ? "Личный кабинет" : "Вход и регистрация"}</h2>
        </div>
        ${
          user
            ? `
              <div class="account-summary">
                <strong>${user.name || user.email}</strong>
                <span>${user.email}</span>
                <span>${user.role === "admin" ? "Администратор" : "Покупатель"}</span>
              </div>
              <div class="account-actions">
                ${user.role === "admin" ? '<button class="primary-button" type="button" data-open-admin><i data-lucide="settings"></i> Админка</button>' : ""}
                <button class="ghost-button" type="button" data-logout>Выйти</button>
              </div>
              <h3>История заказов</h3>
              <div class="orders-list">
                ${
                  orders.length
                    ? orders
                        .map(
                          (order) => `
                            <article>
                              <strong>${order.id}</strong>
                              <span>${order.date}</span>
                              <span>${order.items.length} позиций · ${formatMoney(order.total)}</span>
                            </article>
                          `
                        )
                        .join("")
                    : "<p>Заказов пока нет. После отправки заявки они появятся здесь.</p>"
                }
              </div>
            `
            : `
              <form class="auth-form" id="authForm">
                <input name="name" type="text" placeholder="Имя или компания" />
                <input name="email" type="email" placeholder="Email" required />
                <input name="password" type="password" placeholder="Пароль" required />
                <div class="auth-actions">
                  <button class="primary-button" type="submit" data-auth-mode="login">Войти</button>
                  <button class="ghost-button" type="submit" data-auth-mode="register">Зарегистрироваться</button>
                </div>
                <p class="form-note">Тестовый админ: admin@sobag.local / admin</p>
              </form>
            `
        }
      </section>
    </div>
  `;
}

function openAccount() {
  document.body.insertAdjacentHTML("beforeend", accountModalHtml());
  if (window.lucide) window.lucide.createIcons();
}

function adminModalHtml() {
  return `
    <div class="modal is-visible" id="adminModal" role="dialog" aria-modal="true">
      <div class="modal__backdrop" data-close-modal></div>
      <section class="modal__panel admin-panel">
        <button class="modal__close" type="button" data-close-modal><i data-lucide="x"></i></button>
        <div>
          <p class="eyebrow">Admin</p>
          <h2>Массовое создание карточек</h2>
          <p>Задайте начальный артикул и группы вариантов. Сайт создаст все комбинации: тип × размер × материал.</p>
        </div>
        <form class="admin-form" id="adminGenerator">
          <input name="name" type="text" placeholder="Название коллекции" value="Коллекция New Print" required />
          <input name="baseSku" type="text" placeholder="Начальный артикул" value="SB-PIL-NEW" required />
          <input name="category" type="text" placeholder="Категория" value="Подушки и наволочки" required />
          <input name="theme" type="text" placeholder="Тематика" value="Новая тематика" required />
          <input name="types" type="text" placeholder="Типы через запятую" value="${TYPE_OPTIONS.join(", ")}" required />
          <input name="sizes" type="text" placeholder="Размеры через запятую" value="${SIZE_OPTIONS.join(", ")}" required />
          <input name="materials" type="text" placeholder="Материалы через запятую" value="${MATERIAL_OPTIONS.join(", ")}" required />
          <input name="basePrice" type="number" min="1" value="220" placeholder="Базовая цена" required />
          <input name="image" type="url" placeholder="URL изображения" value="https://images.pexels.com/photos/4614119/pexels-photo-4614119.jpeg?auto=compress&cs=tinysrgb&w=900" />
          <select name="stock">
            <option value="ready">В наличии</option>
            <option value="made">Под заказ</option>
          </select>
          <div class="admin-actions">
            <button class="primary-button" type="submit">Сгенерировать</button>
            <button class="ghost-button" type="button" data-save-generated>Добавить карточку</button>
            <button class="ghost-button" type="button" data-download-template>CSV-шаблон</button>
          </div>
        </form>
        <div class="excel-import">
          <label>
            Импорт Excel/CSV
            <input id="excelInput" type="file" accept=".xlsx,.xls,.csv" />
          </label>
          <p>Колонки: name, baseSku, category, theme, types, sizes, materials, basePrice, image, stock.</p>
        </div>
        <div class="admin-preview" id="adminPreview"></div>
      </section>
    </div>
  `;
}

function openAdmin() {
  document.querySelector("#accountModal")?.remove();
  document.body.insertAdjacentHTML("beforeend", adminModalHtml());
  renderAdminPreview([]);
  if (window.lucide) window.lucide.createIcons();
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function productFromForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  return normalizeProduct({
    id: `${data.baseSku}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    baseSku: data.baseSku.trim().toUpperCase(),
    name: data.name.trim(),
    category: data.category.trim(),
    theme: data.theme.trim(),
    types: splitList(data.types),
    sizes: splitList(data.sizes),
    materials: splitList(data.materials),
    basePrice: Number(data.basePrice),
    image: data.image || "https://images.pexels.com/photos/4614119/pexels-photo-4614119.jpeg?auto=compress&cs=tinysrgb&w=900",
    stock: data.stock,
    badge: "Новая карточка",
    description: "Карточка создана массовым генератором вариантов.",
    popular: 60,
  });
}

function renderAdminPreview(items) {
  const node = document.querySelector("#adminPreview");
  if (!node) return;
  state.adminPreview = items;
  node.innerHTML = items.length
    ? items
        .map(
          (product) => `
            <article>
              <strong>${product.name}</strong>
              <span>${product.baseSku} · ${product.variants.length} вариантов</span>
              <small>${product.variants.slice(0, 6).map((variant) => variant.sku).join(", ")}${product.variants.length > 6 ? "..." : ""}</small>
            </article>
          `
        )
        .join("")
    : "<p>Сгенерируйте карточку или загрузите Excel, чтобы увидеть будущие артикулы.</p>";
}

function saveGeneratedProducts() {
  if (!state.adminPreview.length) {
    showToast("Сначала сгенерируйте карточки.");
    return;
  }
  products = [...state.adminPreview, ...products];
  saveProducts();
  renderFilters();
  renderProducts();
  renderAdminPreview([]);
  showToast("Карточки добавлены в каталог.");
}

function downloadTemplate() {
  const csv = [
    "name,baseSku,category,theme,types,sizes,materials,basePrice,image,stock",
    `"Коллекция Sample","SB-PIL-SMP","Подушки и наволочки","Аниме","Подушка, Наволочка","30x30, 35x35, 40x40, 45x45, 50x50","Велюр, Габардин","220","","ready"`,
  ].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sobag-products-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

async function importExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
  const imported = rows
    .filter((row) => row.name && row.baseSku)
    .map((row) =>
      normalizeProduct({
        id: `${row.baseSku}-${Date.now()}-${Math.random().toString(16).slice(2)}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        baseSku: String(row.baseSku).trim().toUpperCase(),
        name: String(row.name).trim(),
        category: String(row.category || "Подушки и наволочки").trim(),
        theme: String(row.theme || "Без тематики").trim(),
        types: splitList(row.types || TYPE_OPTIONS.join(",")),
        sizes: splitList(row.sizes || SIZE_OPTIONS.join(",")),
        materials: splitList(row.materials || MATERIAL_OPTIONS.join(",")),
        basePrice: Number(row.basePrice || 220),
        image: row.image || "https://images.pexels.com/photos/4614119/pexels-photo-4614119.jpeg?auto=compress&cs=tinysrgb&w=900",
        stock: row.stock || "made",
        badge: "Excel",
        description: "Карточка импортирована из Excel.",
        popular: 55,
      })
    );
  renderAdminPreview(imported);
  showToast(`Из Excel загружено карточек: ${imported.length}.`);
}

function closeModal() {
  document.querySelectorAll(".modal").forEach((modal) => modal.remove());
}

function submitOrder(form) {
  if (state.cart.size === 0) {
    showToast("Сначала добавьте товары в заявку.");
    return;
  }
  const users = getUsers();
  const user = users[state.currentUser];
  const totals = getCartTotals();
  if (user) {
    user.orders.unshift({
      id: `SO-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleString("ru-RU"),
      items: [...state.cart.values()],
      total: totals.total,
    });
    saveUsers(users);
  }
  form.reset();
  state.cart.clear();
  renderCart();
  showToast(user ? "Заявка сохранена в истории заказов." : "Заявка отправлена. Зарегистрируйтесь, чтобы сохранять историю.");
}

function boot() {
  seedUsers();
  loadCart();
  renderFilters();
  renderProducts();
  renderCart();
  renderAccountButton();

  document.addEventListener("click", (event) => {
    if (event.target.dataset.closeModal !== undefined) {
      closeModal();
      return;
    }

    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.scroll) document.querySelector(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (button.id === "accountButton") openAccount();
    if (button.dataset.closeModal !== undefined) closeModal();
    if (button.dataset.openProduct) openProduct(button.dataset.openProduct);
    if (button.dataset.variantKey) {
      state.activeVariant[button.dataset.variantKey] = button.dataset.variantValue;
      refreshProductModal();
    }
    if (button.dataset.addVariant) addVariantToCart(button.dataset.addVariant);
    if (button.dataset.favorite) {
      if (state.favorites.has(button.dataset.favorite)) state.favorites.delete(button.dataset.favorite);
      else state.favorites.add(button.dataset.favorite);
      localStorage.setItem("sobag.favorites", JSON.stringify([...state.favorites]));
      renderProducts();
      renderCart();
    }
    if (button.dataset.remove) {
      state.cart.delete(button.dataset.remove);
      renderCart();
      showToast("Позиция удалена из корзины.");
    }
    if (button.id === "clearCart") {
      state.cart.clear();
      renderCart();
      showToast("Корзина очищена.");
    }
    if (button.dataset.logout !== undefined) {
      localStorage.removeItem(STORAGE.user);
      state.currentUser = "";
      loadCart();
      closeModal();
      renderCart();
      renderAccountButton();
    }
    if (button.dataset.openAdmin !== undefined) openAdmin();
    if (button.dataset.saveGenerated !== undefined) saveGeneratedProducts();
    if (button.dataset.downloadTemplate !== undefined) downloadTemplate();
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "searchInput") {
      state.search = event.target.value;
      renderProducts();
    }
    if (event.target.dataset.filterSearch) {
      const key = event.target.dataset.filterSearch;
      state.filterSearch[event.target.dataset.filterSearch] = event.target.value;
      renderFilters();
      const nextInput = document.querySelector(`[data-filter-search="${CSS.escape(key)}"]`);
      nextInput?.focus();
      nextInput?.setSelectionRange(nextInput.value.length, nextInput.value.length);
    }
    if (event.target.id === "detailQty") refreshProductModal();
  });

  document.addEventListener("change", (event) => {
    if (event.target.dataset.filter) {
      const bucket = state.filters[event.target.dataset.filter];
      if (event.target.checked) bucket.add(event.target.value);
      else bucket.delete(event.target.value);
      renderProducts();
    }
    if (event.target.id === "sortSelect") {
      state.sort = event.target.value;
      renderProducts();
    }
    if (event.target.id === "excelInput" && event.target.files[0]) importExcel(event.target.files[0]);
  });

  document.addEventListener("submit", (event) => {
    if (event.target.id === "requestForm") {
      event.preventDefault();
      submitOrder(event.target);
    }
    if (event.target.id === "briefForm") {
      event.preventDefault();
      event.target.reset();
      showToast("Бриф принят. В следующей версии добавим загрузку макета.");
    }
    if (event.target.id === "authForm") {
      event.preventDefault();
      const submitter = event.submitter;
      const data = Object.fromEntries(new FormData(event.target).entries());
      const users = getUsers();
      if (submitter.dataset.authMode === "register") {
        users[data.email] = {
          email: data.email,
          password: data.password,
          name: data.name || data.email,
          role: "buyer",
          orders: [],
        };
        saveUsers(users);
      }
      if (!users[data.email] || users[data.email].password !== data.password) {
        showToast("Проверьте email и пароль.");
        return;
      }
      state.currentUser = data.email;
      localStorage.setItem(STORAGE.user, data.email);
      loadCart();
      closeModal();
      renderCart();
      renderAccountButton();
      showToast("Вы вошли. Корзина и заказы сохраняются за аккаунтом.");
    }
    if (event.target.id === "adminGenerator") {
      event.preventDefault();
      renderAdminPreview([productFromForm(event.target)]);
    }
  });

  if (window.lucide) window.lucide.createIcons();
}

boot();
