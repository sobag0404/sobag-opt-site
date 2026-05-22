const TYPE_OPTIONS = ["Подушка", "Наволочка"];
const SIZE_OPTIONS = ["30x30", "35x35", "40x40", "45x45", "50x50"];
const MATERIAL_OPTIONS = ["Велюр", "Габардин"];

const typeCodes = {
  Подушка: "POD",
  Наволочка: "NAV",
  Мешок: "BAG",
  Чехол: "CSH",
};

const materialCodes = {
  Велюр: "VEL",
  Габардин: "GAB",
  Оксфорд: "OXF",
};

const sizeFactors = {
  "30x30": 0,
  "35x35": 35,
  "40x40": 70,
  "45x45": 115,
  "50x50": 160,
  "30x40": 70,
  "35x45": 115,
  "40x50": 160,
  Стандарт: 120,
  XL: 240,
};

const materialFactors = {
  Габардин: 0,
  Велюр: 90,
  Оксфорд: 70,
};

const typeFactors = {
  Наволочка: 0,
  Подушка: 180,
  Мешок: 40,
  Чехол: 120,
};

const quantityTiers = [
  { qty: 30, discount: 3 },
  { qty: 70, discount: 7 },
  { qty: 150, discount: 12 },
  { qty: 300, discount: 18 },
];

const MIN_CART_TOTAL = 30000;

const catalogCategories = [
  {
    name: "Подушки",
    icon: "square-stack",
    description: "Декоративные подушки с наполнителем",
  },
  {
    name: "Наволочки",
    icon: "panel-top",
    description: "Съемные наволочки под готовые линейки",
  },
  {
    name: "Пледы",
    icon: "layers",
    description: "Пледы с полноцветными принтами",
  },
  {
    name: "Мешки для обуви",
    icon: "package",
    description: "Легкие мешки для школ, спорта и мерча",
  },
  {
    name: "Чехлы на кулер",
    icon: "container",
    description: "Текстильные чехлы под корпоративные заказы",
  },
  {
    name: "Чехлы на чемодан",
    icon: "briefcase",
    description: "Принтованные чехлы для багажа",
  },
];

const catalogCollections = [
  { name: "Аниме", icon: "sparkles" },
  { name: "Мемы", icon: "message-circle" },
  { name: "Животные", icon: "paw-print" },
  { name: "Паттерны", icon: "palette" },
  { name: "Игры", icon: "gamepad-2" },
  { name: "Космос", icon: "orbit" },
  { name: "Военные", icon: "shield" },
  { name: "Бренд", icon: "badge-check" },
  { name: "Подарки", icon: "gift" },
  { name: "Именные", icon: "type" },
];

const catalogHolidays = [
  { name: "Новый год", icon: "snowflake" },
  { name: "14 февраля", icon: "heart" },
  { name: "8 марта", icon: "flower-2" },
  { name: "23 февраля", icon: "medal" },
  { name: "День учителя", icon: "graduation-cap" },
  { name: "День рождения", icon: "cake" },
];

const actualItems = [
  {
    title: "Новогодний опт",
    label: "Новый год",
    type: "holiday",
    image: "assets/hero-products-2.png",
  },
  {
    title: "Аниме на подушках",
    label: "Аниме",
    type: "collection",
    image: "assets/hero-products-1.png",
  },
  {
    title: "Подарки к 8 марта",
    label: "8 марта",
    type: "holiday",
    image: "assets/hero-products-3.png",
  },
];

