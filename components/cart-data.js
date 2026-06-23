(() => {
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
  
  const promoCodes = {};
  const promoUnavailableText = "Промокод согласует менеджер при подтверждении заказа.";
  
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
    footerText: "B2B-каталог для оптовых заказов текстиля с принтами, производства под макет и поставок партиями.",
    footerSalesLabel: "Отдел опта",
    footerEmail: "ip.burago@yandex.ru",
    footerPhone: "+7 901 879-41-62",
    footerCompanyTitle: "Компания",
    footerCompanyLinks: "О компании|Контакты|Политика конфиденциальности|Согласие на обработку персональных данных|Пользовательское соглашение",
    footerClientsTitle: "Клиентам",
    footerClientsLinks: "Как оформить заказ|Доставка товара|Оплата товара|Возврат товара|Изделия с вашим принтом",
    footerPartnersTitle: "Партнерам",
    footerPartnersLinks: "Условия для бизнеса|Мы на маркетплейсах|Поддержка селлеров|Оптовые партии",
    footerContactsTitle: "Контакты",
    footerAddress: "Филиал / производство: 305014, Курская область, г. Курск, ул. Литовская, д. 12",
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

  window.SobagCartData = Object.freeze({
    MIN_CART_TOTAL,
    CURRENT_USER_KEY,
    USERS_KEY,
    ORDERS_KEY,
    THEME_KEY,
    SAVED_CARTS_GUEST_KEY,
    SAVED_CARTS_PREFIX,
    PROTOTYPE_PRODUCT_IDS: Object.freeze([...PROTOTYPE_PRODUCT_IDS]),
    quantityTiers: Object.freeze(quantityTiers.map((tier) => Object.freeze({ ...tier }))),
    basketDiscountTiers: Object.freeze(basketDiscountTiers.map((tier) => Object.freeze({ ...tier }))),
    promoCodes: Object.freeze({ ...promoCodes }),
    promoUnavailableText,
    CART_CONTENT_KEY,
    defaultCartContent: Object.freeze({ ...defaultCartContent }),
  });
})();
