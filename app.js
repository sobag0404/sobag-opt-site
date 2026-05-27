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
    label: "Новый год",
    type: "holiday",
    image: "assets/hero-products-2.png",
  },
  {
    label: "Аниме",
    type: "collection",
    image: "assets/hero-products-1.png",
  },
  {
    label: "8 марта",
    type: "holiday",
    image: "assets/hero-products-3.png",
  },
];

const defaultSiteContent = {
  brandName: "Sobag Opt",
  brandLogo: "",
  toplinePrimary: "Оптовые партии от 30 000 ₽",
  toplineSecondary: "Печать и пошив под заказ",
  toplineTertiary: "Каталог для селлеров и магазинов",
  navCatalogButton: "каталог",
  navMarketplacesButton: "мы на маркетплейсах",
  cartButton: "корзина",
  heroTitle: "Оптовый текстиль с принтами",
  heroLead:
    "Готовые позиции для продаж и производство под ваш макет: пледы, подушки, наволочки, шопперы и сезонные коллекции для маркетплейсов.",
  heroPrimaryButton: "перейти в каталог",
  heroCustomButton: "изделия с вашим принтом",
  actualTitle: "Актуально",
  heroSpecOneValue: "30 000 ₽",
  heroSpecOneText: "минимальная сумма корзины",
  heroSpecTwoValue: "7 дней",
  heroSpecTwoText: "тестовый срок запуска партии",
  heroSpecThreeValue: "18%",
  heroSpecThreeText: "максимальная скидка по шкале",
  benefitOneTitle: "Скидки по количеству",
  benefitOneText: "Чем больше штук в корзине, тем ниже цена. Уровень считается сразу.",
  benefitTwoTitle: "Свое производство",
  benefitTwoText: "Печать, пошив, упаковка и подготовка к отгрузке в одном процессе.",
  benefitThreeTitle: "Под маркетплейсы",
  benefitThreeText: "Штрихкоды, упаковка, комплектация и поставки партиями.",
  benefitFourTitle: "Корзина без оплаты",
  benefitFourText: "Покупатель собирает корзину, менеджер уточняет наличие и условия.",
  catalogTitleDefault: "Каталог продукции",
  catalogBackButton: "категории",
  catalogHomeTitle: "Выберите категорию",
  catalogHomeSubtitle: "Сначала раздел, потом товары и фильтры",
  catalogActualTitle: "Актуально",
  catalogCollectionsTitle: "Подборки",
  catalogHolidaysTitle: "Праздники",
  filterOpenButton: "открыть фильтры",
  filterCloseButton: "закрыть фильтры",
  requestEyebrow: "Корзина",
  requestTitle: "Оптовый заказ",
  requestEmptyText: "Добавьте товары из каталога",
  requestMinHint: "Минимальная сумма корзины 30 000 ₽.",
  requestSubmitReady: "отправить корзину",
  requestSubmitLocked: "минимум 30 000 ₽",
  wholesaleTitle: "Скидки и условия",
  tierOneLabel: "от 30 000 ₽",
  tierOneValue: "3%",
  tierOneText: "стартовая оптовая скидка",
  tierTwoLabel: "от 70 000 ₽",
  tierTwoValue: "7%",
  tierTwoText: "для регулярных закупок",
  tierThreeLabel: "от 150 000 ₽",
  tierThreeValue: "12%",
  tierThreeText: "для магазинов и селлеров",
  tierFourLabel: "от 300 000 ₽",
  tierFourValue: "18%",
  tierFourText: "индивидуальные условия",
  marketplacesTitle: "Мы на маркетплейсах",
  marketplacesText:
    "Готовые товары Sobag можно смотреть на витринах маркетплейсов, а оптовые партии и индивидуальные принты оформлять через этот сайт.",
  marketplaceOneName: "Wildberries",
  marketplaceOneTitle: "Витрина Sobag",
  marketplaceOneText: "Ссылка будет добавлена после подключения магазина.",
  marketplaceTwoName: "Ozon",
  marketplaceTwoTitle: "Товары в наличии",
  marketplaceTwoText: "Подходит для просмотра готовых коллекций.",
  marketplaceThreeName: "Яндекс Маркет",
  marketplaceThreeTitle: "Проверка ассортимента",
  marketplaceThreeText: "Позже добавим прямую ссылку на магазин.",
  customTitle: "Изделия с вашим принтом",
  customText:
    "Отдельный сценарий для корпоративных клиентов, селлеров и магазинов: загружают задачу, выбирают изделие, тираж, упаковку и получают расчет.",
  customStepOne: "Выбор изделия и ткани",
  customStepTwo: "Проверка макета",
  customStepThree: "Печать и пошив",
  customStepFour: "Упаковка и отгрузка",
  customSubmitButton: "получить расчет",
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
  heroImages: ["assets/production-hero-1.png", "assets/production-workshop-1.png", "assets/production-hero-1.png"],
  actualSlides: actualItems,
};