const productDrafts = [
  {
    id: "aurora-cats",
    baseSku: "SB-PIL-AUR",
    name: "Подушка Aurora Cats",
    category: "Подушки",
    theme: "Аниме",
    collections: ["Аниме", "Животные", "Паттерны", "Подарки", "Именные"],
    holidays: ["Новый год"],
    tags: ["Аниме", "Подарки", "Животные", "Паттерны", "Новый год"],
    stock: "ready",
    badge: "Хит опта",
    image: "assets/hero-products-1.png",
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
    name: "Наволочка Pixel Quest",
    category: "Наволочки",
    theme: "Игры",
    collections: ["Игры", "Аниме", "Мемы", "Паттерны", "Бренд"],
    holidays: ["День рождения"],
    tags: ["Игры", "Аниме", "Подарки", "Паттерны", "Бренд"],
    stock: "ready",
    badge: "Маркетплейсы",
    image: "assets/hero-products-3.png",
    description: "Игровая подборка для селлеров: размеры от 30 до 50 см, два материала на выбор.",
    types: TYPE_OPTIONS,
    sizes: SIZE_OPTIONS,
    materials: MATERIAL_OPTIONS,
    basePrice: 230,
    popular: 92,
  },
  {
    id: "winter-gift",
    baseSku: "SB-PIL-WIN",
    name: "Плед Winter Gift",
    category: "Пледы",
    theme: "Новый год",
    collections: ["Подарки", "Паттерны", "Животные", "Бренд", "Именные"],
    holidays: ["Новый год", "День рождения"],
    tags: ["Новый год", "Подарки", "Паттерны", "Животные", "Бренд"],
    stock: "made",
    badge: "Под заказ",
    image: "assets/hero-products-2.png",
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
    name: "Чехол Brand Line",
    category: "Чехлы на чемодан",
    theme: "Бренд",
    collections: ["Бренд", "Паттерны", "Подарки", "Космос", "Игры"],
    holidays: ["23 февраля", "День рождения"],
    tags: ["Бренд", "Паттерны", "Подарки", "Космос", "Игры"],
    stock: "made",
    badge: "Ваш принт",
    image: "assets/hero-products-1.png",
    description: "База для клиентских макетов: логотипы, фирменные паттерны, упаковка под конкретный бренд.",
    types: TYPE_OPTIONS,
    sizes: SIZE_OPTIONS,
    materials: MATERIAL_OPTIONS,
    basePrice: 240,
    popular: 80,
  },
  {
    id: "army-supply",
    baseSku: "SB-BAG-ARM",
    name: "Мешок Army Supply",
    category: "Мешки для обуви",
    theme: "Военные",
    collections: ["Военные", "Паттерны", "Бренд", "Подарки", "Игры"],
    holidays: ["23 февраля"],
    tags: ["Военные", "Паттерны", "Бренд", "Подарки", "Игры"],
    stock: "ready",
    badge: "Новая серия",
    image: "assets/hero-products-2.png",
    description: "Мешки для обуви и спортивных наборов с камуфляжными и тактическими принтами.",
    types: ["Мешок"],
    sizes: ["30x40", "35x45", "40x50"],
    materials: ["Габардин", "Оксфорд"],
    basePrice: 165,
    popular: 76,
  },
  {
    id: "cooler-love",
    baseSku: "SB-CLR-LOVE",
    name: "Чехол Love Cooler",
    category: "Чехлы на кулер",
    theme: "14 февраля",
    collections: ["Подарки", "Бренд", "Паттерны", "Космос", "Именные"],
    holidays: ["14 февраля", "8 марта"],
    tags: ["14 февраля", "Подарки", "Бренд", "Паттерны", "Космос"],
    stock: "made",
    badge: "Сезон",
    image: "assets/hero-products-3.png",
    description: "Чехлы для кулеров с сезонными и корпоративными принтами для офисов и подарков.",
    types: ["Чехол"],
    sizes: ["Стандарт", "XL"],
    materials: ["Габардин", "Велюр"],
    basePrice: 390,
    popular: 72,
  },
  {
    id: "meme-cloud",
    baseSku: "SB-PIL-MEM",
    name: "Подушка Meme Cloud",
    category: "Подушки",
    theme: "Мемы",
    collections: ["Мемы", "Подарки", "Паттерны", "Именные", "Бренд"],
    holidays: ["День рождения"],
    tags: ["Мемы", "Подарки", "Именные", "День рождения", "Паттерны"],
    stock: "ready",
    badge: "Тест",
    image: "assets/hero-products-3.png",
    description: "Подушка с юмористическими принтами для маркетплейсов и подарочных витрин.",
    types: TYPE_OPTIONS,
    sizes: SIZE_OPTIONS,
    materials: MATERIAL_OPTIONS,
    basePrice: 225,
    popular: 89,
  },
  {
    id: "march-bloom",
    baseSku: "SB-NAV-MAR",
    name: "Наволочка March Bloom",
    category: "Наволочки",
    theme: "Подарки",
    collections: ["Подарки", "Животные", "Паттерны", "Именные", "Бренд"],
    holidays: ["8 марта", "День рождения"],
    tags: ["8 марта", "Подарки", "Женские принты", "Цветы", "Именные"],
    stock: "made",
    badge: "Сезон",
    image: "assets/hero-products-1.png",
    description: "Подарочная серия наволочек с цветочными и именными принтами.",
    types: TYPE_OPTIONS,
    sizes: SIZE_OPTIONS,
    materials: MATERIAL_OPTIONS,
    basePrice: 215,
    popular: 87,
  },
  {
    id: "teacher-pattern",
    baseSku: "SB-PIL-TCH",
    name: "Подушка Teacher Pattern",
    category: "Подушки",
    theme: "Паттерны",
    collections: ["Паттерны", "Подарки", "Именные", "Бренд", "Мемы"],
    holidays: ["День учителя"],
    tags: ["День учителя", "Паттерны", "Подарки", "Именные", "Школа"],
    stock: "ready",
    badge: "Школа",
    image: "assets/hero-products-2.png",
    description: "Тестовая школьная линейка для сезонных закупок и подарочных наборов.",
    types: TYPE_OPTIONS,
    sizes: SIZE_OPTIONS,
    materials: MATERIAL_OPTIONS,
    basePrice: 218,
    popular: 82,
  },
  {
    id: "space-luggage",
    baseSku: "SB-CSH-SPC",
    name: "Чехол Space Luggage",
    category: "Чехлы на чемодан",
    theme: "Космос",
    collections: ["Космос", "Паттерны", "Бренд", "Подарки", "Игры"],
    holidays: ["День рождения"],
    tags: ["Космос", "Паттерны", "Чехол", "Подарки", "Бренд"],
    stock: "made",
    badge: "Travel",
    image: "assets/hero-products-2.png",
    description: "Чехлы на чемодан с яркими паттернами для туристических и корпоративных заказов.",
    types: ["Чехол"],
    sizes: ["Стандарт", "XL"],
    materials: ["Габардин", "Велюр"],
    basePrice: 420,
    popular: 78,
  },
  {
    id: "anime-cover",
    baseSku: "SB-CSH-ANI",
    name: "Чехол Anime Trip",
    category: "Чехлы на чемодан",
    theme: "Аниме",
    collections: ["Аниме", "Игры", "Подарки", "Бренд", "Паттерны"],
    holidays: ["День рождения"],
    tags: ["Аниме", "Игры", "Чехол", "Подарки", "Паттерны"],
    stock: "ready",
    badge: "Хит",
    image: "assets/hero-products-1.png",
    description: "Аниме-серия для чемоданов, тестовая карточка под разные принты и размеры.",
    types: ["Чехол"],
    sizes: ["Стандарт", "XL"],
    materials: ["Габардин", "Велюр"],
    basePrice: 435,
    popular: 86,
  },
  {
    id: "shoe-cyber",
    baseSku: "SB-BAG-CYB",
    name: "Мешок Cyber Sport",
    category: "Мешки для обуви",
    theme: "Игры",
    collections: ["Игры", "Мемы", "Космос", "Паттерны", "Бренд"],
    holidays: ["23 февраля", "День рождения"],
    tags: ["Игры", "Мемы", "Спорт", "Космос", "23 февраля"],
    stock: "ready",
    badge: "Спорт",
    image: "assets/hero-products-3.png",
    description: "Мешки для обуви с игровыми и спортивными принтами.",
    types: ["Мешок"],
    sizes: ["30x40", "35x45", "40x50"],
    materials: ["Габардин", "Оксфорд"],
    basePrice: 175,
    popular: 81,
  },
  {
    id: "shoe-flower",
    baseSku: "SB-BAG-FLR",
    name: "Мешок Flower Mood",
    category: "Мешки для обуви",
    theme: "Подарки",
    collections: ["Подарки", "Животные", "Паттерны", "Именные", "Бренд"],
    holidays: ["8 марта", "День рождения"],
    tags: ["8 марта", "Подарки", "Цветы", "Мешок", "Именные"],
    stock: "made",
    badge: "Весна",
    image: "assets/hero-products-1.png",
    description: "Весенняя серия мешков для обуви и подарочных комплектов.",
    types: ["Мешок"],
    sizes: ["30x40", "35x45", "40x50"],
    materials: ["Габардин", "Оксфорд"],
    basePrice: 168,
    popular: 74,
  },
  {
    id: "cooler-brand",
    baseSku: "SB-CLR-BRN",
    name: "Чехол Corporate Cooler",
    category: "Чехлы на кулер",
    theme: "Бренд",
    collections: ["Бренд", "Паттерны", "Подарки", "Именные", "Космос"],
    holidays: ["23 февраля", "8 марта"],
    tags: ["Бренд", "Кулер", "Корпоративные", "Подарки", "Паттерны"],
    stock: "made",
    badge: "Офис",
    image: "assets/hero-products-2.png",
    description: "Корпоративные чехлы на кулер с логотипами и паттернами компании.",
    types: ["Чехол"],
    sizes: ["Стандарт", "XL"],
    materials: ["Габардин", "Велюр"],
    basePrice: 405,
    popular: 77,
  },
  {
    id: "cooler-newyear",
    baseSku: "SB-CLR-NY",
    name: "Чехол Snow Office",
    category: "Чехлы на кулер",
    theme: "Новый год",
    collections: ["Подарки", "Паттерны", "Бренд", "Именные", "Животные"],
    holidays: ["Новый год"],
    tags: ["Новый год", "Кулер", "Офис", "Подарки", "Паттерны"],
    stock: "ready",
    badge: "Зима",
    image: "assets/hero-products-3.png",
    description: "Новогодние офисные чехлы на кулер для сезонного оформления.",
    types: ["Чехол"],
    sizes: ["Стандарт", "XL"],
    materials: ["Габардин", "Велюр"],
    basePrice: 398,
    popular: 83,
  },
  {
    id: "plaid-animal",
    baseSku: "SB-PLD-ANM",
    name: "Плед Animal Soft",
    category: "Пледы",
    theme: "Животные",
    collections: ["Животные", "Подарки", "Паттерны", "Именные", "Аниме"],
    holidays: ["День рождения", "Новый год"],
    tags: ["Животные", "Плед", "Подарки", "Новый год", "Именные"],
    stock: "ready",
    badge: "Soft",
    image: "assets/hero-products-1.png",
    description: "Пледы с животными и мягкими паттернами для подарочных подборок.",
    types: TYPE_OPTIONS,
    sizes: SIZE_OPTIONS,
    materials: MATERIAL_OPTIONS,
    basePrice: 260,
    popular: 85,
  },
  {
    id: "plaid-meme",
    baseSku: "SB-PLD-MEM",
    name: "Плед Meme Night",
    category: "Пледы",
    theme: "Мемы",
    collections: ["Мемы", "Игры", "Подарки", "Паттерны", "Космос"],
    holidays: ["День рождения"],
    tags: ["Мемы", "Плед", "Игры", "Подарки", "День рождения"],
    stock: "made",
    badge: "Юмор",
    image: "assets/hero-products-2.png",
    description: "Тестовый плед с мемными принтами для молодежных подборок.",
    types: TYPE_OPTIONS,
    sizes: SIZE_OPTIONS,
    materials: MATERIAL_OPTIONS,
    basePrice: 255,
    popular: 79,
  },
  {
    id: "name-stars",
    baseSku: "SB-NAV-NAM",
    name: "Наволочка Name Stars",
    category: "Наволочки",
    theme: "Именные",
    collections: ["Именные", "Космос", "Подарки", "Паттерны", "Бренд"],
    holidays: ["День рождения", "8 марта"],
    tags: ["Именные", "Космос", "Подарки", "Наволочка", "8 марта"],
    stock: "made",
    badge: "Персонализация",
    image: "assets/hero-products-3.png",
    description: "Именные наволочки для подарочных и корпоративных заказов.",
    types: TYPE_OPTIONS,
    sizes: SIZE_OPTIONS,
    materials: MATERIAL_OPTIONS,
    basePrice: 235,
    popular: 88,
  },
];

