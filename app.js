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
  aboutPageTitle: "О компании",
  aboutPageLead:
    "Sobag Opt — тестовая витрина для оптовых продаж текстиля с принтами и заказов на производство под ваш макет.",
  aboutPageText:
    "Здесь позже появится история компании, описание производства, сильные стороны команды и условия работы с оптовыми покупателями.",
  aboutPageProductionTitle: "Производство и опт",
  aboutPageProductionText:
    "Мы готовим партии для маркетплейсов, магазинов и корпоративных клиентов: печать, пошив, комплектация и подготовка к отгрузке.",
  contactsPageTitle: "Контакты",
  contactsPageLead: "Здесь будут контакты отдела опта, адрес производства и карта.",
  contactsAddress: "Москва, Новоданиловская набережная, 4",
  contactsSchedule: "Пн-Пт, 10:00-18:00",
  contactsMapButton: "показать на карте",
  footerBrand: "SOBAG OPT",
  footerText: "Тестовый прототип B2B-сайта для оптовых продаж текстиля с принтами.",
  footerSalesLabel: "Отдел опта",
  footerEmail: "opt@sobag-shop.ru",
  footerPhone: "+7 900 000-00-00",
  footerCompanyTitle: "Компания",
  footerCompanyLinks: "О компании|Контакты|Политика конфиденциальности|Пользовательское соглашение",
  footerClientsTitle: "Клиентам",
  footerClientsLinks: "Как оформить заказ|Доставка товара|Оплата товара|Возврат товара|Изделия с вашим принтом",
  footerPartnersTitle: "Партнерам",
  footerPartnersLinks: "Условия для бизнеса|Мы на маркетплейсах|Поддержка селлеров|Оптовые партии",
  footerContactsTitle: "Контакты",
  footerAddress: "Адрес производства будет уточнен",
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

const siteTextFieldGroups = siteTextFieldPages.map((group) => ({
  ...group,
  fields: group.keys.map((key) => siteTextFields.find((field) => field.key === key)).filter(Boolean),
}));
const productDrafts = [];
const FAVORITES_KEY = "sobag.favorites";
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
  theme: "sobag.theme.v1",
  guestCart: "sobag.cart.guest",
  orders: "sobag.orders.v1",
};