const siteTextFields = [
  { key: "toplinePrimary", label: "Верхняя строка 1" },
  { key: "toplineSecondary", label: "Верхняя строка 2" },
  { key: "toplineTertiary", label: "Верхняя строка 3" },
  { key: "navCatalogButton", label: "Кнопка шапки: каталог" },
  { key: "navMarketplacesButton", label: "Кнопка шапки: маркетплейсы" },
  { key: "cartButton", label: "Кнопка шапки: корзина" },
  { key: "heroTitle", label: "Заголовок главной" },
  { key: "heroLead", label: "Текст главной", multiline: true, wide: true },
  { key: "heroPrimaryButton", label: "Кнопка главной: каталог" },
  { key: "heroCustomButton", label: "Кнопка главной: свой принт" },
  { key: "actualTitle", label: "Название блока актуально" },
  { key: "heroSpecOneValue", label: "Преимущество 1: цифра" },
  { key: "heroSpecOneText", label: "Преимущество 1: подпись" },
  { key: "heroSpecTwoValue", label: "Преимущество 2: цифра" },
  { key: "heroSpecTwoText", label: "Преимущество 2: подпись" },
  { key: "heroSpecThreeValue", label: "Преимущество 3: цифра" },
  { key: "heroSpecThreeText", label: "Преимущество 3: подпись" },
  { key: "benefitOneTitle", label: "Блок преимуществ 1: заголовок" },
  { key: "benefitOneText", label: "Блок преимуществ 1: текст", multiline: true, wide: true },
  { key: "benefitTwoTitle", label: "Блок преимуществ 2: заголовок" },
  { key: "benefitTwoText", label: "Блок преимуществ 2: текст", multiline: true, wide: true },
  { key: "benefitThreeTitle", label: "Блок преимуществ 3: заголовок" },
  { key: "benefitThreeText", label: "Блок преимуществ 3: текст", multiline: true, wide: true },
  { key: "benefitFourTitle", label: "Блок преимуществ 4: заголовок" },
  { key: "benefitFourText", label: "Блок преимуществ 4: текст", multiline: true, wide: true },
  { key: "catalogTitleDefault", label: "Каталог: заголовок" },
  { key: "catalogBackButton", label: "Каталог: кнопка назад к категориям" },
  { key: "catalogHomeTitle", label: "Каталог: заголовок категорий" },
  { key: "catalogHomeSubtitle", label: "Каталог: подпись категорий" },
  { key: "catalogActualTitle", label: "Каталог: актуально" },
  { key: "catalogCollectionsTitle", label: "Каталог: подборки" },
  { key: "catalogHolidaysTitle", label: "Каталог: праздники" },
  { key: "filterOpenButton", label: "Кнопка: открыть фильтры" },
  { key: "filterCloseButton", label: "Кнопка: закрыть фильтры" },
  { key: "requestEyebrow", label: "Мини-корзина: метка" },
  { key: "requestTitle", label: "Мини-корзина: заголовок" },
  { key: "requestEmptyText", label: "Мини-корзина: пустая корзина" },
  { key: "requestMinHint", label: "Мини-корзина: минимальная сумма" },
  { key: "requestSubmitReady", label: "Кнопка: отправить корзину" },
  { key: "requestSubmitLocked", label: "Кнопка: минимум не набран" },
  { key: "wholesaleTitle", label: "Оптовый блок: заголовок" },
  { key: "tierOneLabel", label: "Скидка 1: условие" },
  { key: "tierOneValue", label: "Скидка 1: процент" },
  { key: "tierOneText", label: "Скидка 1: подпись" },
  { key: "tierTwoLabel", label: "Скидка 2: условие" },
  { key: "tierTwoValue", label: "Скидка 2: процент" },
  { key: "tierTwoText", label: "Скидка 2: подпись" },
  { key: "tierThreeLabel", label: "Скидка 3: условие" },
  { key: "tierThreeValue", label: "Скидка 3: процент" },
  { key: "tierThreeText", label: "Скидка 3: подпись" },
  { key: "tierFourLabel", label: "Скидка 4: условие" },
  { key: "tierFourValue", label: "Скидка 4: процент" },
  { key: "tierFourText", label: "Скидка 4: подпись" },
  { key: "marketplacesTitle", label: "Маркетплейсы: заголовок" },
  { key: "marketplacesText", label: "Маркетплейсы: описание", multiline: true, wide: true },
  { key: "marketplaceOneName", label: "Маркетплейс 1: площадка" },
  { key: "marketplaceOneTitle", label: "Маркетплейс 1: заголовок" },
  { key: "marketplaceOneText", label: "Маркетплейс 1: текст" },
  { key: "marketplaceTwoName", label: "Маркетплейс 2: площадка" },
  { key: "marketplaceTwoTitle", label: "Маркетплейс 2: заголовок" },
  { key: "marketplaceTwoText", label: "Маркетплейс 2: текст" },
  { key: "marketplaceThreeName", label: "Маркетплейс 3: площадка" },
  { key: "marketplaceThreeTitle", label: "Маркетплейс 3: заголовок" },
  { key: "marketplaceThreeText", label: "Маркетплейс 3: текст" },
  { key: "customTitle", label: "Свой принт: заголовок" },
  { key: "customText", label: "Свой принт: описание", multiline: true, wide: true },
  { key: "customStepOne", label: "Свой принт: шаг 1" },
  { key: "customStepTwo", label: "Свой принт: шаг 2" },
  { key: "customStepThree", label: "Свой принт: шаг 3" },
  { key: "customStepFour", label: "Свой принт: шаг 4" },
  { key: "customSubmitButton", label: "Кнопка: получить расчет" },
  { key: "footerBrand", label: "Подвал: название" },
  { key: "footerText", label: "Подвал: описание", multiline: true, wide: true },
  { key: "footerSalesLabel", label: "Подвал: отдел" },
  { key: "footerEmail", label: "Подвал: email" },
  { key: "footerPhone", label: "Подвал: телефон" },
  { key: "cartPageTitle", label: "Страница корзины: заголовок" },
  { key: "cartPageBackButton", label: "Страница корзины: кнопка назад" },
  { key: "cartPageEmptyTitle", label: "Страница корзины: пустая корзина" },
  { key: "cartPageEmptyText", label: "Страница корзины: текст пустой корзины", multiline: true, wide: true },
  { key: "cartDiscountTitle", label: "Страница корзины: скидка" },
  { key: "cartPromoTitle", label: "Страница корзины: промокод" },
  { key: "cartPromoPlaceholder", label: "Страница корзины: поле промокода" },
  { key: "cartPromoButton", label: "Страница корзины: кнопка промокода" },
  { key: "cartCheckoutButton", label: "Страница корзины: кнопка оформления" },
  { key: "checkoutTitle", label: "Форма заказа: заголовок" },
  { key: "checkoutSubmitButton", label: "Форма заказа: кнопка отправки" },
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
  content: "sobag.siteContent.v1",
  theme: "sobag.theme.v1",
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
const themeToggle = document.querySelector("[data-theme-toggle]");

function normalizeSiteContent(content = {}) {
  const actualSlides = Array.isArray(content.actualSlides) && content.actualSlides.length ? content.actualSlides : defaultSiteContent.actualSlides;
  const heroImages = Array.isArray(content.heroImages) && content.heroImages.length ? content.heroImages : defaultSiteContent.heroImages;
  return {
    ...defaultSiteContent,
    ...content,
    heroImages: [0, 1, 2].map((index) => heroImages[index] || defaultSiteContent.heroImages[index]),
    actualSlides: [0, 1, 2].map((index) => ({
      ...defaultSiteContent.actualSlides[index],
      ...(actualSlides[index] || {}),
    })),
  };
}

function getSiteContent() {
  try {
    return normalizeSiteContent(JSON.parse(localStorage.getItem(STORAGE.content) || "null") || {});
  } catch {
    return normalizeSiteContent();
  }
}

function saveSiteContent(content) {
  localStorage.setItem(STORAGE.content, JSON.stringify(normalizeSiteContent(content)));
}

function applyTheme(theme) {
  const isNight = theme === "night";
  document.body.classList.toggle("theme-night", isNight);
  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(isNight));
    themeToggle.innerHTML = `<i data-lucide="${isNight ? "sun" : "moon"}"></i><span>${isNight ? "дневная схема" : "ночная схема"}</span>`;
  }
  if (window.lucide) window.lucide.createIcons();
}