const STORAGE = {
  user: "sobag.currentUser",
  users: "sobag.users",
  products: "sobag.products.v8",
  guestCart: "sobag.cart.guest",
};

let products = loadProducts();
let actualSlideIndex = 0;
let actualSlideTimer = null;

const state = {
  filters: {
    category: new Set(),
    collection: new Set(),
    holiday: new Set(),
    size: new Set(),
    material: new Set(),
  },
  filterSearch: {},
  selectedCategory: "",
  selectedCollection: "",
  selectedHoliday: "",
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
    qty: 1,
  },
  adminPreview: [],
};

const productGrid = document.querySelector("#productGrid");
const productCount = document.querySelector("#productCount");
const filterGroups = document.querySelector("#filterGroups");
const categoryTiles = document.querySelector("#categoryTiles");
const actualTiles = document.querySelector("#actualTiles");
const collectionTiles = document.querySelector("#collectionTiles");
const holidayTiles = document.querySelector("#holidayTiles");
const catalogHome = document.querySelector("#catalogHome");
const catalogListing = document.querySelector("#catalogListing");
const catalogTools = document.querySelector("#catalogTools");
const catalogTitle = document.querySelector("#catalogTitle");
const filterToggle = document.querySelector("#filterToggle");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const cartItems = document.querySelector("#cartItems");
const cartEmpty = document.querySelector("#cartEmpty");
const cartCount = document.querySelector("#cartCount");
const cartHeaderTotal = document.querySelector("#cartHeaderTotal");
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
        const price =
          product.basePrice + (typeFactors[type] || 0) + (sizeFactors[size] || 0) + (materialFactors[material] || 0);
        return {
          sku: `${product.baseSku}-${typeCodes[type] || optionCode(type)}-${optionCode(size)}-${
            materialCodes[material] || optionCode(material)
          }`,
          type,
          size,
          material,
          price,
        };
      })
    )
  );
}

