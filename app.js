const TYPE_OPTIONS = ["Подушка", "Наволочка"];
const SIZE_OPTIONS = ["30x30", "35x35", "40x40", "45x45", "50x50"];
const MATERIAL_OPTIONS = ["Велюр", "Габардин"];

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
const basketDiscountTiers = [
  { amount: MIN_CART_TOTAL, discount: 5 },
  { amount: 70000, discount: 7 },
  { amount: 150000, discount: 12 },
  { amount: 300000, discount: 18 },
];

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
    image: "assets/product-preview-live/opt-22434/3.webp",
  },
  {
    label: "Аниме",
    type: "collection",
    image: "assets/product-preview-live/opt-22441/3.webp",
  },
  {
    label: "8 марта",
    type: "holiday",
    image: "assets/product-preview-live/opt-98081/4.webp",
  },
];

const taxonomyAliases = {
  однотонный: "Однотонные",
  однотонная: "Однотонные",
  однотонное: "Однотонные",
  однотонные: "Однотонные",
  детский: "Детские",
  детская: "Детские",
  детское: "Детские",
  детские: "Детские",
  дети: "Детские",
  животное: "Животные",
  животный: "Животные",
  животные: "Животные",
  мем: "Мемы",
  мемы: "Мемы",
  паттерн: "Паттерны",
  паттерны: "Паттерны",
  цветок: "Цветы",
  цветы: "Цветы",
  именной: "Именные",
  именные: "Именные",
  военный: "Военные",
  военные: "Военные",
  подарок: "Подарки",
  подарки: "Подарки",
  игра: "Игры",
  игры: "Игры",
  "9мая": "9 мая",
  "9 мая": "9 мая",
};

const PRODUCT_STATUSES = ["draft", "published", "hidden", "archive"];
const PRODUCT_STATUS_LABELS = {
  draft: "Черновик",
  published: "Опубликован",
  hidden: "Скрыт",
  archive: "Архив",
};

function productStatusFromValue(value) {
  const prepared = String(value || "").trim().toLocaleLowerCase("ru-RU");
  const aliases = {
    draft: "draft",
    "черновик": "draft",
    published: "published",
    "опубликован": "published",
    "опубликовано": "published",
    "публикация": "published",
    hidden: "hidden",
    "скрыт": "hidden",
    "скрыто": "hidden",
    archive: "archive",
    archived: "archive",
    "архив": "archive",
    "архивный": "archive",
  };
  return aliases[prepared] || "";
}

function normalizeProductStatus(product) {
  return productStatusFromValue(product?.status) || (product?.hidden ? "hidden" : "published");
}

function productStatusLabel(status) {
  return PRODUCT_STATUS_LABELS[productStatusFromValue(status) || status] || PRODUCT_STATUS_LABELS.published;
}

function isProductPublished(product) {
  return normalizeProductStatus(product) === "published";
}

const defaultSiteContent = {
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
  heroTitle: "Оптовый текстиль с принтами",
  heroLead:
    "Готовые позиции для продаж и производство под ваш макет: пледы, подушки, наволочки, шопперы и сезонные коллекции для маркетплейсов.",
  heroPrimaryButton: "перейти в каталог",
  heroCustomButton: "изделия с вашим принтом",
  actualTitle: "Актуально",
  heroSpecOneValue: "30 000 ₽",
  heroSpecOneText: "минимальная сумма заказа",
  heroSpecTwoValue: "7 дней",
  heroSpecTwoText: "тестовый запуск партии",
  heroSpecThreeValue: "до 18%",
  heroSpecThreeText: "скидка при заказе",
  benefitOneTitle: "Скидка от суммы заказа",
  benefitOneText: "Чем больше сумма в корзине, тем ниже цена. Скидка пересчитывается сразу.",
  benefitTwoTitle: "Свое производство",
  benefitTwoText: "Печать, пошив, упаковка и подготовка к отгрузке в одном месте.",
  benefitThreeTitle: "Для маркетплейсов",
  benefitThreeText: "Производство, упаковка, штрихкоды, комплектация и поставки партиями.",
  benefitFourTitle: "Прямая связь",
  benefitFourText: "Личный менеджер и общение напрямую с производством по каждому заказу.",
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
  businessPageTitle: "Условия для бизнеса",
  businessPageLead:
    "Рабочие тестовые условия для магазинов, селлеров и корпоративных клиентов: скидка от суммы заказа, производство в одном месте и сопровождение менеджера.",
  businessMinimumTitle: "Минимальный заказ",
  businessMinimumText: "Минимальная сумма для оформления оптовой заявки — 30 000 ₽. До этой суммы товары можно добавлять в корзину, сохранять подборку и готовить заказ к отправке менеджеру.",
  businessDiscountTitle: "Скидка от суммы",
  businessDiscountText: "Скидка пересчитывается автоматически по общей сумме корзины: от 30 000 ₽, 70 000 ₽, 150 000 ₽ и 300 000 ₽. Чем больше партия, тем ниже цена за единицу товара.",
  businessProductionTitle: "Производство и комплектация",
  businessProductionText: "Печать, раскрой, пошив, упаковка, маркировка и подготовка к отгрузке выполняются в одном процессе. Для теста считаем, что стандартная партия запускается за 7 рабочих дней после согласования.",
  businessManagerTitle: "Связь с менеджером",
  businessManagerText: "После отправки корзины менеджер связывается с покупателем, уточняет наличие, сроки, упаковку, город отгрузки и помогает довести заказ до запуска.",
  businessDocumentsTitle: "Документы и согласования",
  businessDocumentsText: "Реквизиты, счет, макеты, штрихкоды, упаковку и требования маркетплейсов можно согласовать до запуска партии. Финальные условия фиксируются в счете, договоре или переписке с менеджером.",
  aboutPageTitle: "О компании Sobag Opt",
  aboutPageLead:
    "Sobag Opt — тестовый B2B-каталог для оптовых продаж текстиля с принтами и заказов на производство под макет покупателя.",
  aboutPageText:
    "Мы работаем с магазинами, селлерами и корпоративными клиентами: помогаем подобрать товар, собрать партию, рассчитать скидку, подготовить упаковку и передать заказ в производство. Эти данные тестовые, позже здесь будут реальные факты о компании.",
  aboutPageProductionTitle: "Производство текстиля с принтами",
  aboutPageProductionText:
    "В тестовой модели производство включает печать, раскрой, пошив, контроль качества, упаковку, маркировку и подготовку к отгрузке. Один принт можно выпускать в разных изделиях, размерах и материалах.",
  contactsPageTitle: "Контакты",
  contactsPageLead: "Тестовые контакты отдела опта. Позже здесь будут реальные телефон, почта, адрес производства и карта.",
  contactsAddress: "Москва, ул. Текстильщиков, 12, стр. 2",
  contactsSchedule: "Пн-Пт, 10:00-18:00 по Москве",
  contactsMapButton: "показать на карте",
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
  heroImages: ["assets/production-hero-1.png", "assets/production-workshop-1.png", "assets/production-hero-1.png"],
  catalogCategories,
  catalogCollections,
  catalogHolidays,
  actualSlides: actualItems,
};