function initTheme() {
  applyTheme(localStorage.getItem(STORAGE.theme) || "default");
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains("theme-night") ? "default" : "night";
  localStorage.setItem(STORAGE.theme, nextTheme);
  applyTheme(nextTheme);
}

function updateButtonText(button, text) {
  if (!button) return;
  const icon = button.querySelector("i")?.outerHTML || "";
  button.innerHTML = `${icon}${buttonLabel(text)}`;
}

function buttonLabel(text) {
  return String(text || "").trim().toLocaleUpperCase("ru-RU");
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}

function setButtonText(selector, value) {
  document.querySelectorAll(selector).forEach((button) => updateButtonText(button, value));
}

function pluralRu(count, one, few, many) {
  const value = Math.abs(Number(count));
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function productWord(count) {
  return pluralRu(count, "товар", "товара", "товаров");
}

function variantWord(count) {
  return pluralRu(count, "вариант", "варианта", "вариантов");
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

function renderHeroActualSlides(content = getSiteContent()) {
  const actual = document.querySelector(".hero__actual");
  if (!actual) return;
  actual.querySelectorAll("[data-actual-slide]").forEach((slide) => slide.remove());
  const slidesHtml = content.actualSlides
    .map((slide, index) => {
      const type = slide.type === "collection" ? "collection" : "holiday";
      return `
        <button class="hero__actual-card${index === actualSlideIndex ? " is-active" : ""}" type="button" data-actual-slide data-open-${type}="${slide.label}">
          <img src="${slide.image}" alt="${slide.label}" />
          <b>${slide.label}</b>
        </button>
      `;
    })
    .join("");
  actual.insertAdjacentHTML("beforeend", slidesHtml);
}

function renderSiteContent() {
  const content = getSiteContent();
  const brand = document.querySelector(".brand");
  const brandMark = document.querySelector(".brand__mark");
  const brandName = document.querySelector(".brand__name");
  const heroTitle = document.querySelector(".hero h1");
  const heroLead = document.querySelector(".hero__lead");
  const toplineItems = document.querySelectorAll(".topline__inner > span");
  if (brand) brand.setAttribute("aria-label", content.brandName);
  if (brandMark) {
    brandMark.innerHTML = content.brandLogo
      ? `<img src="${content.brandLogo}" alt="" />`
      : escapeHtml(String(content.brandName || "S").trim().charAt(0) || "S");
  }
  if (brandName) brandName.innerHTML = brandNameHtml(content.brandName);
  [content.toplinePrimary, content.toplineSecondary, content.toplineTertiary].forEach((value, index) => {
    if (toplineItems[index]) toplineItems[index].textContent = value;
  });
  if (heroTitle) heroTitle.textContent = content.heroTitle;
  if (heroLead) heroLead.textContent = content.heroLead;
  setButtonText(".catalog-button", content.navCatalogButton);
  setButtonText(".nav-link-button", content.navMarketplacesButton);
  setText(".cart-button span", buttonLabel(content.cartButton));
  setButtonText(".hero__actions .primary-button", content.heroPrimaryButton);
  setButtonText(".hero__actions .ghost-button", content.heroCustomButton);
  setText(".hero__actual-head strong", content.actualTitle);
  const heroSpecs = document.querySelectorAll(".hero__specs article");
  [
    [content.heroSpecOneValue, content.heroSpecOneText],
    [content.heroSpecTwoValue, content.heroSpecTwoText],
    [content.heroSpecThreeValue, content.heroSpecThreeText],
  ].forEach(([value, text], index) => {
    heroSpecs[index]?.querySelector("strong") && (heroSpecs[index].querySelector("strong").textContent = value);
    heroSpecs[index]?.querySelector("span") && (heroSpecs[index].querySelector("span").textContent = text);
  });
  const benefitCards = document.querySelectorAll(".benefits article");
  [
    [content.benefitOneTitle, content.benefitOneText],
    [content.benefitTwoTitle, content.benefitTwoText],
    [content.benefitThreeTitle, content.benefitThreeText],
    [content.benefitFourTitle, content.benefitFourText],
  ].forEach(([title, text], index) => {
    benefitCards[index]?.querySelector("strong") && (benefitCards[index].querySelector("strong").textContent = title);
    benefitCards[index]?.querySelector("span") && (benefitCards[index].querySelector("span").textContent = text);
  });
  setButtonText("[data-back-catalog]", content.catalogBackButton);
  setText("#catalogHome .catalog-home__head:not(.catalog-home__head--themes) h3", content.catalogHomeTitle);
  setText("#catalogHome .catalog-home__head:not(.catalog-home__head--themes) span", content.catalogHomeSubtitle);
  const catalogThemeHeads = document.querySelectorAll("#catalogHome .catalog-home__head--themes h3");
  [content.catalogActualTitle, content.catalogCollectionsTitle, content.catalogHolidaysTitle].forEach((value, index) => {
    if (catalogThemeHeads[index]) catalogThemeHeads[index].textContent = value;
  });
  setText(".request-panel .eyebrow", content.requestEyebrow);
  setText(".request-panel h3", content.requestTitle);
  setText("#cartEmpty span", content.requestEmptyText);
  setText("#cartMinHint", content.requestMinHint);
  const wholesaleTitle = document.querySelector(".wholesale h2");
  if (wholesaleTitle) wholesaleTitle.textContent = content.wholesaleTitle;
  const tiers = document.querySelectorAll(".tiers article");
  [
    [content.tierOneLabel, content.tierOneValue, content.tierOneText],
    [content.tierTwoLabel, content.tierTwoValue, content.tierTwoText],
    [content.tierThreeLabel, content.tierThreeValue, content.tierThreeText],
    [content.tierFourLabel, content.tierFourValue, content.tierFourText],
  ].forEach(([label, value, text], index) => {
    tiers[index]?.querySelector("span") && (tiers[index].querySelector("span").textContent = label);
    tiers[index]?.querySelector("strong") && (tiers[index].querySelector("strong").textContent = value);
    tiers[index]?.querySelector("small") && (tiers[index].querySelector("small").textContent = text);
  });
  setText(".marketplaces h2", content.marketplacesTitle);
  setText(".marketplaces .section-head p", content.marketplacesText);
  const marketplaceCards = document.querySelectorAll(".marketplace-card");
  [
    [content.marketplaceOneName, content.marketplaceOneTitle, content.marketplaceOneText],
    [content.marketplaceTwoName, content.marketplaceTwoTitle, content.marketplaceTwoText],
    [content.marketplaceThreeName, content.marketplaceThreeTitle, content.marketplaceThreeText],
  ].forEach(([name, title, text], index) => {
    marketplaceCards[index]?.querySelector("span") && (marketplaceCards[index].querySelector("span").textContent = name);
    marketplaceCards[index]?.querySelector("strong") && (marketplaceCards[index].querySelector("strong").textContent = title);
    marketplaceCards[index]?.querySelector("small") && (marketplaceCards[index].querySelector("small").textContent = text);
  });
  setText(".custom h2", content.customTitle);
  setText(".custom__content p:not(.eyebrow)", content.customText);
  document.querySelectorAll(".custom .steps span").forEach((step, index) => {
    const values = [content.customStepOne, content.customStepTwo, content.customStepThree, content.customStepFour];
    const number = step.querySelector("b")?.outerHTML || `<b>${index + 1}</b>`;
    step.innerHTML = `${number} ${escapeHtml(values[index])}`;
  });
  setButtonText("#briefForm .primary-button", content.customSubmitButton);
  const footer = document.querySelector(".footer");
  if (footer) {
    const footerBrand = footer.querySelector("strong");
    const footerText = footer.querySelector("p");
    const footerLabel = footer.querySelector("span");
    const footerEmail = footer.querySelector('a[href^="mailto:"]');
    const footerPhone = footer.querySelector('a[href^="tel:"]');
    if (footerBrand) footerBrand.textContent = content.footerBrand;
    if (footerText) footerText.textContent = content.footerText;
    if (footerLabel) footerLabel.textContent = content.footerSalesLabel;
    if (footerEmail) {
      footerEmail.textContent = content.footerEmail;
      footerEmail.href = `mailto:${content.footerEmail}`;
    }
    if (footerPhone) footerPhone.textContent = content.footerPhone;
  }
  if (catalogTitle && !state.currentCategory && !state.currentCollection && !state.currentHoliday && !state.query) {
    catalogTitle.textContent = content.catalogTitleDefault;
  }
  document.querySelectorAll(".hero__slideshow .hero__image").forEach((image, index) => {
    image.src = content.heroImages[index] || defaultSiteContent.heroImages[index];
  });
  renderHeroActualSlides(content);
  if (window.lucide) window.lucide.createIcons();
}

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

async function copyText(value, label = "Артикул") {
  const text = String(value || "").trim();
  if (!text) return;
  const fallbackCopy = () => {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    field.style.top = "0";
    document.body.append(field);
    field.focus();
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  };
  try {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        if (!fallbackCopy()) throw new Error("fallback-copy-failed");
      }
    } else if (!fallbackCopy()) {
      throw new Error("fallback-copy-failed");
    }
    showToast(`${label} скопирован: ${text}`);
  } catch {
    showToast("Не удалось скопировать. Попробуйте выделить артикул вручную.");
  }
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
  if (!categoryTiles || !actualTiles || !collectionTiles || !holidayTiles) return;
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
          <b>${countByCategory[category.name] || 0} ${productWord(countByCategory[category.name] || 0)}</b>
        </button>
      `
    )
    .join("");

  actualTiles.innerHTML = actualItems
    .map(
      (item, index) => `
        <button class="actual-tile actual-tile--${index + 1}" type="button" data-open-${item.type}="${item.label}">
          <img src="${item.image}" alt="${item.label}" loading="lazy" />
          <span>${item.label}</span>
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
  if (!catalogHome || !catalogListing || !catalogTools || !catalogTitle) return;
  const isHome = !state.selectedCategory && !state.selectedCollection && !state.selectedHoliday && !state.search.trim();
  catalogHome.classList.toggle("is-hidden", !isHome);
  catalogListing.classList.toggle("is-hidden", isHome);
  catalogTools.classList.toggle("is-hidden", isHome);
  document.body.classList.remove("filters-open");
  updateFilterToggle();

  if (isHome) {
    catalogTitle.textContent = getSiteContent().catalogTitleDefault;
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
  const content = getSiteContent();
  const open = document.body.classList.contains("filters-open");
  filterToggle.innerHTML = `<i data-lucide="${open ? "x" : "sliders-horizontal"}"></i> ${buttonLabel(open ? content.filterCloseButton : content.filterOpenButton)}`;
  if (window.lucide) window.lucide.createIcons();
}

function openCatalogCategory(category) {
  if (!catalogListing || document.body.classList.contains("home-page")) {
    window.location.href = `catalog.html?category=${encodeURIComponent(category)}`;
    return;
  }
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
  if (!catalogListing || document.body.classList.contains("home-page")) {
    window.location.href = `catalog.html?collection=${encodeURIComponent(collection)}`;
    return;
  }
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
  if (!catalogListing || document.body.classList.contains("home-page")) {
    window.location.href = `catalog.html?holiday=${encodeURIComponent(holiday)}`;
    return;
  }
  state.selectedCategory = "";
  state.selectedCollection = "";
  state.selectedHoliday = holiday;
  state.filters.holiday.clear();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function initCatalogRoute() {
  if (!catalogListing) return;
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");
  const collection = params.get("collection");
  const holiday = params.get("holiday");
  const search = params.get("q");
  if (category) state.selectedCategory = category;
  if (collection) state.selectedCollection = collection;
  if (holiday) state.selectedHoliday = holiday;
  if (search) {
    state.search = search;
    if (searchInput) searchInput.value = search;
  }
}

function backToCatalogHome() {
  if (!catalogListing) {
    window.location.href = "catalog.html";
    return;
  }
  state.selectedCategory = "";
  state.selectedCollection = "";
  state.selectedHoliday = "";
  state.search = "";
  if (searchInput) searchInput.value = "";
  Object.values(state.filters).forEach((bucket) => bucket.clear());
  renderCatalogShell();
  renderFilters();
  renderProducts();
}

function renderFilters() {
  if (!filterGroups) return;
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
  if (!productGrid || !productCount) return;
  const list = getFilteredProducts();
  productCount.textContent = `${list.length} ${productWord(list.length)}`;
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
            <div class="product-card__sku-row">
              <span class="product-card__sku">${product.baseSku}</span>
              <button class="copy-sku-button" type="button" data-copy-sku="${product.baseSku}" title="Скопировать артикул" aria-label="Скопировать артикул ${product.baseSku}">
                <i data-lucide="copy"></i>
              </button>
            </div>
            <h3>${product.name}</h3>
            <div class="product-card__bottom">
              <div class="price">
                <strong>от ${formatMoney(product.minPrice)}</strong>
              </div>
              <button class="add-button" type="button" data-open-product="${product.id}">перейти в карточку</button>
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

  if (cartItems) {
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
  }

  cartEmpty?.classList.toggle("is-hidden", lines.length > 0);
  if (cartCount) cartCount.textContent = totals.qty;
  if (cartHeaderTotal) cartHeaderTotal.textContent = formatMoney(totals.total);
  const headerCartButton = cartCount?.closest(".cart-button");
  headerCartButton?.classList.toggle("is-empty", totals.qty === 0);
  if (favoriteCount) favoriteCount.textContent = state.favorites.size;
  if (subtotalNode) subtotalNode.textContent = formatMoney(totals.subtotal);
  if (discountValue) discountValue.textContent = `${averageDiscount}%`;
  if (grandTotal) grandTotal.textContent = formatMoney(totals.total);
  const cartMinHint = document.querySelector("#cartMinHint");
  const checkoutButton = document.querySelector("#requestForm button[type='submit']");
  const content = getSiteContent();
  const cartReady = totals.total >= MIN_CART_TOTAL;
  if (cartMinHint) {
    cartMinHint.textContent = cartReady
      ? "Минимальная сумма набрана, корзину можно отправлять."
      : content.requestMinHint;
  }
  if (checkoutButton) {
    checkoutButton.disabled = !cartReady;
    checkoutButton.innerHTML = cartReady
      ? `<i data-lucide="send"></i> ${buttonLabel(content.requestSubmitReady)}`
      : `<i data-lucide="lock"></i> ${buttonLabel(content.requestSubmitLocked)}`;
  }

  const nextTier = quantityTiers.find((tier) => totals.qty < tier.qty);
  const maxTier = quantityTiers[quantityTiers.length - 1];
  if (discountProgress) discountProgress.style.width = `${Math.min((totals.qty / maxTier.qty) * 100, 100)}%`;
  if (discountHint) {
    discountHint.textContent = nextTier
      ? `До скидки ${nextTier.discount}% осталось ${nextTier.qty - totals.qty} шт. в корзине.`
      : "Максимальная скидка по количеству применена.";
  }

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
              <div class="sku-line__value">
                <strong id="selectedSku">${variant.sku}</strong>
                <button class="copy-sku-button copy-sku-button--detail" type="button" data-copy-sku="${variant.sku}" title="Скопировать артикул" aria-label="Скопировать выбранный артикул ${variant.sku}">
                  <i data-lucide="copy"></i>
                </button>
              </div>
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
  const detailCopySkuButton = modal.querySelector(".copy-sku-button--detail");
  if (detailCopySkuButton) {
    detailCopySkuButton.dataset.copySku = variant.sku;
    detailCopySkuButton.setAttribute("aria-label", `Скопировать выбранный артикул ${variant.sku}`);
  }
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const productTemplateColumns = [
  { key: "name", label: "Название" },
  { key: "baseSku", label: "Начальный артикул" },
  { key: "category", label: "Категория" },
  { key: "theme", label: "Основная подборка" },
  { key: "collections", label: "Подборки" },
  { key: "holidays", label: "Праздники" },
  { key: "tags", label: "Теги" },
  { key: "types", label: "Типы товара" },
  { key: "sizes", label: "Размеры" },
  { key: "materials", label: "Материалы" },
  { key: "basePrice", label: "Базовая цена" },
  { key: "image", label: "URL фото" },
  { key: "stock", label: "Статус" },
];

const productExportOnlyColumns = [
  { key: "description", label: "Краткое описание" },
  { key: "detailDescription", label: "Описание в карточке" },
  { key: "badge", label: "Бейдж" },
  { key: "popular", label: "Популярность" },
  { key: "photoFolder", label: "Папка фото" },
  { key: "gallery", label: "Фото галереи" },
];

const productExportColumns = [...productTemplateColumns, ...productExportOnlyColumns];

function rowValue(row, key) {
  const column = productExportColumns.find((item) => item.key === key);
  return row[key] ?? row[column?.label] ?? "";
}

function adminImageFallback(kind) {
  if (kind === "brandLogo") {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='256' fill='%23fff'/%3E%3Ctext x='256' y='330' text-anchor='middle' font-family='Arial,sans-serif' font-size='250' font-weight='900' fill='%23000'%3ES%3C/text%3E%3C/svg%3E";
  }
  return "assets/production-workshop-1.png";
}

function adminImageUploadHtml(kind, index, image, title, note) {
  return `
    <label class="admin-image-upload admin-image-upload--${kind}">
      <span>${title}</span>
      <img src="${escapeHtml(image || adminImageFallback(kind))}" alt="${escapeHtml(title)}" />
      <input type="file" accept="image/*" data-content-image="${kind}" data-content-index="${index}" />
      <small>${note}</small>
    </label>
  `;
}

function adminActualSlideHtml(slide, index) {
  const collectionSelected = slide.type === "collection" ? "selected" : "";
  const holidaySelected = slide.type !== "collection" ? "selected" : "";
  return `
    <article class="admin-slide-editor" data-admin-slide="${index}">
      ${adminImageUploadHtml("actualSlides", index, slide.image, `Актуально ${index + 1}`, "Рекомендуем: 1440x750 px, JPG/WebP до 1.5 МБ.")}
      <div class="admin-slide-editor__fields">
        <label>
          Надпись на слайде
          <input name="actualLabel${index}" type="text" value="${escapeHtml(slide.label)}" placeholder="Например: Новый год" />
        </label>
        <label>
          Куда ведет слайд
          <select name="actualType${index}">
            <option value="holiday" ${holidaySelected}>Праздник</option>
            <option value="collection" ${collectionSelected}>Подборка</option>
          </select>
        </label>
      </div>
    </article>
  `;
}

function adminModalHtml() {
  const content = getSiteContent();
  return `
    <div class="modal is-visible" id="adminModal" role="dialog" aria-modal="true">
      <div class="modal__backdrop" data-close-modal></div>
      <section class="modal__panel admin-panel">
        <button class="modal__close" type="button" data-close-modal><i data-lucide="x"></i></button>
        <div>
          <p class="eyebrow">Content</p>
          <h2>Контент сайта</h2>
          <p>Тестовое управление контентом. Изображения и тексты сохраняются в этом браузере; для постоянного хранения нужен backend.</p>
        </div>
        <form class="admin-content-form" id="adminContentForm">
          <div class="admin-content-grid">
            <label>
              Название сайта
              <input name="brandName" type="text" value="${escapeHtml(content.brandName)}" />
            </label>
            ${siteTextFields.map((field) => renderTextField(field, content)).join("")}
          </div>
          <div class="admin-content-section">
            <h3>Логотип в шапке</h3>
            <div class="admin-image-grid admin-image-grid--logo">
              ${adminImageUploadHtml("brandLogo", 0, content.brandLogo, "Логотип", "Рекомендуем: PNG/WebP 512x512 px, прозрачный фон, до 1.5 МБ.")}
            </div>
          </div>
          <div class="admin-content-section">
            <h3>Фото главной страницы</h3>
            <div class="admin-image-grid">
              ${content.heroImages
                .map((image, index) => adminImageUploadHtml("heroImages", index, image, `Главное фото ${index + 1}`, "Рекомендуем: 1920x1200 px, JPG/WebP до 1.5 МБ."))
                .join("")}
            </div>
          </div>
          <div class="admin-content-section">
            <h3>Вкладка Актуально</h3>
            <div class="admin-slides-grid">
              ${content.actualSlides.map((slide, index) => adminActualSlideHtml(slide, index)).join("")}
            </div>
          </div>
          <div class="admin-actions">
            <button class="primary-button" type="submit">Сохранить контент</button>
            <button class="ghost-button" type="button" data-reset-content>Сбросить контент</button>
          </div>
        </form>
        <div class="admin-divider"></div>
        <div>
          <p class="eyebrow">Admin</p>
          <h2>Массовое создание карточек</h2>
          <p>Задайте начальный артикул и группы вариантов. Сайт создаст все комбинации: тип × размер × материал.</p>
        </div>
        <form class="admin-form" id="adminGenerator">
          <label>
            Название
            <input name="name" type="text" placeholder="Название коллекции" value="Коллекция New Print" required />
          </label>
          <label>
            Начальный артикул
            <input name="baseSku" type="text" placeholder="SB-PIL-NEW" value="SB-PIL-NEW" required />
          </label>
          <label>
            Категория
            <input name="category" type="text" placeholder="Подушки" value="Подушки" required />
          </label>
          <label>
            Основная подборка
            <input name="theme" type="text" placeholder="Новая подборка" value="Новая подборка" required />
          </label>
          <label>
            Подборки
            <input name="collections" type="text" placeholder="Через запятую" value="Новая подборка" />
          </label>
          <label>
            Праздники
            <input name="holidays" type="text" placeholder="Через запятую" value="" />
          </label>
          <label>
            Теги
            <input name="tags" type="text" placeholder="Через запятую" value="Новая подборка" />
          </label>
          <label>
            Типы товара
            <input name="types" type="text" placeholder="Через запятую" value="${TYPE_OPTIONS.join(", ")}" required />
          </label>
          <label>
            Размеры
            <input name="sizes" type="text" placeholder="Через запятую" value="${SIZE_OPTIONS.join(", ")}" required />
          </label>
          <label>
            Материалы
            <input name="materials" type="text" placeholder="Через запятую" value="${MATERIAL_OPTIONS.join(", ")}" required />
          </label>
          <label>
            Базовая цена
            <input name="basePrice" type="number" min="1" value="220" placeholder="Цена за единицу" required />
          </label>
          <label>
            Фото товара
            <input name="image" type="url" placeholder="URL изображения" value="assets/production-workshop-1.png" />
            <small class="field-note">Рекомендуем: квадрат 1200x1200 px, JPG/WebP. В каталоге все фото будут отображаться квадратом.</small>
          </label>
          <label>
            Статус
            <select name="stock">
              <option value="ready">В наличии</option>
              <option value="made">Под заказ</option>
            </select>
          </label>
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
          <p>Колонки шаблона: ${productExportColumns.map((column) => column.label).join(", ")}.</p>
          <p>Фото товаров в импорте: квадрат 1200x1200 px. Пока можно указать ссылку в колонке «URL фото», а для будущей привязки локальных папок заполнить «Папка фото».</p>
          <div class="admin-actions">
            <button class="ghost-button" type="button" data-export-products>Скачать все товары</button>
            <button class="ghost-button" type="button" data-export-filtered-products>Скачать товары по текущим фильтрам</button>
          </div>
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
              <span>${product.baseSku} · ${product.variants.length} ${variantWord(product.variants.length)}</span>
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

function csvCell(value) {
  const prepared = Array.isArray(value) ? value.join(", ") : value ?? "";
  return `"${String(prepared).replaceAll('"', '""')}"`;
}

function downloadCsv(fileName, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadTemplate() {
  downloadCsv("sobag-products-template.csv", [
    productExportColumns.map((column) => column.label),
    [
      "Коллекция Sample",
      "SB-PIL-SMP",
      "Подушки",
      "Аниме",
      "Аниме, Подарки",
      "Новый год",
      "Аниме, Подарки, интерьер",
      "Подушка, Наволочка",
      "30x30, 35x35, 40x40, 45x45, 50x50",
      "Велюр, Габардин",
      "220",
      "",
      "made",
      "Краткое описание для каталога",
      "Подробное описание для карточки товара",
      "Новинка",
      "60",
      "SB-PIL-SMP",
      "2.jpg, 3.jpg, 4.jpg",
    ],
  ]);
}

function productGalleryForExport(product) {
  const generatedImages = new Set(["assets/hero-products-1.png", "assets/hero-products-2.png", "assets/hero-products-3.png"]);
  return (product.gallery || [])
    .filter((image) => image && image !== product.image && !generatedImages.has(image))
    .join(", ");
}

function productExportValue(product, key) {
  if (["types", "sizes", "materials", "collections", "holidays", "tags"].includes(key)) {
    return product[key] || [];
  }
  if (key === "gallery") return productGalleryForExport(product);
  if (key === "photoFolder") return product.photoFolder || product.baseSku;
  return product[key] ?? "";
}

function productExportRow(product) {
  return productExportColumns.map((column) => productExportValue(product, column.key));
}

function downloadProductsCsv(source, fileName) {
  const rows = source.map(productExportRow);
  downloadCsv(fileName, [productExportColumns.map((column) => column.label), ...rows]);
  showToast(`Скачано товаров: ${source.length}.`);
}

async function importExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
  const imported = rows
    .filter((row) => rowValue(row, "name") && rowValue(row, "baseSku"))
    .map((row) =>
      normalizeProduct({
        id: `${rowValue(row, "baseSku")}-${Date.now()}-${Math.random().toString(16).slice(2)}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        baseSku: String(rowValue(row, "baseSku")).trim().toUpperCase(),
        name: String(rowValue(row, "name")).trim(),
        category: String(rowValue(row, "category") || "Подушки").trim(),
        theme: String(rowValue(row, "theme") || "Без подборки").trim(),
        collections: splitList(rowValue(row, "collections") || rowValue(row, "theme") || "Без подборки"),
        holidays: splitList(rowValue(row, "holidays") || ""),
        tags: splitList(rowValue(row, "tags") || rowValue(row, "theme") || "Без подборки"),
        types: splitList(rowValue(row, "types") || TYPE_OPTIONS.join(",")),
        sizes: splitList(rowValue(row, "sizes") || SIZE_OPTIONS.join(",")),
        materials: splitList(rowValue(row, "materials") || MATERIAL_OPTIONS.join(",")),
        basePrice: Number(rowValue(row, "basePrice") || 220),
        image: rowValue(row, "image") || "assets/production-workshop-1.png",
        stock: rowValue(row, "stock") || "made",
        gallery: splitList(rowValue(row, "gallery") || ""),
        photoFolder: rowValue(row, "photoFolder") || rowValue(row, "baseSku"),
        badge: rowValue(row, "badge") || "Excel",
        description: rowValue(row, "description") || "Карточка импортирована из Excel.",
        detailDescription: rowValue(row, "detailDescription") || "Карточка импортирована из Excel. Фото и параметры можно уточнить перед публикацией.",
        popular: Number(rowValue(row, "popular") || 55),
      })
    );
  renderAdminPreview(imported);
  showToast(`Из Excel загружено карточек: ${imported.length}.`);
}

function readContentFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 1_500_000) {
    showToast("Изображение слишком тяжелое для тестового localStorage. Лучше загрузить файл до 1.5 МБ.");
    input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    input.dataset.imageValue = String(reader.result);
    const preview = input.closest(".admin-image-upload")?.querySelector("img");
    if (preview) preview.src = String(reader.result);
    showToast("Изображение загружено в предпросмотр. Нажмите «Сохранить контент».");
  });
  reader.readAsDataURL(file);
}

function contentFromAdminForm(form) {
  const current = getSiteContent();
  const data = Object.fromEntries(new FormData(form).entries());
  const brandLogoInput = form.querySelector('[data-content-image="brandLogo"][data-content-index="0"]');
  const heroImages = [0, 1, 2].map((index) => {
    const input = form.querySelector(`[data-content-image="heroImages"][data-content-index="${index}"]`);
    return input?.dataset.imageValue || current.heroImages[index] || defaultSiteContent.heroImages[index];
  });
  const actualSlides = [0, 1, 2].map((index) => {
    const input = form.querySelector(`[data-content-image="actualSlides"][data-content-index="${index}"]`);
    return {
      label: data[`actualLabel${index}`] || current.actualSlides[index].label,
      type: data[`actualType${index}`] || current.actualSlides[index].type,
      image: input?.dataset.imageValue || current.actualSlides[index].image || defaultSiteContent.actualSlides[index].image,
    };
  });
  const textContent = Object.fromEntries(
    siteTextFields.map((field) => [field.key, data[field.key] || defaultSiteContent[field.key] || ""])
  );
  return normalizeSiteContent({
    ...textContent,
    brandName: data.brandName || defaultSiteContent.brandName,
    brandLogo: brandLogoInput?.dataset.imageValue || current.brandLogo || defaultSiteContent.brandLogo,
    heroImages,
    actualSlides,
  });
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
  initTheme();
  initCatalogRoute();
  loadCart();
  renderCatalogHome();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  renderCart();
  renderAccountButton();
  renderSiteContent();
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
    if (button.dataset.themeToggle !== undefined) {
      toggleTheme();
      return;
    }
    if (button.dataset.nav) {
      window.location.href = button.dataset.nav;
      return;
    }
    if (button.dataset.openCart !== undefined) {
      window.location.href = "cart.html";
      return;
    }
    if (button.dataset.scroll) {
      const target = document.querySelector(button.dataset.scroll);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        const routes = {
          "#catalog": "catalog.html",
          "#custom": "custom.html",
          "#briefForm": "custom.html#briefForm",
          "#marketplaces": "marketplaces.html",
          "#wholesale": "index.html#wholesale",
        };
        if (routes[button.dataset.scroll]) window.location.href = routes[button.dataset.scroll];
      }
      return;
    }
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
    if (button.dataset.copySku) {
      copyText(button.dataset.copySku);
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
    if (button.dataset.exportProducts !== undefined) downloadProductsCsv(products, "sobag-products-all.csv");
    if (button.dataset.exportFilteredProducts !== undefined) downloadProductsCsv(getFilteredProducts(), "sobag-products-filtered.csv");
    if (button.dataset.resetContent !== undefined) {
      localStorage.removeItem(STORAGE.content);
      renderSiteContent();
      closeModal();
      openAdmin();
      showToast("Контент сброшен к тестовым значениям.");
      return;
    }
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
    if (event.target.dataset.contentImage) readContentFile(event.target);
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
    if (event.target.id === "adminContentForm") {
      event.preventDefault();
      saveSiteContent(contentFromAdminForm(event.target));
      renderSiteContent();
      showToast("Контент сайта сохранен в этом браузере.");
    }
  });

  if (window.lucide) window.lucide.createIcons();
}

boot();