let products = loadProducts();
let actualSlideIndex = 0;
let actualSlideTimer = null;
let lastFocusedElement = null;
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
  cart: new Map(),
  favorites: new Set(cleanFavoriteIds(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"))),
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
const isFavoritesPage = document.body.classList.contains("favorites-page");

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

function saveSiteContent(content) {
  localStorage.setItem(STORAGE.content, JSON.stringify(normalizeSiteContent(content)));
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

function footerLinkUrl(label = "") {
  const prepared = String(label).trim().toLocaleLowerCase("ru-RU");
  if (prepared.includes("о компании")) return "about.html";
  if (prepared.includes("контакт")) return "contacts.html";
  if (prepared.includes("маркетплейс")) return "marketplaces.html";
  if (prepared.includes("свой") || prepared.includes("принт")) return "custom.html";
  if (prepared.includes("услов")) return "index.html#wholesale";
  if (prepared.includes("политик") || prepared.includes("персональ")) return "assets/legal/personal-data-consent.pdf";
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
        const externalAttrs = href.endsWith(".pdf") ? ' target="_blank" rel="noopener"' : "";
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
  };
  saveUsers(users);
  state.currentUser = profile.email;
  localStorage.setItem(STORAGE.user, profile.email);
}

function mirrorServerOrder(order, userEmail = state.currentUser) {
  if (!order?.id) return;
  const orders = getOrders().filter((item) => item.id !== order.id);
  saveOrders([order, ...orders]);
  const users = getUsers();
  if (userEmail && users[userEmail]) {
    users[userEmail].orders = [order, ...(users[userEmail].orders || []).filter((item) => item.id !== order.id)];
    saveUsers(users);
  }
}

async function loadBackendAccountData() {
  try {
    const session = await apiRequest("/api/auth/me");
    if (!session.user) return false;
    saveServerUserProfile(session.user);
    if (["admin", "manager"].includes(session.user.role)) {
      const ordersData = await apiRequest("/api/admin/orders");
      if (Array.isArray(ordersData.orders)) saveOrders(ordersData.orders);
    }
    if (session.user.role === "admin") {
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
  setText(".custom__content p:not(.eyebrow)", content.customText);
  document.querySelectorAll(".custom .steps span").forEach((step, index) => {
    const values = [content.customStepOne, content.customStepTwo, content.customStepThree, content.customStepFour];
    const number = step.querySelector("b")?.outerHTML || `<b>${index + 1}</b>`;
    step.innerHTML = `${number} ${escapeHtml(values[index])}`;
  });
  setButtonText("#briefForm .primary-button", content.customSubmitButton);
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
        const price =
          product.basePrice + (typeFactors[type] || 0) + (sizeFactors[size] || 0) + (materialFactors[material] || 0);
        return {
          sku: [product.baseSku, skuPart(type, 3), skuSizePart(size), skuPart(material, 3)].filter(Boolean).join("_"),
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

function normalizeProduct(product) {
  const categories = normalizeListField(product, "categories", splitList(product.category || ""));
  const normalizedCategories = categories.length ? categories : [product.category || "Подушки"];
  const normalized = {
    ...product,
    categories: normalizedCategories,
    category: normalizedCategories[0],
    types: product.types?.length ? product.types : TYPE_OPTIONS,
    sizes: product.sizes?.length ? product.sizes : SIZE_OPTIONS,
    materials: product.materials?.length ? product.materials : MATERIAL_OPTIONS,
    collections: normalizeListField(product, "collections", product.theme ? [product.theme] : []),
    holidays: normalizeListField(product, "holidays"),
    tags: normalizeTags(product),
    gallery: [...new Set([product.image, ...(product.gallery || [])])].filter(Boolean),
    detailDescription:
      product.detailDescription ||
      "Карточка показывает товар с несколькими фотографиями, быстрыми тегами и настройкой варианта под оптовую заявку.",
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

async function loadPublishedProducts() {
  try {
    const response = await fetch("data/products-live.json", { cache: "default" });
    if (!response.ok) return;
    const liveProducts = await response.json();
    if (!Array.isArray(liveProducts) || !liveProducts.length) return;
    const saved = loadStoredProducts();
    products = saved?.length ? mergeProducts(products, liveProducts) : liveProducts.map(normalizeProduct);
    addMissingCatalogCategories(products);
    renderSiteContent();
    renderCatalogHome();
    renderCatalogShell();
    renderFilters();
    renderProducts();
  } catch {
    // The static catalog file is optional in local prototype mode.
  }
}

function saveProducts() {
  const clean = products.map(({ variants, minPrice, maxPrice, ...product }) => product);
  localStorage.setItem(STORAGE.products, JSON.stringify(clean));
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
  return "Покупатель";
}

function orderStatusLabel(status) {
  if (status === "processing") return "В работе";
  if (status === "done") return "Выполнен";
  return "Новый";
}

function canManageOrders(user) {
  return user?.role === "admin" || user?.role === "manager";
}

function saveOrderRecord(order, userKey = state.currentUser) {
  const users = getUsers();
  const orders = getOrders();
  const record = {
    status: "new",
    source: "cart",
    userEmail: userKey || order.customer?.email || "",
    ...order,
  };
  saveOrders([record, ...orders]);
  if (userKey && users[userKey]) {
    users[userKey].orders = [record, ...(users[userKey].orders || [])];
    saveUsers(users);
  }
  return record;
}

function updateOrderStatus(orderId, status) {
  const orders = getOrders().map((order) => (order.id === orderId ? { ...order, status } : order));
  const users = getUsers();
  Object.values(users).forEach((user) => {
    user.orders = (user.orders || []).map((order) => (order.id === orderId ? { ...order, status } : order));
  });
  saveOrders(orders);
  saveUsers(users);
}

function setUserRole(email, role) {
  const users = getUsers();
  if (!users[email] || users[email].role === "admin") return false;
  users[email].role = role;
  saveUsers(users);
  return true;
}

function getCartKey() {
  return state.currentUser ? `sobag.cart.${state.currentUser}` : STORAGE.guestCart;
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

  const favorites = cleanFavoriteIds(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"));
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  state.favorites = new Set(favorites);

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

function discountedUnitPrice(price, discount) {
  return Math.round(price * (1 - discount / 100));
}

function getBasketDiscountHint(amount) {
  const nextTier = basketDiscountTiers.find((tier) => amount < tier.amount);
  if (!nextTier) return "Максимальная скидка по корзине применена";
  return `${formatMoney(Math.max(nextTier.amount - amount, 0))} до скидки ${nextTier.discount}%`;
}

function lineTotals(line, discount = getQuantityDiscount(line.qty)) {
  const subtotal = line.variant.price * line.qty;
  const total = discountedUnitPrice(line.variant.price, discount) * line.qty;
  return { subtotal, discount, total };
}

function getCartTotals() {
  const lines = [...state.cart.values()];
  const qty = lines.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.variant.price * line.qty, 0);
  const discount = getQuantityDiscount(qty);
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

function productsForFilterOptions(key) {
  return products.filter((product) => {
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
  if (products.some((product) => productHasExactSearchMatch(product, query))) return [];
  return products
    .map((product) => ({ product, score: searchScore(product, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.product.popular - a.product.popular)
    .slice(0, 5)
    .map(({ product }) => product);
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
  return products
    .map((product) => ({ product, score: searchScore(product) }))
    .filter(
      ({ product, score }) =>
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

function renderCatalogHome() {
  if (!categoryTiles || !actualTiles || !collectionTiles || !holidayTiles) return;
  const content = getSiteContent();
  const countByCategory = Object.fromEntries(content.catalogCategories.map((category) => [category.name, 0]));
  products.forEach((product) => {
    (product.categories || [product.category]).forEach((category) => {
      countByCategory[category] = (countByCategory[category] || 0) + 1;
    });
  });

  categoryTiles.innerHTML = content.catalogCategories
    .map(
      (category) => `
        <button class="category-tile" type="button" data-open-category="${escapeHtml(category.name)}">
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
        <button class="actual-tile actual-tile--${(index % 3) + 1}" type="button" data-open-${item.type}="${escapeHtml(item.label)}">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.label)}" ${imageAttrs(640, 360)} />
          <span>${escapeHtml(item.label)}</span>
          <b>${escapeHtml(item.label)}</b>
        </button>
      `
    )
    .join("");

  collectionTiles.innerHTML = content.catalogCollections
    .map(
      (collection) => `
        <button class="theme-tile" type="button" data-open-collection="${escapeHtml(collection.name)}">
          ${collection.image ? `<img class="theme-tile__image" src="${escapeHtml(collection.image)}" alt="" ${imageAttrs(520, 320)} />` : `<i data-lucide="${escapeHtml(collection.icon)}"></i>`}
          <span>${escapeHtml(collection.name)}</span>
        </button>
      `
    )
    .join("");

  holidayTiles.innerHTML = content.catalogHolidays
    .map(
      (holiday) => `
        <button class="theme-tile" type="button" data-open-holiday="${escapeHtml(holiday.name)}">
          ${holiday.image ? `<img class="theme-tile__image" src="${escapeHtml(holiday.image)}" alt="" ${imageAttrs(520, 320)} />` : `<i data-lucide="${escapeHtml(holiday.icon)}"></i>`}
          <span>${escapeHtml(holiday.name)}</span>
        </button>
      `
    )
    .join("");

  if (window.lucide) window.lucide.createIcons();
}

function renderCatalogShell() {
  if (!catalogHome || !catalogListing || !catalogTools || !catalogTitle) return;
  const isHome = !isFavoritesPage && !state.selectedCategory && !state.selectedCollection && !state.selectedHoliday && !state.search.trim();
  catalogHome.classList.toggle("is-hidden", !isHome);
  catalogListing.classList.toggle("is-hidden", isHome);
  catalogTools.classList.toggle("is-hidden", isHome || isFavoritesPage);
  document.body.classList.remove("filters-open");
  updateFilterToggle();

  if (isFavoritesPage) {
    catalogTitle.textContent = "Избранное";
    filterToggle?.classList.remove("is-hidden");
    updateFilterToggle();
    return;
  }

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
  syncCatalogRoute();
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
  syncCatalogRoute();
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
    window.location.href = "catalog.html";
    return;
  }
  state.selectedCategory = "";
  state.selectedCollection = "";
  state.selectedHoliday = "";
  state.search = "";
  if (searchInput) searchInput.value = "";
  Object.values(state.filters).forEach((bucket) => bucket.clear());
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
  const list = getFilteredProducts();
  renderSearchSuggestions();
  productCount.textContent = `${list.length} ${productWord(list.length)}`;
  if (!list.length) {
    productGrid.innerHTML = `
      <div class="empty-products">
        <i data-lucide="${isFavoritesPage ? "heart" : "search-x"}"></i>
        <strong>${isFavoritesPage ? "Избранное пока пустое" : "Товары не найдены"}</strong>
        <span>${isFavoritesPage ? "Нажмите сердечко в каталоге, чтобы сохранить товары здесь." : "Попробуйте изменить фильтры или запрос поиска."}</span>
        ${isFavoritesPage ? `<button class="ghost-button" type="button" data-nav="catalog.html">в каталог</button>` : ""}
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  productGrid.innerHTML = list
    .map((product) => {
      const favorite = state.favorites.has(product.id) ? " is-active" : "";
      return `
        <article class="product-card">
          <div class="product-card__image">
            <button class="product-card__image-button" type="button" data-open-product="${product.id}" aria-label="Открыть ${product.name}">
              <img src="${product.image}" alt="${product.name}" ${imageAttrs(640, 640)} />
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
              <button class="add-button product-card__price-button" type="button" data-open-product="${product.id}" aria-label="Открыть ${product.name}">
                <span>от ${formatMoney(product.minPrice)}</span>
              </button>
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
  if (cartCount) cartCount.textContent = totals.qty;
  if (cartHeaderTotal) cartHeaderTotal.textContent = formatMoney(totals.total);
  const headerCartButton = cartCount?.closest(".cart-button");
  headerCartButton?.classList.toggle("is-empty", totals.qty === 0);
  if (favoriteCount) favoriteCount.textContent = state.favorites.size;
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

function productModalHtml(product) {
  const variant = findVariant(product);
  const previewQty = getCartTotals().qty + state.activeVariant.qty;
  const discount = getQuantityDiscount(previewQty);
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
              <img id="detailMainImage" src="${gallery[0]}" alt="${product.name}" ${imageAttrs(900, 900, "eager", "high")} />
              <div class="product-gallery" aria-label="Фотографии товара">
                ${gallery
                  .map(
                    (image, index) => `
                      <button class="product-gallery__thumb${index === 0 ? " is-active" : ""}" type="button" data-detail-image="${image}" aria-label="Фото ${index + 1}">
                        <img src="${image}" alt="" ${imageAttrs(160, 160)} />
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

function openProduct(productId) {
  const product = products.find((item) => item.id === productId);
  state.activeProductId = productId;
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
  const discount = getQuantityDiscount(getCartTotals().qty + qty);
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

function orderCardHtml(order, managerMode = false) {
  const items = order.items || [];
  const customer = order.customer || {};
  return `
    <article class="order-card">
      <strong>${order.id}</strong>
      <span>${order.date}</span>
      <span>${items.length} позиций · ${formatMoney(order.total || 0)}</span>
      <span>${customer.name || customer.company || order.userEmail || "Покупатель"} · ${customer.phone || customer.email || ""}</span>
      <span>Статус: ${orderStatusLabel(order.status)}</span>
      ${
        managerMode
          ? `
            <div class="order-actions">
              <button class="ghost-button" type="button" data-order-status="${order.id}" data-status-value="processing">В работу</button>
              <button class="ghost-button" type="button" data-order-status="${order.id}" data-status-value="done">Выполнен</button>
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
      <h3>Заказы покупателей</h3>
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
                <span>${roleLabel(user.role)}</span>
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

const productColumnAliases = {
  baseSku: ["Начальный артикул", "Артикул", "Базовый артикул"],
  category: ["Категория", "Категории"],
  image: ["Главное фото", "URL фото", "Фото"],
  theme: ["Тематика", "Основная тематика", "Основная подборка"],
  collections: ["Тематики", "Подборки"],
  holidays: ["Праздник", "Праздники"],
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

function adminTextGroupHtml(group, content, extraHtml = "") {
  return `
    <div class="admin-content-section admin-content-section--page">
      <h3>${group.title}</h3>
      <p class="admin-section-note">${group.note}</p>
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
          <p>Тестовое управление контентом. Изображения и тексты сохраняются в этом браузере; для постоянного хранения нужен backend.</p>
        </div>
        <form class="admin-content-form" id="adminContentForm">
          ${adminTextGroupHtml(
            siteTextFieldGroups[0],
            content,
            `<label>
              Название сайта в шапке
              <input name="brandName" type="text" value="${escapeHtml(content.brandName)}" />
            </label>`
          )}
          <div class="admin-content-section admin-content-section--page">
            <h3>Общие настройки сайта: логотип</h3>
            <p class="admin-section-note">Квадратный логотип в шапке сайта. Рекомендуем сразу готовить файл в едином размере.</p>
            <div class="admin-image-grid admin-image-grid--logo">
              ${adminImageUploadHtml("brandLogo", 0, content.brandLogo, "Логотип", "Рекомендуем: PNG/WebP 512x512 px, прозрачный фон, до 1.5 МБ.")}
            </div>
          </div>
          ${adminTextGroupHtml(siteTextFieldGroups[1], content)}
          <div class="admin-content-section admin-content-section--page">
            <h3>Страница: главная — фото первого экрана</h3>
            <p class="admin-section-note">Изображения используются в верхнем слайдшоу главной страницы.</p>
            <div class="admin-image-grid">
              ${content.heroImages
                .map((image, index) => adminImageUploadHtml("heroImages", index, image, `Главное фото ${index + 1}`, "Рекомендуем: 1920x1200 px, JPG/WebP до 1.5 МБ.") )
                .join("")}
            </div>
          </div>
          <div class="admin-content-section admin-content-section--page">
            <h3>Страница: главная — блок Актуально</h3>
            <div class="admin-content-grid">
              ${adminListTextarea("actualSlidesText", "Список актуального", serializeActualList(content.actualSlides), "Одна строка = один слайд. Формат: название | collection или holiday. После добавления новой строки сохраните контент, откройте админку снова и загрузите фото.")}
            </div>
            <div class="admin-slides-grid">
              ${content.actualSlides.map((slide, index) => adminActualSlideHtml(slide, index)).join("")}
            </div>
          </div>
          ${adminTextGroupHtml(siteTextFieldGroups[2], content)}
          <div class="admin-content-section admin-content-section--page">
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
  if (getUsers()[state.currentUser]?.role !== "admin") {
    showToast("Управление сайтом доступно только администратору.");
    return;
  }
  document.querySelector("#accountModal")?.remove();
  document.body.insertAdjacentHTML("beforeend", adminModalHtml());
  activateModal(document.querySelector("#adminModal"));
  renderAdminPreview([]);
  if (window.lucide) window.lucide.createIcons();
}

function splitList(value) {
  const prepared = String(value || "");
  const delimiter = prepared.includes(";") ? ";" : ",";
  return prepared
    .split(delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
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
  const existingSkus = new Set(products.map((product) => baseSkuKey(product.baseSku)));
  const seenSkus = new Set();
  const uniqueProducts = state.adminPreview.filter((product) => {
    const sku = baseSkuKey(product.baseSku);
    if (!sku || existingSkus.has(sku) || seenSkus.has(sku)) return false;
    seenSkus.add(sku);
    return true;
  });
  const skipped = state.adminPreview.length - uniqueProducts.length;
  if (!uniqueProducts.length) {
    showToast("Новые карточки не добавлены: все артикулы уже есть в каталоге.");
    return;
  }
  products = [...uniqueProducts, ...products];
  addMissingCatalogCategories(uniqueProducts);
  saveProducts();
  renderCatalogHome();
  renderCatalogShell();
  renderFilters();
  renderProducts();
  renderAdminPreview([]);
  showToast(skipped ? `Карточки добавлены: ${uniqueProducts.length}. Дубли пропущены: ${skipped}.` : "Карточки добавлены в каталог.");
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
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
  const existingSkus = new Set(products.map((product) => baseSkuKey(product.baseSku)));
  const seenSkus = new Set();
  let skippedDuplicates = 0;
  const imported = rows.reduce((items, row) => {
    if (!rowValue(row, "name") || !rowValue(row, "baseSku")) return items;
    const baseSku = normalizeBaseSku(rowValue(row, "baseSku"));
    const skuKey = baseSkuKey(baseSku);
    if (existingSkus.has(skuKey) || seenSkus.has(skuKey)) {
      skippedDuplicates += 1;
      return items;
    }
    seenSkus.add(skuKey);
    items.push(
      normalizeProduct({
        id: `${rowValue(row, "baseSku")}-${Date.now()}-${Math.random().toString(16).slice(2)}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        baseSku,
        name: String(rowValue(row, "name")).trim(),
        category: String(rowValue(row, "category") || "Подушки").trim(),
        categories: splitList(rowValue(row, "category") || "Подушки"),
        theme: String(rowValue(row, "theme") || "").trim(),
        collections: splitList(rowValue(row, "collections") || rowValue(row, "theme") || ""),
        holidays: splitList(rowValue(row, "holidays") || ""),
        tags: splitList(rowValue(row, "tags") || rowValue(row, "theme") || ""),
        types: splitList(rowValue(row, "types") || TYPE_OPTIONS.join(";")),
        sizes: splitList(rowValue(row, "sizes") || SIZE_OPTIONS.join(";")),
        materials: splitList(rowValue(row, "materials") || MATERIAL_OPTIONS.join(";")),
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
    return items;
  }, []);
  addMissingCatalogCategories(imported);
  renderAdminPreview(imported);
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

function closeModal() {
  document.querySelectorAll(".modal").forEach((modal) => modal.remove());
  document.body.classList.remove("modal-open");
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
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
  const customer = {
    name: user?.name || data.company || "",
    company: data.company || "",
    phone: data.phone || user?.phone || "",
    email: data.email || user?.email || "",
    comment: data.comment || "",
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
  initActualSlider();
  loadPublishedProducts();
  initFormEnhancements();
  loadBackendAccountData().then((changed) => {
    if (!changed) return;
    loadCart();
    renderCart();
    renderAccountButton();
  });

  document.addEventListener("click", async (event) => {
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
    if (button.dataset.detailQtyStep) {
      const input = document.querySelector("#detailQty");
      if (input) {
        input.value = Math.max(0, Number(input.value || 0) + Number(button.dataset.detailQtyStep));
        refreshProductModal();
      }
      return;
    }
    if (button.dataset.addVariant) addVariantToCart(button.dataset.addVariant);
    if (button.dataset.favorite) {
      if (state.favorites.has(button.dataset.favorite)) state.favorites.delete(button.dataset.favorite);
      else state.favorites.add(button.dataset.favorite);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
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
      try {
        await apiRequest("/api/auth/logout", { method: "POST" });
      } catch (error) {
        if (!isBackendUnavailable(error)) console.warn(error);
      }
      localStorage.removeItem(STORAGE.user);
      state.currentUser = "";
      loadCart();
      closeModal();
      renderCart();
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
    if (button.dataset.saveGenerated !== undefined) saveGeneratedProducts();
    if (button.dataset.downloadTemplate !== undefined) downloadTemplate();
    if (button.dataset.downloadXlsxTemplate !== undefined) downloadXlsxTemplate();
    if (button.dataset.exportProducts !== undefined) downloadProductsCsv(products, "sobag-products-all.csv");
    if (button.dataset.exportFilteredProducts !== undefined) downloadProductsCsv(getFilteredProducts(), "sobag-products-filtered.csv");
    if (button.dataset.exportVariantPrices !== undefined) downloadVariantPricesCsv(products, "sobag-variant-prices-all.csv");
    if (button.dataset.exportFilteredVariantPrices !== undefined) downloadVariantPricesCsv(getFilteredProducts(), "sobag-variant-prices-filtered.csv");
    if (button.dataset.resetContent !== undefined) {
      localStorage.removeItem(STORAGE.content);
      renderSiteContent();
      closeModal();
      openAdmin();
      showToast("Контент сброшен к тестовым значениям.");
      return;
    }
  });

  document.addEventListener("keydown", (event) => {
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
          closeModal();
          renderCart();
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
          closeModal();
          renderCart();
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