const siteTextFields = [
  { key: "toplinePrimary", label: "Верхняя строка 1" },
  { key: "toplineSecondary", label: "Верхняя строка 2" },
  { key: "toplineTertiary", label: "Верхняя строка 3" },
  { key: "navCatalogButton", label: "Кнопка шапки: каталог" },
  { key: "navBusinessButton", label: "Кнопка шапки: условия" },
  { key: "navMarketplacesButton", label: "Кнопка шапки: маркетплейсы" },
  { key: "navAboutButton", label: "Кнопка шапки: о компании" },
  { key: "navContactsButton", label: "Кнопка шапки: контакты" },
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
  { key: "businessPageTitle", label: "Условия для бизнеса: заголовок" },
  { key: "businessPageLead", label: "Условия для бизнеса: вступление", multiline: true, wide: true },
  { key: "businessMinimumTitle", label: "Условия: минимальный заказ" },
  { key: "businessMinimumText", label: "Условия: текст минимального заказа", multiline: true, wide: true },
  { key: "businessDiscountTitle", label: "Условия: скидка" },
  { key: "businessDiscountText", label: "Условия: текст скидки", multiline: true, wide: true },
  { key: "businessProductionTitle", label: "Условия: производство" },
  { key: "businessProductionText", label: "Условия: текст производства", multiline: true, wide: true },
  { key: "businessManagerTitle", label: "Условия: менеджер" },
  { key: "businessManagerText", label: "Условия: текст менеджера", multiline: true, wide: true },
  { key: "businessDocumentsTitle", label: "Условия: документы" },
  { key: "businessDocumentsText", label: "Условия: текст документов", multiline: true, wide: true },
  { key: "aboutPageTitle", label: "О компании: заголовок" },
  { key: "aboutPageLead", label: "О компании: вступление", multiline: true, wide: true },
  { key: "aboutPageText", label: "О компании: основной текст", multiline: true, wide: true },
  { key: "aboutPageProductionTitle", label: "О компании: блок производства" },
  { key: "aboutPageProductionText", label: "О компании: текст производства", multiline: true, wide: true },
  { key: "contactsPageTitle", label: "Контакты: заголовок" },
  { key: "contactsPageLead", label: "Контакты: вступление", multiline: true, wide: true },
  { key: "contactsAddress", label: "Контакты: адрес для Яндекс Карт" },
  { key: "contactsSchedule", label: "Контакты: график" },
  { key: "contactsMapButton", label: "Контакты: кнопка карты" },
  { key: "footerBrand", label: "Подвал: название" },
  { key: "footerText", label: "Подвал: описание", multiline: true, wide: true },
  { key: "footerSalesLabel", label: "Подвал: отдел" },
  { key: "footerEmail", label: "Подвал: email" },
  { key: "footerPhone", label: "Подвал: телефон" },
  { key: "footerCompanyTitle", label: "Подвал: колонка Компания" },
  { key: "footerCompanyLinks", label: "Подвал: ссылки Компания через |", multiline: true, wide: true },
  { key: "footerClientsTitle", label: "Подвал: колонка Клиентам" },
  { key: "footerClientsLinks", label: "Подвал: ссылки Клиентам через |", multiline: true, wide: true },
  { key: "footerPartnersTitle", label: "Подвал: колонка Партнерам" },
  { key: "footerPartnersLinks", label: "Подвал: ссылки Партнерам через |", multiline: true, wide: true },
  { key: "footerContactsTitle", label: "Подвал: колонка Контакты" },
  { key: "footerAddress", label: "Подвал: адрес", multiline: true, wide: true },
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


const siteTextFieldPages = [
  {
    title: "Общие настройки сайта",
    note: "Название, верхнее меню, кнопки шапки и корзина. Эти элементы видны почти на всех страницах.",
    keys: ["toplinePrimary", "toplineSecondary", "toplineTertiary", "navCatalogButton", "navBusinessButton", "navMarketplacesButton", "navAboutButton", "navContactsButton", "cartButton"],
  },
  {
    title: "Страница: главная",
    note: "Первый экран, блок Актуально, преимущества и условия для бизнеса на главной странице.",
    keys: ["heroTitle", "heroLead", "heroPrimaryButton", "heroCustomButton", "actualTitle", "heroSpecOneValue", "heroSpecOneText", "heroSpecTwoValue", "heroSpecTwoText", "heroSpecThreeValue", "heroSpecThreeText", "benefitOneTitle", "benefitOneText", "benefitTwoTitle", "benefitTwoText", "benefitThreeTitle", "benefitThreeText", "benefitFourTitle", "benefitFourText", "wholesaleTitle", "tierOneLabel", "tierOneValue", "tierOneText", "tierTwoLabel", "tierTwoValue", "tierTwoText", "tierThreeLabel", "tierThreeValue", "tierThreeText", "tierFourLabel", "tierFourValue", "tierFourText"],
  },
  {
    title: "Страница: каталог",
    note: "Главная каталога, фильтры и боковая мини-корзина внутри каталога.",
    keys: ["catalogTitleDefault", "catalogBackButton", "catalogHomeTitle", "catalogHomeSubtitle", "catalogActualTitle", "catalogCollectionsTitle", "catalogHolidaysTitle", "filterOpenButton", "filterCloseButton", "requestEyebrow", "requestTitle", "requestEmptyText", "requestMinHint", "requestSubmitReady", "requestSubmitLocked"],
  },
  {
    title: "Страница: мы на маркетплейсах",
    note: "Отдельная страница со ссылками и описаниями витрин.",
    keys: ["marketplacesTitle", "marketplacesText", "marketplaceOneName", "marketplaceOneTitle", "marketplaceOneText", "marketplaceTwoName", "marketplaceTwoTitle", "marketplaceTwoText", "marketplaceThreeName", "marketplaceThreeTitle", "marketplaceThreeText"],
  },
  {
    title: "Страница: изделия с вашим принтом",
    note: "Текст калькулятора/брифа для заказов под макет клиента.",
    keys: ["customTitle", "customText", "customStepOne", "customStepTwo", "customStepThree", "customStepFour", "customSubmitButton"],
  },
  {
    title: "Страница: условия для бизнеса",
    note: "Отдельная страница с правилами опта, скидками, производством и работой менеджера.",
    keys: ["businessPageTitle", "businessPageLead", "businessMinimumTitle", "businessMinimumText", "businessDiscountTitle", "businessDiscountText", "businessProductionTitle", "businessProductionText", "businessManagerTitle", "businessManagerText", "businessDocumentsTitle", "businessDocumentsText"],
  },
  {
    title: "Страница: о компании",
    note: "Отдельная страница с описанием компании, производства и оптового направления.",
    keys: ["aboutPageTitle", "aboutPageLead", "aboutPageText", "aboutPageProductionTitle", "aboutPageProductionText"],
  },
  {
    title: "Страница: контакты",
    note: "Отдельная страница контактов, адрес для Яндекс Карт и график работы.",
    keys: ["contactsPageTitle", "contactsPageLead", "contactsAddress", "contactsSchedule", "contactsMapButton"],
  },
  {
    title: "Страница: корзина и оформление",
    note: "Отдельная страница корзины, промокод и модальное окно оформления заказа.",
    keys: ["cartPageTitle", "cartPageBackButton", "cartPageEmptyTitle", "cartPageEmptyText", "cartDiscountTitle", "cartPromoTitle", "cartPromoPlaceholder", "cartPromoButton", "cartCheckoutButton", "checkoutTitle", "checkoutSubmitButton"],
  },
  {
    title: "Контакты и подвал",
    note: "Нижний блок сайта и контактные данные отдела опта.",
    keys: ["footerBrand", "footerText", "footerSalesLabel", "footerEmail", "footerPhone", "footerCompanyTitle", "footerCompanyLinks", "footerClientsTitle", "footerClientsLinks", "footerPartnersTitle", "footerPartnersLinks", "footerContactsTitle", "footerAddress"],
  },
];

const adminPageAnchors = ["global", "home", "catalog", "marketplaces", "custom", "business", "about", "contacts", "cart", "footer"];

const siteTextFieldGroups = siteTextFieldPages.map((group, index) => ({
  ...group,
  anchor: adminPageAnchors[index] || `section-${index + 1}`,
  fields: group.keys.map((key) => siteTextFields.find((field) => field.key === key)).filter(Boolean),
}));
const productDrafts = [];
const FAVORITES_KEY = "sobag.favorites";
const FAVORITES_PREFIX = "sobag.favorites.";
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

const STORAGE = {
  user: "sobag.currentUser",
  users: "sobag.users",
  products: "sobag.products.v8",
  content: "sobag.siteContent.v1",
  importBatches: "sobag.importBatches.v1",
  theme: "sobag.theme.v1",
  guestCart: "sobag.cart.guest",
  guestSavedCarts: "sobag.savedCarts.guest",
  savedCartsPrefix: "sobag.savedCarts.",
  orders: "sobag.orders.v1",
  recentProducts: "sobag.recentProducts.v1",
};

let products = loadProducts();
let actualSlideIndex = 0;
let actualSlideTimer = null;
let lastFocusedElement = null;
let catalogHomeHasAnimated = false;
const focusableSelector =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  visibleLimit: 120,
  serverCatalog: {
    status: "idle",
    key: "",
    requestId: 0,
    items: [],
    total: 0,
    facets: {},
    facetOptions: {},
    nextCursor: "",
    hasMore: false,
    source: "",
    loadingMore: false,
  },
  cart: new Map(),
  favorites: new Set(cleanFavoriteIds(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"))),
  recentProducts: cleanFavoriteIds(JSON.parse(localStorage.getItem(STORAGE.recentProducts) || "[]")),
  currentUser: localStorage.getItem(STORAGE.user) || "",
  activeProductId: null,
  activeVariant: {
    type: "Подушка",
    size: "40x40",
    material: "Габардин",
    qty: 1,
  },
  productReviews: [],
  adminReviews: [],
  adminPreview: [],
  importPhotoFiles: [],
  importPhotoReport: [],
  importPhotoUploading: false,
  importBatches: loadStoredImportBatches(),
  activeImportBatchId: "",
  importUpdateExisting: false,
  pricePreview: [],
};

const productGrid = document.querySelector("#productGrid");
const productCount = document.querySelector("#productCount");
const filterGroups = document.querySelector("#filterGroups");
const activeFilterChips = document.querySelector("#activeFilterChips");
const searchResultsPanel = document.querySelector("#searchResultsPanel");
const catalogLoadMore = document.querySelector("#catalogLoadMore");
const recentProductsSection = document.querySelector("#recentProductsSection");
const recentProductsNode = document.querySelector("#recentProducts");
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
const isFavoritesPage = document.body.classList.contains("favorites-page");
const isSearchPage = document.body.classList.contains("search-page");
const isAdminOrdersPage = document.body.classList.contains("admin-orders-page");
const isAdminOrderPage = document.body.classList.contains("admin-order-page");
const isAdminCustomerPage = document.body.classList.contains("admin-customer-page");
const isAdminProductsPage = document.body.classList.contains("admin-products-page");
const isAdminPricesPage = document.body.classList.contains("admin-prices-page");
const isAdminImportPage = document.body.classList.contains("admin-import-page");
let personalStateReady = !state.currentUser;

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
      if (options.description) {
        prepared.description = String(item.description || fallback.description || "").trim();
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
    heroSpecTwoText: ["тестовый срок запуска партии", defaultSiteContent.heroSpecTwoText],
    heroSpecThreeValue: ["18%", defaultSiteContent.heroSpecThreeValue],
    heroSpecThreeText: ["максимальная скидка по шкале", defaultSiteContent.heroSpecThreeText],
    benefitOneTitle: ["Скидки по количеству", defaultSiteContent.benefitOneTitle],
    benefitOneText: ["Чем больше штук в корзине, тем ниже цена. Уровень считается сразу.", defaultSiteContent.benefitOneText],
    benefitTwoText: ["Печать, пошив, упаковка и подготовка к отгрузке в одном процессе.", defaultSiteContent.benefitTwoText],
    benefitThreeTitle: ["Под маркетплейсы", defaultSiteContent.benefitThreeTitle],
    benefitThreeText: ["Штрихкоды, упаковка, комплектация и поставки партиями.", defaultSiteContent.benefitThreeText],
    benefitFourTitle: ["Корзина без оплаты", defaultSiteContent.benefitFourTitle],
    benefitFourText: ["Покупатель собирает корзину, менеджер уточняет наличие и условия.", defaultSiteContent.benefitFourText],
    businessPageLead: [
      "Оптовые условия для магазинов, селлеров и корпоративных клиентов: скидка от суммы заказа, производство в одном месте и сопровождение менеджера.",
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
      "Печать, пошив, упаковка, маркировка и подготовка к отгрузке выполняются в одном процессе, чтобы партия была готова к продаже.",
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
      "Sobag Opt — тестовая витрина для оптовых продаж текстиля с принтами и заказов на производство под ваш макет.",
      defaultSiteContent.aboutPageLead,
    ],
    aboutPageText: [
      "Здесь позже появится история компании, описание производства, сильные стороны команды и условия работы с оптовыми покупателями.",
      defaultSiteContent.aboutPageText,
    ],
    aboutPageProductionTitle: ["Производство и опт", defaultSiteContent.aboutPageProductionTitle],
    aboutPageProductionText: [
      "Мы готовим партии для маркетплейсов, магазинов и корпоративных клиентов: печать, пошив, комплектация и подготовка к отгрузке.",
      defaultSiteContent.aboutPageProductionText,
    ],
    contactsPageLead: ["Здесь будут контакты отдела опта, адрес производства и карта.", defaultSiteContent.contactsPageLead],
    contactsAddress: ["Москва, Новоданиловская набережная, 4", defaultSiteContent.contactsAddress],
    contactsSchedule: ["Пн-Пт, 10:00-18:00", defaultSiteContent.contactsSchedule],
    footerText: ["Тестовый прототип B2B-сайта для оптовых продаж текстиля с принтами.", defaultSiteContent.footerText],
    footerEmail: ["opt@sobag-shop.ru", defaultSiteContent.footerEmail],
    footerPhone: ["+7 900 000-00-00", defaultSiteContent.footerPhone],
    footerAddress: ["Адрес производства будет уточнен", defaultSiteContent.footerAddress],
  };
  Object.entries(benefitReplacements).forEach(([key, [oldValue, newValue]]) => {
    if (migrated[key] === oldValue) migrated[key] = newValue;
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

function getSiteContent() {
  try {
    return normalizeSiteContent(JSON.parse(localStorage.getItem(STORAGE.content) || "null") || {});
  } catch {
    return normalizeSiteContent();
  }
}

function saveSiteContent(content, options = {}) {
  const normalized = normalizeSiteContent(content);
  localStorage.setItem(STORAGE.content, JSON.stringify(normalized));
  if (options.sync !== false) syncSiteContentToBackend(normalized);
  return normalized;
}

async function loadServerSiteContent() {
  try {
    const data = await apiRequest("/api/content");
    if (!data.content || typeof data.content !== "object") return false;
    const normalized = normalizeSiteContent(data.content);
    if (data.source === "server") localStorage.setItem(STORAGE.content, JSON.stringify(normalized));
    renderSiteContent();
    renderCatalogHome();
    updateCustomCalculator();
    return true;
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 404) console.warn(error);
    return false;
  }
}

async function syncSiteContentToBackend(content) {
  const user = getUsers()[state.currentUser];
  if (!canManageContent(user)) return false;
  try {
    await apiRequest("/api/admin/content", { method: "PUT", body: { content } });
    showToast("Настройки сайта сохранены на сервере.");
    return true;
  } catch (error) {
    if (!isBackendUnavailable(error)) {
      console.warn(error);
      showToast("Настройки сохранены локально, но серверное сохранение не прошло.");
    }
    return false;
  }
}

function applyTheme(theme) {
  const isNight = theme === "night";
  document.body.classList.toggle("theme-night", isNight);
  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(isNight));
    themeToggle.innerHTML = `<span>${isNight ? "дневная тема" : "ночная тема"}</span><b class="theme-toggle__track" aria-hidden="true"></b>`;
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

function phoneHref(value = "") {
  const prepared = String(value).replace(/[^\d+]/g, "");
  return prepared ? `tel:${prepared}` : "#";
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

function syncCatalogRoute() {
  if (!catalogListing || document.body.classList.contains("home-page")) return;
  const params = new URLSearchParams();
  if (state.selectedCategory) params.set("category", state.selectedCategory);
  if (state.selectedCollection) params.set("collection", state.selectedCollection);
  if (state.selectedHoliday) params.set("holiday", state.selectedHoliday);
  if (state.search.trim()) params.set("q", state.search.trim());
  const nextUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
  window.history.replaceState({}, "", nextUrl);
}

function routeKey(pathname = window.location.pathname) {
  const cleanPath = pathname.replace(/\/+$/, "");
  const lastPart = cleanPath.split("/").filter(Boolean).pop() || "index";
  return lastPart.replace(/\.html$/i, "") || "index";
}

function smoothScrollToHash(hash) {
  if (!hash) return false;
  const target = document.querySelector(hash);
  if (!target) return false;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

function applyCatalogUrl(targetUrl) {
  if (!catalogListing) return false;
  const params = new URLSearchParams(targetUrl.search);
  state.selectedCategory = params.get("category") || "";
  state.selectedCollection = params.get("collection") || "";
  state.selectedHoliday = params.get("holiday") || "";
  state.search = params.get("q") || "";
  if (searchInput) searchInput.value = state.search;
  Object.values(state.filters).forEach((bucket) => bucket.clear());
  resetVisibleProducts();
  syncCatalogRoute();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  smoothScrollToHash(targetUrl.hash || "#catalog");
  return true;
}

function hasActiveCatalogState() {
  return Boolean(
    state.selectedCategory ||
      state.selectedCollection ||
      state.selectedHoliday ||
      state.search.trim() ||
      Object.values(state.filters).some((bucket) => bucket.size)
  );
}

function resetVisibleProducts() {
  state.visibleLimit = 120;
  resetServerCatalogList();
}

function hasCatalogFilterValues() {
  return Object.values(state.filters).some((bucket) => bucket.size);
}

function shouldUseServerCatalogList() {
  if (!catalogListing || isFavoritesPage || shouldLoadAdminCatalog()) return false;
  if (isSearchPage && !state.search.trim() && !state.selectedCategory && !state.selectedCollection && !state.selectedHoliday && !hasCatalogFilterValues()) {
    return false;
  }
  return Boolean(isSearchPage || state.selectedCategory || state.selectedCollection || state.selectedHoliday || state.search.trim() || hasCatalogFilterValues());
}

function serverCatalogValues(key) {
  const values = new Set([...state.filters[key]].map((value) => String(value || "").trim()).filter(Boolean));
  if (key === "category" && state.selectedCategory) values.add(state.selectedCategory);
  if (key === "collection" && state.selectedCollection) values.add(state.selectedCollection);
  if (key === "holiday" && state.selectedHoliday) values.add(state.selectedHoliday);
  return [...values].sort((left, right) => left.localeCompare(right, "ru", { sensitivity: "base", numeric: true }));
}

function serverCatalogSortValue() {
  if (state.sort === "priceAsc") return "price_asc";
  if (state.sort === "priceDesc") return "price_desc";
  if (state.sort === "popular") return "popular";
  return "relevance";
}

function serverCatalogKey() {
  return JSON.stringify({
    q: state.search.trim(),
    sort: serverCatalogSortValue(),
    category: serverCatalogValues("category"),
    collection: serverCatalogValues("collection"),
    holiday: serverCatalogValues("holiday"),
    size: serverCatalogValues("size"),
    material: serverCatalogValues("material"),
  });
}

function serverCatalogParams(options = {}) {
  const params = new URLSearchParams();
  if (state.search.trim()) params.set("q", state.search.trim());
  params.set("sort", serverCatalogSortValue());
  params.set("pageSize", "120");
  if (options.cursor) params.set("cursor", options.cursor);
  [
    ["category", serverCatalogValues("category")],
    ["collection", serverCatalogValues("collection")],
    ["holiday", serverCatalogValues("holiday")],
    ["size", serverCatalogValues("size")],
    ["material", serverCatalogValues("material")],
  ].forEach(([name, values]) => values.forEach((value) => params.append(name, value)));
  return params;
}

function resetServerCatalogList() {
  state.serverCatalog.requestId += 1;
  state.serverCatalog.status = "idle";
  state.serverCatalog.key = "";
  state.serverCatalog.items = [];
  state.serverCatalog.total = 0;
  state.serverCatalog.facets = {};
  state.serverCatalog.facetOptions = {};
  state.serverCatalog.nextCursor = "";
  state.serverCatalog.hasMore = false;
  state.serverCatalog.source = "";
  state.serverCatalog.loadingMore = false;
}

function serverCatalogImageMeta(card) {
  const meta = normalizeProductImageMetadata(card?.imageMeta);
  if (meta) return meta;
  const image = String(card?.image || "").trim();
  return image ? normalizeProductImageMetadata(image) : null;
}

function serverCatalogProduct(card = {}) {
  const imageMeta = serverCatalogImageMeta(card);
  const image = String(card.image || imageMeta?.url || "assets/production-workshop-1.png").trim();
  const categories = uniqueList([...(Array.isArray(card.categories) ? card.categories : splitList(card.category)), card.category]);
  return {
    id: String(card.id || card.baseSku || "").trim(),
    baseSku: String(card.baseSku || card.id || "").trim(),
    name: String(card.name || "").trim(),
    category: categories[0] || String(card.category || "").trim(),
    categories,
    collections: uniqueList(Array.isArray(card.collections) ? card.collections : splitList(card.collections)),
    holidays: uniqueList(Array.isArray(card.holidays) ? card.holidays : splitList(card.holidays)),
    tags: uniqueList(Array.isArray(card.tags) ? card.tags : splitList(card.tags)),
    description: String(card.description || "").trim(),
    detailDescription: "",
    stock: String(card.stock || "").trim(),
    status: "published",
    hidden: false,
    image,
    images: imageMeta ? [imageMeta] : [],
    gallery: [image],
    types: [],
    sizes: [],
    materials: [],
    variants: [],
    minPrice: Number(card.minPrice || 0) || 0,
    maxPrice: Number(card.maxPrice || card.minPrice || 0) || 0,
    popular: Number(card.popular || 0) || 0,
    variantCount: Number(card.variantCount || 0) || 0,
  };
}

function rememberServerCatalogCards(items = []) {
  const existingKeys = new Set(products.map(productKey));
  const additions = items.filter((item) => !existingKeys.has(productKey(item)));
  if (!additions.length) return;
  products = [...products, ...additions];
  addMissingCatalogCategories(products);
}

function currentServerCatalogResult() {
  if (!shouldUseServerCatalogList()) return null;
  const key = serverCatalogKey();
  if (state.serverCatalog.status !== "ready" || state.serverCatalog.key !== key) return null;
  return state.serverCatalog;
}

async function refreshServerCatalogList(options = {}) {
  if (!shouldUseServerCatalogList()) {
    resetServerCatalogList();
    return false;
  }
  const key = serverCatalogKey();
  const append = Boolean(options.append && state.serverCatalog.status === "ready" && state.serverCatalog.key === key && state.serverCatalog.nextCursor);
  if (append) state.serverCatalog.loadingMore = true;
  else {
    state.serverCatalog.status = "loading";
    state.serverCatalog.key = key;
    state.serverCatalog.items = [];
    state.serverCatalog.total = 0;
    state.serverCatalog.facets = {};
    state.serverCatalog.facetOptions = {};
    state.serverCatalog.nextCursor = "";
    state.serverCatalog.hasMore = false;
  }
  const requestId = state.serverCatalog.requestId + 1;
  state.serverCatalog.requestId = requestId;
  try {
    const params = serverCatalogParams({ cursor: append ? state.serverCatalog.nextCursor : "" });
    const data = await apiRequest(`/api/catalog-query?${params.toString()}`);
    if (requestId !== state.serverCatalog.requestId) return false;
    const incoming = (Array.isArray(data.items) ? data.items : []).map(serverCatalogProduct).filter((product) => product.id && product.name);
    const merged = append ? [...state.serverCatalog.items, ...incoming] : incoming;
    const seen = new Set();
    const items = merged.filter((product) => {
      const keyValue = productKey(product);
      if (!keyValue || seen.has(keyValue)) return false;
      seen.add(keyValue);
      return true;
    });
    rememberServerCatalogCards(items);
    state.serverCatalog.status = "ready";
    state.serverCatalog.key = key;
    state.serverCatalog.items = items;
    state.serverCatalog.total = Number(data.total || items.length) || items.length;
    state.serverCatalog.facets = data.facets && typeof data.facets === "object" ? data.facets : {};
    state.serverCatalog.facetOptions = data.facetOptions && typeof data.facetOptions === "object" ? data.facetOptions : {};
    state.serverCatalog.nextCursor = String(data.pageInfo?.nextCursor || "");
    state.serverCatalog.hasMore = Boolean(data.pageInfo?.hasMore);
    state.serverCatalog.source = String(data.source || "");
    state.serverCatalog.loadingMore = false;
    return true;
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 404) console.warn(error);
    if (requestId === state.serverCatalog.requestId) {
      state.serverCatalog.status = "fallback";
      state.serverCatalog.key = key;
      state.serverCatalog.loadingMore = false;
    }
    return false;
  }
}

function queueServerCatalogRefresh() {
  if (!shouldUseServerCatalogList()) {
    resetServerCatalogList();
    return;
  }
  const key = serverCatalogKey();
  if (state.serverCatalog.key === key && (state.serverCatalog.status === "loading" || state.serverCatalog.status === "ready" || state.serverCatalog.status === "fallback")) {
    return;
  }
  refreshServerCatalogList().then((loaded) => {
    if (!loaded) return;
    renderFilters();
    renderProducts();
  });
}

async function loadMoreServerCatalogProducts() {
  const result = currentServerCatalogResult();
  if (!result?.hasMore || !result.nextCursor || result.loadingMore) return false;
  const loaded = await refreshServerCatalogList({ append: true });
  if (loaded) {
    renderFilters();
    renderProducts();
  }
  return loaded;
}

function navigateWithinSite(url) {
  const targetUrl = new URL(url, window.location.href);
  if (targetUrl.origin !== window.location.origin) {
    window.location.href = targetUrl.href;
    return;
  }

  const currentRoute = routeKey(window.location.pathname);
  const targetRoute = routeKey(targetUrl.pathname);
  const sameRoute = currentRoute === targetRoute;

  if (sameRoute && targetUrl.search === window.location.search && targetUrl.hash === window.location.hash) {
    if (targetUrl.hash) smoothScrollToHash(targetUrl.hash);
    return;
  }

  if (sameRoute && (targetRoute === "catalog" || targetRoute === "search") && catalogListing) {
    if (targetUrl.search) {
      applyCatalogUrl(targetUrl);
      return;
    }
    if (!hasActiveCatalogState() && !catalogListing.classList.contains("is-hidden")) return;
    backToCatalogHome();
    smoothScrollToHash(targetUrl.hash || "#catalog");
    return;
  }

  if (sameRoute && targetUrl.hash && targetUrl.search === window.location.search) {
    if (smoothScrollToHash(targetUrl.hash)) {
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}${targetUrl.hash}`);
      return;
    }
  }

  if (sameRoute && !targetUrl.search && !targetUrl.hash) return;
  window.location.href = targetUrl.href;
}

function updateYandexMap(address) {
  const prepared = String(address || "").trim() || defaultSiteContent.contactsAddress;
  const encoded = encodeURIComponent(prepared);
  const frame = document.querySelector("#yandexMapFrame");
  const link = document.querySelector("#yandexMapLink");
  if (frame) frame.src = `https://yandex.ru/map-widget/v1/?text=${encoded}&z=16`;
  if (link) link.href = `https://yandex.ru/maps/?text=${encoded}`;
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

function reviewWord(count) {
  return pluralRu(count, "отзыв", "отзыва", "отзывов");
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

function updateFavoriteButtons(productId) {
  const active = state.favorites.has(productId);
  document.querySelectorAll("[data-favorite]").forEach((button) => {
    if (button.dataset.favorite !== productId) return;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.title = active ? "Убрать из избранного" : "В избранное";
  });
  setTextWithPop(favoriteCount, state.favorites.size);
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

function saveServerUserProfile(profile) {
  if (!profile?.email) return;
  const users = getUsers();
  users[profile.email] = {
    ...(users[profile.email] || {}),
    ...profile,
    password: "__server__",
    orders: profile.orders || users[profile.email]?.orders || [],
    savedCarts: profile.savedCarts || users[profile.email]?.savedCarts || [],
  };
  saveUsers(users);
  state.currentUser = profile.email;
  localStorage.setItem(STORAGE.user, profile.email);
  loadFavorites();
}

function mirrorServerOrder(order, userEmail = state.currentUser) {
  if (!order?.id) return;
  const orders = getOrders().filter((item) => item.id !== order.id);
  saveOrders([order, ...orders]);
  const users = getUsers();
  if (userEmail && users[userEmail]) {
    const customer = order.customer || {};
    users[userEmail].orders = [order, ...(users[userEmail].orders || []).filter((item) => item.id !== order.id)];
    users[userEmail].company = customer.company || users[userEmail].company || "";
    users[userEmail].inn = customer.inn || users[userEmail].inn || "";
    users[userEmail].kpp = customer.kpp || users[userEmail].kpp || "";
    users[userEmail].legalAddress = customer.legalAddress || users[userEmail].legalAddress || "";
    users[userEmail].phone = customer.phone || users[userEmail].phone || "";
    users[userEmail].city = customer.city || users[userEmail].city || "";
    users[userEmail].address = customer.address || users[userEmail].address || "";
    users[userEmail].addresses = [...new Set([customer.address, ...(users[userEmail].addresses || [])].filter(Boolean))].slice(0, 10);
    users[userEmail].delivery = customer.delivery || users[userEmail].delivery || "";
    users[userEmail].packaging = customer.packaging || users[userEmail].packaging || "";
    users[userEmail].layoutFiles = uniqueTextList([customer.layoutFileName, ...(users[userEmail].layoutFiles || [])], 20, 240);
    users[userEmail].orderComment = customer.comment || users[userEmail].orderComment || "";
    users[userEmail].orderComments = uniqueTextList([customer.comment, ...(users[userEmail].orderComments || [])], 10, 500);
    users[userEmail].companies = parseCompanyProfiles(companiesToText(users[userEmail]), {
      name: users[userEmail].company,
      inn: users[userEmail].inn,
      kpp: users[userEmail].kpp,
      legalAddress: users[userEmail].legalAddress,
    });
    users[userEmail].lastCustomer = customer;
    saveUsers(users);
  }
}

async function loadBackendAccountData() {
  try {
    const session = await apiRequest("/api/auth/me");
    if (!session.user) return false;
    if (Array.isArray(session.savedCarts)) {
      const mergedSavedCarts = mergeSavedCarts(session.savedCarts, getSavedCarts(session.user.email));
      localStorage.setItem(getSavedCartsKey(session.user.email), JSON.stringify(mergedSavedCarts));
      session.user.savedCarts = mergedSavedCarts;
    }
    saveServerUserProfile(session.user);
    if (["admin", "manager"].includes(session.user.role)) {
      const ordersData = await apiRequest("/api/admin/orders");
      if (Array.isArray(ordersData.orders)) saveOrders(ordersData.orders);
    }
    if (["admin", "manager"].includes(session.user.role)) {
      const usersData = await apiRequest("/api/admin/users");
      if (Array.isArray(usersData.users)) {
        const users = getUsers();
        usersData.users.forEach((user) => {
          users[user.email] = { ...(users[user.email] || {}), ...user, password: users[user.email]?.password || "__server__" };
        });
        saveUsers(users);
      }
    }
    return true;
  } catch (error) {
    if (!isBackendUnavailable(error)) console.warn(error);
    return false;
  }
}

async function refreshAccountFromBackend() {
  const changed = await loadBackendAccountData();
  const modal = document.querySelector("#accountModal");
  if (!changed || !modal) return;
  modal.remove();
  document.body.insertAdjacentHTML("beforeend", accountModalHtml());
  activateModal(document.querySelector("#accountModal"));
  if (window.lucide) window.lucide.createIcons();
}

function initFormEnhancements(root = document) {
  root.querySelectorAll('input[name="name"]').forEach((field) => field.setAttribute("autocomplete", "name"));
  root.querySelectorAll('input[name="company"]').forEach((field) => field.setAttribute("autocomplete", "organization"));
  root.querySelectorAll('input[name="email"]').forEach((field) => field.setAttribute("autocomplete", "email"));
  root.querySelectorAll('input[name="phone"]').forEach((field) => field.setAttribute("autocomplete", "tel"));
  root.querySelectorAll('input[name="address"]').forEach((field) => field.setAttribute("autocomplete", "street-address"));
  root.querySelectorAll('input[name="password"]').forEach((field) => field.setAttribute("autocomplete", "current-password"));
}

function activeModal() {
  return [...document.querySelectorAll(".modal")].find((modal) => modal.classList.contains("is-visible")) || document.querySelector(".modal");
}

function activateModal(modal = activeModal()) {
  if (!modal) return;
  lastFocusedElement = document.activeElement;
  document.body.classList.add("modal-open");
  const panel = modal.querySelector(".modal__panel") || modal;
  panel.setAttribute("tabindex", "-1");
  initFormEnhancements(modal);
  requestAnimationFrame(() => {
    const first = modal.querySelector(focusableSelector);
    (first || panel).focus();
  });
}

function trapModalFocus(event) {
  const modal = activeModal();
  if (!modal || event.key !== "Tab") return;
  const focusable = [...modal.querySelectorAll(focusableSelector)].filter((node) => node.offsetParent !== null);
  if (!focusable.length) {
    event.preventDefault();
    modal.focus();
    return;
  }
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

function renderHeroActualSlides(content = getSiteContent()) {
  const actual = document.querySelector(".hero__actual");
  if (!actual) return;
  actual.querySelectorAll("[data-actual-slide]").forEach((slide) => slide.remove());
  const slidesHtml = content.actualSlides
    .map((slide, index) => {
      const type = slide.type === "collection" ? "collection" : "holiday";
      return `
        <button class="hero__actual-card${index === actualSlideIndex ? " is-active" : ""}" type="button" data-actual-slide data-open-${type}="${slide.label}">
          <img src="${slide.image}" alt="${slide.label}" ${imageAttrs(640, 360, index === 0 ? "eager" : "lazy", index === 0 ? "high" : "")} />
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
  if (brand) brand.setAttribute("aria-label", content.brandName);
  if (brandMark) {
    brandMark.innerHTML = content.brandLogo
      ? `<img src="${content.brandLogo}" alt="" width="54" height="54" decoding="async" />`
      : escapeHtml(String(content.brandName || "S").trim().charAt(0) || "S");
  }
  if (brandName) brandName.innerHTML = brandNameHtml(content.brandName);
  if (heroTitle) heroTitle.textContent = content.heroTitle;
  if (heroLead) heroLead.textContent = content.heroLead;
  setButtonText(".catalog-button", content.navCatalogButton);
  setText("[data-top-business]", buttonLabel(content.navBusinessButton));
  setText("[data-top-marketplaces]", buttonLabel(content.navMarketplacesButton));
  setText("[data-top-about]", buttonLabel(content.navAboutButton));
  setText("[data-top-contacts]", buttonLabel(content.navContactsButton));
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
  setText("[data-about-page-title]", content.aboutPageTitle);
  setText("[data-about-page-lead]", content.aboutPageLead);
  setText("[data-about-page-text]", content.aboutPageText);
  setText("[data-about-production-title]", content.aboutPageProductionTitle);
  setText("[data-about-production-text]", content.aboutPageProductionText);
  setText("[data-contacts-page-title]", content.contactsPageTitle);
  setText("[data-contacts-page-lead]", content.contactsPageLead);
  setText("[data-contacts-address]", content.contactsAddress);
  setText("[data-contacts-schedule]", content.contactsSchedule);
  setText("[data-contacts-map-button]", buttonLabel(content.contactsMapButton));
  const mapAddressInput = document.querySelector("#mapAddressInput");
  if (mapAddressInput && !mapAddressInput.dataset.userEdited) mapAddressInput.value = content.contactsAddress;
  updateYandexMap(mapAddressInput?.value || content.contactsAddress);
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
  setText(".custom__content > p:not(.eyebrow)", content.customText);
  document.querySelectorAll(".custom .steps span").forEach((step, index) => {
    const values = [content.customStepOne, content.customStepTwo, content.customStepThree, content.customStepFour];
    const number = step.querySelector("b")?.outerHTML || `<b>${index + 1}</b>`;
    step.innerHTML = `${number} ${escapeHtml(values[index])}`;
  });
  setButtonText("#briefForm .primary-button", content.customSubmitButton);
  setText("[data-business-page-title]", content.businessPageTitle);
  setText("[data-business-page-lead]", content.businessPageLead);
  setText("[data-business-minimum-title]", content.businessMinimumTitle);
  setText("[data-business-minimum-text]", content.businessMinimumText);
  setText("[data-business-discount-title]", content.businessDiscountTitle);
  setText("[data-business-discount-text]", content.businessDiscountText);
  setText("[data-business-production-title]", content.businessProductionTitle);
  setText("[data-business-production-text]", content.businessProductionText);
  setText("[data-business-manager-title]", content.businessManagerTitle);
  setText("[data-business-manager-text]", content.businessManagerText);
  setText("[data-business-documents-title]", content.businessDocumentsTitle);
  setText("[data-business-documents-text]", content.businessDocumentsText);
  const footer = document.querySelector(".footer");
  if (footer) {
    const footerEmails = footer.querySelectorAll("[data-footer-email]");
    const footerPhones = footer.querySelectorAll("[data-footer-phone]");
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
    footerEmails.forEach((footerEmail) => {
      footerEmail.textContent = content.footerEmail;
      footerEmail.href = `mailto:${content.footerEmail}`;
    });
    footerPhones.forEach((footerPhone) => {
      footerPhone.textContent = content.footerPhone;
      footerPhone.href = phoneHref(content.footerPhone);
    });
  }
  if (
    catalogTitle &&
    !isFavoritesPage &&
    !state.selectedCategory &&
    !state.selectedCollection &&
    !state.selectedHoliday &&
    !state.search.trim()
  ) {
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
        const sku = [product.baseSku, skuPart(type, 3), skuSizePart(size), skuPart(material, 3)].filter(Boolean).join("_");
        const calculatedPrice =
          product.basePrice + (typeFactors[type] || 0) + (sizeFactors[size] || 0) + (materialFactors[material] || 0);
        const customPrice = Number(product.variantPrices?.[sku]);
        const price = Number.isFinite(customPrice) && customPrice > 0 ? customPrice : calculatedPrice;
        return {
          sku,
          name: variantNameForType(product.name, type, size, material),
          type,
          size,
          material,
          price,
        };
      })
    )
  );
}

function variantNameForType(name, type, size, material) {
  const preparedName = String(name || "").trim();
  const preparedType = String(type || "").trim();
  if (!preparedName || !preparedType) return preparedName;

  const replacements = [
    ["Подушка", "Наволочка"],
    ["Наволочка", "Подушка"],
    ["Плед", "Плед"],
    ["Мешок", "Мешок"],
    ["Чехол", "Чехол"],
    ["Флаг", "Флаг"],
    ["Ремувка", "Ремувка"],
  ];
  const target = replacements.find(([word]) => preparedType.toLocaleLowerCase("ru-RU").includes(word.toLocaleLowerCase("ru-RU")))?.[0];
  if (!target) return preparedName;

  const source = replacements.find(([word]) => startsWithProductWord(preparedName, word))?.[0];
  if (source && source !== target) {
    return variantNameWithSpecs(replaceLeadingProductWord(preparedName, source, target), size, material);
  }
  if (!source && !startsWithProductWord(preparedName, target)) {
    return variantNameWithSpecs(`${target} ${preparedName}`, size, material);
  }
  return variantNameWithSpecs(preparedName, size, material);
}

function startsWithProductWord(text, word) {
  const preparedText = String(text || "").trim().toLocaleLowerCase("ru-RU");
  const preparedWord = String(word || "").trim().toLocaleLowerCase("ru-RU");
  if (!preparedText.startsWith(preparedWord)) return false;
  const nextChar = preparedText.slice(preparedWord.length, preparedWord.length + 1);
  return !nextChar || /[\s"'«».,:;()/-]/.test(nextChar);
}

function replaceLeadingProductWord(text, source, target) {
  return `${target}${String(text || "").trim().slice(String(source || "").length)}`.replace(/\s+/g, " ").trim();
}

function variantNameWithSpecs(name, size, material) {
  const specs = [size, material]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => value.toLocaleLowerCase("ru-RU") !== "стандарт");
  return specs.length ? `${name} ${specs.join(" ")}` : name;
}

function skuPart(value, limit = Infinity) {
  const prepared = String(value)
    .toLocaleUpperCase("ru-RU")
    .replace(/[^A-ZА-ЯЁ0-9]+/g, "");
  return Number.isFinite(limit) ? prepared.slice(0, limit) : prepared;
}

function skuSizePart(value) {
  return String(value)
    .toLocaleUpperCase("ru-RU")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^A-ZА-ЯЁ0-9ХX,.-]+/g, "");
}

function normalizeTaxonomyItem(value) {
  const prepared = String(value || "").trim().replace(/\s+/g, " ");
  if (!prepared) return "";
  const key = prepared.toLocaleLowerCase("ru-RU");
  if (taxonomyAliases[key]) return taxonomyAliases[key];
  return prepared[0].toLocaleUpperCase("ru-RU") + prepared.slice(1);
}

function uniqueList(items, normalizer = (item) => String(item || "").trim()) {
  const seen = new Set();
  return items
    .map(normalizer)
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLocaleLowerCase("ru-RU");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeListField(product, key, fallback = []) {
  const value = product[key];
  const raw = Array.isArray(value) ? value : splitList(value);
  const backup = Array.isArray(fallback) ? fallback : splitList(fallback);
  return uniqueList(raw.length ? raw : backup, normalizeTaxonomyItem);
}

function normalizeTags(product) {
  const rawTags = Array.isArray(product.tags) ? product.tags : splitList(product.tags);
  return uniqueList([product.theme, ...normalizeListField(product, "collections"), ...normalizeListField(product, "holidays"), ...rawTags], normalizeTaxonomyItem);
}

function productHasCollection(product, collection) {
  return product.collections.includes(collection);
}

function productHasHoliday(product, holiday) {
  return product.holidays.includes(holiday);
}

function productHasCategory(product, category) {
  return (product.categories || [product.category]).includes(category);
}

function normalizeProductImageMetadata(item) {
  if (!item) return null;
  if (typeof item === "string") {
    const url = item.trim();
    return url ? { url, storageKey: "", provider: "", width: null, height: null, mime: "", uploadedAt: "", status: "active" } : null;
  }
  if (typeof item !== "object") return null;
  const url = String(item.url || item.publicUrl || item.downloadUrl || "").trim();
  const storageKey = String(item.storageKey || item.pathname || item.key || "").trim();
  if (!url && !storageKey) return null;
  const variants = Array.isArray(item.variants)
    ? item.variants
        .map((variant) => {
          const normalized = normalizeProductImageMetadata(variant);
          return normalized
            ? {
                ...normalized,
                label: String(variant.label || variant.variantLabel || "").trim(),
                format: String(variant.format || variant.mime || "").replace(/^image\//, "").trim(),
              }
            : null;
        })
        .filter(Boolean)
    : [];
  return {
    url,
    storageKey,
    provider: String(item.provider || "").trim(),
    width: Number(item.width || 0) || null,
    height: Number(item.height || 0) || null,
    mime: String(item.mime || item.contentType || "").trim(),
    uploadedAt: String(item.uploadedAt || "").trim(),
    fileName: String(item.fileName || "").trim(),
    size: Number(item.size || 0) || null,
    etag: String(item.etag || "").trim(),
    status: String(item.status || "active").trim(),
    variants,
  };
}

function normalizeProductImages(images) {
  if (!Array.isArray(images)) return [];
  const seen = new Set();
  return images
    .map(normalizeProductImageMetadata)
    .filter(Boolean)
    .filter((image) => {
      const key = image.storageKey || image.url;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function productImageMetadataUrl(image) {
  return String(image?.url || image?.publicUrl || "").trim();
}

function productImageMetadataForUrl(product, url) {
  const target = String(url || "").trim();
  if (!target) return null;
  return (product?.images || []).find(
    (image) => productImageMetadataUrl(image) === target || (image.variants || []).some((variant) => productImageMetadataUrl(variant) === target)
  );
}

function productImageVariantSrcsetValue(product, url, preferredFormat = "webp") {
  const image = productImageMetadataForUrl(product, url);
  const variants = (image?.variants || [])
    .map((variant) => ({
      url: productImageMetadataUrl(variant),
      width: Number(variant.width || 0),
      format: String(variant.format || variant.mime || "").replace(/^image\//, "").toLowerCase(),
    }))
    .filter((variant) => variant.url && variant.width > 0);
  const preferred = variants.filter((variant) => variant.format === preferredFormat);
  const selected = preferred.length ? preferred : variants;
  const srcset = selected
    .sort((left, right) => left.width - right.width)
    .map((variant) => `${variant.url} ${variant.width}w`)
    .join(", ");
  return srcset;
}

function productImageVariantSrcset(product, url, preferredFormat = "webp") {
  const srcset = productImageVariantSrcsetValue(product, url, preferredFormat);
  return srcset ? `srcset="${escapeHtml(srcset)}" sizes="(max-width: 720px) 92vw, 640px"` : "";
}

function applyProductImageVariantSrcset(node, product, url) {
  const srcset = productImageVariantSrcsetValue(product, url);
  if (srcset) {
    node.setAttribute("srcset", srcset);
    node.setAttribute("sizes", "(max-width: 720px) 92vw, 640px");
  } else {
    node.removeAttribute("srcset");
    node.removeAttribute("sizes");
  }
}

function normalizeProduct(product) {
  const categories = normalizeListField(product, "categories", splitList(product.category || ""));
  const normalizedCategories = categories.length ? categories : [product.category || "Подушки"];
  const status = normalizeProductStatus(product);
  const imageMetadata = normalizeProductImages(product.images);
  const metadataUrls = imageMetadata.map(productImageMetadataUrl).filter(Boolean);
  const primaryImage = String(product.image || metadataUrls[0] || "assets/production-workshop-1.png").trim();
  const normalized = {
    ...product,
    status,
    hidden: status !== "published",
    image: primaryImage,
    images: imageMetadata,
    categories: normalizedCategories,
    category: normalizedCategories[0],
    types: product.types?.length ? product.types : TYPE_OPTIONS,
    sizes: product.sizes?.length ? product.sizes : SIZE_OPTIONS,
    materials: product.materials?.length ? product.materials : MATERIAL_OPTIONS,
    collections: normalizeListField(product, "collections", product.theme ? [product.theme] : []),
    holidays: normalizeListField(product, "holidays"),
    tags: normalizeTags(product),
    gallery: [...new Set([primaryImage, ...(product.gallery || []), ...metadataUrls])].filter(Boolean),
    detailDescription:
      product.detailDescription ||
      "Карточка показывает товар с несколькими фотографиями, быстрыми тегами и настройкой варианта под оптовую заявку.",
    stock: product.stock || "made",
    popular: product.popular || 50,
    basePrice: Number(product.basePrice || 200),
    variantPrices: product.variantPrices && typeof product.variantPrices === "object" ? product.variantPrices : {},
  };
  normalized.variants = createVariants(normalized);
  normalized.minPrice = Math.min(...normalized.variants.map((variant) => variant.price));
  normalized.maxPrice = Math.max(...normalized.variants.map((variant) => variant.price));
  return normalized;
}

function loadProducts() {
  const saved = loadStoredProducts();
  const source = saved.length ? saved : productDrafts;
  return source.map(normalizeProduct);
}

function loadStoredProducts() {
  const saved = JSON.parse(localStorage.getItem(STORAGE.products) || "null");
  return Array.isArray(saved) ? saved.filter((product) => !isPrototypeProduct(product)) : [];
}

function isPrototypeProduct(product) {
  const sku = String(product?.baseSku || "");
  const images = [product?.image, ...(product?.gallery || [])].filter(Boolean).join(" ");
  return PROTOTYPE_PRODUCT_IDS.has(String(product?.id || "")) || sku.startsWith("SB-") || images.includes("assets/hero-products-");
}

function productKey(product) {
  return baseSkuKey(product.baseSku || product.id || product.name);
}

function mergeProducts(baseProducts, incomingProducts) {
  const merged = new Map();
  baseProducts.forEach((product) => merged.set(productKey(product), product));
  incomingProducts.forEach((product) => {
    const normalized = normalizeProduct(product);
    const key = productKey(normalized);
    if (!merged.has(key)) merged.set(key, normalized);
  });
  return [...merged.values()];
}

function applyLoadedProducts(incomingProducts, options = {}) {
  if (!Array.isArray(incomingProducts) || !incomingProducts.length) return false;
  products = options.mergeWithStored
    ? mergeProducts(products, incomingProducts)
    : incomingProducts.map(normalizeProduct);
  addMissingCatalogCategories(products);
  renderSiteContent();
  renderCatalogHome();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  renderAdminProductsPage();
  renderAdminPricesPage();
  return true;
}

async function loadServerProducts() {
  try {
    const data = await apiRequest("/api/catalog");
    if (!Array.isArray(data.products) || !data.products.length) return false;
    state.productReviews = normalizeReviews(data.reviews);
    const saved = loadStoredProducts();
    const loaded = applyLoadedProducts(data.products, { mergeWithStored: data.source !== "server" && Boolean(saved?.length) });
    if (loaded && data.source === "server") localStorage.setItem(STORAGE.products, JSON.stringify(cleanProductsForStorage()));
    return loaded;
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 404) console.warn(error);
    return false;
  }
}

function replaceLoadedProduct(product) {
  const normalized = normalizeProduct(product);
  const key = productKey(normalized);
  let replaced = false;
  products = products.map((item) => {
    if (item.id === normalized.id || productKey(item) === key) {
      replaced = true;
      return normalized;
    }
    return item;
  });
  if (!replaced) products.push(normalized);
  addMissingCatalogCategories(products);
  return normalized;
}

async function loadProductDetailForModal(product) {
  if (!product || shouldLoadAdminCatalog()) return product;
  try {
    const params = new URLSearchParams();
    if (product.id) params.set("id", product.id);
    else if (product.baseSku) params.set("baseSku", product.baseSku);
    const data = await apiRequest(`/api/catalog-detail?${params.toString()}`);
    return data.product ? replaceLoadedProduct(data.product) : product;
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 404) console.warn(error);
    return product;
  }
}

function shouldLoadAdminCatalog() {
  return isAdminProductsPage || isAdminPricesPage || isAdminImportPage;
}

async function loadAdminCatalogProducts() {
  if (!shouldLoadAdminCatalog() || !canManageProducts(getUsers()[state.currentUser])) return false;
  try {
    const data = await apiRequest("/api/admin/catalog");
    if (!Array.isArray(data.products) || !data.products.length) return false;
    const loaded = applyLoadedProducts(data.products);
    if (loaded) localStorage.setItem(STORAGE.products, JSON.stringify(cleanProductsForStorage()));
    return loaded;
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 401 && error.status !== 403 && error.status !== 404) console.warn(error);
    return false;
  }
}

async function loadPublishedProducts() {
  if (await loadAdminCatalogProducts()) return;
  if (await loadServerProducts()) return;
  try {
    const response = await fetch("data/products-live.json", { cache: "default" });
    if (!response.ok) return;
    const liveProducts = await response.json();
    const saved = loadStoredProducts();
    state.productReviews = [];
    applyLoadedProducts(liveProducts, { mergeWithStored: Boolean(saved?.length) });
  } catch {
    // The static catalog file is optional in local prototype mode.
  }
}

function cleanProductsForStorage() {
  return products.map(({ variants, minPrice, maxPrice, ...product }) => product);
}

function normalizeReview(item) {
  const rating = Math.max(1, Math.min(5, Math.round(Number(item?.rating || 0))));
  return {
    id: String(item?.id || ""),
    productId: String(item?.productId || ""),
    baseSku: String(item?.baseSku || ""),
    productName: String(item?.productName || ""),
    rating,
    text: String(item?.text || "").trim(),
    status: item?.status === "hidden" || item?.status === "approved" ? item.status : "pending",
    userEmail: String(item?.userEmail || ""),
    authorName: String(item?.authorName || item?.userEmail || "Покупатель"),
    createdAt: String(item?.createdAt || ""),
    updatedAt: String(item?.updatedAt || item?.createdAt || ""),
    moderatedBy: String(item?.moderatedBy || ""),
  };
}

function normalizeReviews(items) {
  return (Array.isArray(items) ? items : []).map(normalizeReview).filter((item) => item.id && item.productId && item.rating);
}

function reviewsForProduct(product, statuses = ["approved"]) {
  const allowed = new Set(statuses);
  return state.productReviews.filter(
    (review) =>
      allowed.has(review.status) &&
      (review.productId === product.id || baseSkuKey(review.baseSku) === baseSkuKey(product.baseSku))
  );
}

function reviewStats(product) {
  const reviews = reviewsForProduct(product);
  if (!reviews.length) return { count: 0, average: 0 };
  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return { count: reviews.length, average };
}

function starsHtml(value, label = "") {
  const rounded = Math.round(Number(value || 0));
  return `<span class="review-stars" aria-label="${escapeHtml(label || `${rounded} из 5`)}">${[1, 2, 3, 4, 5]
    .map((star) => `<span class="${star <= rounded ? "is-filled" : ""}">★</span>`)
    .join("")}</span>`;
}

let productServerSaveTimer = null;
let productServerSavePromise = Promise.resolve(false);

function syncProductsToBackend(cleanProducts) {
  const user = getUsers()[state.currentUser];
  if (!canManageProducts(user)) return Promise.resolve(false);
  window.clearTimeout(productServerSaveTimer);
  productServerSavePromise = new Promise((resolve) => {
    productServerSaveTimer = window.setTimeout(async () => {
      try {
        const result = await apiRequest("/api/admin/catalog", { method: "PUT", body: { products: cleanProducts } });
        showToast(`Каталог сохранен на сервере: ${result.count || cleanProducts.length} товаров.`);
        resolve(true);
      } catch (error) {
        if (!isBackendUnavailable(error)) {
          console.warn(error);
          showToast("Каталог сохранен локально, но серверное сохранение не прошло.");
        }
        resolve(false);
      }
    }, 250);
  });
  return productServerSavePromise;
}

function saveProducts() {
  const clean = cleanProductsForStorage();
  localStorage.setItem(STORAGE.products, JSON.stringify(clean));
  return syncProductsToBackend(clean);
}

async function syncCatalogNow() {
  const saved = await saveProducts();
  if (!saved) showToast("Каталог сохранен локально. Для серверного сохранения войдите через админ-аккаунт.");
}

function seedUsers() {
  const users = JSON.parse(localStorage.getItem(STORAGE.users) || "null") || {};
  const legacyAdmin = users["admin@sobag.local"];
  const currentAdmin = users["admin@sobag"];
  const adminOrders = currentAdmin?.orders || legacyAdmin?.orders || [];

  users["admin@sobag"] = {
    ...currentAdmin,
    email: "admin@sobag",
    password: "admin",
    name: currentAdmin?.name || legacyAdmin?.name || "\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440",
    phone: currentAdmin?.phone || legacyAdmin?.phone || "+7 900 000-00-00",
    role: "admin",
    orders: adminOrders,
  };

  if (legacyAdmin) delete users["admin@sobag.local"];
  if (localStorage.getItem(STORAGE.user) === "admin@sobag.local") {
    localStorage.setItem(STORAGE.user, "admin@sobag");
    state.currentUser = "admin@sobag";
  }

  localStorage.setItem(STORAGE.users, JSON.stringify(users));
  return users;
}

function getUsers() {
  return seedUsers();
}

function saveUsers(users) {
  localStorage.setItem(STORAGE.users, JSON.stringify(users));
}

function getOrders() {
  return JSON.parse(localStorage.getItem(STORAGE.orders) || "[]");
}

function saveOrders(orders) {
  localStorage.setItem(STORAGE.orders, JSON.stringify(orders));
}

function roleLabel(role) {
  if (role === "admin") return "Администратор";
  if (role === "manager") return "Менеджер";
  if (role === "content") return "Контент-менеджер";
  return "Покупатель";
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
    actor: actor || state.currentUser || "local",
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
    actor: normalizeOrderCommentText(actor || state.currentUser || "local", 120),
    role: normalizeOrderCommentText(role, 40),
    visibility: visibility === "internal" ? "internal" : "customer",
    text: prepared,
  };
}

function canManageOrders(user) {
  return user?.role === "admin" || user?.role === "manager";
}

function canManageContent(user) {
  return user?.role === "admin" || user?.role === "content";
}

function saveOrderRecord(order, userKey = state.currentUser) {
  const users = getUsers();
  const orders = getOrders();
  const customer = order.customer || {};
  const record = {
    status: "new",
    source: "cart",
    userEmail: userKey || customer.email || "",
    ...order,
  };
  saveOrders([record, ...orders]);
  if (userKey && users[userKey]) {
    users[userKey].orders = [record, ...(users[userKey].orders || [])];
    users[userKey].company = customer.company || users[userKey].company || "";
    users[userKey].inn = customer.inn || users[userKey].inn || "";
    users[userKey].kpp = customer.kpp || users[userKey].kpp || "";
    users[userKey].legalAddress = customer.legalAddress || users[userKey].legalAddress || "";
    users[userKey].phone = customer.phone || users[userKey].phone || "";
    users[userKey].city = customer.city || users[userKey].city || "";
    users[userKey].address = customer.address || users[userKey].address || "";
    users[userKey].addresses = [...new Set([customer.address, ...(users[userKey].addresses || [])].filter(Boolean))].slice(0, 10);
    users[userKey].delivery = customer.delivery || users[userKey].delivery || "";
    users[userKey].packaging = customer.packaging || users[userKey].packaging || "";
    users[userKey].layoutFiles = uniqueTextList([customer.layoutFileName, ...(users[userKey].layoutFiles || [])], 20, 240);
    users[userKey].orderComment = customer.comment || users[userKey].orderComment || "";
    users[userKey].orderComments = uniqueTextList([customer.comment, ...(users[userKey].orderComments || [])], 10, 500);
    users[userKey].companies = parseCompanyProfiles(companiesToText(users[userKey]), {
      name: users[userKey].company,
      inn: users[userKey].inn,
      kpp: users[userKey].kpp,
      legalAddress: users[userKey].legalAddress,
    });
    users[userKey].lastCustomer = customer;
    saveUsers(users);
  }
  return record;
}

function updateOrderRecord(orderId, patch) {
  let preparedPatch = null;
  const { crmEntry: crmEntryInput, ...orderPatch } = patch;
  const orders = getOrders().map((order) => {
    if (order.id !== orderId) return order;
    const entry = orderHistoryEntry(order, orderPatch);
    const crmEntry = orderThreadEntry(crmEntryInput || {});
    preparedPatch = {
      ...orderPatch,
      updatedAt: new Date().toISOString(),
      crmThread: crmEntry ? [crmEntry, ...(order.crmThread || [])].slice(0, 200) : order.crmThread || [],
      statusHistory: entry ? [entry, ...(order.statusHistory || [])].slice(0, 100) : order.statusHistory || [],
    };
    return { ...order, ...preparedPatch };
  });
  if (!preparedPatch) return;
  const users = getUsers();
  Object.values(users).forEach((user) => {
    user.orders = (user.orders || []).map((order) => (order.id === orderId ? { ...order, ...preparedPatch } : order));
  });
  saveOrders(orders);
  saveUsers(users);
}

function appendLocalOrderComment(orderId, entry) {
  if (!entry) return false;
  updateOrderRecord(orderId, { crmEntry: entry });
  return true;
}

function updateOrderStatus(orderId, status) {
  updateOrderRecord(orderId, { status });
}

async function submitManagerOrderMessage(form) {
  const orderId = form.dataset.orderManagerMessageForm;
  const data = Object.fromEntries(new FormData(form).entries());
  const text = normalizeOrderCommentText(data.commentText || "");
  if (!text) {
    showToast("Напишите комментарий по заказу.");
    return;
  }
  const visibility = data.commentVisibility === "customer" ? "customer" : "internal";
  try {
    const result = await apiRequest("/api/admin/orders", {
      method: "PATCH",
      body: { id: orderId, commentText: text, commentVisibility: visibility },
    });
    if (result.order) mirrorServerOrder(result.order, result.order.userEmail || result.order.customer?.email || "");
    await loadBackendAccountData();
  } catch (error) {
    if (!isBackendUnavailable(error)) {
      showToast(error.message || "Не удалось добавить комментарий.");
      return;
    }
    const user = getUsers()[state.currentUser] || {};
    appendLocalOrderComment(
      orderId,
      orderThreadEntry({
        text,
        visibility,
        actor: user.name || user.email || "Менеджер",
        role: user.role || "manager",
      })
    );
  }
  form.reset();
  if (isAdminOrdersPage || isAdminOrderPage || isAdminCustomerPage) renderManagementPages();
  else rerenderAccountModal();
  showToast(visibility === "customer" ? "Сообщение покупателю добавлено." : "Внутренний комментарий добавлен.");
}

async function submitCustomerOrderMessage(form) {
  const orderId = form.dataset.orderCustomerMessageForm;
  const text = normalizeOrderCommentText(new FormData(form).get("commentText") || "");
  if (!text) {
    showToast("Напишите сообщение по заказу.");
    return;
  }
  const user = getUsers()[state.currentUser] || {};
  try {
    const result = await apiRequest("/api/orders", {
      method: "PATCH",
      body: { id: orderId, commentText: text },
    });
    if (result.order) mirrorServerOrder(result.order, result.order.userEmail || state.currentUser);
    await loadBackendAccountData();
  } catch (error) {
    if (!isBackendUnavailable(error)) {
      showToast(error.message || "Не удалось отправить сообщение.");
      return;
    }
    appendLocalOrderComment(
      orderId,
      orderThreadEntry({
        text,
        visibility: "customer",
        actor: user.name || user.email || "Покупатель",
        role: "buyer",
      })
    );
  }
  form.reset();
  rerenderAccountModal();
  showToast("Сообщение по заказу добавлено.");
}

function setUserRole(email, role) {
  const users = getUsers();
  if (!users[email] || users[email].role === "admin") return false;
  if (!["buyer", "manager", "content"].includes(role)) return false;
  users[email].role = role;
  saveUsers(users);
  return true;
}

function getFavoritesKey() {
  return state.currentUser ? `${FAVORITES_PREFIX}${state.currentUser}` : FAVORITES_KEY;
}

function loadFavorites() {
  const key = getFavoritesKey();
  const stored = cleanFavoriteIds(JSON.parse(localStorage.getItem(key) || "[]"));
  const legacy = key !== FAVORITES_KEY ? cleanFavoriteIds(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")) : [];
  const merged = legacy.length && !localStorage.getItem(key) ? [...new Set([...stored, ...legacy])] : stored;
  state.favorites = new Set(merged);
  localStorage.setItem(key, JSON.stringify([...state.favorites]));
}

function saveFavorites() {
  localStorage.setItem(getFavoritesKey(), JSON.stringify([...state.favorites]));
  if (personalStateReady) syncFavoritesToBackend();
}

function getCartKey() {
  return state.currentUser ? `sobag.cart.${state.currentUser}` : STORAGE.guestCart;
}

function getSavedCartsKey(userKey = state.currentUser) {
  return userKey ? `${STORAGE.savedCartsPrefix}${userKey}` : STORAGE.guestSavedCarts;
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

function cleanFavoriteIds(ids) {
  return (Array.isArray(ids) ? ids : []).filter((id) => !PROTOTYPE_PRODUCT_IDS.has(String(id || "")));
}

function orderHasPrototypeItems(order) {
  return (order?.items || []).some(isPrototypeCartLine);
}

function cleanPrototypeStorage() {
  const storedProducts = loadStoredProducts();
  localStorage.setItem(STORAGE.products, JSON.stringify(storedProducts));

  Object.keys(localStorage)
    .filter((key) => key === FAVORITES_KEY || key.startsWith(FAVORITES_PREFIX))
    .forEach((key) => {
      const favorites = cleanFavoriteIds(JSON.parse(localStorage.getItem(key) || "[]"));
      localStorage.setItem(key, JSON.stringify(favorites));
    });
  loadFavorites();

  Object.keys(localStorage)
    .filter((key) => key === STORAGE.guestCart || key.startsWith("sobag.cart."))
    .forEach((key) => {
      const entries = cleanCartEntries(JSON.parse(localStorage.getItem(key) || "[]"));
      localStorage.setItem(key, JSON.stringify(entries));
    });

  const orders = getOrders().filter((order) => !orderHasPrototypeItems(order));
  saveOrders(orders);

  const users = getUsers();
  Object.values(users).forEach((user) => {
    user.orders = (user.orders || []).filter((order) => !orderHasPrototypeItems(order));
  });
  saveUsers(users);
}

function loadCart() {
  const entries = cleanCartEntries(JSON.parse(localStorage.getItem(getCartKey()) || "[]"));
  state.cart = new Map(entries);
  localStorage.setItem(getCartKey(), JSON.stringify(entries));
}

function saveCart() {
  localStorage.setItem(getCartKey(), JSON.stringify([...state.cart.entries()]));
  if (personalStateReady) syncCartToBackend();
}

let cartSyncTimer = 0;
let favoritesSyncTimer = 0;
let savedCartsSyncTimer = 0;

function totalsFromCartEntries(entries) {
  const lines = cleanCartEntries(entries).map(([, line]) => line);
  const qty = lines.reduce((sum, line) => sum + Number(line.qty || 0), 0);
  const subtotal = lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.variant?.price || 0), 0);
  const discount = getBasketDiscount(subtotal);
  const total = Math.round(subtotal * (1 - discount / 100));
  return { qty, subtotal, discount, total };
}

function normalizeSavedCartText(value, limit = 1000) {
  return String(value || "").trim().slice(0, limit);
}

function normalizeSavedCartHistory(items) {
  return (Array.isArray(items) ? items : [])
    .map((entry) => ({
      at: normalizeSavedCartText(entry?.at || new Date().toISOString(), 40),
      actor: normalizeSavedCartText(entry?.actor || "", 120),
      role: normalizeSavedCartText(entry?.role || "", 40),
      type: normalizeSavedCartText(entry?.type || "comment", 40),
      text: normalizeSavedCartText(entry?.text || "", 1000),
      visibility: entry?.visibility === "internal" ? "internal" : "customer",
    }))
    .filter((entry) => entry.text)
    .slice(-20);
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
    discount: totals.discount,
    status: item.status === "sent" ? "sent" : "draft",
    sentAt: item.sentAt || "",
    sentOrderId: item.sentOrderId || "",
    customerComment: normalizeSavedCartText(item.customerComment || item.comment || ""),
    managerComment: normalizeSavedCartText(item.managerComment || ""),
    commentHistory: normalizeSavedCartHistory(item.commentHistory),
    ...totals,
  };
}

function getSavedCarts(userKey = state.currentUser) {
  const raw = JSON.parse(localStorage.getItem(getSavedCartsKey(userKey)) || "[]");
  return (Array.isArray(raw) ? raw : []).map(normalizeSavedCart).filter(Boolean).slice(0, 50);
}

function saveSavedCarts(carts, options = {}) {
  const userKey = state.currentUser;
  const normalized = (Array.isArray(carts) ? carts : []).map(normalizeSavedCart).filter(Boolean).slice(0, 50);
  localStorage.setItem(getSavedCartsKey(userKey), JSON.stringify(normalized));
  if (userKey) {
    const users = getUsers();
    if (users[userKey]) {
      users[userKey].savedCarts = normalized;
      saveUsers(users);
    }
  }
  if (options.sync !== false && personalStateReady) syncSavedCartsToBackend();
  return normalized;
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
  renderSavedQuotesPage();
  showToast("Черновик корзины сохранен.");
  return saved[0];
}

function findCurrentVariantBySku(sku) {
  const key = baseSkuKey(sku);
  if (!key) return null;
  for (const product of products) {
    const variant = (product.variants || []).find((item) => baseSkuKey(item.sku) === key);
    if (variant) return { product, variant };
  }
  return null;
}

function savedCartRestoreAnalysis(cart) {
  const missingSkus = [];
  const changedPrices = [];
  const refreshedEntries = cleanCartEntries(cart.items).map(([key, line]) => {
    const sku = line?.variant?.sku || line?.variantSku || "";
    const current = findCurrentVariantBySku(sku);
    if (!current) {
      missingSkus.push(sku || key);
      return [key, line];
    }
    const oldPrice = Number(line?.variant?.price || 0);
    const newPrice = Number(current.variant.price || 0);
    const nextKey = `${current.product.id}:${current.variant.sku}`;
    if (oldPrice !== newPrice) {
      changedPrices.push({
        sku: current.variant.sku,
        oldPrice,
        newPrice,
      });
    }
    return [
      nextKey,
      {
        ...line,
        key: nextKey,
        productId: current.product.id,
        productName: current.variant.name || current.product.name || line.productName || "",
        productImage: current.product.image || line.productImage || "",
        variant: {
          ...(line.variant || {}),
          ...current.variant,
        },
      },
    ];
  });
  return { missingSkus, changedPrices, refreshedEntries };
}

function savedCartRestoreWarning(analysis) {
  const lines = [];
  if (analysis.changedPrices.length) {
    lines.push(
      `Изменились цены у ${analysis.changedPrices.length} ${pluralRu(analysis.changedPrices.length, "варианта", "вариантов", "вариантов")}.`
    );
    analysis.changedPrices.slice(0, 5).forEach((item) => {
      lines.push(`${item.sku}: было ${formatMoney(item.oldPrice)}, сейчас ${formatMoney(item.newPrice)}`);
    });
  }
  if (analysis.missingSkus.length) {
    lines.push(`Не найдены в текущем каталоге: ${analysis.missingSkus.slice(0, 8).join(", ")}.`);
  }
  return lines.join("\n");
}

function restoreSavedCart(cartId) {
  const draft = getSavedCarts().find((item) => item.id === cartId);
  if (!draft) {
    showToast("Черновик корзины не найден.");
    return;
  }
  const analysis = savedCartRestoreAnalysis(draft);
  const warning = savedCartRestoreWarning(analysis);
  if (warning && !window.confirm(`В сохраненном КП есть расхождения с текущим каталогом:\n\n${warning}\n\nВосстановить КП с актуальными ценами там, где SKU найден?`)) {
    return;
  }
  state.cart = new Map(analysis.refreshedEntries);
  saveCart();
  renderCart();
  closeModal();
  navigateWithinSite("cart.html");
  showToast(warning ? "КП восстановлено с учетом актуальных цен." : "Черновик восстановлен в корзину.");
}

function deleteSavedCart(cartId) {
  saveSavedCarts(getSavedCarts().filter((item) => item.id !== cartId));
  refreshSavedCartViews();
  showToast("Черновик удален.");
}

function updateSavedCart(cartId, patch) {
  const next = getSavedCarts().map((item) =>
    item.id === cartId
      ? {
          ...item,
          ...patch,
          updatedAt: new Date().toISOString(),
          date: new Date().toLocaleString("ru-RU"),
        }
      : item
  );
  const saved = saveSavedCarts(next);
  return saved.find((item) => item.id === cartId) || null;
}

function renameSavedCart(cartId) {
  const draft = getSavedCarts().find((item) => item.id === cartId);
  if (!draft) {
    showToast("Черновик корзины не найден.");
    return;
  }
  const title = window.prompt("Название сохраненного КП", draft.title) || "";
  const prepared = title.trim();
  if (!prepared || prepared === draft.title) return;
  updateSavedCart(cartId, { title: prepared, status: draft.status || "draft" });
  refreshSavedCartViews();
  showToast("Название КП обновлено.");
}

function savedCartFileName(cart, extension) {
  const slug =
    String(cart.title || cart.id || "quote")
      .toLocaleLowerCase("ru-RU")
      .replace(/[^a-zа-яё0-9]+/giu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "quote";
  return `sobag-${slug}-${cart.id}.${extension}`;
}

function canViewSavedCartInternal() {
  return canManageOrders(getUsers()[state.currentUser]);
}

function savedCartQuoteRows(cart, options = {}) {
  const totals = totalsFromCartEntries(cart.items);
  const includeInternal = Boolean(options.includeInternal);
  return [
    ["Коммерческое предложение Sobag Opt"],
    ["Название", cart.title],
    ["Дата", new Date(cart.updatedAt || cart.createdAt || Date.now()).toLocaleString("ru-RU")],
    ["Статус", cart.status === "sent" ? "Отправлено менеджеру" : "Черновик"],
    ["Номер заказа", cart.sentOrderId || ""],
    ["Комментарий покупателя", cart.customerComment || ""],
    ...(includeInternal ? [["Комментарий менеджера", cart.managerComment || ""]] : []),
    ["Сумма товаров", totals.subtotal],
    ["Скидка по корзине", `${totals.discount}%`],
    ["Итого", totals.total],
    [],
    ["Артикул", "Наименование", "Тип", "Размер", "Материал", "Количество", "Цена до скидки", "Цена со скидкой", "Сумма"],
    ...cleanCartEntries(cart.items).map(([, line]) => {
      const unit = discountedUnitPrice(line.variant?.price || 0, totals.discount);
      return [
        line.variant?.sku || "",
        line.productName || line.variant?.name || "",
        line.variant?.type || "",
        line.variant?.size || "",
        line.variant?.material || "",
        line.qty || 0,
        line.variant?.price || 0,
        unit,
        unit * (line.qty || 0),
      ];
    }),
  ];
}

function downloadRowsXlsx(rows, fileName, sheetName = "КП") {
  if (!window.XLSX) return false;
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 28 }, { wch: 34 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, fileName);
  return true;
}

function downloadSavedCartQuote(cartId) {
  const draft = getSavedCarts().find((item) => item.id === cartId);
  if (!draft) {
    showToast("Черновик корзины не найден.");
    return;
  }
  const rows = savedCartQuoteRows(draft, { includeInternal: canViewSavedCartInternal() });
  if (downloadRowsXlsx(rows, savedCartFileName(draft, "xlsx"), "КП")) {
    showToast("КП скачано в XLSX.");
    return;
  }
  downloadCsv(savedCartFileName(draft, "csv"), rows);
  showToast("XLSX недоступен на этой странице, скачан CSV.");
}

function printSavedCartQuote(cartId) {
  const draft = getSavedCarts().find((item) => item.id === cartId);
  if (!draft) {
    showToast("Черновик корзины не найден.");
    return;
  }
  const totals = totalsFromCartEntries(draft.items);
  const rows = cleanCartEntries(draft.items)
    .map(([, line]) => {
      const unit = discountedUnitPrice(line.variant?.price || 0, totals.discount);
      return `<tr><td>${escapeHtml(line.variant?.sku || "")}</td><td>${escapeHtml(line.productName || line.variant?.name || "")}</td><td>${escapeHtml([line.variant?.type, line.variant?.size, line.variant?.material].filter(Boolean).join(", "))}</td><td>${line.qty || 0}</td><td>${formatMoney(unit)}</td><td>${formatMoney(unit * (line.qty || 0))}</td></tr>`;
    })
    .join("");
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    showToast("Браузер заблокировал окно печати.");
    return;
  }
  const includeInternal = canViewSavedCartInternal();
  const comments = [
    draft.customerComment ? `<p><b>Комментарий покупателя:</b> ${escapeHtml(draft.customerComment)}</p>` : "",
    includeInternal && draft.managerComment ? `<p><b>Комментарий менеджера:</b> ${escapeHtml(draft.managerComment)}</p>` : "",
  ].join("");
  win.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(draft.title)} · Sobag Opt</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{font-size:28px}p{margin:6px 0}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}.total{font-size:22px;font-weight:800;margin-top:18px}</style></head><body><h1>${escapeHtml(draft.title)}</h1><p>Коммерческое предложение Sobag Opt</p><p>Статус: ${draft.status === "sent" ? "отправлено менеджеру" : "черновик"}</p><p>Скидка по корзине: ${totals.discount}%</p>${comments}<table><thead><tr><th>Артикул</th><th>Наименование</th><th>Параметры</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Итого: ${formatMoney(totals.total)}</p><script>window.print();</script></body></html>`);
  win.document.close();
}

function customerFromSavedCartProfile(user, draft) {
  const note = `Заказ создан из сохраненного КП "${draft.title}".`;
  const comment = [note, draft.customerComment ? `Комментарий к КП: ${draft.customerComment}` : "", user.orderComment || user.lastCustomer?.comment || ""].filter(Boolean).join("\n");
  return {
    name: user.name || user.company || "",
    email: user.email || state.currentUser || "",
    company: user.company || user.lastCustomer?.company || "",
    inn: user.inn || user.lastCustomer?.inn || "",
    kpp: user.kpp || user.lastCustomer?.kpp || "",
    phone: user.phone || user.lastCustomer?.phone || "",
    city: user.city || user.lastCustomer?.city || "",
    address: user.address || user.lastCustomer?.address || user.addresses?.[0] || "",
    legalAddress: user.legalAddress || user.lastCustomer?.legalAddress || "",
    delivery: user.delivery || user.lastCustomer?.delivery || "",
    packaging: user.packaging || user.lastCustomer?.packaging || "",
    layoutFileName: user.layoutFiles?.[0] || user.lastCustomer?.layoutFileName || "",
    comment,
  };
}

async function sendSavedCartToManager(cartId) {
  const draft = getSavedCarts().find((item) => item.id === cartId);
  const user = getUsers()[state.currentUser];
  if (!draft || !user) {
    showToast("Черновик КП не найден.");
    return;
  }
  const customer = customerFromSavedCartProfile(user, draft);
  if (!String(customer.company || "").trim() || !String(customer.phone || "").trim()) {
    showToast("Заполните компанию и телефон в профиле перед отправкой КП менеджеру.");
    return;
  }
  if (!window.confirm(`Отправить менеджеру КП "${draft.title}" на сумму ${formatMoney(draft.total)}?`)) return;
  const items = cleanCartEntries(draft.items).map(([, line]) => line);
  const totals = totalsFromCartEntries(draft.items);
  let order = null;
  try {
    const result = await apiRequest("/api/orders", {
      method: "POST",
      body: {
        customer,
        items,
        total: totals.total,
        source: "saved_cart",
      },
    });
    order = result.order;
    if (order) mirrorServerOrder(order, state.currentUser);
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 404) {
      showToast(error.message || "Не удалось отправить КП менеджеру.");
      return;
    }
  }
  if (!order) {
    order = saveOrderRecord(
      {
        id: `SO-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleString("ru-RU"),
        customer,
        items,
        total: totals.total,
        source: "saved_cart",
      },
      state.currentUser
    );
  }
  updateSavedCart(cartId, {
    status: "sent",
    sentAt: new Date().toISOString(),
    sentOrderId: order.id || "",
    commentHistory: [
      ...normalizeSavedCartHistory(draft.commentHistory),
      {
        at: new Date().toISOString(),
        actor: user.name || user.email || "Покупатель",
        role: "buyer",
        type: "sent",
        visibility: "customer",
        text: `КП отправлено менеджеру как заказ ${order.id || ""}.`,
      },
    ],
  });
  refreshSavedCartViews();
  showToast(`КП отправлено менеджеру. Заказ ${order.id || ""}`);
}

function saveSavedCartComments(form) {
  const cartId = form.dataset.savedCartCommentForm;
  const draft = getSavedCarts().find((item) => item.id === cartId);
  if (!draft) {
    showToast("Черновик КП не найден.");
    return;
  }
  const user = getUsers()[state.currentUser] || {};
  const data = Object.fromEntries(new FormData(form).entries());
  const customerComment = normalizeSavedCartText(data.customerComment || "");
  const managerComment = canManageOrders(user) ? normalizeSavedCartText(data.managerComment || "") : draft.managerComment || "";
  const history = normalizeSavedCartHistory(draft.commentHistory);
  if (customerComment !== (draft.customerComment || "")) {
    history.push({
      at: new Date().toISOString(),
      actor: user.name || user.email || "Покупатель",
      role: user.role || "buyer",
      type: "comment",
      visibility: "customer",
      text: customerComment ? `Комментарий покупателя обновлен: ${customerComment}` : "Комментарий покупателя очищен.",
    });
  }
  if (managerComment !== (draft.managerComment || "")) {
    history.push({
      at: new Date().toISOString(),
      actor: user.name || user.email || "Менеджер",
      role: user.role || "manager",
      type: "manager_comment",
      visibility: "internal",
      text: managerComment ? `Внутренний комментарий менеджера обновлен: ${managerComment}` : "Внутренний комментарий менеджера очищен.",
    });
  }
  updateSavedCart(cartId, {
    customerComment,
    managerComment,
    commentHistory: history,
  });
  refreshSavedCartViews();
  showToast("Комментарии КП сохранены.");
}

async function submitProductReview(form) {
  const product = products.find((item) => item.id === form.dataset.reviewForm);
  const user = getUsers()[state.currentUser];
  if (!product || !user) {
    showToast("Войдите или зарегистрируйтесь, чтобы оставить отзыв.");
    openAccount();
    return;
  }
  const data = Object.fromEntries(new FormData(form).entries());
  const rating = Math.max(1, Math.min(5, Math.round(Number(data.rating || 0))));
  const text = String(data.text || "").trim();
  if (!rating || text.length < 5) {
    showToast("Поставьте оценку и напишите отзыв от 5 символов.");
    return;
  }
  try {
    const result = await apiRequest("/api/auth/me", {
      method: "PUT",
      body: {
        review: {
          productId: product.id,
          baseSku: product.baseSku,
          productName: product.name,
          rating,
          text,
        },
      },
    });
    if (result.user) saveServerUserProfile(result.user);
    form.reset();
    setReviewFormRating(form, 5);
    showToast("Отзыв отправлен на модерацию.");
  } catch (error) {
    if (error.status === 401) {
      showToast("Войдите в аккаунт, чтобы оставить отзыв.");
      openAccount();
      return;
    }
    showToast(error.message || "Не удалось отправить отзыв.");
  }
}

function setReviewFormRating(form, rating) {
  const prepared = Math.max(1, Math.min(5, Math.round(Number(rating || 0))));
  const input = form?.querySelector('input[name="rating"]');
  if (input) input.value = prepared;
  form?.querySelectorAll("[data-review-star]").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.reviewStar || 0) <= prepared);
  });
}

function uniqueTextList(values, limit = 10, itemLimit = 240) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map((item) => String(item || "").trim().slice(0, itemLimit))
        .filter(Boolean)
    ),
  ].slice(0, limit);
}

function textAreaLines(value, limit = 10, itemLimit = 240) {
  return uniqueTextList(String(value || "").split(/\r?\n/), limit, itemLimit);
}

function parseCompanyProfiles(value, primary = {}) {
  const rows = textAreaLines(value, 10, 600)
    .map((line) => {
      const [name = "", inn = "", kpp = "", legalAddress = ""] = line.split(";").map((part) => part.trim());
      return {
        name: name.slice(0, 180),
        inn: inn.replace(/\D/g, "").slice(0, 12),
        kpp: kpp.replace(/\D/g, "").slice(0, 9),
        legalAddress: legalAddress.slice(0, 240),
      };
    })
    .filter((company) => company.name || company.inn);
  const prepared = [primary, ...rows]
    .map((company) => ({
      name: String(company?.name || company?.company || "").trim().slice(0, 180),
      inn: String(company?.inn || "").replace(/\D/g, "").slice(0, 12),
      kpp: String(company?.kpp || "").replace(/\D/g, "").slice(0, 9),
      legalAddress: String(company?.legalAddress || "").trim().slice(0, 240),
    }))
    .filter((company) => company.name || company.inn);
  const seen = new Set();
  return prepared
    .filter((company) => {
      const key = company.inn || company.name.toLocaleLowerCase("ru-RU");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

function companiesToText(user = {}) {
  const primaryKey = user.inn || String(user.company || "").toLocaleLowerCase("ru-RU");
  return (user.companies || [])
    .filter((company) => {
      const key = company.inn || String(company.name || "").toLocaleLowerCase("ru-RU");
      return key && key !== primaryKey;
    })
    .map((company) => [company.name, company.inn, company.kpp, company.legalAddress].filter(Boolean).join("; "))
    .join("\n");
}

function linesToText(values = []) {
  return uniqueTextList(values, 20, 500).join("\n");
}

async function saveProfileForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const currentUserData = getUsers()[state.currentUser] || {};
  const primaryAddress = String(data.address || "").trim();
  const addresses = uniqueTextList([primaryAddress, ...textAreaLines(data.addresses, 10, 240), ...(currentUserData.addresses || [])], 10, 240);
  const layoutFiles = uniqueTextList([...textAreaLines(data.layoutFiles, 20, 240), ...(currentUserData.layoutFiles || [])], 20, 240);
  const orderComment = String(data.orderComment || "").trim();
  const orderComments = uniqueTextList([orderComment, ...textAreaLines(data.orderComments, 10, 500), ...(currentUserData.orderComments || [])], 10, 500);
  const profile = {
    name: String(data.name || "").trim(),
    phone: String(data.phone || "").trim(),
    company: String(data.company || "").trim(),
    inn: String(data.inn || "").replace(/\D/g, ""),
    kpp: String(data.kpp || "").replace(/\D/g, ""),
    legalAddress: String(data.legalAddress || "").trim(),
    city: String(data.city || "").trim(),
    address: primaryAddress,
    delivery: String(data.delivery || "").trim(),
    packaging: String(data.packaging || "").trim(),
    orderComment,
    addresses,
    layoutFiles,
    orderComments,
  };
  profile.companies = parseCompanyProfiles(data.companies, {
    name: profile.company,
    inn: profile.inn,
    kpp: profile.kpp,
    legalAddress: profile.legalAddress,
  });
  if (profile.inn && ![10, 12].includes(profile.inn.length)) {
    setFieldError(form, "inn", "ИНН должен содержать 10 или 12 цифр.");
    return;
  }
  if (profile.kpp && profile.kpp.length !== 9) {
    setFieldError(form, "kpp", "КПП должен содержать 9 цифр.");
    return;
  }
  const users = getUsers();
  const user = users[state.currentUser];
  if (!user) return;
  users[state.currentUser] = {
    ...user,
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  saveUsers(users);
  try {
    const result = await apiRequest("/api/auth/me", { method: "PUT", body: { profile } });
    if (result.user) saveServerUserProfile({ ...result.user, savedCarts: getSavedCarts() });
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 404) {
      showToast(error.message || "Не удалось сохранить профиль на сервере.");
      return;
    }
  }
  showToast("Профиль сохранен.");
  rerenderAccountModal();
}

function rerenderAccountModal() {
  const modal = document.querySelector("#accountModal");
  if (!modal) return;
  modal.remove();
  document.body.insertAdjacentHTML("beforeend", accountModalHtml());
  activateModal(document.querySelector("#accountModal"));
  if (window.lucide) window.lucide.createIcons();
}

function syncCartToBackend() {
  if (!state.currentUser) return;
  window.clearTimeout(cartSyncTimer);
  const items = [...state.cart.entries()];
  cartSyncTimer = window.setTimeout(() => {
    apiRequest("/api/auth/me", { method: "PUT", body: { cartItems: items } }).catch((error) => {
      if (!isBackendUnavailable(error)) console.warn(error);
    });
  }, 250);
}

function syncFavoritesToBackend() {
  if (!state.currentUser) return;
  window.clearTimeout(favoritesSyncTimer);
  const items = [...state.favorites];
  favoritesSyncTimer = window.setTimeout(() => {
    apiRequest("/api/auth/me", { method: "PUT", body: { favoriteItems: items } }).catch((error) => {
      if (!isBackendUnavailable(error)) console.warn(error);
    });
  }, 250);
}

function syncSavedCartsToBackend() {
  if (!state.currentUser) return;
  window.clearTimeout(savedCartsSyncTimer);
  const savedCarts = getSavedCarts();
  savedCartsSyncTimer = window.setTimeout(() => {
    apiRequest("/api/auth/me", { method: "PUT", body: { savedCarts } }).catch((error) => {
      if (!isBackendUnavailable(error)) console.warn(error);
    });
  }, 250);
}

async function loadServerPersonalState() {
  if (!state.currentUser) return false;
  try {
    const personalData = await apiRequest("/api/auth/me");
    const serverCart = cleanCartEntries(personalData.cartItems || []);
    const localCart = cleanCartEntries([...state.cart.entries()]);
    const mergedCart = new Map(serverCart);
    localCart.forEach(([key, line]) => mergedCart.set(key, line));
    state.cart = mergedCart;
    localStorage.setItem(getCartKey(), JSON.stringify([...state.cart.entries()]));

    const mergedFavorites = [...new Set([...cleanFavoriteIds(personalData.favoriteItems || []), ...state.favorites])];
    state.favorites = new Set(mergedFavorites);
    localStorage.setItem(getFavoritesKey(), JSON.stringify([...state.favorites]));

    const mergedSavedCarts = mergeSavedCarts(personalData.savedCarts || [], getSavedCarts());
    saveSavedCarts(mergedSavedCarts, { sync: false });

    personalStateReady = true;
    syncCartToBackend();
    syncFavoritesToBackend();
    syncSavedCartsToBackend();
    renderCart();
    renderProducts();
    renderAccountButton();
    return true;
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 401) console.warn(error);
    personalStateReady = true;
    return false;
  }
}

function repeatOrder(orderId) {
  const order = getOrders().find((item) => item.id === orderId);
  const items = (order?.items || []).filter((line) => line?.variant?.sku);
  if (!items.length) {
    showToast("В заказе нет позиций, которые можно повторить.");
    return;
  }
  items.forEach((line) => {
    const variant = line.variant || {};
    const key = `${line.productId || variant.sku}:${variant.sku}`;
    const existing = state.cart.get(key);
    state.cart.set(key, {
      key,
      productId: line.productId || "",
      productName: line.productName || variant.name || "",
      productImage: line.productImage || "",
      variant,
      qty: Math.max(1, Number(existing?.qty || 0) + Number(line.qty || 1)),
    });
  });
  saveCart();
  renderCart();
  showToast(`Позиции из заказа ${order.id} добавлены в корзину.`);
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

const customCalcPrices = {
  pillow: 520,
  cover: 290,
  blanket: 820,
  bag: 210,
  flag: 360,
  remuvka: 95,
};

const customCalcMaterialAdds = {
  velour: 0,
  gabardine: -35,
  fleece: 80,
};

const customCalcPackAdds = {
  none: 0,
  simple: 18,
  marketplace: 42,
};

function getCustomCalcDiscount(qty) {
  if (qty >= 300) return 18;
  if (qty >= 150) return 12;
  if (qty >= 70) return 7;
  if (qty >= 30) return 3;
  return 0;
}

function updateCustomCalculator() {
  const calculator = document.querySelector("#customCalculator");
  if (!calculator) return;
  const product = document.querySelector("#customCalcProduct")?.value || "pillow";
  const material = document.querySelector("#customCalcMaterial")?.value || "velour";
  const pack = document.querySelector("#customCalcPack")?.value || "none";
  const qty = Math.max(Number(document.querySelector("#customCalcQty")?.value || 0), 0);
  const base = customCalcPrices[product] || customCalcPrices.pillow;
  const unitBeforeDiscount = Math.max(base + (customCalcMaterialAdds[material] || 0) + (customCalcPackAdds[pack] || 0), 1);
  const discount = getCustomCalcDiscount(qty);
  const unit = discountedUnitPrice(unitBeforeDiscount, discount);
  const total = qty * unit;
  const totalNode = document.querySelector("#customCalcTotal");
  const unitNode = document.querySelector("#customCalcUnit");
  const hintNode = document.querySelector("#customCalcHint");
  if (totalNode) totalNode.textContent = formatMoney(total);
  if (unitNode) unitNode.textContent = qty ? `${formatMoney(unit)} за шт. · скидка ${discount}%` : "Введите тираж";
  if (hintNode) {
    const nextTier = quantityTiers.find((tier) => qty < tier.qty);
    hintNode.textContent = nextTier
      ? `${Math.max(nextTier.qty - qty, 0)} шт. до скидки ${nextTier.discount}%. Расчет ориентировочный, финальную цену подтвердит менеджер после проверки макета.`
      : "Применена максимальная скидка по тиражу. Финальную цену подтвердит менеджер после проверки макета.";
  }
}

function lineTotals(line, discount = getBasketDiscount(getCartTotals().subtotal)) {
  const subtotal = line.variant.price * line.qty;
  const total = discountedUnitPrice(line.variant.price, discount) * line.qty;
  return { subtotal, discount, total };
}

function getCartTotals() {
  const lines = [...state.cart.values()];
  const qty = lines.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.variant.price * line.qty, 0);
  const discount = getBasketDiscount(subtotal);
  const total = Math.round(subtotal * (1 - discount / 100));
  return { subtotal, total, qty, discount };
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

function serverFacetBucketKey(key) {
  return {
    category: "categories",
    collection: "collections",
    holiday: "holidays",
    size: "sizes",
    material: "materials",
  }[key] || key;
}

function selectedFilterValues(key) {
  return [...(state.filters[key] || new Set())];
}

function serverFacetOptionsForKey(key) {
  const result = currentServerCatalogResult();
  if (!result) return null;
  const bucket = serverFacetBucketKey(key);
  const source = result.facetOptions?.[bucket] || result.facets?.[bucket];
  if (!Array.isArray(source)) return null;
  return uniqueList([...source.map((item) => item?.value || item), ...selectedFilterValues(key)]).sort((left, right) =>
    left.localeCompare(right, "ru", { sensitivity: "base", numeric: true })
  );
}

function productsForFilterOptions(key) {
  return products.filter((product) => {
    if (product.hidden) return false;
    if (isFavoritesPage && !state.favorites.has(product.id)) return false;
    if (state.selectedCategory && !productHasCategory(product, state.selectedCategory)) return false;
    if (state.selectedCollection && !productHasCollection(product, state.selectedCollection)) return false;
    if (state.selectedHoliday && !productHasHoliday(product, state.selectedHoliday)) return false;
    if (key !== "category" && state.filters.category.size && ![...state.filters.category].some((category) => productHasCategory(product, category))) return false;
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
  const serverOptions = serverFacetOptionsForKey(key);
  if (serverOptions) return serverOptions;
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
  if (key === "category") return [...new Set(sourceProducts.flatMap((product) => product.categories || [product.category]))];
  return [...new Set(sourceProducts.map((product) => product[key]))];
}

function productMatchesFilters(product) {
  const filters = state.filters;
  if (state.selectedCategory && !productHasCategory(product, state.selectedCategory)) return false;
  if (state.selectedCollection && !productHasCollection(product, state.selectedCollection)) return false;
  if (state.selectedHoliday && !productHasHoliday(product, state.selectedHoliday)) return false;
  if (filters.category.size && ![...filters.category].some((category) => productHasCategory(product, category))) return false;
  if (filters.collection.size && ![...filters.collection].some((collection) => productHasCollection(product, collection))) return false;
  if (filters.holiday.size && ![...filters.holiday].some((holiday) => productHasHoliday(product, holiday))) return false;

  const variantFilters = ["size", "material"];
  return product.variants.some((variant) =>
    variantFilters.every((key) => !filters[key].size || filters[key].has(variant[key]))
  );
}

function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\u0451/g, "\u0435")
    .replace(/[\s_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function skuSearchKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function productSearchText(product) {
  return normalizeSearchText(
    [
      product.name,
      product.baseSku,
      product.description,
      product.collections.join(" "),
      product.holidays.join(" "),
      product.tags.join(" "),
      (product.categories || []).join(" "),
      product.variants.map((variant) => variant.sku).join(" "),
    ].join(" ")
  );
}

function productHasExactSearchMatch(product, rawQuery) {
  const query = normalizeSearchText(rawQuery);
  const querySku = skuSearchKey(rawQuery);
  if (!query || !querySku) return false;
  const skuMatch = [product.baseSku, ...product.variants.map((variant) => variant.sku)].some((sku) => skuSearchKey(sku) === querySku);
  return skuMatch || normalizeSearchText(product.name) === query;
}

function searchScore(product, rawQuery = state.search) {
  const query = normalizeSearchText(rawQuery);
  const querySku = skuSearchKey(rawQuery);
  if (!query) return 1;

  const skuKeys = [product.baseSku, ...product.variants.map((variant) => variant.sku)].map(skuSearchKey);
  if (querySku && skuKeys.includes(querySku)) return 10000;
  if (normalizeSearchText(product.name) === query) return 9000;
  if (querySku && skuKeys.some((sku) => sku.startsWith(querySku))) return 7000;
  if (querySku && skuKeys.some((sku) => sku.includes(querySku))) return 5000;
  if (querySku && /\d/.test(querySku)) return 0;

  const name = normalizeSearchText(product.name);
  if (name.startsWith(query)) return 4000;
  if (name.includes(query)) return 3000;

  const text = productSearchText(product);
  if (text.includes(query)) return 1600;
  const tokens = query.split(" ").filter((token) => token.length > 2);
  if (tokens.length && tokens.every((token) => text.includes(token))) return 1200;
  if (tokens.length && tokens.some((token) => text.includes(token))) return 650;
  return 0;
}

function getSearchSuggestions() {
  const query = state.search.trim();
  if (normalizeSearchText(query).length < 2) return [];
  if (products.some((product) => !product.hidden && productHasExactSearchMatch(product, query))) return [];
  return products
    .filter((product) => !product.hidden)
    .map((product) => ({ product, score: searchScore(product, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.product.popular - a.product.popular)
    .slice(0, 5)
    .map(({ product }) => product);
}

function countSearchValues(list, getter, limit = 6) {
  const counts = new Map();
  list.forEach((product) => {
    getter(product).forEach((value) => {
      const prepared = String(value || "").trim();
      if (!prepared) return;
      counts.set(prepared, (counts.get(prepared) || 0) + 1);
    });
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function setSearchQuery(query) {
  state.search = String(query || "").trim();
  if (searchInput) searchInput.value = state.search;
  resetVisibleProducts();
  syncCatalogRoute();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderSearchResultsPanel(list, total = list.length) {
  if (!searchResultsPanel) return;
  const query = state.search.trim();
  const resultTotal = Number(total || 0) || 0;
  const suggestions = getSearchSuggestions();
  const source = list.length ? list : suggestions.length ? suggestions : products.filter((product) => !product.hidden).slice(0, 80);
  const categories = countSearchValues(source, (product) => product.categories || [product.category], 5);
  const collections = countSearchValues(source, (product) => product.collections || [], 5);
  const holidays = countSearchValues(source, (product) => product.holidays || [], 4);
  const tags = countSearchValues(source, (product) => product.tags || [], 6);
  const hasQuickFilters = categories.length || collections.length || holidays.length || tags.length;

  searchResultsPanel.innerHTML = `
    <div class="search-results-panel__main">
      <span>Результаты поиска</span>
      <h3>${query ? escapeHtml(query) : "Введите запрос в поисковой строке"}</h3>
      <p>${query ? `${resultTotal} ${productWord(resultTotal)} найдено. Сначала идут точные совпадения по артикулу, затем по названию и тематике.` : "Ищите по артикулу, названию, подборке, празднику или тегу."}</p>
    </div>
    ${
      suggestions.length
        ? `<div class="search-results-panel__suggestions">
            <span>Возможно, вы искали</span>
            <div>${suggestions
              .map((product) => `<button type="button" data-open-product="${escapeHtml(product.id)}"><b>${escapeHtml(product.baseSku)}</b><span>${escapeHtml(product.name)}</span></button>`)
              .join("")}</div>
          </div>`
        : ""
    }
    ${
      hasQuickFilters
        ? `<div class="search-results-panel__quick">
            <span>Быстрые фильтры</span>
            <div>
              ${categories.map((item) => `<button type="button" data-open-category="${escapeHtml(item.value)}">${escapeHtml(item.value)} <b>${item.count}</b></button>`).join("")}
              ${collections.map((item) => `<button type="button" data-open-collection="${escapeHtml(item.value)}">${escapeHtml(item.value)} <b>${item.count}</b></button>`).join("")}
              ${holidays.map((item) => `<button type="button" data-open-holiday="${escapeHtml(item.value)}">${escapeHtml(item.value)} <b>${item.count}</b></button>`).join("")}
              ${tags.map((item) => `<button type="button" data-search-query="${escapeHtml(item.value)}">${escapeHtml(item.value)} <b>${item.count}</b></button>`).join("")}
            </div>
          </div>`
        : ""
    }
  `;
}

function renderSearchSuggestions() {
  const searchBox = searchInput?.closest(".search");
  if (!searchBox) return;
  let node = searchBox.querySelector(".search-suggestions");
  if (!node) {
    node = document.createElement("div");
    node.className = "search-suggestions";
    node.setAttribute("aria-live", "polite");
    searchBox.appendChild(node);
  }
  const suggestions = getSearchSuggestions();
  if (!suggestions.length) {
    node.hidden = true;
    node.innerHTML = "";
    return;
  }
  node.hidden = false;
  node.innerHTML = `
    <span>Похожие товары</span>
    ${suggestions
      .map(
        (product) => `
          <button type="button" data-open-product="${escapeHtml(product.id)}">
            <strong>${escapeHtml(product.baseSku)}</strong>
            <em>${escapeHtml(product.name)}</em>
          </button>
        `
      )
      .join("")}
  `;
}

function getFilteredProducts() {
  if (
    isSearchPage &&
    !state.search.trim() &&
    !state.selectedCategory &&
    !state.selectedCollection &&
    !state.selectedHoliday &&
    !Object.values(state.filters).some((bucket) => bucket.size)
  ) {
    return [];
  }
  return products
    .map((product) => ({ product, score: searchScore(product) }))
    .filter(
      ({ product, score }) =>
        !product.hidden &&
        (!isFavoritesPage || state.favorites.has(product.id)) &&
        productMatchesFilters(product) &&
        (state.search.trim() ? score > 0 : true)
    )
    .sort((a, b) => {
      if (state.search.trim() && b.score !== a.score) return b.score - a.score;
      if (state.sort === "priceAsc") return a.product.minPrice - b.product.minPrice;
      if (state.sort === "priceDesc") return b.product.maxPrice - a.product.maxPrice;
      if (state.sort === "minQty") return 30 - 30;
      return b.product.popular - a.product.popular;
    })
    .map(({ product }) => product);
}

function activeFilterItems() {
  const items = [];
  if (state.selectedCategory) items.push({ label: state.selectedCategory, key: "selectedCategory" });
  if (state.selectedCollection) items.push({ label: state.selectedCollection, key: "selectedCollection" });
  if (state.selectedHoliday) items.push({ label: state.selectedHoliday, key: "selectedHoliday" });
  if (state.search.trim()) items.push({ label: `Поиск: ${state.search.trim()}`, key: "search" });
  Object.entries(state.filters).forEach(([key, values]) => {
    values.forEach((value) => items.push({ label: value, key, value }));
  });
  return items;
}

function renderActiveFilterChips() {
  if (!activeFilterChips) return;
  const items = activeFilterItems();
  activeFilterChips.classList.toggle("is-hidden", !items.length);
  activeFilterChips.innerHTML = items
    .map(
      (item) => `
        <button type="button" data-clear-filter="${escapeHtml(item.key)}" data-clear-value="${escapeHtml(item.value || "")}">
          <span>${escapeHtml(item.label)}</span>
          <i data-lucide="x"></i>
        </button>
      `
    )
    .join("");
}

function miniProductCard(product) {
  return `
    <button class="mini-product-card" type="button" data-open-product="${escapeHtml(product.id)}">
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" ${imageAttrs(160, 160)} ${productImageVariantSrcset(product, product.image)} />
      <span>${escapeHtml(product.baseSku)}</span>
      <strong>${escapeHtml(product.name)}</strong>
      <b>от ${formatMoney(product.minPrice)}</b>
    </button>
  `;
}

function saveRecentProduct(productId) {
  if (!productId) return;
  state.recentProducts = [productId, ...state.recentProducts.filter((id) => id !== productId)].slice(0, 12);
  localStorage.setItem(STORAGE.recentProducts, JSON.stringify(state.recentProducts));
}

function relatedProducts(product, limit = 4) {
  if (!product) return [];
  const categories = new Set(product.categories || [product.category].filter(Boolean));
  const collections = new Set(product.collections || []);
  const holidays = new Set(product.holidays || []);
  return products
    .filter((item) => item.id !== product.id && !item.hidden)
    .map((item) => {
      let score = 0;
      (item.categories || [item.category]).forEach((value) => {
        if (categories.has(value)) score += 4;
      });
      (item.collections || []).forEach((value) => {
        if (collections.has(value)) score += 6;
      });
      (item.holidays || []).forEach((value) => {
        if (holidays.has(value)) score += 5;
      });
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.item.popular - a.item.popular)
    .slice(0, limit)
    .map(({ item }) => item);
}

function renderRecentProducts() {
  if (!recentProductsSection || !recentProductsNode) return;
  const currentList = new Set(getFilteredProducts().map((product) => product.id));
  const recent = state.recentProducts
    .map((id) => products.find((product) => product.id === id && !product.hidden))
    .filter((product) => product && !currentList.has(product.id))
    .slice(0, 6);
  recentProductsSection.classList.toggle("is-hidden", recent.length === 0);
  recentProductsNode.innerHTML = recent.map(miniProductCard).join("");
}

function clearCatalogFilter(key, value = "") {
  if (key === "selectedCategory") state.selectedCategory = "";
  else if (key === "selectedCollection") state.selectedCollection = "";
  else if (key === "selectedHoliday") state.selectedHoliday = "";
  else if (key === "search") {
    state.search = "";
    if (searchInput) searchInput.value = "";
  } else if (state.filters[key]) {
    if (value) state.filters[key].delete(value);
    else state.filters[key].clear();
  }
  resetVisibleProducts();
  syncCatalogRoute();
  renderCatalogShell();
  renderFilters();
  renderProducts();
}

function renderCatalogHome() {
  if (!categoryTiles || !actualTiles || !collectionTiles || !holidayTiles) return;
  const content = getSiteContent();
  const shouldAnimate = !catalogHomeHasAnimated;
  const countByCategory = Object.fromEntries(content.catalogCategories.map((category) => [category.name, 0]));
  products.forEach((product) => {
    (product.categories || [product.category]).forEach((category) => {
      countByCategory[category] = (countByCategory[category] || 0) + 1;
    });
  });

  const visibleCategories = content.catalogCategories.filter((category) => (countByCategory[category.name] || 0) > 0);
  categoryTiles.innerHTML = visibleCategories
    .map(
      (category, index) => `
        <button class="category-tile${shouldAnimate ? ` motion-enter motion-delay-${Math.min(index, 8)}` : ""}" type="button" data-open-category="${escapeHtml(category.name)}">
          <span class="category-tile__top">
            <span class="category-tile__icon"><i data-lucide="${escapeHtml(category.icon)}"></i></span>
            <span class="category-tile__schema" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </span>
          <strong>${escapeHtml(category.name)}</strong>
          <small>${escapeHtml(category.description)}</small>
          <b>${countByCategory[category.name] || 0} ${productWord(countByCategory[category.name] || 0)}</b>
        </button>
      `
    )
    .join("");

  actualTiles.innerHTML = content.actualSlides
    .map(
      (item, index) => `
        <button class="actual-tile actual-tile--${(index % 3) + 1}${shouldAnimate ? ` motion-enter motion-delay-${Math.min(index, 8)}` : ""}" type="button" data-open-${item.type}="${escapeHtml(item.label)}">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.label)}" ${imageAttrs(640, 360)} />
          <span>${escapeHtml(item.label)}</span>
          <b>${escapeHtml(item.label)}</b>
        </button>
      `
    )
    .join("");

  collectionTiles.innerHTML = content.catalogCollections
    .map(
      (collection, index) => `
        <button class="theme-tile${shouldAnimate ? ` motion-enter motion-delay-${Math.min(index, 8)}` : ""}" type="button" data-open-collection="${escapeHtml(collection.name)}">
          ${collection.image ? `<img class="theme-tile__image" src="${escapeHtml(collection.image)}" alt="" ${imageAttrs(520, 320)} />` : `<i data-lucide="${escapeHtml(collection.icon)}"></i>`}
          <span>${escapeHtml(collection.name)}</span>
        </button>
      `
    )
    .join("");

  holidayTiles.innerHTML = content.catalogHolidays
    .map(
      (holiday, index) => `
        <button class="theme-tile${shouldAnimate ? ` motion-enter motion-delay-${Math.min(index, 8)}` : ""}" type="button" data-open-holiday="${escapeHtml(holiday.name)}">
          ${holiday.image ? `<img class="theme-tile__image" src="${escapeHtml(holiday.image)}" alt="" ${imageAttrs(520, 320)} />` : `<i data-lucide="${escapeHtml(holiday.icon)}"></i>`}
          <span>${escapeHtml(holiday.name)}</span>
        </button>
      `
    )
    .join("");

  if (window.lucide) window.lucide.createIcons();
  catalogHomeHasAnimated = true;
}

function renderCatalogShell() {
  if (!catalogHome || !catalogListing || !catalogTools || !catalogTitle) return;
  const isHome = !isSearchPage && !isFavoritesPage && !state.selectedCategory && !state.selectedCollection && !state.selectedHoliday && !state.search.trim();
  catalogHome.classList.toggle("is-hidden", !isHome);
  catalogListing.classList.toggle("is-hidden", isHome);
  catalogTools.classList.toggle("is-hidden", isHome || isFavoritesPage);
  document.body.classList.remove("filters-open");
  updateFilterToggle();

  if (isFavoritesPage) {
    catalogTitle.textContent = "Избранное";
    filterToggle?.classList.remove("is-hidden");
    updateFilterToggle();
    updateCatalogSeo();
    return;
  }

  if (isSearchPage) {
    catalogTitle.textContent = state.search.trim() ? `Результаты поиска: ${state.search.trim()}` : "Поиск по каталогу";
    filterToggle?.classList.remove("is-hidden");
    updateFilterToggle();
    updateCatalogSeo();
    return;
  }

  if (isHome) {
    catalogTitle.textContent = getSiteContent().catalogTitleDefault;
    filterToggle?.classList.add("is-hidden");
    updateCatalogSeo();
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
  updateCatalogSeo();
}

function setMetaContent(selector, content) {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement(selector.includes("property=") ? "meta" : "meta");
    const nameMatch = selector.match(/name="([^"]+)"/);
    const propertyMatch = selector.match(/property="([^"]+)"/);
    if (nameMatch) node.setAttribute("name", nameMatch[1]);
    if (propertyMatch) node.setAttribute("property", propertyMatch[1]);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

function setJsonLd(id, data) {
  let node = document.head.querySelector(`script#${id}`);
  if (!node) {
    node = document.createElement("script");
    node.id = id;
    node.type = "application/ld+json";
    document.head.appendChild(node);
  }
  node.textContent = JSON.stringify(data);
}

function updateCatalogSeo() {
  if (!document.body.classList.contains("catalog-page")) return;
  const content = getSiteContent();
  const titleParts = [];
  if (isFavoritesPage) titleParts.push("Избранное");
  else if (state.selectedCategory) titleParts.push(state.selectedCategory);
  else if (state.selectedCollection) titleParts.push(state.selectedCollection);
  else if (state.selectedHoliday) titleParts.push(state.selectedHoliday);
  else if (state.search.trim()) titleParts.push(`Поиск: ${state.search.trim()}`);
  else titleParts.push(content.catalogTitleDefault || "Каталог продукции");
  const title = `${titleParts.join(" · ")} | Sobag Opt`;
  const description = `Оптовый каталог Sobag Opt: ${titleParts.join(", ")}. Текстиль с принтами, варианты по размеру, материалу и типу изделия.`;
  document.title = title;
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[property="og:title"]', title);
  setMetaContent('meta[property="og:description"]', description);
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", `${location.origin}${location.pathname}${location.search}`);
  setJsonLd("sobag-organization-jsonld", {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sobag Opt",
    url: location.origin,
    email: getSiteContent().footerEmail || "opt@sobag-shop.online",
    telephone: getSiteContent().footerPhone || "",
  });
  setJsonLd("sobag-catalog-jsonld", {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: titleParts.join(" · "),
    description,
    url: `${location.origin}${location.pathname}${location.search}`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Sobag Opt", item: location.origin },
        { "@type": "ListItem", position: 2, name: "Каталог", item: `${location.origin}/catalog` },
        ...(titleParts.length ? [{ "@type": "ListItem", position: 3, name: titleParts.join(" · "), item: `${location.origin}${location.pathname}${location.search}` }] : []),
      ],
    },
  });
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
    navigateWithinSite(`catalog.html?category=${encodeURIComponent(category)}`);
    return;
  }
  state.selectedCategory = category;
  state.selectedCollection = "";
  state.selectedHoliday = "";
  state.filters.category.clear();
  resetVisibleProducts();
  syncCatalogRoute();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openCatalogCollection(collection) {
  if (!catalogListing || document.body.classList.contains("home-page")) {
    navigateWithinSite(`catalog.html?collection=${encodeURIComponent(collection)}`);
    return;
  }
  state.selectedCategory = "";
  state.selectedCollection = collection;
  state.selectedHoliday = "";
  state.filters.collection.clear();
  resetVisibleProducts();
  syncCatalogRoute();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openCatalogHoliday(holiday) {
  if (!catalogListing || document.body.classList.contains("home-page")) {
    navigateWithinSite(`catalog.html?holiday=${encodeURIComponent(holiday)}`);
    return;
  }
  state.selectedCategory = "";
  state.selectedCollection = "";
  state.selectedHoliday = holiday;
  state.filters.holiday.clear();
  resetVisibleProducts();
  syncCatalogRoute();
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
    navigateWithinSite("catalog.html");
    return;
  }
  state.selectedCategory = "";
  state.selectedCollection = "";
  state.selectedHoliday = "";
  state.search = "";
  if (searchInput) searchInput.value = "";
  Object.values(state.filters).forEach((bucket) => bucket.clear());
  resetVisibleProducts();
  syncCatalogRoute();
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
      if (!options.length && !state.filters[group.key].size) return "";
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
  queueServerCatalogRefresh();
  const localList = getFilteredProducts();
  const serverResult = currentServerCatalogResult();
  const list = serverResult ? serverResult.items : localList;
  const total = serverResult ? serverResult.total : list.length;
  const visibleList = serverResult ? list : list.slice(0, state.visibleLimit);
  renderSearchSuggestions();
  renderSearchResultsPanel(list, total);
  renderActiveFilterChips();
  productCount.textContent = `${total} ${productWord(total)}`;
  if (!list.length) {
    const searchPrompt = isSearchPage && !state.search.trim();
    productGrid.innerHTML = `
      <div class="empty-products">
        <i data-lucide="${isFavoritesPage ? "heart" : "search-x"}"></i>
        <strong>${isFavoritesPage ? "Избранное пока пустое" : "Товары не найдены"}</strong>
        <span>${isFavoritesPage ? "Нажмите сердечко в каталоге, чтобы сохранить товары здесь." : "Попробуйте изменить фильтры или запрос поиска."}</span>
        ${isFavoritesPage ? `<button class="ghost-button" type="button" data-nav="catalog.html">в каталог</button>` : ""}
      </div>
    `;
    if (searchPrompt) {
      const emptyTitle = productGrid.querySelector(".empty-products strong");
      const emptyText = productGrid.querySelector(".empty-products span");
      if (emptyTitle) emptyTitle.textContent = "Введите поисковый запрос";
      if (emptyText) emptyText.textContent = "Поиск работает по точному артикулу, названию, подборкам, праздникам и тегам.";
    }
    if (catalogLoadMore) catalogLoadMore.innerHTML = "";
    renderRecentProducts();
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  productGrid.innerHTML = visibleList
    .map((product) => {
      const favorite = state.favorites.has(product.id) ? " is-active" : "";
      const favoritePressed = state.favorites.has(product.id) ? "true" : "false";
      return `
        <article class="product-card">
          <div class="product-card__image">
            <button class="product-card__image-button" type="button" data-open-product="${product.id}" aria-label="Открыть ${product.name}">
              <img src="${product.image}" alt="${product.name}" ${imageAttrs(640, 640)} ${productImageVariantSrcset(product, product.image)} />
            </button>
            <button class="favorite-button${favorite}" type="button" title="${favoritePressed === "true" ? "Убрать из избранного" : "В избранное"}" data-favorite="${product.id}" aria-pressed="${favoritePressed}">
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
              <button class="add-button product-card__price-button" type="button" data-open-product="${product.id}" aria-label="Открыть ${product.name}">
                <span>от ${formatMoney(product.minPrice)}</span>
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  if (catalogLoadMore) {
    if (serverResult) {
      const remaining = Math.max(0, total - list.length);
      catalogLoadMore.innerHTML =
        serverResult.hasMore && remaining
          ? `<button class="ghost-button" type="button" data-show-more-products>${state.serverCatalog.loadingMore ? "Загрузка..." : `Показать ещё ${Math.min(120, remaining)} из ${remaining}`}</button>`
          : "";
    } else {
      catalogLoadMore.innerHTML =
        list.length > visibleList.length
          ? `<button class="ghost-button" type="button" data-show-more-products>Показать ещё ${Math.min(120, list.length - visibleList.length)} из ${list.length - visibleList.length}</button>`
          : "";
    }
  }

  renderRecentProducts();

  if (window.lucide) window.lucide.createIcons();
}

function renderCart() {
  const totals = getCartTotals();
  const lines = [...state.cart.values()];

  if (cartItems) {
    cartItems.innerHTML = lines
      .map((line) => {
        const lineSummary = lineTotals(line, totals.discount);
        const unitPrice = discountedUnitPrice(line.variant.price, totals.discount);
        return `
          <div class="cart-line">
            <div>
              <strong>${line.productName}</strong>
              <span>${line.variant.sku}</span>
              <span>${line.variant.type}, ${line.variant.size}, ${line.variant.material}</span>
              <span>${line.qty} шт. × ${formatMoney(unitPrice)} · скидка ${lineSummary.discount}%</span>
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
  setTextWithPop(cartCount, totals.qty);
  setTextWithPop(cartHeaderTotal, formatMoney(totals.total));
  const headerCartButton = cartCount?.closest(".cart-button");
  headerCartButton?.classList.toggle("is-empty", totals.qty === 0);
  setTextWithPop(favoriteCount, state.favorites.size);
  if (subtotalNode) subtotalNode.textContent = formatMoney(totals.subtotal);
  if (discountValue) {
    discountValue.textContent = getBasketDiscountHint(totals.subtotal);
    if (discountValue.previousElementSibling) discountValue.previousElementSibling.hidden = true;
  }
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

  const maxTier = quantityTiers[quantityTiers.length - 1];
  if (discountProgress) discountProgress.style.width = `${Math.min((totals.qty / maxTier.qty) * 100, 100)}%`;
  if (discountHint) {
    discountHint.textContent = getBasketDiscountHint(totals.subtotal);
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
  button.innerHTML =
    user?.role === "admin"
      ? '<i data-lucide="shield"></i>'
      : user?.role === "manager"
      ? '<i data-lucide="briefcase-business"></i>'
      : '<i data-lucide="user"></i>';
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

function variantMatrixHtml(product) {
  const totals = getCartTotals();
  return `
    <div class="variant-matrix">
      <div class="variant-matrix__head">
        <div>
          <strong>Оптовые варианты</strong>
          <span>Каждая строка = отдельный артикул для прайса и заказа</span>
        </div>
        <button class="ghost-button" type="button" data-download-product-price="${escapeHtml(product.id)}">
          <i data-lucide="download"></i>
          Прайс
        </button>
      </div>
      <div class="variant-matrix__table" role="table" aria-label="Варианты товара">
        <div role="row" class="variant-matrix__row variant-matrix__row--head">
          <span>Артикул</span>
          <span>Тип</span>
          <span>Размер</span>
          <span>Материал</span>
          <span>Цена</span>
          <span>Кол-во</span>
          <span></span>
        </div>
        ${product.variants
          .map((variant) => {
            const unit = discountedUnitPrice(variant.price, getBasketDiscount(totals.subtotal));
            return `
              <div role="row" class="variant-matrix__row">
                <span title="${escapeHtml(variant.sku)}">${escapeHtml(variant.sku)}</span>
                <span>${escapeHtml(variant.type)}</span>
                <span>${escapeHtml(variant.size)}</span>
                <span>${escapeHtml(variant.material)}</span>
                <strong>${formatMoney(unit)}</strong>
                <input type="number" min="0" step="1" value="0" data-matrix-qty="${escapeHtml(variant.sku)}" aria-label="Количество ${escapeHtml(variant.sku)}" />
                <button type="button" data-add-matrix-variant="${escapeHtml(product.id)}" data-variant-sku="${escapeHtml(variant.sku)}">+</button>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function relatedProductsHtml(product) {
  const list = relatedProducts(product, 4);
  if (!list.length) return "";
  return `
    <section class="related-products" aria-label="Похожие товары">
      <div class="related-products__head">
        <h3>Похожие принты</h3>
        <span>Ещё товары из близких категорий и подборок</span>
      </div>
      <div class="mini-product-row">
        ${list.map(miniProductCard).join("")}
      </div>
    </section>
  `;
}

function reviewFormHtml(product) {
  const user = getUsers()[state.currentUser];
  if (!user) {
    return `
      <div class="review-login-note">
        <span>Отзывы могут оставлять только зарегистрированные покупатели.</span>
        <button class="ghost-button" type="button" data-open-account>Войти</button>
      </div>
    `;
  }
  return `
    <form class="review-form" data-review-form="${escapeHtml(product.id)}">
      <input type="hidden" name="rating" value="5" />
      <div class="review-form__head">
        <span>Ваша оценка</span>
        <div class="review-rating-input" aria-label="Оценка товара">
          ${[1, 2, 3, 4, 5]
            .map((value) => `<button class="is-active" type="button" data-review-star="${value}" aria-label="${value} из 5">★</button>`)
            .join("")}
        </div>
      </div>
      <textarea name="text" rows="3" maxlength="1000" placeholder="Напишите, что понравилось в товаре, качестве печати или упаковке"></textarea>
      <button class="primary-button" type="submit">Отправить отзыв</button>
      <small>Отзыв появится в карточке после модерации.</small>
    </form>
  `;
}

function productReviewsHtml(product) {
  const reviews = reviewsForProduct(product);
  const stats = reviewStats(product);
  return `
    <section class="product-reviews" aria-label="Отзывы о товаре">
      <div class="product-reviews__head">
        <div>
          <h3>Отзывы</h3>
          <span>${stats.count ? `${stats.average.toFixed(1)} из 5 · ${stats.count} ${reviewWord(stats.count)}` : "Пока нет одобренных отзывов"}</span>
        </div>
        ${stats.count ? starsHtml(stats.average, `Средняя оценка ${stats.average.toFixed(1)} из 5`) : ""}
      </div>
      ${
        reviews.length
          ? `<div class="review-list">${reviews
              .slice(0, 6)
              .map(
                (review) => `
                  <article class="review-card">
                    <div class="review-card__head">
                      <strong>${escapeHtml(review.authorName)}</strong>
                      ${starsHtml(review.rating, `Оценка ${review.rating} из 5`)}
                    </div>
                    <p>${escapeHtml(review.text)}</p>
                    <span>${escapeHtml(review.createdAt ? new Date(review.createdAt).toLocaleDateString("ru-RU") : "")}</span>
                  </article>
                `
              )
              .join("")}</div>`
          : '<p class="review-empty">Станьте первым покупателем, кто оставит отзыв после регистрации.</p>'
      }
      ${reviewFormHtml(product)}
    </section>
  `;
}

function productModalHtml(product) {
  const variant = findVariant(product);
  const previewSubtotal = getCartTotals().subtotal + variant.price * state.activeVariant.qty;
  const discount = getBasketDiscount(previewSubtotal);
  const unitPrice = discountedUnitPrice(variant.price, discount);
  const total = unitPrice * state.activeVariant.qty;
  const basketDiscountHint = getBasketDiscountHint(getCartTotals().subtotal + variant.price * state.activeVariant.qty);
  const gallery = product.gallery?.length ? product.gallery : [product.image];
  return `
    <div class="modal is-visible" id="productModal" role="dialog" aria-modal="true" aria-labelledby="detailProductName">
      <div class="modal__backdrop" data-close-modal></div>
      <section class="modal__panel product-detail">
        <button class="modal__close" type="button" data-close-modal><i data-lucide="x"></i></button>
        <div class="product-detail__layout">
          <div class="product-detail__main">
            <div class="product-detail__media">
              <img id="detailMainImage" src="${gallery[0]}" alt="${product.name}" ${imageAttrs(900, 900, "eager", "high")} ${productImageVariantSrcset(product, gallery[0])} />
              <div class="product-gallery" aria-label="Фотографии товара">
                ${gallery
                  .map(
                    (image, index) => `
                      <button class="product-gallery__thumb${index === 0 ? " is-active" : ""}" type="button" data-detail-image="${image}" aria-label="Фото ${index + 1}">
                        <img src="${image}" alt="" ${imageAttrs(160, 160)} ${productImageVariantSrcset(product, image)} />
                      </button>
                    `
                  )
                  .join("")}
              </div>
            </div>
            <div class="product-detail__copy">
              <p class="eyebrow">${product.baseSku}</p>
              <h2 id="detailProductName">${variant.name}</h2>
              <p>${product.description}</p>
              <p class="product-detail__note">${product.detailDescription}</p>
              <div class="detail-tags" aria-label="Быстрые фильтры">
                ${(product.categories || [product.category])
                  .map((category) => `<button type="button" class="detail-tag" data-open-category="${category}">${category}</button>`)
                  .join("")}
                ${product.collections
                  .map((tag) => `<button type="button" class="detail-tag" data-open-collection="${tag}">${tag}</button>`)
                  .join("")}
                ${product.holidays
                  .map((tag) => `<button type="button" class="detail-tag" data-open-holiday="${tag}">${tag}</button>`)
                  .join("")}
              </div>
              ${relatedProductsHtml(product)}
              ${productReviewsHtml(product)}
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
            ${variantMatrixHtml(product)}
            <div class="detail-qty">
              <label>
                Количество, шт.
                <div class="detail-qty-control">
                  <button type="button" data-detail-qty-step="-1" aria-label="Уменьшить количество">
                    <i data-lucide="minus"></i>
                  </button>
                  <input id="detailQty" type="number" min="0" step="1" value="${state.activeVariant.qty}" />
                  <button type="button" data-detail-qty-step="1" aria-label="Увеличить количество">
                    <i data-lucide="plus"></i>
                  </button>
                </div>
              </label>
              <div class="detail-price">
                <span>Цена за шт.</span>
                <strong id="detailPrice">${formatMoney(unitPrice)}</strong>
                <small id="detailDiscount">${basketDiscountHint}</small>
              </div>
            </div>
            <div class="detail-total">
              <span>ИТОГО</span>
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

async function openProduct(productId) {
  const baseProduct = products.find((item) => item.id === productId);
  const product = await loadProductDetailForModal(baseProduct);
  if (!product) return;
  state.activeProductId = product.id;
  saveRecentProduct(product.id);
  state.activeVariant = {
    type: product.types[0],
    size: product.sizes.includes("40x40") ? "40x40" : product.sizes[0],
    material: product.materials[0],
    qty: 0,
  };
  document.body.insertAdjacentHTML("beforeend", productModalHtml(product));
  activateModal(document.querySelector("#productModal"));
  if (window.lucide) window.lucide.createIcons();
}

function refreshProductModal() {
  const modal = document.querySelector("#productModal");
  if (!modal) return;
  const product = products.find((item) => item.id === state.activeProductId);
  const variant = findVariant(product);
  const qty = Math.max(0, Number(document.querySelector("#detailQty")?.value || state.activeVariant.qty || 0));
  state.activeVariant.qty = qty;
  const detailQtyInput = document.querySelector("#detailQty");
  if (detailQtyInput) detailQtyInput.value = qty;
  const discount = getBasketDiscount(getCartTotals().subtotal + variant.price * qty);
  const unitPrice = discountedUnitPrice(variant.price, discount);
  const basketDiscountHint = getBasketDiscountHint(getCartTotals().subtotal + variant.price * qty);
  document.querySelector("#selectedSku").textContent = variant.sku;
  document.querySelector("#detailProductName").textContent = variant.name;
  const detailCopySkuButton = modal.querySelector(".copy-sku-button--detail");
  if (detailCopySkuButton) {
    detailCopySkuButton.dataset.copySku = variant.sku;
    detailCopySkuButton.setAttribute("aria-label", `Скопировать выбранный артикул ${variant.sku}`);
  }
  document.querySelector("#detailPrice").textContent = formatMoney(unitPrice);
  document.querySelector("#detailDiscount").textContent = basketDiscountHint;
  document.querySelector("#detailTotal").textContent = formatMoney(unitPrice * qty);
  modal.querySelectorAll(".variant-option").forEach((button) => {
    button.classList.toggle("is-active", state.activeVariant[button.dataset.variantKey] === button.dataset.variantValue);
  });
}

function addVariantLineToCart(product, variant, qty) {
  if (!product || !variant || !qty) {
    showToast("Укажите количество товара перед добавлением в корзину.");
    return false;
  }
  const key = `${product.id}:${variant.sku}`;
  const existing = state.cart.get(key);
  state.cart.set(key, {
    key,
    productId: product.id,
    productName: variant.name,
    productImage: product.image,
    variant,
    qty: existing ? existing.qty + qty : qty,
  });
  renderCart();
  return true;
}

function addMatrixVariantToCart(productId, variantSku) {
  const product = products.find((item) => item.id === productId);
  const variant = product?.variants.find((item) => item.sku === variantSku);
  const input = document.querySelector(`[data-matrix-qty="${CSS.escape(variantSku)}"]`);
  const qty = Math.max(0, Number(input?.value || 0));
  if (!addVariantLineToCart(product, variant, qty)) return;
  if (input) input.value = 0;
  showToast("Вариант добавлен в корзину.");
}

function downloadProductPriceCsv(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  downloadCsv(`sobag-product-${product.baseSku || product.id}-prices.csv`, [
    ["Основной артикул", "Артикул варианта", "Наименование", "Тип", "Размер", "Материал", "Цена"],
    ...product.variants.map((variant) => [product.baseSku, variant.sku, variant.name, variant.type, variant.size, variant.material, variant.price]),
  ]);
}

function addVariantToCart(productId) {
  const product = products.find((item) => item.id === productId);
  const variant = findVariant(product);
  const qty = Math.max(0, Number(document.querySelector("#detailQty")?.value || state.activeVariant.qty || 0));
  if (!qty) {
    showToast("Укажите количество товара перед добавлением в корзину.");
    return;
  }
  const key = `${product.id}:${variant.sku}`;
  const existing = state.cart.get(key);
  state.cart.set(key, {
    key,
    productId: product.id,
    productName: variant.name,
    productImage: product.image,
    variant,
    qty: existing ? existing.qty + qty : qty,
  });
  renderCart();
  closeModal();
  showToast("Вариант добавлен в корзину и сохранен за текущим пользователем.");
}

function orderManagerOptions(selectedEmail = "") {
  const users = getUsers();
  const managers = Object.values(users).filter((user) => user.role === "admin" || user.role === "manager");
  const options = ['<option value="">Не назначен</option>'];
  managers.forEach((user) => {
    const email = user.email || "";
    options.push(`<option value="${escapeHtml(email)}"${email === selectedEmail ? " selected" : ""}>${escapeHtml(user.name || email)} · ${escapeHtml(roleLabel(user.role))}</option>`);
  });
  return options.join("");
}

function orderItemsPreview(items) {
  if (!items.length) return "";
  return `
    <details class="order-card__items">
      <summary>Позиции: ${items.length}</summary>
      <ul>
        ${items
          .map((line) => {
            const variant = line.variant || {};
            return `<li><b>${escapeHtml(variant.sku || line.variantSku || "")}</b><span>${escapeHtml(variant.name || line.productName || "")} · ${line.qty || 0} шт.</span></li>`;
          })
          .join("")}
      </ul>
    </details>
  `;
}

function orderHistoryHtml(order) {
  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  if (!history.length) return "";
  return `
    <details class="order-history">
      <summary>История заказа: ${history.length}</summary>
      <ul>
        ${history
          .slice(0, 12)
          .map(
            (entry) => `
              <li>
                <b>${escapeHtml(new Date(entry.at || Date.now()).toLocaleString("ru-RU"))}</b>
                <span>${escapeHtml(entry.summary || "")}</span>
                ${entry.actor ? `<small>${escapeHtml(entry.actor)}</small>` : ""}
              </li>
            `
          )
          .join("")}
      </ul>
    </details>
  `;
}

function orderThreadHtml(order, managerMode = false) {
  const thread = normalizeOrderThread(order.crmThread, managerMode);
  if (!thread.length) return "";
  return `
    <details class="order-thread" open>
      <summary>Обсуждение заказа: ${thread.length}</summary>
      <ul>
        ${thread
          .map(
            (entry) => `
              <li class="${entry.visibility === "internal" ? "is-internal" : ""}">
                <div>
                  <b>${escapeHtml(new Date(entry.at || Date.now()).toLocaleString("ru-RU"))}</b>
                  <small>${escapeHtml(entry.actor || "Участник")}${entry.visibility === "internal" ? " · внутренне" : ""}</small>
                </div>
                <span>${escapeHtml(entry.text)}</span>
              </li>
            `
          )
          .join("")}
      </ul>
    </details>
  `;
}

function orderCustomerMessageForm(order) {
  if (!order?.id) return "";
  return `
    <form class="order-message-form" data-order-customer-message-form="${escapeHtml(order.id)}">
      <label>
        Сообщение по заказу
        <textarea name="commentText" rows="2" placeholder="Например: приложу макет позже или нужно уточнить доставку"></textarea>
      </label>
      <button class="ghost-button" type="submit">Отправить сообщение</button>
    </form>
  `;
}

function orderManagerMessageForm(order) {
  if (!order?.id) return "";
  return `
    <form class="order-message-form order-message-form--manager" data-order-manager-message-form="${escapeHtml(order.id)}">
      <label>
        Комментарий CRM
        <textarea name="commentText" rows="2" placeholder="Сообщение по заказу или внутренняя заметка"></textarea>
      </label>
      <label>
        Видимость
        <select name="commentVisibility">
          <option value="internal">Внутренне: только админ и менеджер</option>
          <option value="customer">Покупателю: видно в личном кабинете</option>
        </select>
      </label>
      <button class="ghost-button" type="submit">Добавить в ленту</button>
    </form>
  `;
}

function orderCardHtml(order, managerMode = false) {
  const items = order.items || [];
  const customer = order.customer || {};
  const managerEmail = order.managerEmail || "";
  const managerName = order.managerName || managerEmail || "";
  const customerEmail = customer.email || order.userEmail || "";
  return `
    <article class="order-card">
      <div class="order-card__head">
        <strong>${escapeHtml(order.id || "")}</strong>
        <span class="order-status order-status--${escapeHtml(order.status || "new")}">${escapeHtml(orderStatusLabel(order.status))}</span>
      </div>
      <span>${escapeHtml(order.date || "")}</span>
      <span>${items.length} ${productWord(items.length)} · ${formatMoney(order.total || 0)}</span>
      <span>${escapeHtml(customer.name || customer.company || order.userEmail || "Покупатель")} · ${escapeHtml(customer.phone || customer.email || "")}</span>
      ${managerName ? `<span>Менеджер: ${escapeHtml(managerName)}</span>` : ""}
      ${order.managerNote ? `<p class="order-card__note">${escapeHtml(order.managerNote)}</p>` : ""}
      ${orderItemsPreview(items)}
      ${managerMode ? orderHistoryHtml(order) : ""}
      ${orderThreadHtml(order, managerMode)}
      ${
        !managerMode && items.length
          ? `<div class="order-actions"><button class="ghost-button" type="button" data-repeat-order="${escapeHtml(order.id || "")}">Повторить заказ</button></div>${orderCustomerMessageForm(order)}`
          : ""
      }
      ${
        managerMode
          ? `
            <div class="order-actions order-actions--links">
              <a class="ghost-button" href="${adminOrderUrl(order.id)}" target="_blank" rel="noopener">Открыть заказ</a>
              ${customerEmail ? `<a class="ghost-button" href="${adminCustomerUrl(customerEmail)}" target="_blank" rel="noopener">Профиль покупателя</a>` : ""}
              <button class="ghost-button" type="button" data-export-order="${escapeHtml(order.id || "")}">Экспорт CSV</button>
              <button class="ghost-button" type="button" data-export-order-xlsx="${escapeHtml(order.id || "")}">Экспорт XLSX</button>
              <button class="ghost-button" type="button" data-print-order="${escapeHtml(order.id || "")}">Печать / PDF</button>
            </div>
            <form class="order-manager-form" data-order-manager-form="${escapeHtml(order.id || "")}">
              <label>
                <span>Менеджер</span>
                <select name="managerEmail">${orderManagerOptions(managerEmail)}</select>
              </label>
              <label>
                <span>Комментарий менеджера</span>
                <textarea name="managerNote" rows="2" placeholder="Например: клиенту позвонили, ждем макет">${escapeHtml(order.managerNote || "")}</textarea>
              </label>
              <button class="ghost-button" type="submit">Сохранить</button>
            </form>
            ${orderManagerMessageForm(order)}
            <div class="order-actions">
              ${orderStatusOptions
                .map(
                  ([status, label]) =>
                    `<button class="ghost-button${order.status === status ? " is-active" : ""}" type="button" data-order-status="${escapeHtml(order.id || "")}" data-status-value="${status}">${escapeHtml(label)}</button>`
                )
                .join("")}
            </div>
          `
          : ""
      }
    </article>
  `;
}

function managementOrdersHtml(user) {
  if (!canManageOrders(user)) return "";
  const orders = getOrders();
  return `
    <div class="account-section">
      <div class="account-section__head">
        <h3>Заказы покупателей</h3>
        <div class="order-actions">
          <a class="ghost-button" href="admin-orders.html" target="_blank" rel="noopener">Открыть все заказы</a>
          <button class="ghost-button" type="button" data-export-orders>Экспорт заказов CSV</button>
        </div>
      </div>
      <div class="orders-list">
        ${
          orders.length
            ? orders.map((order) => orderCardHtml(order, true)).join("")
            : "<p>Заказов пока нет. Новые заказы покупателей появятся здесь.</p>"
        }
      </div>
    </div>
  `;
}

function orderSearchText(order) {
  const customer = order.customer || {};
  const itemText = (order.items || [])
    .map((line) => `${line.variant?.sku || ""} ${line.variant?.name || ""} ${line.productName || ""}`)
    .join(" ");
  return [
    order.id,
    order.status,
    order.date,
    order.managerName,
    order.managerEmail,
    customer.name,
    customer.company,
    customer.inn,
    customer.phone,
    customer.email,
    customer.city,
    customer.address,
    customer.delivery,
    customer.packaging,
    customer.layoutFileName,
    customer.comment,
    itemText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filteredAdminOrders(params = new URLSearchParams(window.location.search)) {
  const status = String(params.get("status") || "all");
  const query = String(params.get("q") || "").trim().toLowerCase();
  return getOrders().filter((order) => {
    if (status !== "all" && (order.status || "new") !== status) return false;
    if (query && !orderSearchText(order).includes(query)) return false;
    return true;
  });
}

function customerSegment(customer) {
  if (customer.total >= 100000) return "VIP";
  if (customer.orders >= 2) return "Повторный";
  if (!customer.email) return "Без email";
  return "Новый";
}

function aggregateCustomersFromOrders(orders) {
  const customers = new Map();
  orders.forEach((order) => {
    const customer = order.customer || {};
    const email = String(customer.email || order.userEmail || "").trim().toLowerCase();
    const phone = String(customer.phone || "").trim();
    const key = email || phone || order.id || `guest-${customers.size}`;
    const current = customers.get(key) || {
      key,
      email,
      phone,
      name: customer.name || customer.company || email || phone || "Покупатель",
      company: customer.company || "",
      orders: 0,
      total: 0,
      lastDate: "",
      lastStatus: "",
    };
    current.orders += 1;
    current.total += Number(order.total || 0);
    current.lastDate = order.date || order.createdAt || current.lastDate;
    current.lastStatus = order.status || current.lastStatus;
    current.name = current.name || customer.name || customer.company || email || phone || "Покупатель";
    current.company = current.company || customer.company || "";
    customers.set(key, current);
  });
  return [...customers.values()].sort((a, b) => b.total - a.total || b.orders - a.orders);
}

function adminCustomersPanelHtml(orders) {
  const customers = aggregateCustomersFromOrders(orders);
  const segmentCounts = customers.reduce((acc, customer) => {
    const segment = customerSegment(customer);
    acc[segment] = (acc[segment] || 0) + 1;
    return acc;
  }, {});
  return `
    <section class="admin-customers-panel" aria-label="Клиенты по текущему фильтру">
      <div class="account-section__head">
        <h3>Клиенты по текущему списку</h3>
        <div class="admin-customer-segments">
          ${["Новый", "Повторный", "VIP", "Без email"].map((segment) => `<span><b>${segmentCounts[segment] || 0}</b> ${segment.toLowerCase()}</span>`).join("")}
        </div>
      </div>
      ${
        customers.length
          ? `<div class="admin-customers-list">
              ${customers
                .slice(0, 12)
                .map(
                  (customer) => `
                    <article>
                      <strong>${escapeHtml(customer.name)}</strong>
                      <span>${escapeHtml(customer.company || customer.email || customer.phone || "Контакт не указан")}</span>
                      <b>${customer.orders} ${pluralRu(customer.orders, "заказ", "заказа", "заказов")} · ${formatMoney(customer.total)}</b>
                      <small>${escapeHtml(customerSegment(customer))} · ${escapeHtml(orderStatusLabel(customer.lastStatus))}</small>
                      ${customer.email ? `<a class="ghost-button" href="${adminCustomerUrl(customer.email)}" target="_blank" rel="noopener">Профиль</a>` : ""}
                    </article>
                  `
                )
                .join("")}
            </div>`
          : "<p>Клиентов по выбранным условиям нет.</p>"
      }
    </section>
  `;
}

function adminOrdersPageHtml() {
  const params = new URLSearchParams(window.location.search);
  const status = String(params.get("status") || "all");
  const query = String(params.get("q") || "");
  const allOrders = getOrders();
  const orders = filteredAdminOrders(params);
  const total = allOrders.length;
  const statusCounts = Object.fromEntries(orderStatusOptions.map(([key]) => [key, allOrders.filter((order) => (order.status || "new") === key).length]));
  return `
    <div class="admin-orders-toolbar">
      <form class="admin-orders-filter" action="admin-orders.html" method="get">
        <label>
          Статус
          <select name="status">
            <option value="all"${status === "all" ? " selected" : ""}>Все статусы</option>
            ${orderStatusOptions.map(([key, label]) => `<option value="${key}"${status === key ? " selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
        <label>
          Поиск
          <input name="q" type="search" value="${escapeHtml(query)}" placeholder="Номер, email, телефон, артикул" />
        </label>
        <button class="primary-button" type="submit">Найти</button>
        <a class="ghost-button" href="admin-orders.html">Сбросить</a>
        <button class="ghost-button" type="button" data-export-orders>Экспорт CSV</button>
      </form>
      <div class="admin-orders-summary" aria-label="Сводка по заказам">
        <span><b>${total}</b> ${pluralRu(total, "заказ", "заказа", "заказов")}</span>
        ${orderStatusOptions.map(([key, label]) => `<span><b>${statusCounts[key] || 0}</b> ${label.toLowerCase()}</span>`).join("")}
      </div>
    </div>
    ${adminCustomersPanelHtml(orders)}
    <div class="orders-list admin-orders-list">
      ${orders.length ? orders.map((order) => orderCardHtml(order, true)).join("") : "<p>Заказов по выбранным условиям нет.</p>"}
    </div>
  `;
}

function canManageProducts(user) {
  return canManageContent(user);
}

function adminProductOptions(key) {
  const values = new Set();
  products.filter(isProductPublished).forEach((product) => {
    if (key === "category") (product.categories || [product.category]).forEach((value) => values.add(value));
    else if (key === "collection") product.collections.forEach((value) => values.add(value));
    else if (key === "holiday") product.holidays.forEach((value) => values.add(value));
    else if (key === "size") product.sizes.forEach((value) => values.add(value));
    else if (key === "material") product.materials.forEach((value) => values.add(value));
  });
  return [...values].filter(Boolean).sort((a, b) => a.localeCompare(b, "ru"));
}

function adminProductMatches(product, params) {
  const query = normalizeSearchText(params.get("q") || "");
  const statusFilter = params.get("status") || params.get("hidden") || "published";
  const status = normalizeProductStatus(product);
  const category = params.get("category") || "";
  const collection = params.get("collection") || "";
  const holiday = params.get("holiday") || "";
  const size = params.get("size") || "";
  const material = params.get("material") || "";
  if ((statusFilter === "visible" || statusFilter === "published") && status !== "published") return false;
  if (statusFilter === "hidden" && status !== "hidden") return false;
  if (statusFilter === "draft" && status !== "draft") return false;
  if (statusFilter === "archive" && status !== "archive") return false;
  if (category && !productHasCategory(product, category)) return false;
  if (collection && !productHasCollection(product, collection)) return false;
  if (holiday && !productHasHoliday(product, holiday)) return false;
  if (size && !product.sizes.includes(size)) return false;
  if (material && !product.materials.includes(material)) return false;
  if (query && !productSearchText(product).includes(query) && !skuSearchKey(product.baseSku).includes(skuSearchKey(query))) return false;
  return true;
}

function filteredAdminProducts(params = new URLSearchParams(window.location.search)) {
  return products
    .filter((product) => adminProductMatches(product, params))
    .sort((a, b) => String(a.baseSku).localeCompare(String(b.baseSku), "ru", { numeric: true }));
}

function adminSelectHtml(name, label, value, options, allLabel = "Все") {
  return `
    <label>
      ${label}
      <select name="${name}">
        <option value="">${allLabel}</option>
        ${options.map((option) => `<option value="${escapeHtml(option)}"${option === value ? " selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </label>
  `;
}

function adminProductStatusOptionsHtml(status) {
  return PRODUCT_STATUSES.map(
    (value) => `<option value="${value}"${status === value ? " selected" : ""}>${escapeHtml(PRODUCT_STATUS_LABELS[value])}</option>`
  ).join("");
}

function adminProductCardHtml(product) {
  const status = normalizeProductStatus(product);
  const statusLabel = `<span class="admin-product-badge admin-product-badge--${escapeHtml(status)}">${escapeHtml(productStatusLabel(status))}</span>`;
  return `
    <article class="admin-product-card">
      <label class="admin-product-card__select">
        <input type="checkbox" data-admin-product-select="${escapeHtml(product.id)}" />
        <span>Выбрать</span>
      </label>
      <div class="admin-product-card__media">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" ${imageAttrs(160, 160)} ${productImageVariantSrcset(product, product.image)} />
      </div>
      <form class="admin-product-card__body" data-admin-product-form="${escapeHtml(product.id)}">
        <div class="admin-product-card__head">
          <div>
            <strong>${escapeHtml(product.baseSku)}</strong>
            ${statusLabel}
            <button class="copy-sku-button" type="button" data-copy-sku="${escapeHtml(product.baseSku)}" title="Скопировать артикул">
              <i data-lucide="copy"></i>
            </button>
          </div>
          <span>${escapeHtml((product.categories || [product.category]).join(", "))}</span>
        </div>
        <div class="admin-product-fields">
          <label>
            Наименование
            <input name="name" type="text" value="${escapeHtml(product.name)}" />
          </label>
          <label>
            Базовая цена
            <input name="basePrice" type="number" min="0" step="1" value="${Number(product.basePrice || 0)}" />
          </label>
          <label>
            Статус публикации
            <select name="status">
              ${adminProductStatusOptionsHtml(status)}
            </select>
          </label>
          <label class="admin-product-fields__wide">
            Краткое описание
            <textarea name="description" rows="2">${escapeHtml(product.description || "")}</textarea>
          </label>
          <label class="admin-product-fields__wide">
            Описание в карточке
            <textarea name="detailDescription" rows="3">${escapeHtml(product.detailDescription || "")}</textarea>
          </label>
        </div>
        <div class="admin-product-meta">
          <span>${product.variants.length} ${variantWord(product.variants.length)}</span>
          <span>от ${formatMoney(product.minPrice)} до ${formatMoney(product.maxPrice)}</span>
          <span>${escapeHtml(product.collections.join(", ") || "без подборок")}</span>
        </div>
        <details class="admin-product-variants">
          <summary>Варианты товара</summary>
          <div>
            ${product.variants
              .slice(0, 80)
              .map((variant) => `<span><b>${escapeHtml(variant.sku)}</b><em>${escapeHtml(variant.type)}, ${escapeHtml(variant.size)}, ${escapeHtml(variant.material)} · ${formatMoney(variant.price)}</em></span>`)
              .join("")}
          </div>
        </details>
        <div class="order-actions">
          <button class="primary-button" type="submit">Сохранить</button>
          <button class="ghost-button" type="button" data-open-product="${escapeHtml(product.id)}">Просмотр карточки</button>
          <button class="ghost-button" type="button" data-admin-toggle-product="${escapeHtml(product.id)}">${isProductPublished(product) ? "Скрыть товар" : "Опубликовать"}</button>
        </div>
      </form>
    </article>
  `;
}

function selectedAdminProducts() {
  const ids = [...document.querySelectorAll("[data-admin-product-select]:checked")].map((input) => input.dataset.adminProductSelect);
  if (!ids.length) return filteredAdminProducts();
  const selected = new Set(ids);
  return products.filter((product) => selected.has(product.id));
}

function adminProductsPageHtml() {
  const params = new URLSearchParams(window.location.search);
  const list = filteredAdminProducts(params);
  const statusCounts = Object.fromEntries(PRODUCT_STATUSES.map((status) => [status, products.filter((product) => normalizeProductStatus(product) === status).length]));
  return `
    <div class="admin-products-toolbar">
      <form class="admin-products-filter" action="admin-products.html" method="get">
        <label>
          Поиск
          <input name="q" type="search" value="${escapeHtml(params.get("q") || "")}" placeholder="Артикул, название, тег" />
        </label>
        ${adminSelectHtml("category", "Категория", params.get("category") || "", adminProductOptions("category"))}
        ${adminSelectHtml("collection", "Подборка", params.get("collection") || "", adminProductOptions("collection"))}
        ${adminSelectHtml("holiday", "Праздник", params.get("holiday") || "", adminProductOptions("holiday"))}
        ${adminSelectHtml("size", "Размер", params.get("size") || "", adminProductOptions("size"))}
        ${adminSelectHtml("material", "Материал", params.get("material") || "", adminProductOptions("material"))}
        <label>
          Статус
          <select name="status">
            <option value="published"${(params.get("status") || params.get("hidden") || "published") === "published" || params.get("hidden") === "visible" ? " selected" : ""}>Опубликованные</option>
            <option value="all"${params.get("status") === "all" || params.get("hidden") === "all" ? " selected" : ""}>Все товары</option>
            ${PRODUCT_STATUSES.filter((status) => status !== "published")
              .map((status) => `<option value="${status}"${(params.get("status") || params.get("hidden")) === status ? " selected" : ""}>${escapeHtml(PRODUCT_STATUS_LABELS[status])}</option>`)
              .join("")}
          </select>
        </label>
        <button class="primary-button" type="submit">Найти</button>
        <a class="ghost-button" href="admin-products.html">Сбросить</a>
      </form>
      <div class="admin-orders-summary">
        <span><b>${products.length}</b> ${productWord(products.length)} всего</span>
        <span><b>${list.length}</b> найдено</span>
        <span><b>${statusCounts.published || 0}</b> опубликовано</span>
        <span><b>${statusCounts.draft || 0}</b> черновиков</span>
        <span><b>${statusCounts.hidden || 0}</b> скрыто</span>
        <span><b>${statusCounts.archive || 0}</b> в архиве</span>
      </div>
      <div class="admin-product-export">
        <button class="ghost-button" type="button" data-admin-sync-catalog>Сохранить каталог на сервере</button>
        <button class="ghost-button" type="button" data-admin-export-products>Экспорт выбранных товаров</button>
        <button class="ghost-button" type="button" data-admin-export-variants>Экспорт вариантов и цен</button>
        <span>Если ничего не выбрано, экспортируются товары по текущему фильтру.</span>
      </div>
    </div>
    <div class="admin-products-list">
      ${list.length ? list.map(adminProductCardHtml).join("") : "<p>Товаров по выбранным условиям нет.</p>"}
    </div>
  `;
}

function currentManagerUser() {
  return getUsers()[state.currentUser];
}

function managementAccessHtml() {
  return `
    <article class="info-page__panel">
      <h2>Нужен доступ</h2>
      <p>Эта страница доступна администратору и менеджерам. Войдите в аккаунт с нужной ролью.</p>
      <button class="primary-button" type="button" data-open-account><i data-lucide="user"></i> Войти</button>
    </article>
  `;
}

function findManagedOrder(orderId) {
  return getOrders().find((order) => order.id === orderId);
}

function customerFromOrders(email) {
  const normalizedEmail = String(email || "").toLowerCase();
  const orders = getOrders().filter((order) => String(order.userEmail || order.customer?.email || "").toLowerCase() === normalizedEmail);
  if (!orders.length) return null;
  const latestCustomer = orders[0].customer || {};
  return {
    email: normalizedEmail,
    name: latestCustomer.name || latestCustomer.company || normalizedEmail,
    role: "buyer",
    company: latestCustomer.company || "",
    inn: latestCustomer.inn || "",
    kpp: latestCustomer.kpp || "",
    legalAddress: latestCustomer.legalAddress || "",
    phone: latestCustomer.phone || "",
    city: latestCustomer.city || "",
    address: latestCustomer.address || "",
    addresses: [...new Set(orders.map((order) => order.customer?.address).filter(Boolean))],
    layoutFiles: [...new Set(orders.map((order) => order.customer?.layoutFileName).filter(Boolean))],
    orderComments: [...new Set(orders.map((order) => order.customer?.comment).filter(Boolean))],
    lastCustomer: latestCustomer,
    orders,
  };
}

function orderDetailHtml(order) {
  if (!order) {
    return `<article class="info-page__panel"><h2>Заказ не найден</h2><p>Проверьте ссылку или откройте заказ из списка в личном кабинете.</p></article>`;
  }
  const customer = order.customer || {};
  const customerEmail = customer.email || order.userEmail || "";
  return `
    <div class="admin-detail-grid">
      <article class="info-page__panel">
        <h2>${escapeHtml(order.id || "Заказ")}</h2>
        ${orderCardHtml(order, true)}
      </article>
      <article class="info-page__panel">
        <h2>Покупатель</h2>
        <div class="admin-detail-list">
          <span>Имя: <b>${escapeHtml(customer.name || "Не указано")}</b></span>
          <span>Компания: <b>${escapeHtml(customer.company || "Не указана")}</b></span>
          <span>ИНН: <b>${escapeHtml(customer.inn || "Не указан")}</b></span>
          <span>КПП: <b>${escapeHtml(customer.kpp || "Не указан")}</b></span>
          <span>Телефон: <b>${escapeHtml(customer.phone || "Не указан")}</b></span>
          <span>Email: <b>${escapeHtml(customerEmail || "Не указан")}</b></span>
          <span>Город: <b>${escapeHtml(customer.city || "Не указан")}</b></span>
          <span>Адрес: <b>${escapeHtml(customer.address || "Не указан")}</b></span>
          <span>Юр. адрес: <b>${escapeHtml(customer.legalAddress || "Не указан")}</b></span>
          <span>Доставка: <b>${escapeHtml(customer.delivery || "Согласовать")}</b></span>
          <span>Упаковка: <b>${escapeHtml(customer.packaging || "Стандартная")}</b></span>
          ${customer.layoutFileName ? `<span>Макет: <b>${escapeHtml(customer.layoutFileName)}</b></span>` : ""}
          ${customer.comment ? `<span>Комментарий: <b>${escapeHtml(customer.comment)}</b></span>` : ""}
        </div>
        <div class="order-actions">
          ${customer.phone ? `<a class="ghost-button" href="tel:${escapeHtml(String(customer.phone).replace(/[^+\d]/g, ""))}"><i data-lucide="phone"></i> Позвонить</a>` : ""}
          ${customerEmail ? `<a class="ghost-button" href="mailto:${escapeHtml(customerEmail)}"><i data-lucide="mail"></i> Написать</a>` : ""}
        </div>
        ${customerEmail ? `<a class="primary-button" href="${adminCustomerUrl(customerEmail)}" target="_blank" rel="noopener"><i data-lucide="external-link"></i> Открыть профиль покупателя</a>` : ""}
      </article>
      <article class="info-page__panel admin-detail-grid__wide">
        <h2>Позиции заказа</h2>
        <div class="admin-order-lines">
          ${(order.items || [])
            .map((line) => {
              const variant = line.variant || {};
              return `
                <div>
                  <strong>${escapeHtml(variant.sku || "")}</strong>
                  <span>${escapeHtml(variant.name || line.productName || "")}</span>
                  <b>${line.qty || 0} шт. · ${formatMoney((variant.price || 0) * (line.qty || 0))}</b>
                </div>
              `;
            })
            .join("")}
        </div>
      </article>
    </div>
  `;
}

function customerDetailHtml(customer) {
  if (!customer) {
    return `<article class="info-page__panel"><h2>Покупатель не найден</h2><p>Проверьте email или откройте профиль из заказа.</p></article>`;
  }
  const orders = customer.orders || getOrders().filter((order) => order.userEmail === customer.email || order.customer?.email === customer.email);
  return `
    <div class="admin-detail-grid">
      <article class="info-page__panel">
        <h2>${escapeHtml(customer.name || customer.email)}</h2>
        <div class="admin-detail-list">
          <span>Email: <b>${escapeHtml(customer.email || "")}</b></span>
          <span>Компания: <b>${escapeHtml(customer.company || customer.lastCustomer?.company || "Не указана")}</b></span>
          <span>ИНН: <b>${escapeHtml(customer.inn || customer.lastCustomer?.inn || "Не указан")}</b></span>
          <span>КПП: <b>${escapeHtml(customer.kpp || customer.lastCustomer?.kpp || "Не указан")}</b></span>
          <span>Телефон: <b>${escapeHtml(customer.phone || customer.lastCustomer?.phone || "Не указан")}</b></span>
          <span>Роль: <b>${escapeHtml(roleLabel(customer.role))}</b></span>
          <span>Город: <b>${escapeHtml(customer.city || customer.lastCustomer?.city || "Не указан")}</b></span>
          <span>Адрес: <b>${escapeHtml(customer.address || customer.lastCustomer?.address || "Не указан")}</b></span>
          <span>Юр. адрес: <b>${escapeHtml(customer.legalAddress || customer.lastCustomer?.legalAddress || "Не указан")}</b></span>
          <span>Заказов: <b>${orders.length}</b></span>
        </div>
        ${(customer.addresses || []).length ? `<h3>Адреса</h3><ul class="admin-detail-list">${customer.addresses.map((address) => `<li>${escapeHtml(address)}</li>`).join("")}</ul>` : ""}
        ${(customer.layoutFiles || []).length ? `<h3>Макеты</h3><ul class="admin-detail-list">${customer.layoutFiles.map((file) => `<li>${escapeHtml(file)}</li>`).join("")}</ul>` : ""}
        ${(customer.orderComments || []).length ? `<h3>Комментарии</h3><ul class="admin-detail-list">${customer.orderComments.map((comment) => `<li>${escapeHtml(comment)}</li>`).join("")}</ul>` : ""}
      </article>
      <article class="info-page__panel admin-detail-grid__wide">
        <h2>История заказов</h2>
        <div class="orders-list">
          ${orders.length ? orders.map((order) => orderCardHtml(order, true)).join("") : "<p>Заказов пока нет.</p>"}
        </div>
      </article>
    </div>
  `;
}

function renderManagementPages() {
  const user = currentManagerUser();
  const ordersNode = document.querySelector("#adminOrdersPage");
  const orderNode = document.querySelector("#adminOrderPage");
  const customerNode = document.querySelector("#adminCustomerPage");
  if (!ordersNode && !orderNode && !customerNode) return;
  if (!canManageOrders(user)) {
    if (ordersNode) ordersNode.innerHTML = managementAccessHtml();
    if (orderNode) orderNode.innerHTML = managementAccessHtml();
    if (customerNode) customerNode.innerHTML = managementAccessHtml();
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  const params = new URLSearchParams(window.location.search);
  if (ordersNode) ordersNode.innerHTML = adminOrdersPageHtml();
  if (orderNode) orderNode.innerHTML = orderDetailHtml(findManagedOrder(params.get("id") || ""));
  if (customerNode) {
    const email = String(params.get("email") || "").toLowerCase();
    customerNode.innerHTML = customerDetailHtml(getUsers()[email] || customerFromOrders(email));
  }
  if (window.lucide) window.lucide.createIcons();
}

function renderAdminProductsPage() {
  const node = document.querySelector("#adminProductsPage");
  if (!node) return;
  const user = currentManagerUser();
  if (!canManageProducts(user)) {
    node.innerHTML = managementAccessHtml();
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  node.innerHTML = adminProductsPageHtml();
  if (window.lucide) window.lucide.createIcons();
}

function adminPriceRows(sourceProducts = products) {
  return sourceProducts.flatMap((product) => product.variants.map((variant) => ({ product, variant })));
}

function adminPriceRowId(product, variant) {
  return `${product.id}::${variant.sku}`;
}

function adminPriceOptions(key) {
  const values = new Set();
  products.forEach((product) => {
    if (key === "category") (product.categories || [product.category]).forEach((value) => values.add(value));
    else if (key === "collection") product.collections.forEach((value) => values.add(value));
    else if (key === "holiday") product.holidays.forEach((value) => values.add(value));
    else if (key === "type") product.types.forEach((value) => values.add(value));
    else if (key === "size") product.sizes.forEach((value) => values.add(value));
    else if (key === "material") product.materials.forEach((value) => values.add(value));
  });
  return [...values].filter(Boolean).sort((a, b) => a.localeCompare(b, "ru"));
}

function adminPriceMatches(row, params) {
  const { product, variant } = row;
  const query = normalizeSearchText(params.get("q") || "");
  const category = params.get("category") || "";
  const collection = params.get("collection") || "";
  const holiday = params.get("holiday") || "";
  const type = params.get("type") || "";
  const size = params.get("size") || "";
  const material = params.get("material") || "";
  if (category && !productHasCategory(product, category)) return false;
  if (collection && !productHasCollection(product, collection)) return false;
  if (holiday && !productHasHoliday(product, holiday)) return false;
  if (type && variant.type !== type) return false;
  if (size && variant.size !== size) return false;
  if (material && variant.material !== material) return false;
  if (query) {
    const text = normalizeSearchText([product.baseSku, variant.sku, variant.name, product.name, product.tags.join(" ")].join(" "));
    if (!text.includes(query) && !skuSearchKey(variant.sku).includes(skuSearchKey(query))) return false;
  }
  return true;
}

function filteredAdminPriceRows(params = new URLSearchParams(window.location.search)) {
  return adminPriceRows(products)
    .filter((row) => adminPriceMatches(row, params))
    .sort((a, b) => a.variant.sku.localeCompare(b.variant.sku, "ru", { numeric: true }));
}

function selectedAdminPriceRows() {
  const selectedIds = [...document.querySelectorAll("[data-admin-price-select]:checked")].map((input) => input.dataset.adminPriceSelect);
  if (!selectedIds.length) return filteredAdminPriceRows();
  const selected = new Set(selectedIds);
  return adminPriceRows(products).filter((row) => selected.has(adminPriceRowId(row.product, row.variant)));
}

function pricePreviewRowsHtml() {
  if (!state.pricePreview.length) return `<p class="admin-price-preview__empty">Предпросмотр пока пуст. Сначала подготовьте изменение цен.</p>`;
  return `
    <div class="admin-price-preview__table">
      ${state.pricePreview
        .slice(0, 160)
        .map(
          (row) => `
            <div>
              <b>${escapeHtml(row.sku)}</b>
              <span>${escapeHtml(row.name)}</span>
              <strong>${formatMoney(row.oldPrice)} → ${formatMoney(row.newPrice)}</strong>
            </div>
          `
        )
        .join("")}
    </div>
    ${state.pricePreview.length > 160 ? `<p class="admin-section-note">Показаны первые 160 изменений из ${state.pricePreview.length}.</p>` : ""}
  `;
}

function setPricePreview(changes) {
  state.pricePreview = changes.filter((change) => Number.isFinite(change.newPrice) && change.newPrice > 0 && change.newPrice !== change.oldPrice);
  renderAdminPricesPage();
  showToast(state.pricePreview.length ? `Подготовлено изменений цен: ${state.pricePreview.length}.` : "Нет изменений для предпросмотра.");
}

function roundedPrice(value, roundStep = 1) {
  const step = Math.max(1, Number(roundStep || 1));
  return Math.max(1, Math.round(Number(value || 0) / step) * step);
}

function buildPriceChange(row, newPrice, reason = "") {
  return {
    productId: row.product.id,
    baseSku: row.product.baseSku,
    sku: row.variant.sku,
    name: row.variant.name,
    oldPrice: Number(row.variant.price || 0),
    newPrice: Math.max(1, Math.round(Number(newPrice || 0))),
    reason,
  };
}

function previewBulkPriceChanges(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const mode = data.adjustMode || "percent";
  const value = Number(data.adjustValue || 0);
  const roundStep = Number(data.roundStep || 1);
  const rows = selectedAdminPriceRows();
  const changes = rows.map((row) => {
    const current = Number(row.variant.price || 0);
    let next = current;
    if (mode === "percent") next = current * (1 + value / 100);
    if (mode === "rub") next = current + value;
    if (mode === "set") next = value;
    next = roundedPrice(next, roundStep);
    return buildPriceChange(row, next, mode);
  });
  setPricePreview(changes);
}

function previewManualPriceChanges() {
  const changes = [...document.querySelectorAll("[data-admin-price-input]")]
    .map((input) => {
      const row = adminPriceRows(products).find((item) => adminPriceRowId(item.product, item.variant) === input.dataset.adminPriceInput);
      if (!row) return null;
      return buildPriceChange(row, Number(input.value || row.variant.price), "manual");
    })
    .filter(Boolean);
  setPricePreview(changes);
}

function applyPricePreview() {
  if (!state.pricePreview.length) {
    showToast("Нет подготовленных изменений цен.");
    return;
  }
  const byProduct = new Map(products.map((product) => [product.id, product]));
  state.pricePreview.forEach((change) => {
    const product = byProduct.get(change.productId);
    if (!product) return;
    product.variantPrices = { ...(product.variantPrices || {}), [change.sku]: change.newPrice };
    Object.assign(product, normalizeProduct(product));
  });
  saveProducts();
  state.pricePreview = [];
  renderCatalogHome();
  renderFilters();
  renderProducts();
  renderAdminProductsPage();
  renderAdminPricesPage();
  showToast("Цены вариантов применены и сохранены.");
}

function adminPricesPageHtml() {
  const params = new URLSearchParams(window.location.search);
  const rows = filteredAdminPriceRows(params);
  const visibleRows = rows.slice(0, 500);
  return `
    <div class="admin-prices-toolbar">
      <form class="admin-products-filter" action="admin-prices.html" method="get">
        <label>
          Поиск
          <input name="q" type="search" value="${escapeHtml(params.get("q") || "")}" placeholder="Артикул, название, тег" />
        </label>
        ${adminSelectHtml("category", "Категория", params.get("category") || "", adminPriceOptions("category"))}
        ${adminSelectHtml("collection", "Подборка", params.get("collection") || "", adminPriceOptions("collection"))}
        ${adminSelectHtml("holiday", "Праздник", params.get("holiday") || "", adminPriceOptions("holiday"))}
        ${adminSelectHtml("type", "Тип", params.get("type") || "", adminPriceOptions("type"))}
        ${adminSelectHtml("size", "Размер", params.get("size") || "", adminPriceOptions("size"))}
        ${adminSelectHtml("material", "Материал", params.get("material") || "", adminPriceOptions("material"))}
        <button class="primary-button" type="submit">Найти</button>
        <a class="ghost-button" href="admin-prices.html">Сбросить</a>
      </form>
      <div class="admin-orders-summary">
        <span><b>${adminPriceRows(products).length}</b> вариантов всего</span>
        <span><b>${rows.length}</b> найдено</span>
        <span><b>${visibleRows.length}</b> показано</span>
        <span><b>${state.pricePreview.length}</b> в предпросмотре</span>
      </div>
      <form class="admin-price-tools" data-admin-price-bulk-form>
        <label>
          Массовое изменение
          <select name="adjustMode">
            <option value="percent">Процент</option>
            <option value="rub">Рубли</option>
            <option value="set">Установить цену</option>
          </select>
        </label>
        <label>
          Значение
          <input name="adjustValue" type="number" step="1" value="5" />
        </label>
        <label>
          Округлить до
          <input name="roundStep" type="number" min="1" step="1" value="1" />
        </label>
        <button class="primary-button" type="submit">Предпросмотр</button>
        <button class="ghost-button" type="button" data-admin-preview-manual-prices>Предпросмотр ручных цен</button>
        <button class="ghost-button" type="button" data-admin-apply-price-preview>Применить предпросмотр</button>
      </form>
      <div class="admin-product-export">
        <button class="ghost-button" type="button" data-admin-sync-catalog>Сохранить каталог на сервере</button>
        <button class="ghost-button" type="button" data-admin-export-price-rows>Экспорт цен</button>
        <button class="ghost-button" type="button" data-admin-export-price-xlsx>Экспорт цен XLSX</button>
        <button class="ghost-button" type="button" data-admin-export-price-products>Экспорт товаров с ценами</button>
        <label class="ghost-button admin-price-import">
          Импорт CSV/XLSX
          <input type="file" accept=".csv,.xlsx,.xls" data-admin-price-import />
        </label>
        <span>Если строки не выбраны, действие применяется к текущему фильтру.</span>
      </div>
      <section class="admin-price-preview" aria-live="polite">
        <h3>Предпросмотр изменений</h3>
        ${pricePreviewRowsHtml()}
      </section>
    </div>
    <div class="admin-price-table">
      ${rows.length > visibleRows.length ? `<p class="admin-section-note">Показаны первые ${visibleRows.length} строк из ${rows.length}. Для ручной правки уточните поиск или фильтры; экспорт и массовое изменение работают по всему текущему фильтру.</p>` : ""}
      <div class="admin-price-table__head">
        <span></span><span>Основной артикул</span><span>Артикул варианта</span><span>Название</span><span>Тип</span><span>Размер</span><span>Материал</span><span>Цена</span>
      </div>
      ${visibleRows
        .map(
          ({ product, variant }) => `
            <div class="admin-price-row">
              <label><input type="checkbox" data-admin-price-select="${escapeHtml(adminPriceRowId(product, variant))}" /><span class="sr-only">Выбрать</span></label>
              <b>${escapeHtml(product.baseSku)}</b>
              <strong>${escapeHtml(variant.sku)}</strong>
              <span>${escapeHtml(variant.name)}</span>
              <span>${escapeHtml(variant.type)}</span>
              <span>${escapeHtml(variant.size)}</span>
              <span>${escapeHtml(variant.material)}</span>
              <input data-admin-price-input="${escapeHtml(adminPriceRowId(product, variant))}" type="number" min="1" step="1" value="${Number(variant.price || 0)}" />
            </div>
          `
        )
        .join("")}
      ${rows.length ? "" : "<p>Вариантов по выбранным условиям нет.</p>"}
    </div>
  `;
}

function renderAdminPricesPage() {
  const node = document.querySelector("#adminPricesPage");
  if (!node) return;
  const user = currentManagerUser();
  if (!canManageProducts(user)) {
    node.innerHTML = managementAccessHtml();
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  node.innerHTML = adminPricesPageHtml();
  if (window.lucide) window.lucide.createIcons();
}

function loadStoredImportBatches() {
  try {
    const batches = JSON.parse(localStorage.getItem(STORAGE.importBatches) || "[]");
    return Array.isArray(batches) ? batches : [];
  } catch {
    return [];
  }
}

function saveStoredImportBatches() {
  localStorage.setItem(STORAGE.importBatches, JSON.stringify(state.importBatches.slice(0, 30)));
}

function importBatchCounts(rows) {
  return rows.reduce(
    (counts, row) => {
      if (row.action === "created") counts.created += 1;
      else if (row.action === "updated") counts.updated += 1;
      else if (row.action === "error") counts.errors += 1;
      else counts.skipped += 1;
      return counts;
    },
    { created: 0, skipped: 0, updated: 0, errors: 0 }
  );
}

function importBatchRows(items, options = {}) {
  const existingSkus = new Set(products.map((product) => baseSkuKey(product.baseSku)));
  const existingVariantSkus = collectVariantSkuKeys(products);
  const seenSkus = new Set();
  const seenVariantSkus = new Set();
  return items.map((product, index) => {
    const sku = baseSkuKey(product.baseSku);
    if (!sku || !product.name) return { row: index + 1, baseSku: product.baseSku || "", name: product.name || "", action: "error", status: "error", reason: !sku ? "missing_base_sku" : "missing_name" };
    if (seenSkus.has(sku)) return { row: index + 1, baseSku: product.baseSku, name: product.name, action: "skipped", status: "duplicate_skipped", reason: "base_sku_repeated_in_batch" };
    const exists = existingSkus.has(sku);
    if (exists && !options.updateExisting) {
      seenSkus.add(sku);
      return { row: index + 1, baseSku: product.baseSku, name: product.name, action: "skipped", status: "duplicate_skipped", reason: "base_sku_exists" };
    }
    const variantSkus = [...productVariantSkuKeys(product)];
    const collisions = variantSkus.filter((variantSku) => (existingVariantSkus.has(variantSku) && !exists) || seenVariantSkus.has(variantSku));
    if (collisions.length) {
      seenSkus.add(sku);
      return { row: index + 1, baseSku: product.baseSku, name: product.name, action: "skipped", status: "variant_duplicate_skipped", reason: "variant_sku_collision", warnings: collisions.slice(0, 5).join(", ") };
    }
    seenSkus.add(sku);
    variantSkus.forEach((variantSku) => seenVariantSkus.add(variantSku));
    return {
      row: index + 1,
      baseSku: product.baseSku,
      name: product.name,
      action: exists ? "updated" : "created",
      status: exists ? "updated" : "created",
      reason: "",
      variantCount: variantSkus.length,
      warnings: product.image === "assets/production-workshop-1.png" ? "fallback_image" : "",
    };
  });
}

function importBatchFromProducts(items, source = "admin-import", options = {}) {
  const rows = importBatchRows(items, options);
  return {
    id: `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    source,
    status: "preview",
    updateExisting: Boolean(options.updateExisting),
    createdAt: new Date().toISOString(),
    createdBy: state.currentUser || "local-admin",
    counts: importBatchCounts(rows),
    rows,
    products: items.map((product, index) => ({ action: rows[index]?.action, product })).filter((entry) => entry.action === "created" || entry.action === "updated"),
  };
}

function importBatchStatusLabel(status) {
  return (
    {
      preview: "Предпросмотр",
      applied: "Применена",
      rejected: "Отклонена",
      rolled_back: "Откат выполнен",
    }[status] || "Партия"
  );
}

function importBatchReasonLabel(reason) {
  return (
    {
      base_sku_exists: "артикул уже есть",
      base_sku_repeated_in_batch: "повтор в партии",
      variant_sku_collision: "дубль варианта",
      missing_base_sku: "нет артикула",
      missing_name: "нет названия",
      fallback_image: "fallback фото",
    }[reason] || reason || ""
  );
}

async function loadImportBatches() {
  if (!isAdminImportPage || !canManageProducts(getUsers()[state.currentUser])) return false;
  try {
    const data = await apiRequest("/api/admin/import-batches");
    if (!Array.isArray(data.batches)) return false;
    state.importBatches = data.batches;
    saveStoredImportBatches();
    renderAdminImportPage();
    return true;
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 401 && error.status !== 403 && error.status !== 404) console.warn(error);
    return false;
  }
}

async function createImportBatch(items, source = "admin-import", options = {}) {
  const batchOptions = { updateExisting: Boolean(options.updateExisting) };
  const fallbackBatch = importBatchFromProducts(items, source, batchOptions);
  state.adminPreview = items;
  try {
    const data = await apiRequest("/api/admin/import-batches", {
      method: "POST",
      body: { action: "preview", source, updateExisting: batchOptions.updateExisting, products: cleanProductsForBatch(items) },
    });
    if (data.batch) {
      state.importBatches = [data.batch, ...state.importBatches.filter((batch) => batch.id !== data.batch.id)].slice(0, 30);
      state.activeImportBatchId = data.batch.id;
      saveStoredImportBatches();
      renderAdminImportPage();
      return data.batch;
    }
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 401 && error.status !== 403 && error.status !== 404) console.warn(error);
  }
  state.importBatches = [fallbackBatch, ...state.importBatches.filter((batch) => batch.id !== fallbackBatch.id)].slice(0, 30);
  state.activeImportBatchId = fallbackBatch.id;
  saveStoredImportBatches();
  renderAdminImportPage();
  return fallbackBatch;
}

function cleanProductsForBatch(items) {
  return items.map(({ variants, minPrice, maxPrice, ...product }) => product);
}

function normalizePhotoMatchKey(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/opt[_\s-]*/g, "opt ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function photoProductKeys(product) {
  return [...new Set([product.baseSku, product.photoFolder, product.id].map(normalizePhotoMatchKey).filter((key) => key.length >= 2))];
}

function photoFileSearchText(file) {
  const relative = String(file.webkitRelativePath || file.name || "");
  const parts = relative.split(/[\\/]/).filter(Boolean);
  const parent = parts.length > 1 ? parts[parts.length - 2] : "";
  return normalizePhotoMatchKey([relative, parent, file.name].filter(Boolean).join(" "));
}

function findProductForPhotoFile(file) {
  const searchText = photoFileSearchText(file);
  return state.adminPreview.find((product) => photoProductKeys(product).some((key) => searchText === key || searchText.includes(key) || key.includes(searchText)));
}

function photoReportCounts(rows = state.importPhotoReport) {
  return rows.reduce(
    (counts, row) => {
      if (row.status === "ready") counts.ready += 1;
      else if (row.status === "uploaded") counts.uploaded += 1;
      else if (row.status === "failed") counts.failed += 1;
      else if (row.status === "missing") counts.missing += 1;
      else if (row.status === "repeated") counts.repeated += 1;
      return counts;
    },
    { ready: 0, uploaded: 0, failed: 0, missing: 0, repeated: 0 }
  );
}

function importPhotoStatusLabel(status) {
  return (
    {
      ready: "Готово к загрузке",
      uploaded: "Загружено",
      failed: "Ошибка",
      missing: "Нет фото",
      repeated: "Повтор",
    }[status] || status || ""
  );
}

function importPhotoReasonLabel(reason) {
  return (
    {
      no_preview_products: "сначала загрузите Excel/CSV",
      no_product_match: "товар не найден по имени файла или папки",
      unsupported_file: "файл не является изображением",
      repeated_image: "повторное фото для товара",
      missing_image: "для товара не выбран файл",
      backend_unavailable: "серверный upload недоступен",
    }[reason] || reason || ""
  );
}

function buildImportPhotoReport(files) {
  const selected = Array.from(files || []).filter(Boolean);
  const rows = [];
  const matchedProducts = new Set();
  const seenProductImages = new Set();
  state.importPhotoFiles = selected;

  if (!state.adminPreview.length) {
    selected.forEach((file, index) => rows.push({ status: "failed", reason: "no_preview_products", fileIndex: index, fileName: file.name, baseSku: "", productName: "" }));
    state.importPhotoReport = rows;
    return rows;
  }

  selected.forEach((file, index) => {
    if (!String(file.type || "").startsWith("image/")) {
      rows.push({ status: "failed", reason: "unsupported_file", fileIndex: index, fileName: file.name, baseSku: "", productName: "" });
      return;
    }
    const product = findProductForPhotoFile(file);
    if (!product) {
      rows.push({ status: "failed", reason: "no_product_match", fileIndex: index, fileName: file.webkitRelativePath || file.name, baseSku: "", productName: "" });
      return;
    }
    const duplicateKey = `${baseSkuKey(product.baseSku)}::${normalizePhotoMatchKey(file.name)}`;
    const status = seenProductImages.has(duplicateKey) ? "repeated" : "ready";
    if (status === "ready") seenProductImages.add(duplicateKey);
    matchedProducts.add(productKey(product));
    rows.push({
      status,
      reason: status === "repeated" ? "repeated_image" : "",
      fileIndex: index,
      fileName: file.webkitRelativePath || file.name,
      baseSku: product.baseSku,
      productName: product.name,
      productId: product.id,
    });
  });

  state.adminPreview.forEach((product) => {
    if (!matchedProducts.has(productKey(product))) {
      rows.push({ status: "missing", reason: "missing_image", fileIndex: -1, fileName: "", baseSku: product.baseSku, productName: product.name, productId: product.id });
    }
  });
  state.importPhotoReport = rows;
  return rows;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("Не удалось прочитать файл.")));
    reader.readAsDataURL(file);
  });
}

function imageSizeFromDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener("load", () => resolve({ width: image.naturalWidth || null, height: image.naturalHeight || null }));
    image.addEventListener("error", () => resolve({ width: null, height: null }));
    image.src = dataUrl;
  });
}

function updatePreviewProductImage(baseSku, imageMetadata) {
  const sku = baseSkuKey(baseSku);
  state.adminPreview = state.adminPreview.map((product) => {
    if (baseSkuKey(product.baseSku) !== sku) return product;
    const nextImages = normalizeProductImages([...(product.images || []), imageMetadata]);
    const uploadedUrl = productImageMetadataUrl(nextImages[nextImages.length - 1]);
    const currentImage = String(product.image || "");
    const nextImage = !currentImage || currentImage === "assets/production-workshop-1.png" ? uploadedUrl || currentImage : currentImage;
    return normalizeProduct({
      ...product,
      image: nextImage,
      images: nextImages,
      gallery: [...new Set([nextImage, ...(product.gallery || []), uploadedUrl].filter(Boolean))],
    });
  });
}

async function uploadImportPhotos() {
  if (state.importPhotoUploading) return;
  const readyRows = state.importPhotoReport.filter((row) => row.status === "ready");
  if (!readyRows.length) {
    showToast("Нет фото, готовых к загрузке.");
    return;
  }
  state.importPhotoUploading = true;
  renderAdminImportPage();
  let uploaded = 0;
  for (const row of readyRows) {
    const file = state.importPhotoFiles[row.fileIndex];
    if (!file) {
      row.status = "failed";
      row.reason = "missing_image";
      continue;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const dimensions = await imageSizeFromDataUrl(dataUrl);
      const result = await apiRequest("/api/admin/product-images", {
        method: "POST",
        body: {
          action: "upload",
          productKey: row.baseSku,
          fileName: file.name,
          mime: file.type || "image/jpeg",
          dataUrl,
          width: dimensions.width,
          height: dimensions.height,
        },
      });
      row.status = "uploaded";
      row.reason = "";
      row.url = result.image?.url || "";
      row.storageKey = result.image?.storageKey || "";
      updatePreviewProductImage(row.baseSku, result.image);
      uploaded += 1;
    } catch (error) {
      row.status = "failed";
      row.reason = isBackendUnavailable(error) || error.status === 404 ? "backend_unavailable" : error.message || "upload_failed";
    }
  }
  state.importPhotoUploading = false;
  if (uploaded) await createImportBatch(state.adminPreview, "admin-import+photos", { updateExisting: state.importUpdateExisting });
  else renderAdminImportPage();
  showToast(uploaded ? `Фото загружены: ${uploaded}. Создан новый preview с metadata.` : "Фото не загружены. Проверьте отчет.");
}

function importPhotoReportHtml() {
  const rows = state.importPhotoReport.slice(0, 80);
  const counts = photoReportCounts();
  return `
    <section class="import-photo-workspace">
      <div class="section-head section-head--compact">
        <div>
          <h3>Фото текущего предпросмотра</h3>
          <p>Выберите файлы или папку с фото. Preview сопоставит изображения с товарами по baseSku и полю "Папка фото", затем загрузка отправит их в object storage через API product-images.</p>
        </div>
        <div class="admin-actions">
          <button class="primary-button" type="button" data-upload-import-photos ${counts.ready && !state.importPhotoUploading ? "" : "disabled"}>${state.importPhotoUploading ? "Загрузка..." : "Загрузить фото"}</button>
          <button class="ghost-button" type="button" data-export-import-photo-report ${state.importPhotoReport.length ? "" : "disabled"}>Скачать отчет фото CSV</button>
          <button class="ghost-button" type="button" data-clear-import-photo-report ${state.importPhotoReport.length ? "" : "disabled"}>Очистить отчет</button>
        </div>
      </div>
      <label class="import-photo-picker">
        Файлы фото
        <input id="photoUploadInput" type="file" accept="image/*" multiple />
      </label>
      <label class="import-photo-picker">
        Папка фото
        <input id="photoFolderInput" type="file" accept="image/*" multiple webkitdirectory />
      </label>
      <div class="admin-orders-summary">
        <span><b>${state.importPhotoFiles.length}</b> файлов выбрано</span>
        <span><b>${counts.ready}</b> готовы</span>
        <span><b>${counts.uploaded}</b> загружено</span>
        <span><b>${counts.missing}</b> без фото</span>
        <span><b>${counts.repeated}</b> повторов</span>
        <span><b>${counts.failed}</b> ошибок</span>
      </div>
      ${rows.length ? `
        <div class="import-photo-table">
          <div class="import-photo-table__head"><span>Статус</span><span>Артикул</span><span>Товар</span><span>Файл</span><span>Причина</span></div>
          ${rows
            .map(
              (row) => `
                <div>
                  <strong>${escapeHtml(importPhotoStatusLabel(row.status))}</strong>
                  <b>${escapeHtml(row.baseSku || "")}</b>
                  <span>${escapeHtml(row.productName || "")}</span>
                  <span>${escapeHtml(row.fileName || row.storageKey || "")}</span>
                  <em>${escapeHtml(importPhotoReasonLabel(row.reason))}</em>
                </div>
              `
            )
            .join("")}
        </div>
        ${state.importPhotoReport.length > rows.length ? `<p class="admin-section-note">Показаны первые ${rows.length} строк из ${state.importPhotoReport.length}.</p>` : ""}
      ` : "<p>Пока нет отчета по фото. Загрузите Excel/CSV и выберите файлы изображений.</p>"}
    </section>
  `;
}

function importBatchById(id) {
  return state.importBatches.find((batch) => batch.id === id);
}

async function applyImportBatch(batchId) {
  const batch = importBatchById(batchId);
  if (!batch || batch.status !== "preview") {
    showToast("Партия недоступна для применения.");
    return;
  }
  try {
    const data = await apiRequest("/api/admin/import-batches", { method: "POST", body: { action: "apply", id: batchId } });
    if (data.batch) {
      state.importBatches = state.importBatches.map((item) => (item.id === batchId ? data.batch : item));
      saveStoredImportBatches();
      await loadAdminCatalogProducts();
      renderAdminImportPage();
      showToast("Партия применена на сервере.");
      return;
    }
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 401 && error.status !== 403 && error.status !== 404) {
      showToast(error.message || "Не удалось применить партию.");
      return;
    }
  }
  batch.snapshot = { products: cleanProductsForStorage(), createdAt: new Date().toISOString() };
  state.adminPreview = (batch.products || []).map((entry) => normalizeProduct(entry.product));
  saveGeneratedProducts({ batchId });
}

async function rejectImportBatch(batchId) {
  const batch = importBatchById(batchId);
  if (!batch || batch.status !== "preview") return;
  try {
    const data = await apiRequest("/api/admin/import-batches", { method: "POST", body: { action: "reject", id: batchId } });
    if (data.batch) {
      state.importBatches = state.importBatches.map((item) => (item.id === batchId ? data.batch : item));
    }
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 401 && error.status !== 403 && error.status !== 404) console.warn(error);
    batch.status = "rejected";
    batch.rejectedAt = new Date().toISOString();
  }
  saveStoredImportBatches();
  renderAdminImportPage();
  showToast("Партия отклонена.");
}

async function rollbackImportBatch(batchId) {
  const batch = importBatchById(batchId);
  if (!batch || batch.status !== "applied") return;
  try {
    const data = await apiRequest("/api/admin/import-batches", { method: "POST", body: { action: "rollback", id: batchId } });
    if (data.batch) {
      state.importBatches = state.importBatches.map((item) => (item.id === batchId ? data.batch : item));
      saveStoredImportBatches();
      await loadAdminCatalogProducts();
      renderAdminImportPage();
      showToast("Партия откачена на сервере.");
      return;
    }
  } catch (error) {
    if (!isBackendUnavailable(error) && error.status !== 401 && error.status !== 403 && error.status !== 404) {
      showToast(error.message || "Не удалось откатить партию.");
      return;
    }
  }
  if (!batch.snapshot?.products?.length) {
    showToast("Локальный snapshot для отката не найден.");
    return;
  }
  products = batch.snapshot.products.map(normalizeProduct);
  batch.status = "rolled_back";
  batch.rolledBackAt = new Date().toISOString();
  saveProducts();
  saveStoredImportBatches();
  renderCatalogHome();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  renderAdminImportPage();
  showToast("Локальная партия откачена.");
}

function importBatchRowsHtml(batch) {
  const rows = (batch?.rows || []).slice(0, 80);
  if (!rows.length) return "<p>В партии пока нет строк отчета.</p>";
  return `
    <div class="import-batch-table">
      <div class="import-batch-table__head"><span>#</span><span>Артикул</span><span>Товар</span><span>Действие</span><span>Причина</span></div>
      ${rows
        .map(
          (row) => `
            <div>
              <span>${Number(row.row || 0)}</span>
              <b>${escapeHtml(row.baseSku || "")}</b>
              <span>${escapeHtml(row.name || "")}</span>
              <strong>${escapeHtml(row.status || row.action || "")}</strong>
              <em>${escapeHtml(importBatchReasonLabel(row.reason) || row.warnings || "")}</em>
            </div>
          `
        )
        .join("")}
    </div>
    ${(batch.rows || []).length > rows.length ? `<p class="admin-section-note">Показаны первые ${rows.length} строк из ${(batch.rows || []).length}.</p>` : ""}
  `;
}

function importBatchCardHtml(batch, index) {
  const counts = batch.counts || {};
  const canRollback = batch.status === "applied" && index === state.importBatches.findIndex((item) => item.status === "applied");
  return `
    <article class="import-batch-card">
      <div class="import-batch-card__head">
        <div>
          <strong>${escapeHtml(batch.source || "Импорт")}</strong>
          <span>${escapeHtml(importBatchStatusLabel(batch.status))} · ${escapeHtml(batch.createdAt || "")}</span>
        </div>
        <b>${escapeHtml(batch.id || "")}</b>
      </div>
      <div class="admin-orders-summary">
        <span><b>${counts.created || 0}</b> создано</span>
        <span><b>${counts.updated || 0}</b> обновлено</span>
        <span><b>${counts.skipped || 0}</b> пропущено</span>
        <span><b>${counts.errors || 0}</b> ошибок</span>
      </div>
      <p class="admin-section-note">${batch.updateExisting ? "Режим: обновление существующих по baseSku" : "Режим: только новые товары, существующие baseSku пропускаются"}</p>
      ${importBatchRowsHtml(batch)}
      <div class="order-actions">
        ${batch.status === "preview" ? `<button class="primary-button" type="button" data-apply-import-batch="${escapeHtml(batch.id)}">Применить</button><button class="ghost-button" type="button" data-reject-import-batch="${escapeHtml(batch.id)}">Отклонить</button>` : ""}
        ${canRollback ? `<button class="ghost-button" type="button" data-rollback-import-batch="${escapeHtml(batch.id)}">Откатить последнюю партию</button>` : ""}
        <button class="ghost-button" type="button" data-export-import-batch="${escapeHtml(batch.id)}">Скачать отчет CSV</button>
      </div>
    </article>
  `;
}

function adminImportPageHtml() {
  return `
    <div class="admin-products-toolbar">
      <div class="excel-import">
        <h3>Импорт товаров из Excel/CSV</h3>
        <p>Загрузите таблицу, проверьте предпросмотр карточек и только потом нажмите добавление. Дубли по основному артикулу будут пропущены, старые товары без команды не удаляются.</p>
        <div class="admin-actions">
          <button class="ghost-button" type="button" data-download-xlsx-template>Скачать XLSX-шаблон</button>
          <button class="ghost-button" type="button" data-download-template>Скачать CSV-шаблон</button>
          <button class="primary-button" type="button" data-save-generated>Применить текущий предпросмотр локально</button>
        </div>
        <label>
          Файл товаров
          <input id="excelInput" type="file" accept=".xlsx,.xls,.csv" />
        </label>
        <label class="admin-section-note">
          <input id="importUpdateExisting" type="checkbox" ${state.importUpdateExisting ? "checked" : ""} />
          Обновлять существующие товары по baseSku. Включите перед загрузкой файла; импорт не удаляет старые товары.
        </label>
        <small>Рекомендуемый разделитель в CSV: ;. Для списков категорий, типов, размеров, материалов, подборок и тегов тоже используйте ;.</small>
      </div>
      <div class="admin-orders-summary">
        <span><b>${products.length}</b> ${productWord(products.length)} в текущем каталоге</span>
        <span><b>${state.adminPreview.length}</b> в предпросмотре</span>
        <span><b>${state.importBatches.length}</b> партий</span>
      </div>
    </div>
    ${importPhotoReportHtml()}
    <section class="import-batch-workspace">
      <div class="section-head section-head--compact">
        <div>
          <h3>Партии импорта</h3>
          <p>Preview не меняет каталог. Применение создает или обновляет только строки отчета со статусами created/updated; дубли и ошибки остаются в отчете.</p>
        </div>
        <button class="ghost-button" type="button" data-refresh-import-batches>Обновить партии</button>
      </div>
      <div class="import-batch-list">
        ${state.importBatches.length ? state.importBatches.map(importBatchCardHtml).join("") : "<p>Пока нет партий импорта. Загрузите Excel/CSV, чтобы создать предпросмотр.</p>"}
      </div>
    </section>
    <div class="admin-preview" id="adminPreview"></div>
  `;
}

function renderAdminImportPage() {
  const node = document.querySelector("#adminImportPage");
  if (!node) return;
  const user = currentManagerUser();
  if (!canManageProducts(user)) {
    node.innerHTML = managementAccessHtml();
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  node.innerHTML = adminImportPageHtml();
  renderAdminPreview(state.adminPreview);
  if (window.lucide) window.lucide.createIcons();
}

function userManagementHtml(user) {
  if (user?.role !== "admin") return "";
  const users = getUsers();
  return `
    <div class="account-section">
      <h3>Пользователи</h3>
      <div class="orders-list">
        ${Object.entries(users)
          .map(([email, item]) => {
            const isAdmin = item.role === "admin";
            const isManager = item.role === "manager";
            const isContent = item.role === "content";
            return `
              <article>
                <strong>${item.name || email}</strong>
                <span>${email}</span>
                ${item.phone ? `<span>${item.phone}</span>` : ""}
                <span>${roleLabel(item.role)}</span>
                ${
                  isAdmin
                    ? ""
                    : `<div class="order-actions">
                        <button class="ghost-button" type="button" data-set-role="${email}" data-role-value="${isManager ? "buyer" : "manager"}">
                          ${isManager ? "Снять менеджера" : "Назначить менеджером"}
                        </button>
                        <button class="ghost-button" type="button" data-set-role="${email}" data-role-value="${isContent ? "buyer" : "content"}">
                          ${isContent ? "Снять контент-менеджера" : "Назначить контент-менеджером"}
                        </button>
                      </div>`
                }
              </article>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function buyerProfileHtml(user) {
  const latest = user.lastCustomer || {};
  return `
    <form class="account-section account-profile-form" data-profile-form>
      <div class="account-section__head">
        <div>
          <h3>Профиль и реквизиты</h3>
          <span>Эти данные можно подставлять при оформлении заказа</span>
        </div>
        <button class="ghost-button" type="submit">Сохранить профиль</button>
      </div>
      <div class="account-profile-grid">
        <label>
          Имя или контакт
          <input name="name" type="text" value="${escapeHtml(user.name || "")}" autocomplete="name" />
        </label>
        <label>
          Телефон
          <input name="phone" type="tel" value="${escapeHtml(user.phone || latest.phone || "")}" autocomplete="tel" />
        </label>
        <label>
          Компания или ИП
          <input name="company" type="text" value="${escapeHtml(user.company || latest.company || "")}" autocomplete="organization" />
        </label>
        <label>
          ИНН
          <input name="inn" type="text" inputmode="numeric" value="${escapeHtml(user.inn || latest.inn || "")}" />
        </label>
        <label>
          КПП
          <input name="kpp" type="text" inputmode="numeric" value="${escapeHtml(user.kpp || latest.kpp || "")}" />
        </label>
        <label>
          Город
          <input name="city" type="text" value="${escapeHtml(user.city || latest.city || "")}" autocomplete="address-level2" />
        </label>
        <label class="account-profile-grid__wide">
          Адрес доставки
          <input name="address" type="text" value="${escapeHtml(user.address || latest.address || user.addresses?.[0] || "")}" autocomplete="street-address" />
        </label>
        <label class="account-profile-grid__wide">
          Юридический адрес
          <input name="legalAddress" type="text" value="${escapeHtml(user.legalAddress || latest.legalAddress || "")}" />
        </label>
        <label>
          Доставка по умолчанию
          <select name="delivery">
            <option value=""${!(user.delivery || latest.delivery) ? " selected" : ""}>Согласовать</option>
            <option value="Самовывоз"${(user.delivery || latest.delivery) === "Самовывоз" ? " selected" : ""}>Самовывоз</option>
            <option value="Транспортная компания"${(user.delivery || latest.delivery) === "Транспортная компания" ? " selected" : ""}>Транспортная компания</option>
            <option value="До маркетплейса"${(user.delivery || latest.delivery) === "До маркетплейса" ? " selected" : ""}>До маркетплейса</option>
          </select>
        </label>
        <label>
          Упаковка по умолчанию
          <select name="packaging">
            <option value=""${!(user.packaging || latest.packaging) ? " selected" : ""}>Стандартная</option>
            <option value="Под маркетплейс"${(user.packaging || latest.packaging) === "Под маркетплейс" ? " selected" : ""}>Под маркетплейс</option>
            <option value="Индивидуальная"${(user.packaging || latest.packaging) === "Индивидуальная" ? " selected" : ""}>Индивидуальная</option>
          </select>
        </label>
        <label class="account-profile-grid__wide">
          Дополнительные реквизиты
          <textarea name="companies" rows="3" placeholder="Компания; ИНН; КПП; юридический адрес">${escapeHtml(companiesToText(user))}</textarea>
        </label>
        <label class="account-profile-grid__wide">
          Адреса доставки
          <textarea name="addresses" rows="3" placeholder="Каждый адрес с новой строки">${escapeHtml(linesToText(user.addresses || []))}</textarea>
        </label>
        <label class="account-profile-grid__wide">
          Файлы макетов
          <textarea name="layoutFiles" rows="3" placeholder="Названия файлов или ссылки на макеты">${escapeHtml(linesToText(user.layoutFiles || []))}</textarea>
        </label>
        <label class="account-profile-grid__wide">
          Комментарий для заказов
          <textarea name="orderComment" rows="3">${escapeHtml(user.orderComment || latest.comment || "")}</textarea>
        </label>
        <label class="account-profile-grid__wide">
          Сохраненные комментарии
          <textarea name="orderComments" rows="3" placeholder="Каждый комментарий с новой строки">${escapeHtml(linesToText(user.orderComments || []))}</textarea>
        </label>
      </div>
    </form>
  `;
}

function savedCartStatusText(cart) {
  return `${cart.status === "sent" ? "Отправлено менеджеру" : "Черновик"}${cart.sentOrderId ? ` · заказ ${cart.sentOrderId}` : ""}`;
}

function savedCartHistoryHtml(cart, includeInternal = false) {
  const history = normalizeSavedCartHistory(cart.commentHistory).filter((entry) => includeInternal || entry.visibility !== "internal");
  if (!history.length) return "";
  return `
    <details class="saved-cart-history">
      <summary>История комментариев: ${history.length}</summary>
      <ul>
        ${history
          .map(
            (entry) => `
              <li>
                <b>${escapeHtml(new Date(entry.at || Date.now()).toLocaleString("ru-RU"))}</b>
                <span>${escapeHtml(entry.text)}</span>
                ${entry.actor ? `<small>${escapeHtml(entry.actor)}${entry.visibility === "internal" ? " · внутренне" : ""}</small>` : ""}
              </li>
            `
          )
          .join("")}
      </ul>
    </details>
  `;
}

function savedCartCardHtml(cart, options = {}) {
  const compact = Boolean(options.compact);
  const user = getUsers()[state.currentUser];
  const managerMode = canManageOrders(user);
  return `
    <article class="saved-cart-card${compact ? " saved-cart-card--compact" : ""}">
      <div class="saved-cart-card__main">
        <strong>${escapeHtml(cart.title)}</strong>
        <span>${escapeHtml(cart.date || new Date(cart.updatedAt).toLocaleString("ru-RU"))}</span>
        <span>${escapeHtml(savedCartStatusText(cart))}</span>
        ${cart.customerComment ? `<p>${escapeHtml(cart.customerComment)}</p>` : ""}
        ${managerMode && cart.managerComment ? `<p class="saved-cart-card__internal">Внутренне: ${escapeHtml(cart.managerComment)}</p>` : ""}
      </div>
      <div class="saved-cart-card__meta">
        <span>${cart.qty} ${productWord(cart.qty)}</span>
        <b>${formatMoney(cart.total)}</b>
      </div>
      <div class="order-actions">
        <button class="ghost-button" type="button" data-rename-saved-cart="${escapeHtml(cart.id)}">Переименовать</button>
        <button class="ghost-button" type="button" data-download-saved-cart="${escapeHtml(cart.id)}">Скачать XLSX</button>
        <button class="ghost-button" type="button" data-print-saved-cart="${escapeHtml(cart.id)}">Печать / PDF</button>
        <button class="ghost-button" type="button" data-send-saved-cart="${escapeHtml(cart.id)}">${cart.status === "sent" ? "Отправить повторно" : "Отправить менеджеру"}</button>
        <button class="primary-button" type="button" data-restore-saved-cart="${escapeHtml(cart.id)}">Восстановить</button>
        <button class="ghost-button" type="button" data-delete-saved-cart="${escapeHtml(cart.id)}">Удалить</button>
      </div>
      <form class="saved-cart-comments" data-saved-cart-comment-form="${escapeHtml(cart.id)}">
        <label>
          Комментарий покупателя к КП
          <textarea name="customerComment" rows="3" placeholder="Например: нужен расчет по срокам, упаковке или поставке">${escapeHtml(cart.customerComment || "")}</textarea>
        </label>
        ${
          managerMode
            ? `<label>
                Внутренний комментарий менеджера
                <textarea name="managerComment" rows="3" placeholder="Виден только администратору и менеджеру">${escapeHtml(cart.managerComment || "")}</textarea>
              </label>`
            : ""
        }
        <button class="ghost-button" type="submit">Сохранить комментарии</button>
      </form>
      ${savedCartHistoryHtml(cart, managerMode)}
    </article>
  `;
}

function savedCartsHtml() {
  const savedCarts = getSavedCarts();
  const totals = getCartTotals();
  return `
    <div class="account-section">
      <div class="account-section__head">
        <div>
          <h3>Сохраненные КП</h3>
          <span>Черновики коммерческих предложений и повторных закупок</span>
        </div>
        <div class="account-section__actions">
          ${totals.qty ? '<button class="ghost-button" type="button" data-save-current-cart>Сохранить текущую</button>' : ""}
          <a class="ghost-button" href="quotes.html">Открыть все КП</a>
        </div>
      </div>
      <div class="saved-carts-list">
        ${
          savedCarts.length
            ? savedCarts
                .slice(0, 3)
                .map((cart) => savedCartCardHtml(cart, { compact: true }))
                .join("")
            : "<p>Сохраненных КП пока нет. Соберите корзину и сохраните ее как черновик.</p>"
        }
      </div>
    </div>
  `;
}

function savedQuotesPageHtml() {
  const user = getUsers()[state.currentUser];
  const savedCarts = getSavedCarts();
  const totals = getCartTotals();
  if (!user) {
    return `
      <section class="quotes-empty">
        <i data-lucide="file-lock-2"></i>
        <h2>Войдите, чтобы открыть сохраненные КП</h2>
        <p>Черновики коммерческих предложений сохраняются за аккаунтом и доступны на разных устройствах.</p>
        <button class="primary-button" type="button" data-open-account>Войти или зарегистрироваться</button>
      </section>
    `;
  }
  return `
    <section class="quotes-page__head">
      <div>
        <div class="accent-stripe" aria-hidden="true"></div>
        <h1>Сохраненные КП</h1>
        <p>Здесь можно хранить черновики оптовых закупок, добавлять комментарии, скачивать XLSX/PDF и отправлять КП менеджеру.</p>
      </div>
      <div class="quotes-page__summary">
        <span>${savedCarts.length} ${pluralRu(savedCarts.length, "КП", "КП", "КП")}</span>
        <strong>${formatMoney(savedCarts.reduce((sum, cart) => sum + Number(cart.total || 0), 0))}</strong>
        ${totals.qty ? '<button class="ghost-button" type="button" data-save-current-cart>Сохранить текущую корзину</button>' : ""}
      </div>
    </section>
    <div class="saved-carts-list saved-carts-list--page">
      ${savedCarts.length ? savedCarts.map((cart) => savedCartCardHtml(cart)).join("") : "<p>Сохраненных КП пока нет. Соберите корзину и сохраните ее как черновик.</p>"}
    </div>
  `;
}

function renderSavedQuotesPage() {
  const node = document.querySelector("#savedQuotesPage");
  if (!node) return;
  node.innerHTML = savedQuotesPageHtml();
  if (window.lucide) window.lucide.createIcons();
}

function refreshSavedCartViews() {
  renderSavedQuotesPage();
  rerenderAccountModal();
}

function accountModalHtml() {
  const users = getUsers();
  const user = users[state.currentUser];
  const orders = user?.orders || [];
  return `
    <div class="modal is-visible" id="accountModal" role="dialog" aria-modal="true" aria-labelledby="accountModalTitle">
      <div class="modal__backdrop" data-close-modal></div>
      <section class="modal__panel account-panel">
        <button class="modal__close" type="button" data-close-modal><i data-lucide="x"></i></button>
        <div>
          <p class="eyebrow">Account</p>
          <h2 id="accountModalTitle">${user ? "Личный кабинет" : "Вход и регистрация"}</h2>
        </div>
        ${
          user
            ? `
              <div class="account-summary">
                <strong>${user.name || user.email}</strong>
                <span>${user.email}</span>
                ${user.phone ? `<span>${user.phone}</span>` : ""}
                ${user.address ? `<span>${user.address}</span>` : ""}
                <span>${roleLabel(user.role)}</span>
              </div>
              ${
                (user.addresses || []).length
                  ? `<div class="account-section account-section--compact"><h3>Сохраненные адреса</h3><div class="admin-detail-list">${user.addresses
                      .map((address) => `<span>${escapeHtml(address)}</span>`)
                      .join("")}</div></div>`
                  : ""
              }
              <div class="account-actions">
                ${canManageContent(user) ? '<button class="primary-button" type="button" data-open-admin><i data-lucide="settings"></i> Админка</button>' : ""}
                ${canManageContent(user) ? '<a class="ghost-button" href="admin-products.html" target="_blank" rel="noopener">Товары</a>' : ""}
                ${canManageContent(user) ? '<a class="ghost-button" href="admin-prices.html" target="_blank" rel="noopener">Цены</a>' : ""}
                ${canManageContent(user) ? '<a class="ghost-button" href="admin-import.html" target="_blank" rel="noopener">Импорт</a>' : ""}
                ${canManageOrders(user) ? '<a class="ghost-button" href="admin-orders.html" target="_blank" rel="noopener">Заказы</a>' : ""}
                <button class="ghost-button" type="button" data-logout>Выйти</button>
              </div>
              ${buyerProfileHtml(user)}
              ${savedCartsHtml()}
              <h3>История заказов</h3>
              <div class="orders-list">
                ${
                  orders.length
                    ? orders
                        .map((order) => orderCardHtml(order))
                        .join("")
                    : "<p>Заказов пока нет. После отправки заявки они появятся здесь.</p>"
                }
              </div>
              ${managementOrdersHtml(user)}
              ${userManagementHtml(user)}
            `
            : `
              <form class="auth-form" id="authForm" novalidate>
                <input name="name" type="text" placeholder="Имя или компания" autocomplete="name" />
                <input name="email" type="email" placeholder="Email" autocomplete="email" required />
                <input name="phone" type="tel" placeholder="Телефон" autocomplete="tel" />
                <input name="password" type="password" placeholder="Пароль" autocomplete="current-password" required />
                <label class="consent-check auth-consent">
                  <input name="personalDataConsent" type="checkbox" />
                  <span>
                    Согласен на
                    <a href="assets/legal/personal-data-consent.pdf" target="_blank" rel="noopener">
                      обработку персональных данных
                    </a>
                  </span>
                </label>
                <div class="auth-actions">
                  <button class="primary-button" type="submit" data-auth-mode="login">Войти</button>
                  <button class="ghost-button" type="submit" data-auth-mode="register">Зарегистрироваться</button>
                </div>
              </form>
            `
        }
      </section>
    </div>
  `;
}

function openAccount() {
  document.body.insertAdjacentHTML("beforeend", accountModalHtml());
  activateModal(document.querySelector("#accountModal"));
  if (window.lucide) window.lucide.createIcons();
  refreshAccountFromBackend();
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
  { key: "baseSku", label: "Основной артикул" },
  { key: "category", label: "Категории" },
  { key: "theme", label: "Основная подборка" },
  { key: "collections", label: "Подборки" },
  { key: "holidays", label: "Праздники" },
  { key: "tags", label: "Теги" },
  { key: "types", label: "Типы товара" },
  { key: "sizes", label: "Размеры" },
  { key: "materials", label: "Материалы" },
  { key: "basePrice", label: "Базовая цена" },
  { key: "image", label: "URL фото" },
  { key: "status", label: "Статус публикации" },
  { key: "stock", label: "Статус наличия" },
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

const productColumnAliases = {
  baseSku: ["Начальный артикул", "Артикул", "Базовый артикул"],
  category: ["Категория", "Категории"],
  image: ["Главное фото", "URL фото", "Фото"],
  theme: ["Тематика", "Основная тематика", "Основная подборка"],
  collections: ["Тематики", "Подборки"],
  holidays: ["Праздник", "Праздники"],
  status: ["Публикация", "Публикационный статус", "status"],
  stock: ["Статус наличия", "Статус", "stock"],
  photoFolder: ["Папка", "Папка фото", "Папка с фото"],
};

function rowValue(row, key) {
  const column = productExportColumns.find((item) => item.key === key);
  const labels = [key, column?.label, ...(productColumnAliases[key] || [])].filter(Boolean);
  const found = labels.find((label) => row[label] !== undefined && row[label] !== "");
  return found ? row[found] : "";
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
      <img src="${escapeHtml(image || adminImageFallback(kind))}" alt="${escapeHtml(title)}" ${imageAttrs(520, 320)} />
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

function serializeCategoryList(items) {
  return items.map((item) => [item.name, item.description, item.icon].map((value) => value || "").join(" | ")).join("\n");
}

function serializeSimpleList(items) {
  return items.map((item) => [item.name, item.icon].map((value) => value || "").join(" | ")).join("\n");
}

function serializeActualList(items) {
  return items.map((item) => [item.label, item.type].map((value) => value || "").join(" | ")).join("\n");
}

function adminListTextarea(name, title, value, note) {
  return `
    <label class="admin-content-grid__wide">
      ${title}
      <textarea name="${name}" rows="6">${escapeHtml(value)}</textarea>
      <small class="field-note">${note}</small>
    </label>
  `;
}

function adminSectionHref(anchor) {
  return (
    {
      global: "index.html",
      home: "index.html",
      catalog: "catalog.html",
      marketplaces: "marketplaces.html",
      custom: "custom.html",
      business: "business.html",
      about: "about.html",
      contacts: "contacts.html",
      cart: "cart.html",
      footer: "index.html#footer",
    }[anchor] || "index.html"
  );
}

function adminSectionPreviewHtml(anchor) {
  return `
    <a class="admin-section-open" href="${adminSectionHref(anchor)}" target="_blank" rel="noopener">
      <i data-lucide="external-link"></i>
      Открыть страницу
    </a>
  `;
}

function adminSectionMapHtml() {
  const items = [
    { anchor: "global", title: "Шапка и общие", note: "Логотип, название, верхние кнопки", shot: "header" },
    { anchor: "home", title: "Главная", note: "Первый экран, актуально, преимущества", shot: "home" },
    { anchor: "catalog", title: "Каталог", note: "Категории, подборки, праздники, фильтры", shot: "catalog" },
    { anchor: "marketplaces", title: "Маркетплейсы", note: "Отдельная страница витрин", shot: "page" },
    { anchor: "custom", title: "Свой принт", note: "Калькулятор и бриф", shot: "page" },
    { anchor: "business", title: "Условия для бизнеса", note: "Оптовые условия, скидки и запуск партии", shot: "page" },
    { anchor: "about", title: "О компании", note: "Описание производства", shot: "page" },
    { anchor: "contacts", title: "Контакты", note: "Адрес, карта, график", shot: "contacts" },
    { anchor: "cart", title: "Корзина", note: "Оформление и промокод", shot: "cart" },
    { anchor: "footer", title: "Подвал", note: "Нижнее меню и контакты", shot: "footer" },
  ];
  return `
    <aside class="admin-content-sidebar">
      <div class="admin-content-sidebar__intro">
        <strong>Страницы</strong>
        <span>Выберите блок, отредактируйте поля справа и сохраните изменения на сервере.</span>
      </div>
      <div class="admin-content-map" aria-label="Разделы настройки контента">
      ${items
        .map(
          (item) => `
            <a class="admin-content-map__card" href="#admin-section-${item.anchor}">
              <span class="admin-content-map__shot admin-content-map__shot--${item.shot}" aria-hidden="true">
                <i></i><i></i><i></i><i></i>
              </span>
              <b>${item.title}</b>
              <small>${item.note}</small>
            </a>
          `
        )
        .join("")}
      </div>
    </aside>
  `;
}

function adminTextGroupHtml(group, content, extraHtml = "") {
  const sectionId = group.anchor ? ` id="admin-section-${escapeHtml(group.anchor)}"` : "";
  return `
    <div class="admin-content-section admin-content-section--page"${sectionId}>
      <div class="admin-content-section__head">
        <div>
          <h3>${group.title}</h3>
          <p class="admin-section-note">${group.note}</p>
        </div>
        ${adminSectionPreviewHtml(group.anchor)}
      </div>
      <div class="admin-content-grid">
        ${extraHtml}
        ${group.fields.map((field) => renderTextField(field, content)).join("")}
      </div>
    </div>
  `;
}

function adminCatalogImagesHtml(kind, items, title, note) {
  if (!items.length) return "";
  return `
    <div class="admin-content-section admin-content-section--nested">
      <h4>${title}</h4>
      <div class="admin-image-grid">
        ${items.map((item, index) => adminImageUploadHtml(kind, index, item.image, item.name || item.label, note)).join("")}
      </div>
    </div>
  `;
}

function reviewStatusLabel(status) {
  if (status === "approved") return "Одобрен";
  if (status === "hidden") return "Скрыт";
  return "На модерации";
}

function adminReviewCardHtml(review) {
  const product = products.find((item) => item.id === review.productId || baseSkuKey(item.baseSku) === baseSkuKey(review.baseSku));
  return `
    <article class="admin-review-card">
      <div class="admin-review-card__head">
        <div>
          <strong>${escapeHtml(review.baseSku || product?.baseSku || "Товар")}</strong>
          <span>${escapeHtml(review.productName || product?.name || "")}</span>
        </div>
        <b class="review-status review-status--${escapeHtml(review.status)}">${escapeHtml(reviewStatusLabel(review.status))}</b>
      </div>
      <div class="admin-review-card__meta">
        ${starsHtml(review.rating, `Оценка ${review.rating} из 5`)}
        <span>${escapeHtml(review.authorName || review.userEmail || "Покупатель")}</span>
        <span>${escapeHtml(review.createdAt ? new Date(review.createdAt).toLocaleString("ru-RU") : "")}</span>
      </div>
      <p>${escapeHtml(review.text)}</p>
      <div class="order-actions">
        <button class="ghost-button" type="button" data-review-status="${escapeHtml(review.id)}" data-review-status-value="approved">Одобрить</button>
        <button class="ghost-button" type="button" data-review-status="${escapeHtml(review.id)}" data-review-status-value="hidden">Скрыть</button>
        <button class="ghost-button" type="button" data-delete-review="${escapeHtml(review.id)}">Удалить</button>
      </div>
    </article>
  `;
}

function adminReviewsPanelHtml() {
  const reviews = state.adminReviews;
  const pending = reviews.filter((review) => review.status === "pending").length;
  return `
    <section class="admin-content-section admin-content-section--page" id="admin-section-reviews">
      <div class="admin-content-section__head">
        <div>
          <h3>Отзывы товаров</h3>
          <p class="admin-section-note">${reviews.length ? `${reviews.length} ${reviewWord(reviews.length)} · ${pending} на модерации` : "Отзывов пока нет."}</p>
        </div>
        <button class="ghost-button" type="button" data-refresh-reviews><i data-lucide="refresh-cw"></i> Обновить</button>
      </div>
      <div class="admin-reviews-list">
        ${reviews.length ? reviews.map(adminReviewCardHtml).join("") : "<p>Когда покупатели оставят отзывы, они появятся здесь.</p>"}
      </div>
    </section>
  `;
}

function renderAdminReviewsPanel() {
  const node = document.querySelector("#adminReviewsPanel");
  if (!node) return;
  node.innerHTML = adminReviewsPanelHtml();
  if (window.lucide) window.lucide.createIcons();
}

async function loadAdminReviews() {
  const user = getUsers()[state.currentUser];
  if (!canManageContent(user)) return false;
  try {
    const result = await apiRequest("/api/admin/content?reviews=1");
    state.adminReviews = normalizeReviews(result.reviews);
    renderAdminReviewsPanel();
    return true;
  } catch (error) {
    if (!isBackendUnavailable(error)) showToast(error.message || "Не удалось загрузить отзывы.");
    return false;
  }
}

async function moderateReview(reviewId, patch) {
  try {
    const result = await apiRequest("/api/admin/content", {
      method: "PATCH",
      body: { reviewId, ...patch },
    });
    if (result.deleted) {
      state.adminReviews = state.adminReviews.filter((review) => review.id !== reviewId);
      state.productReviews = state.productReviews.filter((review) => review.id !== reviewId);
    } else if (result.review) {
      const normalized = normalizeReview(result.review);
      state.adminReviews = state.adminReviews.map((review) => (review.id === normalized.id ? normalized : review));
      state.productReviews = normalizeReviews([...state.productReviews.filter((review) => review.id !== normalized.id), normalized]);
    }
    renderAdminReviewsPanel();
    showToast(result.deleted ? "Отзыв удален." : "Статус отзыва обновлен.");
  } catch (error) {
    showToast(error.message || "Не удалось изменить отзыв.");
  }
}

function adminModalHtml() {
  const content = getSiteContent();
  return `
    <div class="modal is-visible" id="adminModal" role="dialog" aria-modal="true" aria-labelledby="adminModalTitle">
      <div class="modal__backdrop" data-close-modal></div>
      <section class="modal__panel admin-panel">
        <button class="modal__close" type="button" data-close-modal><i data-lucide="x"></i></button>
        <div>
          <p class="eyebrow">Content</p>
          <h2 id="adminModalTitle">Контент сайта</h2>
          <p>Редактор текстов, изображений и блоков сайта. После сохранения изменения записываются локально и отправляются на сервер, чтобы они были доступны на других устройствах.</p>
        </div>
        <form class="admin-content-form" id="adminContentForm">
          <div class="admin-content-toolbar">
            <div>
              <strong>Редактор страниц</strong>
              <span data-content-save-status>Изменения сохраняются локально и на сервере после нажатия кнопки.</span>
            </div>
            <div class="admin-content-toolbar__actions">
              <button class="primary-button" type="submit"><i data-lucide="save"></i> Сохранить на сервере</button>
              <button class="ghost-button" type="button" data-reset-content>Сбросить контент</button>
            </div>
          </div>
          <div id="adminReviewsPanel">
            ${adminReviewsPanelHtml()}
          </div>
          <div class="admin-content-workspace">
            ${adminSectionMapHtml()}
            <div class="admin-content-pages">
          ${adminTextGroupHtml(
            siteTextFieldGroups[0],
            content,
            `<label>
              Название сайта в шапке
              <input name="brandName" type="text" value="${escapeHtml(content.brandName)}" />
            </label>`
          )}
          <div class="admin-content-section admin-content-section--page" id="admin-section-logo">
            <h3>Общие настройки сайта: логотип</h3>
            <p class="admin-section-note">Квадратный логотип в шапке сайта. Рекомендуем сразу готовить файл в едином размере.</p>
            <div class="admin-image-grid admin-image-grid--logo">
              ${adminImageUploadHtml("brandLogo", 0, content.brandLogo, "Логотип", "Рекомендуем: PNG/WebP 512x512 px, прозрачный фон, до 1.5 МБ.")}
            </div>
          </div>
          ${adminTextGroupHtml(siteTextFieldGroups[1], content)}
          <div class="admin-content-section admin-content-section--page" id="admin-section-home-images">
            <h3>Страница: главная — фото первого экрана</h3>
            <p class="admin-section-note">Изображения используются в верхнем слайдшоу главной страницы.</p>
            <div class="admin-image-grid">
              ${content.heroImages
                .map((image, index) => adminImageUploadHtml("heroImages", index, image, `Главное фото ${index + 1}`, "Рекомендуем: 1920x1200 px, JPG/WebP до 1.5 МБ.") )
                .join("")}
            </div>
          </div>
          <div class="admin-content-section admin-content-section--page" id="admin-section-actual">
            <h3>Страница: главная — блок Актуально</h3>
            <div class="admin-content-grid">
              ${adminListTextarea("actualSlidesText", "Список актуального", serializeActualList(content.actualSlides), "Одна строка = один слайд. Формат: название | collection или holiday. После добавления новой строки сохраните контент, откройте админку снова и загрузите фото.")}
            </div>
            <div class="admin-slides-grid">
              ${content.actualSlides.map((slide, index) => adminActualSlideHtml(slide, index)).join("")}
            </div>
          </div>
          ${adminTextGroupHtml(siteTextFieldGroups[2], content)}
          <div class="admin-content-section admin-content-section--page" id="admin-section-catalog-lists">
            <h3>Страница: каталог — категории, подборки и праздники</h3>
            <p class="admin-section-note">Редактируются справочники, которые видит покупатель на главной странице каталога. Иконки указываются названиями Lucide, например: square-stack, gift, heart, palette.</p>
            <div class="admin-content-grid">
              ${adminListTextarea("catalogCategoriesText", "Категории", serializeCategoryList(content.catalogCategories), "Одна строка = категория. Формат: название | описание | иконка. Фото категорий пока не используем, оставляем схему.")}
              ${adminListTextarea("catalogCollectionsText", "Подборки", serializeSimpleList(content.catalogCollections), "Одна строка = подборка. Формат: название | иконка. Фото можно загрузить ниже после сохранения новой строки.")}
              ${adminListTextarea("catalogHolidaysText", "Праздники", serializeSimpleList(content.catalogHolidays), "Одна строка = праздник. Формат: название | иконка. Фото можно загрузить ниже после сохранения новой строки.")}
            </div>
            ${adminCatalogImagesHtml("catalogCollections", content.catalogCollections, "Фото подборок", "Рекомендуем: 900x520 px, JPG/WebP до 1.5 МБ.")}
            ${adminCatalogImagesHtml("catalogHolidays", content.catalogHolidays, "Фото праздников", "Рекомендуем: 900x520 px, JPG/WebP до 1.5 МБ.")}
          </div>
          ${siteTextFieldGroups.slice(3).map((group) => adminTextGroupHtml(group, content)).join("")}
            </div>
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
            Категории
            <input name="category" type="text" placeholder="Подушки; Наволочки" value="Подушки; Наволочки" required />
          </label>
          <label>
            Основная подборка
            <input name="theme" type="text" placeholder="Новая подборка" value="Новая подборка" required />
          </label>
          <label>
            Подборки
            <input name="collections" type="text" placeholder="Через ;" value="Новая подборка" />
          </label>
          <label>
            Праздники
            <input name="holidays" type="text" placeholder="Через ;" value="" />
          </label>
          <label>
            Теги
            <input name="tags" type="text" placeholder="Через ;" value="Новая подборка" />
          </label>
          <label>
            Типы товара
            <input name="types" type="text" placeholder="Через ;" value="${TYPE_OPTIONS.join("; ")}" required />
          </label>
          <label>
            Размеры
            <input name="sizes" type="text" placeholder="Через ;" value="${SIZE_OPTIONS.join("; ")}" required />
          </label>
          <label>
            Материалы
            <input name="materials" type="text" placeholder="Через ;" value="${MATERIAL_OPTIONS.join("; ")}" required />
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
            Статус наличия
            <select name="stock">
              <option value="ready">В наличии</option>
              <option value="made">Под заказ</option>
            </select>
          </label>
          <div class="admin-actions">
            <button class="primary-button" type="submit">Сгенерировать</button>
            <button class="ghost-button" type="button" data-save-generated>Добавить карточку</button>
            <button class="ghost-button" type="button" data-download-template>CSV-шаблон</button>
            <button class="ghost-button" type="button" data-download-xlsx-template>XLSX-шаблон</button>
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
            <button class="ghost-button" type="button" data-export-variant-prices>Скачать цены вариантов</button>
            <button class="ghost-button" type="button" data-export-filtered-variant-prices>Цены вариантов по фильтрам</button>
          </div>
        </div>
        <div class="admin-preview" id="adminPreview"></div>
      </section>
    </div>
  `;
}

function openAdmin() {
  if (!canManageContent(getUsers()[state.currentUser])) {
    showToast("Управление контентом доступно администратору и контент-менеджеру.");
    return;
  }
  document.querySelector("#accountModal")?.remove();
  document.body.insertAdjacentHTML("beforeend", adminModalHtml());
  activateModal(document.querySelector("#adminModal"));
  renderAdminPreview([]);
  if (window.lucide) window.lucide.createIcons();
  loadAdminReviews();
}

function splitList(value) {
  const prepared = String(value || "");
  const delimiter = prepared.includes(";") ? ";" : ",";
  return prepared
    .split(delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDelimitedText(text) {
  const delimiter = text.includes(";") ? ";" : ",";
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some((value) => value)) rows.push(row);
  const headers = (rows.shift() || []).map((header) => header.replace(/^\uFEFF/, "").trim());
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

async function readProductRowsFromFile(file) {
  if (/\.csv$/i.test(file.name) || !window.XLSX) {
    return parseDelimitedText(await file.text());
  }
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
}

function productFromForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  return normalizeProduct({
    id: `${data.baseSku}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    baseSku: normalizeBaseSku(data.baseSku),
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
    status: "draft",
    stock: data.stock,
    badge: "Новая карточка",
    description: "Карточка создана массовым генератором вариантов.",
    popular: 60,
  });
}

function normalizeBaseSku(value) {
  return String(value || "").trim();
}

function baseSkuKey(value) {
  return normalizeBaseSku(value).toLocaleUpperCase("ru-RU");
}

function productVariantSkuKeys(product) {
  return new Set((product?.variants || []).map((variant) => baseSkuKey(variant.sku)).filter(Boolean));
}

function collectVariantSkuKeys(sourceProducts) {
  const skus = new Set();
  sourceProducts.forEach((product) => {
    productVariantSkuKeys(product).forEach((sku) => skus.add(sku));
  });
  return skus;
}

function renderAdminPreview(items) {
  const node = document.querySelector("#adminPreview");
  if (!node) return;
  state.adminPreview = items;
  const existingSkus = new Set(products.map((product) => baseSkuKey(product.baseSku)));
  const existingVariantSkus = collectVariantSkuKeys(products);
  node.innerHTML = items.length
    ? items
        .map(
          (product) => {
            const rawBaseDuplicate = existingSkus.has(baseSkuKey(product.baseSku));
            const baseDuplicate = rawBaseDuplicate && !state.importUpdateExisting;
            const updateDuplicate = rawBaseDuplicate && state.importUpdateExisting;
            const variantDuplicate = [...productVariantSkuKeys(product)].some((sku) => existingVariantSkus.has(sku)) && !updateDuplicate;
            const issue = baseDuplicate ? "Основной артикул уже есть в каталоге" : variantDuplicate ? "Есть пересечение артикулов вариантов" : "";
            return `
            <article>
              <strong>${product.name}</strong>
              <span>${product.baseSku} · ${productStatusLabel(product.status)} · ${product.variants.length} ${variantWord(product.variants.length)}</span>
              <small>${product.variants.slice(0, 6).map((variant) => variant.sku).join(", ")}${product.variants.length > 6 ? "..." : ""}</small>
              ${issue ? `<em class="admin-preview__issue">${issue}</em>` : `<em class="admin-preview__ok">Готово к добавлению</em>`}
            </article>
          `;
          }
        )
        .join("")
    : "<p>Сгенерируйте карточку или загрузите Excel, чтобы увидеть будущие артикулы.</p>";
}

function saveGeneratedProducts(options = {}) {
  if (!state.adminPreview.length) {
    showToast("Сначала сгенерируйте карточки.");
    return;
  }
  const batch = options.batchId ? importBatchById(options.batchId) : null;
  if (batch && !batch.snapshot) batch.snapshot = { products: cleanProductsForStorage(), createdAt: new Date().toISOString() };
  if (batch?.updateExisting) {
    const currentProducts = [...products];
    const bySku = new Map(currentProducts.map((product) => [baseSkuKey(product.baseSku), product]));
    const existingSkuSet = new Set(bySku.keys());
    const createdProducts = [];
    let updatedCount = 0;
    let applySkipped = 0;
    (batch.products || []).forEach((entry) => {
      const product = normalizeProduct(entry.product || {});
      const sku = baseSkuKey(product.baseSku);
      if (!sku) {
        applySkipped += 1;
        return;
      }
      if (entry.action === "updated" && bySku.has(sku)) {
        bySku.set(sku, product);
        updatedCount += 1;
        return;
      }
      if (entry.action === "created" && !bySku.has(sku)) {
        bySku.set(sku, product);
        createdProducts.push(product);
        return;
      }
      applySkipped += 1;
    });
    if (!createdProducts.length && !updatedCount) {
      showToast("Партия не применена локально: нет строк для создания или обновления.");
      return;
    }
    products = [
      ...createdProducts.filter((product) => !existingSkuSet.has(baseSkuKey(product.baseSku))),
      ...currentProducts.map((product) => bySku.get(baseSkuKey(product.baseSku)) || product),
    ];
    batch.status = "applied";
    batch.appliedAt = new Date().toISOString();
    batch.counts = {
      ...(batch.counts || {}),
      created: createdProducts.length,
      updated: updatedCount,
      skipped: (batch.rows || []).filter((row) => row.action === "skipped").length + applySkipped,
    };
    addMissingCatalogCategories(products);
    saveProducts();
    saveStoredImportBatches();
    renderCatalogHome();
    renderCatalogShell();
    renderFilters();
    renderProducts();
    renderAdminPreview([]);
    renderAdminImportPage();
    showToast(`Партия применена локально: создано ${createdProducts.length}, обновлено ${updatedCount}.`);
    return;
  }
  const existingSkus = new Set(products.map((product) => baseSkuKey(product.baseSku)));
  const existingVariantSkus = collectVariantSkuKeys(products);
  const seenSkus = new Set();
  const seenVariantSkus = new Set();
  let skippedVariantDuplicates = 0;
  const uniqueProducts = state.adminPreview.filter((product) => {
    const sku = baseSkuKey(product.baseSku);
    if (!sku || existingSkus.has(sku) || seenSkus.has(sku)) return false;
    const variantSkus = [...productVariantSkuKeys(product)];
    if (variantSkus.some((variantSku) => existingVariantSkus.has(variantSku) || seenVariantSkus.has(variantSku))) {
      skippedVariantDuplicates += 1;
      return false;
    }
    seenSkus.add(sku);
    variantSkus.forEach((variantSku) => seenVariantSkus.add(variantSku));
    return true;
  });
  const skipped = state.adminPreview.length - uniqueProducts.length;
  if (!uniqueProducts.length) {
    showToast("Новые карточки не добавлены: все артикулы уже есть в каталоге.");
    return;
  }
  products = [...uniqueProducts, ...products];
  if (batch) {
    batch.status = "applied";
    batch.appliedAt = new Date().toISOString();
    batch.counts = batch.counts || {};
    batch.counts.created = uniqueProducts.length;
    batch.counts.skipped = skipped;
  }
  addMissingCatalogCategories(uniqueProducts);
  saveProducts();
  saveStoredImportBatches();
  renderCatalogHome();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  renderAdminPreview([]);
  renderAdminImportPage();
  const duplicateText = skipped ? ` Дубли пропущены: ${skipped}${skippedVariantDuplicates ? `, из них по вариантам: ${skippedVariantDuplicates}` : ""}.` : "";
  showToast(`Карточки добавлены: ${uniqueProducts.length}.${duplicateText}`);
}

function setActualSlide(index) {
  const slides = [...document.querySelectorAll("[data-actual-slide]")];
  if (!slides.length) return;
  actualSlideIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => {
    const active = slideIndex === actualSlideIndex;
    slide.classList.toggle("is-active", active);
    slide.setAttribute("aria-hidden", String(!active));
    slide.tabIndex = active ? 0 : -1;
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
  const prepared = Array.isArray(value) ? value.join("; ") : value ?? "";
  return `"${String(prepared).replaceAll('"', '""')}"`;
}

function downloadCsv(fileName, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\n");
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
      "Подушки; Наволочки",
      "Аниме",
      "Аниме; Подарки",
      "Новый год",
      "Аниме; Подарки; интерьер",
      "Подушка; Наволочка",
      "30x30; 35x35; 40x40; 45x45; 50x50",
      "Велюр; Габардин",
      "220",
      "",
      "draft",
      "made",
      "Краткое описание для каталога",
      "Подробное описание для карточки товара",
      "Новинка",
      "60",
      "SB-PIL-SMP",
      "2.jpg; 3.jpg; 4.jpg",
    ],
  ]);
}

function downloadXlsxTemplate() {
  window.location.href = "templates/sobag-products-template.xlsx";
}

function productGalleryForExport(product) {
  const generatedImages = new Set();
  return (product.gallery || [])
    .filter((image) => image && image !== product.image && !generatedImages.has(image))
    .join("; ");
}

function productExportValue(product, key) {
  if (["category", "types", "sizes", "materials", "collections", "holidays", "tags"].includes(key)) {
    if (key === "category") return product.categories || [product.category].filter(Boolean);
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

const variantPriceExportColumns = [
  "Основной артикул",
  "Артикул варианта",
  "Название варианта",
  "Тип товара",
  "Размер",
  "Материал",
  "Цена варианта",
  "Категории",
  "Подборки",
  "Праздники",
  "Теги",
  "Папка фото",
];

function productVariantPriceRows(source) {
  return source.flatMap((product) =>
    product.variants.map((variant) => [
      product.baseSku,
      variant.sku,
      variant.name,
      variant.type,
      variant.size,
      variant.material,
      variant.price,
      product.categories || [product.category].filter(Boolean),
      product.collections || [],
      product.holidays || [],
      product.tags || [],
      product.photoFolder || product.baseSku,
    ])
  );
}

function downloadVariantPricesCsv(source, fileName) {
  const rows = productVariantPriceRows(source);
  downloadCsv(fileName, [variantPriceExportColumns, ...rows]);
  showToast(`Скачано вариантов: ${rows.length}.`);
}

function downloadAdminPriceRowsCsv(rows, fileName = "sobag-admin-prices.csv") {
  const preparedRows = rows.map(({ product, variant }) => [
    product.baseSku,
    variant.sku,
    variant.name,
    variant.type,
    variant.size,
    variant.material,
    variant.price,
    product.categories || [product.category].filter(Boolean),
    product.collections || [],
    product.holidays || [],
    product.tags || [],
  ]);
  downloadCsv(fileName, [variantPriceExportColumns.slice(0, 11), ...preparedRows]);
  showToast(`Скачано строк цен: ${preparedRows.length}.`);
}

function downloadAdminPriceRowsXlsx(rows, fileName = "sobag-admin-prices.xlsx") {
  if (!window.XLSX) {
    downloadAdminPriceRowsCsv(rows, fileName.replace(/\.xlsx$/i, ".csv"));
    return;
  }
  const preparedRows = rows.map(({ product, variant }) => [
    product.baseSku,
    variant.sku,
    variant.name,
    variant.type,
    variant.size,
    variant.material,
    variant.price,
    (product.categories || [product.category].filter(Boolean)).join("; "),
    (product.collections || []).join("; "),
    (product.holidays || []).join("; "),
    (product.tags || []).join("; "),
  ]);
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([variantPriceExportColumns.slice(0, 11), ...preparedRows]);
  sheet["!cols"] = [{ wch: 18 }, { wch: 30 }, { wch: 34 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 34 }];
  XLSX.utils.book_append_sheet(workbook, sheet, "Цены вариантов");
  XLSX.writeFile(workbook, fileName);
  showToast(`Скачано строк цен в XLSX: ${preparedRows.length}.`);
}

function downloadOrdersCsv() {
  const rows = getOrders().map((order) => {
    const customer = order.customer || {};
    const items = order.items || [];
    return [
      order.id || "",
      order.date || order.createdAt || "",
      orderStatusLabel(order.status),
      order.managerName || order.managerEmail || "",
      customer.name || "",
      customer.company || "",
      customer.inn || "",
      customer.kpp || "",
      customer.phone || "",
      customer.email || order.userEmail || "",
      customer.city || "",
      customer.address || "",
      customer.legalAddress || "",
      customer.delivery || "",
      customer.packaging || "",
      customer.layoutFileName || "",
      order.total || 0,
      order.promo || "",
      items.length,
      items.map((line) => `${line.variant?.sku || ""} x ${line.qty || 0}`).join("; "),
      order.managerNote || "",
      customer.comment || "",
    ];
  });
  downloadCsv("sobag-orders.csv", [
    ["Номер", "Дата", "Статус", "Менеджер", "Имя", "Компания", "ИНН", "КПП", "Телефон", "Email", "Город", "Адрес", "Юр. адрес", "Доставка", "Упаковка", "Макет", "Сумма", "Промокод", "Позиций", "Артикулы", "Комментарий менеджера", "Комментарий клиента"],
    ...rows,
  ]);
  showToast(`Скачано заказов: ${rows.length}.`);
}

function orderCsvRows(order) {
  const customer = order?.customer || {};
  const items = order?.items || [];
  return [
    ["Поле", "Значение"],
    ["Номер", order?.id || ""],
    ["Дата", order?.date || order?.createdAt || ""],
    ["Статус", orderStatusLabel(order?.status)],
    ["Менеджер", order?.managerName || order?.managerEmail || ""],
    ["Имя", customer.name || ""],
    ["Компания", customer.company || ""],
    ["ИНН", customer.inn || ""],
    ["КПП", customer.kpp || ""],
    ["Телефон", customer.phone || ""],
    ["Email", customer.email || order?.userEmail || ""],
    ["Город", customer.city || ""],
    ["Адрес", customer.address || ""],
    ["Юр. адрес", customer.legalAddress || ""],
    ["Доставка", customer.delivery || ""],
    ["Упаковка", customer.packaging || ""],
    ["Макет", customer.layoutFileName || ""],
    ["Сумма", order?.total || 0],
    ["Промокод", order?.promo || ""],
    [],
    ["Артикул", "Наименование", "Тип", "Размер", "Материал", "Количество", "Цена"],
    ...items.map((line) => {
      const variant = line.variant || {};
      return [variant.sku || "", variant.name || line.productName || "", variant.type || "", variant.size || "", variant.material || "", line.qty || 0, variant.price || 0];
    }),
  ];
}

function downloadOrderCsv(orderId) {
  const order = getOrders().find((item) => item.id === orderId);
  if (!order) {
    showToast("Заказ не найден.");
    return;
  }
  downloadCsv(`sobag-order-${order.id || "order"}.csv`, orderCsvRows(order));
}

function downloadOrderXlsx(orderId) {
  const order = getOrders().find((item) => item.id === orderId);
  if (!order) {
    showToast("Заказ не найден.");
    return;
  }
  const rows = orderCsvRows(order);
  if (downloadRowsXlsx(rows, `sobag-order-${order.id || "order"}.xlsx`, "Заказ")) {
    showToast("Заказ скачан в XLSX.");
    return;
  }
  downloadCsv(`sobag-order-${order.id || "order"}.csv`, rows);
  showToast("XLSX недоступен на этой странице, скачан CSV.");
}

function printOrder(orderId) {
  const order = getOrders().find((item) => item.id === orderId);
  if (!order) {
    showToast("Заказ не найден.");
    return;
  }
  const customer = order.customer || {};
  const lines = (order.items || [])
    .map((line) => {
      const variant = line.variant || {};
      return `<tr><td>${escapeHtml(variant.sku || "")}</td><td>${escapeHtml(variant.name || line.productName || "")}</td><td>${escapeHtml([variant.type, variant.size, variant.material].filter(Boolean).join(", "))}</td><td>${line.qty || 0}</td><td>${formatMoney(variant.price || 0)}</td></tr>`;
    })
    .join("");
  const win = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
  if (!win) {
    showToast("Браузер заблокировал печатное окно.");
    return;
  }
  win.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Заказ ${escapeHtml(order.id || "")}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{font-size:28px}dl{display:grid;grid-template-columns:180px 1fr;gap:8px 16px}dt{color:#666}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}</style></head><body><h1>Заказ ${escapeHtml(order.id || "")}</h1><dl><dt>Статус</dt><dd>${escapeHtml(orderStatusLabel(order.status))}</dd><dt>Дата</dt><dd>${escapeHtml(order.date || order.createdAt || "")}</dd><dt>Покупатель</dt><dd>${escapeHtml(customer.name || customer.company || "")}</dd><dt>Компания</dt><dd>${escapeHtml(customer.company || "")}</dd><dt>ИНН</dt><dd>${escapeHtml(customer.inn || "")}</dd><dt>КПП</dt><dd>${escapeHtml(customer.kpp || "")}</dd><dt>Телефон</dt><dd>${escapeHtml(customer.phone || "")}</dd><dt>Email</dt><dd>${escapeHtml(customer.email || order.userEmail || "")}</dd><dt>Город</dt><dd>${escapeHtml(customer.city || "")}</dd><dt>Адрес</dt><dd>${escapeHtml(customer.address || "")}</dd><dt>Юр. адрес</dt><dd>${escapeHtml(customer.legalAddress || "")}</dd><dt>Доставка</dt><dd>${escapeHtml(customer.delivery || "")}</dd><dt>Упаковка</dt><dd>${escapeHtml(customer.packaging || "")}</dd><dt>Макет</dt><dd>${escapeHtml(customer.layoutFileName || "")}</dd><dt>Комментарий</dt><dd>${escapeHtml(customer.comment || "")}</dd><dt>Итого</dt><dd><b>${formatMoney(order.total || 0)}</b></dd></dl><table><thead><tr><th>Артикул</th><th>Наименование</th><th>Параметры</th><th>Кол-во</th><th>Цена</th></tr></thead><tbody>${lines}</tbody></table><script>window.print();</script></body></html>`);
  win.document.close();
}

function adminOrderUrl(orderId) {
  return `admin-order.html?id=${encodeURIComponent(orderId || "")}`;
}

function adminCustomerUrl(email) {
  return `admin-customer.html?email=${encodeURIComponent(email || "")}`;
}

function addMissingCatalogCategories(sourceProducts) {
  const content = getSiteContent();
  const catalogCategories = addMissingCatalogItems(
    content.catalogCategories,
    sourceProducts.flatMap((product) => product.categories || [product.category]),
    (name) => ({
      name,
      icon: "tag",
      description: "Категория добавлена из импорта. Эмблему и описание можно уточнить в админке.",
      image: "",
    })
  );
  const catalogCollections = addMissingCatalogItems(content.catalogCollections, sourceProducts.flatMap((product) => product.collections || []), (name) => ({
    name,
    icon: "tag",
    image: "",
  }));
  const catalogHolidays = addMissingCatalogItems(content.catalogHolidays, sourceProducts.flatMap((product) => product.holidays || []), (name) => ({
    name,
    icon: "calendar-days",
    image: "",
  }));
  if (
    catalogCategories.length === content.catalogCategories.length &&
    catalogCollections.length === content.catalogCollections.length &&
    catalogHolidays.length === content.catalogHolidays.length
  ) {
    return;
  }
  saveSiteContent({
    ...content,
    catalogCategories,
    catalogCollections,
    catalogHolidays,
  });
}

function addMissingCatalogItems(currentItems, names, makeItem) {
  const existing = new Set(currentItems.map((item) => normalizeTaxonomyItem(item.name).toLocaleLowerCase("ru-RU")));
  const additions = [];
  names.forEach((rawName) => {
    const name = normalizeTaxonomyItem(rawName);
    const key = name.toLocaleLowerCase("ru-RU");
    if (!name || existing.has(key)) return;
    existing.add(key);
    additions.push(makeItem(name));
  });
  return additions.length ? [...currentItems, ...additions] : currentItems;
}

async function importExcel(file) {
  const rows = await readProductRowsFromFile(file);
  const updateExisting = Boolean(state.importUpdateExisting);
  const existingBySku = new Map(products.map((product) => [baseSkuKey(product.baseSku), product]));
  const existingSkus = new Set(products.map((product) => baseSkuKey(product.baseSku)));
  const seenSkus = new Set();
  let skippedDuplicates = 0;
  const imported = rows.reduce((items, row) => {
    if (!rowValue(row, "name") || !rowValue(row, "baseSku")) return items;
    const baseSku = normalizeBaseSku(rowValue(row, "baseSku"));
    const skuKey = baseSkuKey(baseSku);
    const existingProduct = updateExisting ? existingBySku.get(skuKey) : null;
    if ((existingSkus.has(skuKey) && !updateExisting) || seenSkus.has(skuKey)) {
      skippedDuplicates += 1;
      return items;
    }
    seenSkus.add(skuKey);
    if (existingProduct) {
      if (!rowValue(row, "category")) row.category = existingProduct.category;
      if (!rowValue(row, "description")) row.description = existingProduct.description;
      if (!rowValue(row, "detailDescription")) row.detailDescription = existingProduct.detailDescription;
    }
    const gallery = splitList(rowValue(row, "gallery") || "");
    const rowImage = rowValue(row, "image");
    const rowStatus = rowValue(row, "status");
    items.push(
      normalizeProduct({
        id: existingProduct?.id || `${rowValue(row, "baseSku")}-${Date.now()}-${Math.random().toString(16).slice(2)}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        baseSku,
        name: String(rowValue(row, "name")).trim(),
        category: String(rowValue(row, "category") || "Подушки").trim(),
        categories: splitList(rowValue(row, "category") || "Подушки"),
        theme: String(rowValue(row, "theme") || existingProduct?.theme || "").trim(),
        collections: splitList(rowValue(row, "collections") || rowValue(row, "theme") || existingProduct?.collections?.join(";") || existingProduct?.theme || ""),
        holidays: splitList(rowValue(row, "holidays") || existingProduct?.holidays?.join(";") || ""),
        tags: splitList(rowValue(row, "tags") || rowValue(row, "theme") || existingProduct?.tags?.join(";") || existingProduct?.theme || ""),
        types: splitList(rowValue(row, "types") || existingProduct?.types?.join(";") || TYPE_OPTIONS.join(";")),
        sizes: splitList(rowValue(row, "sizes") || existingProduct?.sizes?.join(";") || SIZE_OPTIONS.join(";")),
        materials: splitList(rowValue(row, "materials") || existingProduct?.materials?.join(";") || MATERIAL_OPTIONS.join(";")),
        basePrice: Number(rowValue(row, "basePrice") || existingProduct?.basePrice || 220),
        image: rowImage || existingProduct?.image || "assets/production-workshop-1.png",
        status: rowStatus || existingProduct?.status || "draft",
        stock: rowValue(row, "stock") || existingProduct?.stock || "made",
        gallery: gallery.length ? gallery : existingProduct?.gallery || [],
        images: existingProduct?.images || [],
        photoFolder: rowValue(row, "photoFolder") || existingProduct?.photoFolder || rowValue(row, "baseSku"),
        badge: rowValue(row, "badge") || existingProduct?.badge || "Excel",
        description: rowValue(row, "description") || "Карточка импортирована из Excel.",
        detailDescription: rowValue(row, "detailDescription") || "Карточка импортирована из Excel. Фото и параметры можно уточнить перед публикацией.",
        popular: Number(rowValue(row, "popular") || existingProduct?.popular || 55),
        variantPrices: existingProduct?.variantPrices || {},
      })
    );
    return items;
  }, []);
  addMissingCatalogCategories(imported);
  await createImportBatch(imported, file.name || "admin-import", { updateExisting });
  if (state.importPhotoFiles.length) {
    buildImportPhotoReport(state.importPhotoFiles);
    renderAdminImportPage();
  }
  if (updateExisting) {
    showToast(
      skippedDuplicates
        ? `Из Excel загружено строк для предпросмотра: ${imported.length}. Повторы в файле пропущены: ${skippedDuplicates}.`
        : `Из Excel загружено строк для предпросмотра: ${imported.length}.`
    );
    return;
  }
  showToast(
    skippedDuplicates
      ? `Из Excel загружено новых карточек: ${imported.length}. Дубли пропущены: ${skippedDuplicates}.`
      : `Из Excel загружено новых карточек: ${imported.length}.`
  );
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

function normalizeImportHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function priceImportValue(row, candidates) {
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    const wanted = normalizeImportHeader(candidate);
    const found = entries.find(([key]) => normalizeImportHeader(key) === wanted);
    if (found) return found[1];
  }
  return "";
}

async function importPriceFile(file) {
  let rows = [];
  if (/\.csv$/i.test(file.name)) {
    const text = await file.text();
    const delimiter = text.includes(";") ? ";" : ",";
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const headers = (lines.shift() || "").split(delimiter).map((header) => header.replace(/^\uFEFF/, "").trim());
    rows = lines.map((line) =>
      Object.fromEntries(line.split(delimiter).map((cell, index) => [headers[index] || `col${index}`, cell.replace(/^"|"$/g, "").replaceAll('""', '"').trim()]))
    );
  } else {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
  }
  const rowBySku = new Map();
  rows.forEach((row) => {
    const sku = String(priceImportValue(row, ["Артикул варианта", "variant sku", "sku", "Артикул"]) || "").trim();
    const price = Number(String(priceImportValue(row, ["Цена варианта", "Новая цена", "price", "Цена"]) || "").replace(",", "."));
    if (sku && Number.isFinite(price) && price > 0) rowBySku.set(sku.toLocaleUpperCase("ru-RU"), Math.round(price));
  });
  const changes = adminPriceRows(products)
    .filter(({ variant }) => rowBySku.has(variant.sku.toLocaleUpperCase("ru-RU")))
    .map((row) => buildPriceChange(row, rowBySku.get(row.variant.sku.toLocaleUpperCase("ru-RU")), "import"));
  setPricePreview(changes);
}

function findCatalogItemByName(items, name) {
  const prepared = String(name || "").trim().toLocaleLowerCase("ru-RU");
  return items.find((item) => String(item.name || item.label || "").trim().toLocaleLowerCase("ru-RU") === prepared);
}

function parseCatalogLines(text, currentItems, fallbackItems, options = {}) {
  const rows = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed = rows.map((line, index) => {
    const [nameRaw, secondRaw, thirdRaw] = line.split("|").map((part) => part.trim());
    const previous = findCatalogItemByName(currentItems, nameRaw) || currentItems[index] || {};
    if (options.description) {
      return {
        name: nameRaw || previous.name || "",
        description: secondRaw || previous.description || "",
        icon: thirdRaw || previous.icon || "tag",
        image: previous.image || "",
      };
    }
    return {
      name: nameRaw || previous.name || "",
      icon: secondRaw || previous.icon || "tag",
      image: previous.image || "",
    };
  });
  return normalizeCatalogList(parsed, fallbackItems, options);
}

function parseActualLines(text, currentItems) {
  const rows = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed = rows.map((line, index) => {
    const [labelRaw, typeRaw] = line.split("|").map((part) => part.trim());
    const previous = findCatalogItemByName(currentItems, labelRaw) || currentItems[index] || {};
    const preparedType = String(typeRaw || previous.type || "holiday").toLocaleLowerCase("ru-RU");
    return {
      label: labelRaw || previous.label || "",
      type: preparedType.includes("collection") || preparedType.includes("подбор") ? "collection" : "holiday",
      image: previous.image || "",
    };
  });
  return normalizeActualSlides(parsed);
}

function applyAdminIndexedImages(form, kind, items, currentItems) {
  return items.map((item, index) => {
    const input = form.querySelector(`[data-content-image="${kind}"][data-content-index="${index}"]`);
    const previous = findCatalogItemByName(currentItems, item.name || item.label) || currentItems[index] || {};
    return {
      ...item,
      image: input?.dataset.imageValue || item.image || previous.image || "",
    };
  });
}

function contentFromAdminForm(form) {
  const current = getSiteContent();
  const data = Object.fromEntries(new FormData(form).entries());
  const brandLogoInput = form.querySelector('[data-content-image="brandLogo"][data-content-index="0"]');
  const heroImages = [0, 1, 2].map((index) => {
    const input = form.querySelector(`[data-content-image="heroImages"][data-content-index="${index}"]`);
    return input?.dataset.imageValue || current.heroImages[index] || defaultSiteContent.heroImages[index];
  });
  const actualTextChanged = data.actualSlidesText && data.actualSlidesText !== serializeActualList(current.actualSlides);
  const slideRows = data.actualSlidesText ? parseActualLines(data.actualSlidesText, current.actualSlides) : current.actualSlides;
  const actualSlides = slideRows.map((slide, index) => {
    const input = form.querySelector(`[data-content-image="actualSlides"][data-content-index="${index}"]`);
    const previous = findCatalogItemByName(current.actualSlides, slide.label) || current.actualSlides[index] || {};
    return {
      label: actualTextChanged ? slide.label : data[`actualLabel${index}`] || slide.label || previous.label,
      type: actualTextChanged ? slide.type : data[`actualType${index}`] || slide.type || previous.type,
      image: input?.dataset.imageValue || slide.image || previous.image || defaultSiteContent.actualSlides[index % defaultSiteContent.actualSlides.length].image,
    };
  });
  const catalogCategories = parseCatalogLines(data.catalogCategoriesText, current.catalogCategories, defaultSiteContent.catalogCategories, { description: true });
  const catalogCollections = applyAdminIndexedImages(
    form,
    "catalogCollections",
    parseCatalogLines(data.catalogCollectionsText, current.catalogCollections, defaultSiteContent.catalogCollections),
    current.catalogCollections
  );
  const catalogHolidays = applyAdminIndexedImages(
    form,
    "catalogHolidays",
    parseCatalogLines(data.catalogHolidaysText, current.catalogHolidays, defaultSiteContent.catalogHolidays),
    current.catalogHolidays
  );
  const textContent = Object.fromEntries(
    siteTextFields.map((field) => [field.key, data[field.key] || defaultSiteContent[field.key] || ""])
  );
  return normalizeSiteContent({
    ...textContent,
    brandName: data.brandName || defaultSiteContent.brandName,
    brandLogo: brandLogoInput?.dataset.imageValue || current.brandLogo || defaultSiteContent.brandLogo,
    heroImages,
    catalogCategories,
    catalogCollections,
    catalogHolidays,
    actualSlides,
  });
}

function finishModalClose() {
  document.body.classList.remove("modal-open");
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
}

function closeModal() {
  const modals = [...document.querySelectorAll(".modal")];
  if (!modals.length) return;
  if (prefersReducedMotion()) {
    modals.forEach((modal) => modal.remove());
    finishModalClose();
    return;
  }
  modals.forEach((modal) => {
    modal.classList.remove("is-visible");
    modal.classList.add("is-closing");
  });
  window.setTimeout(() => {
    modals.forEach((modal) => modal.remove());
    finishModalClose();
  }, 220);
}

async function submitOrder(form) {
  clearFormErrors(form);
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
  const data = Object.fromEntries(new FormData(form).entries());
  if (!String(data.company || "").trim()) {
    setFieldError(form, "company", "Укажите компанию или ИП.");
    return;
  }
  if (!String(data.phone || "").trim()) {
    setFieldError(form, "phone", "Укажите телефон для связи.");
    return;
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email).trim())) {
    setFieldError(form, "email", "Проверьте формат email.");
    return;
  }
  const inn = String(data.inn || "").replace(/\D/g, "");
  if (inn && ![10, 12].includes(inn.length)) {
    setFieldError(form, "inn", "ИНН должен содержать 10 или 12 цифр.");
    return;
  }
  const kpp = String(data.kpp || "").replace(/\D/g, "");
  if (kpp && kpp.length !== 9) {
    setFieldError(form, "kpp", "КПП должен содержать 9 цифр.");
    return;
  }
  const layoutFile = form.elements.layoutFile?.files?.[0] || null;
  const customer = {
    name: user?.name || data.company || "",
    company: data.company || "",
    inn,
    kpp,
    phone: data.phone || user?.phone || "",
    email: data.email || user?.email || "",
    city: data.city || "",
    address: data.address || user?.address || "",
    legalAddress: data.legalAddress || user?.legalAddress || "",
    delivery: data.delivery || user?.delivery || "",
    packaging: data.packaging || user?.packaging || "",
    layoutFileName: layoutFile ? layoutFile.name : String(data.layoutReference || user?.layoutFiles?.[0] || "").trim(),
    comment: data.comment || user?.orderComment || "",
  };
  try {
    const result = await apiRequest("/api/orders", {
      method: "POST",
      body: {
        customer,
        items: [...state.cart.values()],
        total: totals.total,
        source: "catalog",
      },
    });
    mirrorServerOrder(result.order, state.currentUser);
    form.reset();
    state.cart.clear();
    renderCart();
    showToast("Заказ отправлен и сохранен на сервере.");
    return;
  } catch (error) {
    if (!isBackendUnavailable(error)) {
      showToast(error.message || "Не удалось отправить заказ.");
      return;
    }
  }
  saveOrderRecord(
    {
      id: `SO-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleString("ru-RU"),
      customer,
      items: [...state.cart.values()],
      total: totals.total,
      source: "catalog",
    },
    state.currentUser
  );
  form.reset();
  state.cart.clear();
  renderCart();
  showToast("Заказ отправлен и появился у администратора и менеджеров.");
}

function boot() {
  seedUsers();
  cleanPrototypeStorage();
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
  renderManagementPages();
  renderSavedQuotesPage();
  renderAdminProductsPage();
  renderAdminPricesPage();
  renderAdminImportPage();
  updateCustomCalculator();
  initActualSlider();
  loadServerSiteContent();
  loadPublishedProducts();
  loadImportBatches();
  initFormEnhancements();
  loadBackendAccountData().then(async (changed) => {
    if (!changed) return;
    loadCart();
    loadFavorites();
    await loadServerPersonalState();
    renderCart();
    renderProducts();
    renderAccountButton();
    renderManagementPages();
    renderSavedQuotesPage();
    renderAdminProductsPage();
    renderAdminPricesPage();
    renderAdminImportPage();
    loadImportBatches();
  });

  document.addEventListener("click", async (event) => {
    if (event.target.dataset.closeModal !== undefined) {
      closeModal();
      return;
    }

    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.reviewStar) {
      setReviewFormRating(button.closest("[data-review-form]"), button.dataset.reviewStar);
      return;
    }
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
      navigateWithinSite(button.dataset.nav);
      return;
    }
    if (button.dataset.openCart !== undefined) {
      navigateWithinSite("cart.html");
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
          "#wholesale": "business.html",
        };
        if (routes[button.dataset.scroll]) navigateWithinSite(routes[button.dataset.scroll]);
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
    if (button.dataset.clearFilter) {
      clearCatalogFilter(button.dataset.clearFilter, button.dataset.clearValue || "");
      return;
    }
    if (button.dataset.searchQuery) {
      setSearchQuery(button.dataset.searchQuery);
      return;
    }
    if (button.dataset.showMoreProducts !== undefined) {
      if (await loadMoreServerCatalogProducts()) return;
      state.visibleLimit += 120;
      renderProducts();
      return;
    }
    if (button.dataset.copySku) {
      copyText(button.dataset.copySku);
      return;
    }
    if (button.id === "accountButton" || button.dataset.openAccount !== undefined) openAccount();
    if (button.dataset.closeModal !== undefined) closeModal();
    if (button.dataset.openProduct) {
      const currentModal = activeModal();
      if (currentModal) currentModal.remove();
      document.body.classList.remove("modal-open");
      openProduct(button.dataset.openProduct);
      return;
    }
    if (button.dataset.detailImage) {
      const image = document.querySelector("#detailMainImage");
      if (image) {
        image.src = button.dataset.detailImage;
        applyProductImageVariantSrcset(image, products.find((product) => product.id === state.activeProductId), button.dataset.detailImage);
      }
      document.querySelectorAll(".product-gallery__thumb").forEach((node) => node.classList.toggle("is-active", node === button));
    }
    if (button.dataset.variantKey) {
      state.activeVariant[button.dataset.variantKey] = button.dataset.variantValue;
      refreshProductModal();
    }
    if (button.dataset.detailQtyStep) {
      const input = document.querySelector("#detailQty");
      if (input) {
        input.value = Math.max(0, Number(input.value || 0) + Number(button.dataset.detailQtyStep));
        refreshProductModal();
      }
      return;
    }
    if (button.dataset.addVariant) addVariantToCart(button.dataset.addVariant);
    if (button.dataset.addMatrixVariant) {
      addMatrixVariantToCart(button.dataset.addMatrixVariant, button.dataset.variantSku || "");
      return;
    }
    if (button.dataset.downloadProductPrice) {
      downloadProductPriceCsv(button.dataset.downloadProductPrice);
      return;
    }
    if (button.dataset.repeatOrder) {
      repeatOrder(button.dataset.repeatOrder);
      closeModal();
      navigateWithinSite("cart.html");
      return;
    }
    if (button.dataset.saveCurrentCart !== undefined) {
      const title = window.prompt("Название черновика корзины", `Корзина от ${new Date().toLocaleDateString("ru-RU")}`) || "";
      saveCurrentCartDraft(title.trim());
      refreshSavedCartViews();
      return;
    }
    if (button.dataset.restoreSavedCart) {
      restoreSavedCart(button.dataset.restoreSavedCart);
      return;
    }
    if (button.dataset.renameSavedCart) {
      renameSavedCart(button.dataset.renameSavedCart);
      return;
    }
    if (button.dataset.downloadSavedCart) {
      downloadSavedCartQuote(button.dataset.downloadSavedCart);
      return;
    }
    if (button.dataset.printSavedCart) {
      printSavedCartQuote(button.dataset.printSavedCart);
      return;
    }
    if (button.dataset.sendSavedCart) {
      await sendSavedCartToManager(button.dataset.sendSavedCart);
      return;
    }
    if (button.dataset.deleteSavedCart) {
      deleteSavedCart(button.dataset.deleteSavedCart);
      return;
    }
    if (button.dataset.favorite) {
      if (state.favorites.has(button.dataset.favorite)) state.favorites.delete(button.dataset.favorite);
      else state.favorites.add(button.dataset.favorite);
      saveFavorites();
      if (isFavoritesPage && !state.favorites.has(button.dataset.favorite)) {
        renderProducts();
      } else {
        updateFavoriteButtons(button.dataset.favorite);
      }
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
      try {
        await apiRequest("/api/auth/logout", { method: "POST" });
      } catch (error) {
        if (!isBackendUnavailable(error)) console.warn(error);
      }
      localStorage.removeItem(STORAGE.user);
      state.currentUser = "";
      loadCart();
      loadFavorites();
      closeModal();
      renderCart();
      renderProducts();
      renderAccountButton();
    }
    if (button.dataset.orderStatus) {
      const status = button.dataset.statusValue || "new";
      try {
        await apiRequest("/api/admin/orders", { method: "PATCH", body: { id: button.dataset.orderStatus, status } });
        await loadBackendAccountData();
      } catch (error) {
        if (!isBackendUnavailable(error)) {
          showToast(error.message || "Не удалось обновить статус заказа.");
          return;
        }
        updateOrderStatus(button.dataset.orderStatus, status);
      }
      if (isAdminOrdersPage || isAdminOrderPage || isAdminCustomerPage) {
        renderManagementPages();
        showToast("Статус заказа обновлен.");
        return;
      }
      closeModal();
      openAccount();
      showToast("Статус заказа обновлен.");
      return;
    }
    if (button.dataset.setRole) {
      let updated = false;
      try {
        const result = await apiRequest("/api/admin/users", {
          method: "PATCH",
          body: { email: button.dataset.setRole, role: button.dataset.roleValue || "buyer" },
        });
        if (result.user) {
          const users = getUsers();
          users[result.user.email] = { ...(users[result.user.email] || {}), ...result.user, password: users[result.user.email]?.password || "__server__" };
          saveUsers(users);
          updated = true;
        }
      } catch (error) {
        if (!isBackendUnavailable(error)) {
          showToast(error.message || "Не удалось обновить роль.");
          return;
        }
        updated = setUserRole(button.dataset.setRole, button.dataset.roleValue || "buyer");
      }
      closeModal();
      openAccount();
      showToast(updated ? "Роль пользователя обновлена." : "Роль пользователя не изменена.");
      return;
    }
    if (button.dataset.openAdmin !== undefined) openAdmin();
    if (button.dataset.refreshReviews !== undefined) {
      await loadAdminReviews();
      return;
    }
    if (button.dataset.reviewStatus) {
      await moderateReview(button.dataset.reviewStatus, { status: button.dataset.reviewStatusValue || "pending" });
      return;
    }
    if (button.dataset.deleteReview) {
      if (window.confirm("Удалить отзыв без восстановления?")) {
        await moderateReview(button.dataset.deleteReview, { delete: true });
      }
      return;
    }
    if (button.dataset.saveGenerated !== undefined) saveGeneratedProducts();
    if (button.dataset.refreshImportBatches !== undefined) {
      await loadImportBatches();
      return;
    }
    if (button.dataset.uploadImportPhotos !== undefined) {
      await uploadImportPhotos();
      return;
    }
    if (button.dataset.clearImportPhotoReport !== undefined) {
      state.importPhotoFiles = [];
      state.importPhotoReport = [];
      renderAdminImportPage();
      return;
    }
    if (button.dataset.exportImportPhotoReport !== undefined) {
      downloadCsv("sobag-import-photo-report.csv", [
        ["Статус", "Основной артикул", "Товар", "Файл", "Причина", "URL", "Storage key"],
        ...state.importPhotoReport.map((row) => [
          importPhotoStatusLabel(row.status),
          row.baseSku || "",
          row.productName || "",
          row.fileName || "",
          importPhotoReasonLabel(row.reason),
          row.url || "",
          row.storageKey || "",
        ]),
      ]);
      return;
    }
    if (button.dataset.applyImportBatch) {
      await applyImportBatch(button.dataset.applyImportBatch);
      return;
    }
    if (button.dataset.rejectImportBatch) {
      await rejectImportBatch(button.dataset.rejectImportBatch);
      return;
    }
    if (button.dataset.rollbackImportBatch) {
      if (window.confirm("Откатить последнюю примененную партию и вернуть snapshot каталога?")) {
        await rollbackImportBatch(button.dataset.rollbackImportBatch);
      }
      return;
    }
    if (button.dataset.exportImportBatch) {
      const batch = importBatchById(button.dataset.exportImportBatch);
      if (batch) {
        downloadCsv(`sobag-import-batch-${batch.id}.csv`, [
          ["Партия", "Статус партии", "Строка", "Основной артикул", "Название", "Статус строки", "Действие", "Причина", "Вариантов", "Предупреждения"],
          ...(batch.rows || []).map((row) => [
            batch.id,
            importBatchStatusLabel(batch.status),
            row.row || "",
            row.baseSku || "",
            row.name || "",
            row.status || "",
            row.action || "",
            importBatchReasonLabel(row.reason),
            row.variantCount || "",
            row.warnings || "",
          ]),
        ]);
      }
      return;
    }
    if (button.dataset.downloadTemplate !== undefined) downloadTemplate();
    if (button.dataset.downloadXlsxTemplate !== undefined) downloadXlsxTemplate();
    if (button.dataset.exportProducts !== undefined) downloadProductsCsv(products, "sobag-products-all.csv");
    if (button.dataset.exportFilteredProducts !== undefined) downloadProductsCsv(getFilteredProducts(), "sobag-products-filtered.csv");
    if (button.dataset.exportVariantPrices !== undefined) downloadVariantPricesCsv(products, "sobag-variant-prices-all.csv");
    if (button.dataset.exportFilteredVariantPrices !== undefined) downloadVariantPricesCsv(getFilteredProducts(), "sobag-variant-prices-filtered.csv");
    if (button.dataset.exportOrders !== undefined) downloadOrdersCsv();
    if (button.dataset.exportOrder) downloadOrderCsv(button.dataset.exportOrder);
    if (button.dataset.exportOrderXlsx) downloadOrderXlsx(button.dataset.exportOrderXlsx);
    if (button.dataset.printOrder) printOrder(button.dataset.printOrder);
    if (button.dataset.adminSyncCatalog !== undefined) {
      syncCatalogNow();
      return;
    }
    if (button.dataset.adminExportProducts !== undefined) downloadProductsCsv(selectedAdminProducts(), "sobag-admin-products-selected.csv");
    if (button.dataset.adminExportVariants !== undefined) downloadVariantPricesCsv(selectedAdminProducts(), "sobag-admin-variant-prices-selected.csv");
    if (button.dataset.adminExportPriceRows !== undefined) downloadAdminPriceRowsCsv(selectedAdminPriceRows(), "sobag-admin-prices-selected.csv");
    if (button.dataset.adminExportPriceXlsx !== undefined) downloadAdminPriceRowsXlsx(selectedAdminPriceRows(), "sobag-admin-prices-selected.xlsx");
    if (button.dataset.adminExportPriceProducts !== undefined) {
      const productIds = new Set(selectedAdminPriceRows().map(({ product }) => product.id));
      downloadVariantPricesCsv(products.filter((product) => productIds.has(product.id)), "sobag-admin-product-variant-prices.csv");
    }
    if (button.dataset.adminPreviewManualPrices !== undefined) {
      previewManualPriceChanges();
      return;
    }
    if (button.dataset.adminApplyPricePreview !== undefined) {
      applyPricePreview();
      return;
    }
    if (button.dataset.adminToggleProduct) {
      const product = products.find((item) => item.id === button.dataset.adminToggleProduct);
      if (product) {
        product.status = isProductPublished(product) ? "hidden" : "published";
        product.hidden = product.status !== "published";
        Object.assign(product, normalizeProduct(product));
        saveProducts();
        renderCatalogHome();
        renderFilters();
        renderProducts();
        renderAdminProductsPage();
        renderAdminPricesPage();
        showToast(isProductPublished(product) ? "Товар опубликован в каталоге." : "Товар скрыт из каталога.");
      }
      return;
    }
    if (button.dataset.resetContent !== undefined) {
      localStorage.removeItem(STORAGE.content);
      renderSiteContent();
      closeModal();
      openAdmin();
      showToast("Контент сброшен к тестовым значениям.");
      return;
    }
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

  document.addEventListener("keydown", (event) => {
    if (event.target?.id === "searchInput" && event.key === "Enter") {
      event.preventDefault();
      const query = event.target.value.trim();
      if (query) navigateWithinSite(`search?q=${encodeURIComponent(query)}`);
      return;
    }
    const modal = activeModal();
    if (modal) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      trapModalFocus(event);
      return;
    }
    if (event.target.closest?.(".hero__actual")) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nextActualSlide(-1);
        startActualSlider();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nextActualSlide(1);
        startActualSlider();
      }
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "searchInput") {
      state.search = event.target.value;
      resetVisibleProducts();
      renderSearchSuggestions();
      if (!catalogListing && state.search.trim().length >= 2) return;
      syncCatalogRoute();
      renderCatalogShell();
      renderProducts();
    }
    if (event.target.id === "mapAddressInput") {
      event.target.dataset.userEdited = "true";
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
    if (event.target.closest?.("#customCalculator")) updateCustomCalculator();
  });

  document.addEventListener("change", (event) => {
    if (event.target.dataset.filter) {
      const bucket = state.filters[event.target.dataset.filter];
      if (event.target.checked) bucket.add(event.target.value);
      else bucket.delete(event.target.value);
      resetVisibleProducts();
      renderFilters();
      renderProducts();
    }
    if (event.target.id === "sortSelect") {
      state.sort = event.target.value;
      resetVisibleProducts();
      renderProducts();
    }
    if (event.target.id === "importUpdateExisting") {
      state.importUpdateExisting = event.target.checked;
      renderAdminImportPage();
      return;
    }
    if (event.target.id === "excelInput" && event.target.files[0]) importExcel(event.target.files[0]);
    if (event.target.id === "photoUploadInput" || event.target.id === "photoFolderInput") {
      buildImportPhotoReport(event.target.files || []);
      renderAdminImportPage();
      showToast("Отчет по фото подготовлен.");
    }
    if (event.target.dataset.contentImage) readContentFile(event.target);
    if (event.target.dataset.adminPriceImport !== undefined && event.target.files[0]) {
      importPriceFile(event.target.files[0]).finally(() => {
        event.target.value = "";
      });
    }
    if (event.target.closest?.("#customCalculator")) updateCustomCalculator();
  });

  document.addEventListener("submit", async (event) => {
    if (event.target.id === "requestForm") {
      event.preventDefault();
      await submitOrder(event.target);
    }
    if (event.target.id === "briefForm") {
      event.preventDefault();
      event.target.reset();
      showToast("Бриф принят. В следующей версии добавим загрузку макета.");
    }
    if (event.target.id === "mapAddressForm") {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      updateYandexMap(data.mapAddress);
      showToast("Карта обновлена по введенному адресу.");
    }
    if (event.target.dataset.profileForm !== undefined) {
      event.preventDefault();
      clearFormErrors(event.target);
      await saveProfileForm(event.target);
      return;
    }
    if (event.target.dataset.reviewForm) {
      event.preventDefault();
      await submitProductReview(event.target);
      return;
    }
    if (event.target.dataset.savedCartCommentForm) {
      event.preventDefault();
      saveSavedCartComments(event.target);
      return;
    }
    if (event.target.id === "authForm") {
      event.preventDefault();
      clearFormErrors(event.target);
      const submitter = event.submitter;
      const data = Object.fromEntries(new FormData(event.target).entries());
      const users = getUsers();
      const email = String(data.email || "").trim().toLowerCase();
      const password = String(data.password || "");
      const name = String(data.name || "").trim();
      const phone = String(data.phone || "").trim();
      const existingEmailKey = Object.keys(users).find((key) => key.toLowerCase() === email);
      if (!email) {
        setFieldError(event.target, "email", "Укажите email.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email !== "admin@sobag") {
        setFieldError(event.target, "email", "Проверьте формат email.");
        return;
      }
      if (!password) {
        setFieldError(event.target, "password", "Укажите пароль.");
        return;
      }
      if (submitter.dataset.authMode === "register") {
        if (!name || !phone) {
          if (!name) setFieldError(event.target, "name", "Для регистрации укажите имя или компанию.");
          else setFieldError(event.target, "phone", "Для регистрации укажите телефон.");
          showToast("Для регистрации укажите имя и телефон.");
          return;
        }
        if (data.personalDataConsent !== "on") {
          setFieldError(event.target, "personalDataConsent", "Подтвердите согласие на обработку персональных данных.");
          showToast("Для регистрации подтвердите согласие на обработку персональных данных.");
          return;
        }
        if (existingEmailKey) {
          setFieldError(event.target, "email", "Этот email уже зарегистрирован в системе.");
          showToast("Этот email уже зарегистрирован в системе.");
          return;
        }
        try {
          const result = await apiRequest("/api/auth/register", {
            method: "POST",
            body: {
              email,
              password,
              name,
              phone,
              personalDataConsent: data.personalDataConsent === "on",
            },
          });
          saveServerUserProfile(result.user);
          await loadBackendAccountData();
          loadCart();
          await loadServerPersonalState();
          closeModal();
          renderCart();
          renderProducts();
          renderAccountButton();
          showToast("Вы зарегистрированы. Аккаунт сохранен на сервере.");
          return;
        } catch (error) {
          if (!isBackendUnavailable(error)) {
            setFieldError(event.target, error.code === "email_exists" ? "email" : "password", error.message);
            showToast(error.message);
            return;
          }
        }
        users[email] = {
          email,
          password,
          name: name || email,
          phone,
          role: "buyer",
          orders: [],
          personalDataConsent: true,
          consentAt: new Date().toISOString(),
          consentTextVersion: "personal-data-consent-2026-05-29",
        };
        saveUsers(users);
      }
      if (submitter.dataset.authMode !== "register") {
        try {
          const result = await apiRequest("/api/auth/login", { method: "POST", body: { email, password } });
          saveServerUserProfile(result.user);
          await loadBackendAccountData();
          loadCart();
          await loadServerPersonalState();
          closeModal();
          renderCart();
          renderProducts();
          renderAccountButton();
          showToast("Вы вошли. Серверная сессия активна.");
          return;
        } catch (error) {
          if (!isBackendUnavailable(error)) {
            setFieldError(event.target, "password", error.message);
            showToast(error.message);
            return;
          }
        }
      }
      const userKey = existingEmailKey || email;
      if (!users[userKey] || users[userKey].password !== password) {
        setFieldError(event.target, "password", "Проверьте email и пароль.");
        showToast("Проверьте email и пароль.");
        return;
      }
      state.currentUser = userKey;
      localStorage.setItem(STORAGE.user, userKey);
      loadCart();
      loadFavorites();
      await loadServerPersonalState();
      closeModal();
      renderCart();
      renderProducts();
      renderAccountButton();
      showToast("Вы вошли. Корзина и заказы сохраняются за аккаунтом.");
    }
    if (event.target.dataset.adminProductForm) {
      event.preventDefault();
      const product = products.find((item) => item.id === event.target.dataset.adminProductForm);
      if (!product) {
        showToast("Товар не найден.");
        return;
      }
      const data = Object.fromEntries(new FormData(event.target).entries());
      product.name = String(data.name || product.name).trim() || product.name;
      product.basePrice = Math.max(0, Number(data.basePrice || product.basePrice || 0));
      product.description = String(data.description || "").trim();
      product.detailDescription = String(data.detailDescription || "").trim();
      product.status = productStatusFromValue(data.status) || normalizeProductStatus(product);
      product.hidden = product.status !== "published";
      const normalized = normalizeProduct(product);
      Object.assign(product, normalized);
      saveProducts();
      renderCatalogHome();
      renderFilters();
      renderProducts();
      renderAdminProductsPage();
      renderAdminPricesPage();
      showToast("Товар сохранен. Варианты и цены пересчитаны.");
      return;
    }
    if (event.target.dataset.adminPriceBulkForm !== undefined) {
      event.preventDefault();
      previewBulkPriceChanges(event.target);
      return;
    }
    if (event.target.id === "adminGenerator") {
      event.preventDefault();
      renderAdminPreview([productFromForm(event.target)]);
    }
    if (event.target.id === "adminContentForm") {
      event.preventDefault();
      const statusNode = event.target.querySelector("[data-content-save-status]");
      if (statusNode) statusNode.textContent = "Сохраняю изменения...";
      const savedContent = saveSiteContent(contentFromAdminForm(event.target), { sync: false });
      renderSiteContent();
      const synced = await syncSiteContentToBackend(savedContent);
      if (statusNode) {
        statusNode.textContent = synced
          ? "Сохранено на сервере. Изменения будут видны на других устройствах."
          : "Сохранено локально. Серверное сохранение не выполнено.";
      }
      showToast(synced ? "Контент сайта сохранен на сервере." : "Контент сохранен локально, сервер недоступен.");
    }
    if (event.target.dataset.orderManagerForm) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const managerEmail = String(formData.get("managerEmail") || "");
      const manager = managerEmail ? getUsers()[managerEmail] : null;
      const patch = {
        managerEmail,
        managerName: manager ? manager.name || manager.email : "",
        managerNote: String(formData.get("managerNote") || "").trim(),
      };
      try {
        const result = await apiRequest("/api/admin/orders", { method: "PATCH", body: { id: event.target.dataset.orderManagerForm, ...patch } });
        if (result.order) mirrorServerOrder(result.order, result.order.userEmail || "");
        await loadBackendAccountData();
      } catch (error) {
        if (!isBackendUnavailable(error)) {
          showToast(error.message || "Не удалось сохранить данные заказа.");
          return;
        }
        updateOrderRecord(event.target.dataset.orderManagerForm, patch);
      }
      if (isAdminOrdersPage || isAdminOrderPage || isAdminCustomerPage) {
        renderManagementPages();
        showToast("Данные заказа сохранены.");
        return;
      }
      closeModal();
      openAccount();
      showToast("Данные заказа сохранены.");
      return;
    }
    if (event.target.dataset.orderManagerMessageForm) {
      event.preventDefault();
      await submitManagerOrderMessage(event.target);
      return;
    }
    if (event.target.dataset.orderCustomerMessageForm) {
      event.preventDefault();
      await submitCustomerOrderMessage(event.target);
      return;
    }
  });

  if (window.lucide) window.lucide.createIcons();
}

boot();