function optionCode(value) {
  return String(value)
    .toUpperCase()
    .replace(/[^A-ZА-Я0-9]+/g, "")
    .slice(0, 6);
}

function normalizeListField(product, key, fallback = []) {
  const value = product[key];
  const raw = Array.isArray(value) ? value : splitList(value);
  const backup = Array.isArray(fallback) ? fallback : splitList(fallback);
  return [...new Set((raw.length ? raw : backup).filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];
}

function normalizeTags(product) {
  const rawTags = Array.isArray(product.tags) ? product.tags : splitList(product.tags);
  return [
    ...new Set(
      [product.theme, ...normalizeListField(product, "collections"), ...normalizeListField(product, "holidays"), ...rawTags]
        .filter(Boolean)
        .map((tag) => String(tag).trim())
        .filter(Boolean)
    ),
  ];
}

function productHasCollection(product, collection) {
  return product.collections.includes(collection);
}

function productHasHoliday(product, holiday) {
  return product.holidays.includes(holiday);
}

function normalizeProduct(product) {
  const normalized = {
    ...product,
    types: product.types?.length ? product.types : TYPE_OPTIONS,
    sizes: product.sizes?.length ? product.sizes : SIZE_OPTIONS,
    materials: product.materials?.length ? product.materials : MATERIAL_OPTIONS,
    collections: normalizeListField(product, "collections", product.theme ? [product.theme] : []),
    holidays: normalizeListField(product, "holidays"),
    tags: normalizeTags(product),
    gallery: [...new Set([product.image, ...(product.gallery || []), "assets/hero-products-1.png", "assets/hero-products-2.png", "assets/hero-products-3.png"])].filter(Boolean),
    detailDescription:
      product.detailDescription ||
      "Тестовая карточка показывает, как будет выглядеть товар с несколькими фотографиями, быстрыми тегами и настройкой варианта под оптовую заявку.",
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

function productsForFilterOptions(key) {
  return products.filter((product) => {
    if (state.selectedCategory && product.category !== state.selectedCategory) return false;
    if (state.selectedCollection && !productHasCollection(product, state.selectedCollection)) return false;
    if (state.selectedHoliday && !productHasHoliday(product, state.selectedHoliday)) return false;
    if (key !== "category" && state.filters.category.size && !state.filters.category.has(product.category)) return false;
    if (key !== "collection" && state.filters.collection.size && ![...state.filters.collection].some((collection) => productHasCollection(product, collection))) return false;
    if (key !== "holiday" && state.filters.holiday.size && ![...state.filters.holiday].some((holiday) => productHasHoliday(product, holiday))) return false;

    if (key === "size" || key === "material") {
      return product.variants.some((variant) => {
        if (key !== "size" && state.filters.size.size && !state.filters.size.has(variant.size)) return false;
        if (key !== "material" && state.filters.material.size && !state.filters.material.has(variant.material)) return false;
        return true;
      });
    }

    return true;
  });
}

function uniqueOptions(key) {
  const sourceProducts = productsForFilterOptions(key);
  if (key === "size" || key === "material") {
    const variants = sourceProducts.flatMap((product) => product.variants);
    return [
      ...new Set(
        variants
          .filter((variant) => {
            if (key !== "size" && state.filters.size.size && !state.filters.size.has(variant.size)) return false;
            if (key !== "material" && state.filters.material.size && !state.filters.material.has(variant.material)) return false;
            return true;
          })
          .map((variant) => variant[key])
      ),
    ];
  }
  if (key === "collection") return [...new Set(sourceProducts.flatMap((product) => product.collections))];
  if (key === "holiday") return [...new Set(sourceProducts.flatMap((product) => product.holidays))];
  return [...new Set(sourceProducts.map((product) => product[key]))];
}

function productMatchesFilters(product) {
  const filters = state.filters;
  if (state.selectedCategory && product.category !== state.selectedCategory) return false;
  if (state.selectedCollection && !productHasCollection(product, state.selectedCollection)) return false;
  if (state.selectedHoliday && !productHasHoliday(product, state.selectedHoliday)) return false;
  if (filters.category.size && !filters.category.has(product.category)) return false;
  if (filters.collection.size && ![...filters.collection].some((collection) => productHasCollection(product, collection))) return false;
  if (filters.holiday.size && ![...filters.holiday].some((holiday) => productHasHoliday(product, holiday))) return false;

  const variantFilters = ["size", "material"];
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
  const text = [product.collections.join(" "), product.holidays.join(" "), product.tags.join(" "), product.category, product.description]
    .join(" ")
    .toLowerCase();
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

function renderCatalogHome() {
  const countByCategory = Object.fromEntries(catalogCategories.map((category) => [category.name, 0]));
  products.forEach((product) => {
    countByCategory[product.category] = (countByCategory[product.category] || 0) + 1;
  });

  categoryTiles.innerHTML = catalogCategories
    .map(
      (category) => `
        <button class="category-tile" type="button" data-open-category="${category.name}">
          <span class="category-tile__top">
            <span class="category-tile__icon"><i data-lucide="${category.icon}"></i></span>
            <span class="category-tile__schema" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </span>
          <strong>${category.name}</strong>
          <small>${category.description}</small>
          <b>${countByCategory[category.name] || 0} товаров</b>
        </button>
      `
    )
    .join("");

  actualTiles.innerHTML = actualItems
    .map(
      (item, index) => `
        <button class="actual-tile actual-tile--${index + 1}" type="button" data-open-${item.type}="${item.label}">
          <img src="${item.image}" alt="${item.title}" loading="lazy" />
          <span>${item.title}</span>
          <b>${item.label}</b>
        </button>
      `
    )
    .join("");

  collectionTiles.innerHTML = catalogCollections
    .map(
      (collection) => `
        <button class="theme-tile" type="button" data-open-collection="${collection.name}">
          <i data-lucide="${collection.icon}"></i>
          <span>${collection.name}</span>
        </button>
      `
    )
    .join("");

  holidayTiles.innerHTML = catalogHolidays
    .map(
      (holiday) => `
        <button class="theme-tile" type="button" data-open-holiday="${holiday.name}">
          <i data-lucide="${holiday.icon}"></i>
          <span>${holiday.name}</span>
        </button>
      `
    )
    .join("");

  if (window.lucide) window.lucide.createIcons();
}

function renderCatalogShell() {
  const isHome = !state.selectedCategory && !state.selectedCollection && !state.selectedHoliday && !state.search.trim();
  catalogHome.classList.toggle("is-hidden", !isHome);
  catalogListing.classList.toggle("is-hidden", isHome);
  catalogTools.classList.toggle("is-hidden", isHome);
  document.body.classList.remove("filters-open");
  updateFilterToggle();

  if (isHome) {
    catalogTitle.textContent = "Каталог продукции";
    filterToggle?.classList.add("is-hidden");
    return;
  }

  const titleParts = [];
  if (state.selectedCategory) titleParts.push(state.selectedCategory);
  if (state.selectedCollection) titleParts.push(state.selectedCollection);
  if (state.selectedHoliday) titleParts.push(state.selectedHoliday);
  if (!titleParts.length && state.search.trim()) titleParts.push("Результаты поиска");
  catalogTitle.textContent = titleParts.join(" · ");
  filterToggle?.classList.remove("is-hidden");
  updateFilterToggle();
}

function updateFilterToggle() {
  if (!filterToggle) return;
  const open = document.body.classList.contains("filters-open");
  filterToggle.innerHTML = `<i data-lucide="${open ? "x" : "sliders-horizontal"}"></i> ${open ? "Закрыть фильтры" : "Открыть фильтры"}`;
  if (window.lucide) window.lucide.createIcons();
}

function openCatalogCategory(category) {
  state.selectedCategory = category;
  state.selectedCollection = "";
  state.selectedHoliday = "";
  state.filters.category.clear();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openCatalogCollection(collection) {
  state.selectedCategory = "";
  state.selectedCollection = collection;
  state.selectedHoliday = "";
  state.filters.collection.clear();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openCatalogHoliday(holiday) {
  state.selectedCategory = "";
  state.selectedCollection = "";
  state.selectedHoliday = holiday;
  state.filters.holiday.clear();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function backToCatalogHome() {
  state.selectedCategory = "";
  state.selectedCollection = "";
  state.selectedHoliday = "";
  state.search = "";
  searchInput.value = "";
  Object.values(state.filters).forEach((bucket) => bucket.clear());
  renderCatalogShell();
  renderFilters();
  renderProducts();
}

function renderFilters() {
  const groups = [];
  if (!state.selectedCategory) groups.push({ key: "category", title: "Категории", label: (value) => value });
  if (!state.selectedCollection) groups.push({ key: "collection", title: "Подборки", label: (value) => value });
  if (!state.selectedHoliday) groups.push({ key: "holiday", title: "Праздники", label: (value) => value });
  groups.push(
    { key: "size", title: "Размер", label: (value) => value },
    { key: "material", title: "Материал", label: (value) => value }
  );

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
      return `
        <article class="product-card">
          <div class="product-card__image">
            <button class="product-card__image-button" type="button" data-open-product="${product.id}" aria-label="Открыть ${product.name}">
              <img src="${product.image}" alt="${product.name}" loading="lazy" />
            </button>
            <button class="favorite-button${favorite}" type="button" title="В избранное" data-favorite="${product.id}">
              <i data-lucide="heart"></i>
            </button>
          </div>
          <div class="product-card__body">
            <span class="product-card__sku">${product.baseSku}</span>
            <h3>${product.name}</h3>
            <div class="product-card__bottom">
              <div class="price">
                <strong>от ${formatMoney(product.minPrice)}</strong>
              </div>
              <button class="add-button" type="button" data-open-product="${product.id}">Перейти в карточку</button>
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
  if (cartHeaderTotal) cartHeaderTotal.textContent = formatMoney(totals.total);
  favoriteCount.textContent = state.favorites.size;
  subtotalNode.textContent = formatMoney(totals.subtotal);
  discountValue.textContent = `${averageDiscount}%`;
  grandTotal.textContent = formatMoney(totals.total);
  const cartMinHint = document.querySelector("#cartMinHint");
  const checkoutButton = document.querySelector("#requestForm button[type='submit']");
  const cartReady = totals.total >= MIN_CART_TOTAL;
  if (cartMinHint) {
    cartMinHint.textContent = cartReady
      ? "Минимальная сумма набрана, корзину можно отправлять."
      : `До минимальной суммы осталось ${formatMoney(Math.max(MIN_CART_TOTAL - totals.total, 0))}.`;
  }
  if (checkoutButton) {
    checkoutButton.disabled = !cartReady;
    checkoutButton.innerHTML = cartReady
      ? '<i data-lucide="send"></i> Отправить корзину'
      : `<i data-lucide="lock"></i> Минимум ${formatMoney(MIN_CART_TOTAL)}`;
  }

  const nextTier = quantityTiers.find((tier) => totals.qty < tier.qty);
  const maxTier = quantityTiers[quantityTiers.length - 1];
  discountProgress.style.width = `${Math.min((totals.qty / maxTier.qty) * 100, 100)}%`;
  discountHint.textContent = nextTier
    ? `До скидки ${nextTier.discount}% осталось ${nextTier.qty - totals.qty} шт. в корзине.`
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
  const gallery = product.gallery?.length ? product.gallery : [product.image];
  return `
    <div class="modal is-visible" id="productModal" role="dialog" aria-modal="true">
      <div class="modal__backdrop" data-close-modal></div>
      <section class="modal__panel product-detail">
        <button class="modal__close" type="button" data-close-modal><i data-lucide="x"></i></button>
        <div class="product-detail__layout">
          <div class="product-detail__main">
            <div class="product-detail__media">
              <img id="detailMainImage" src="${gallery[0]}" alt="${product.name}" />
              <div class="product-gallery" aria-label="Фотографии товара">
                ${gallery
                  .map(
                    (image, index) => `
                      <button class="product-gallery__thumb${index === 0 ? " is-active" : ""}" type="button" data-detail-image="${image}" aria-label="Фото ${index + 1}">
                        <img src="${image}" alt="" loading="lazy" />
                      </button>
                    `
                  )
                  .join("")}
              </div>
            </div>
            <div class="product-detail__copy">
              <p class="eyebrow">${product.baseSku}</p>
              <h2>${product.name}</h2>
              <p>${product.description}</p>
              <p class="product-detail__note">${product.detailDescription}</p>
              <div class="detail-tags" aria-label="Быстрые фильтры">
                <button type="button" class="detail-tag" data-open-category="${product.category}">${product.category}</button>
                ${product.collections
                  .map((tag) => `<button type="button" class="detail-tag" data-open-collection="${tag}">${tag}</button>`)
                  .join("")}
                ${product.holidays
                  .map((tag) => `<button type="button" class="detail-tag" data-open-holiday="${tag}">${tag}</button>`)
                  .join("")}
              </div>
            </div>
          </div>
          <aside class="product-detail__options">
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
              Добавить в корзину
            </button>
          </div>
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
    qty: 1,
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
    productImage: product.image,
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
          <input name="theme" type="text" placeholder="Основная подборка" value="Новая подборка" required />
          <input name="collections" type="text" placeholder="Подборки через запятую" value="Новая подборка" />
          <input name="holidays" type="text" placeholder="Праздники через запятую" value="" />
          <input name="tags" type="text" placeholder="Дополнительные теги через запятую" value="Новая подборка" />
          <input name="types" type="text" placeholder="Типы через запятую" value="${TYPE_OPTIONS.join(", ")}" required />
          <input name="sizes" type="text" placeholder="Размеры через запятую" value="${SIZE_OPTIONS.join(", ")}" required />
          <input name="materials" type="text" placeholder="Материалы через запятую" value="${MATERIAL_OPTIONS.join(", ")}" required />
          <input name="basePrice" type="number" min="1" value="220" placeholder="Базовая цена" required />
          <input name="image" type="url" placeholder="URL изображения" value="assets/production-workshop-1.png" />
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
          <p>Колонки: name, baseSku, category, theme, collections, holidays, tags, types, sizes, materials, basePrice, image, stock.</p>
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
    collections: splitList(data.collections || data.theme),
    holidays: splitList(data.holidays || ""),
    tags: splitList(data.tags || data.theme),
    types: splitList(data.types),
    sizes: splitList(data.sizes),
    materials: splitList(data.materials),
    basePrice: Number(data.basePrice),
    image: data.image || "assets/production-workshop-1.png",
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
  renderCatalogHome();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  renderAdminPreview([]);
  showToast("Карточки добавлены в каталог.");
}

function setActualSlide(index) {
  const slides = [...document.querySelectorAll("[data-actual-slide]")];
  if (!slides.length) return;
  actualSlideIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === actualSlideIndex);
  });
}

function nextActualSlide(direction = 1) {
  setActualSlide(actualSlideIndex + direction);
}

function startActualSlider() {
  window.clearInterval(actualSlideTimer);
  actualSlideTimer = window.setInterval(() => nextActualSlide(1), 15000);
}

function initActualSlider() {
  setActualSlide(0);
  startActualSlider();
}

function downloadTemplate() {
  const csv = [
    "name,baseSku,category,theme,collections,holidays,tags,types,sizes,materials,basePrice,image,stock",
    `"Коллекция Sample","SB-PIL-SMP","Подушки и наволочки","Аниме","Аниме, Подарки","Новый год","Аниме, Подарки","Подушка, Наволочка","30x30, 35x35, 40x40, 45x45, 50x50","Велюр, Габардин","220","","ready"`,
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
        theme: String(row.theme || "Без подборки").trim(),
        collections: splitList(row.collections || row.theme || "Без подборки"),
        holidays: splitList(row.holidays || ""),
        tags: splitList(row.tags || row.theme || "Без подборки"),
        types: splitList(row.types || TYPE_OPTIONS.join(",")),
        sizes: splitList(row.sizes || SIZE_OPTIONS.join(",")),
        materials: splitList(row.materials || MATERIAL_OPTIONS.join(",")),
        basePrice: Number(row.basePrice || 220),
        image: row.image || "assets/production-workshop-1.png",
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
    showToast("Сначала добавьте товары в корзину.");
    return;
  }
  const users = getUsers();
  const user = users[state.currentUser];
  const totals = getCartTotals();
  if (totals.total < MIN_CART_TOTAL) {
    showToast(`Минимальная сумма корзины ${formatMoney(MIN_CART_TOTAL)}. Осталось ${formatMoney(MIN_CART_TOTAL - totals.total)}.`);
    return;
  }
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
  showToast(user ? "Корзина сохранена в истории заказов." : "Корзина отправлена. Зарегистрируйтесь, чтобы сохранять историю.");
}

function boot() {
  seedUsers();
  loadCart();
  renderCatalogHome();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  renderCart();
  renderAccountButton();
  initActualSlider();

  document.addEventListener("click", (event) => {
    if (event.target.dataset.closeModal !== undefined) {
      closeModal();
      return;
    }

    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.actualPrev !== undefined) {
      nextActualSlide(-1);
      startActualSlider();
      return;
    }
    if (button.dataset.actualNext !== undefined) {
      nextActualSlide(1);
      startActualSlider();
      return;
    }
    if (button.dataset.openCart !== undefined) {
      const cartWindow = window.open("cart.html", "_blank", "noopener");
      if (!cartWindow) window.location.href = "cart.html";
      return;
    }
    if (button.dataset.scroll) document.querySelector(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (button.dataset.openCategory) {
      closeModal();
      openCatalogCategory(button.dataset.openCategory);
      return;
    }
    if (button.dataset.openCollection) {
      closeModal();
      openCatalogCollection(button.dataset.openCollection);
      return;
    }
    if (button.dataset.openHoliday) {
      closeModal();
      openCatalogHoliday(button.dataset.openHoliday);
      return;
    }
    if (button.dataset.toggleFilters !== undefined) {
      document.body.classList.toggle("filters-open");
      updateFilterToggle();
      return;
    }
    if (button.dataset.backCatalog !== undefined) {
      backToCatalogHome();
      return;
    }
    if (button.id === "accountButton") openAccount();
    if (button.dataset.closeModal !== undefined) closeModal();
    if (button.dataset.openProduct) openProduct(button.dataset.openProduct);
    if (button.dataset.detailImage) {
      const image = document.querySelector("#detailMainImage");
      if (image) image.src = button.dataset.detailImage;
      document.querySelectorAll(".product-gallery__thumb").forEach((node) => node.classList.toggle("is-active", node === button));
    }
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
      renderCatalogShell();
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
      renderFilters();
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
