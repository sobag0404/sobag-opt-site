(() => {
  const shells = {
    topline: `    <header class="topline">
      <div class="container topline__inner">
        <nav class="topline__nav" aria-label="Верхняя навигация">
          <a class="topline__link" href="marketplaces.html" data-top-marketplaces>Мы на маркетплейсах</a>
          <a class="topline__link" href="business.html" data-top-business>Условия для бизнеса</a>
          <a class="topline__link" href="about.html" data-top-about>О компании</a>
          <a class="topline__link" href="contacts.html" data-top-contacts>Контакты</a>
        </nav>
        <button class="theme-toggle" type="button" data-theme-toggle aria-pressed="false">
          <span>Ночная тема</span>
          <b class="theme-toggle__track" aria-hidden="true"></b>
        </button>
      </div>
    </header>`,
    header: {
      commerce: `    <nav class="header">
      <div class="container header__inner">
        <a class="brand" href="/" aria-label="Sobag Opt">
          <span class="brand__mark">S</span>
          <span class="brand__name">Sobag <b>Opt</b></span>
        </a>
        <button class="catalog-button" type="button" data-nav="catalog.html">
          <i data-lucide="layout-grid"></i>
          Каталог
        </button>
        <label class="search" aria-label="Поиск по каталогу">
          <i data-lucide="search"></i>
          <input id="searchInput" type="search" placeholder="Поиск: пледы, подушки, тираж, принт" />
        </label>
        <div class="header__actions">
          <button class="icon-button" id="accountButton" type="button" title="Войти или зарегистрироваться" aria-label="Войти или зарегистрироваться">
            <i data-lucide="user"></i>
          </button>
          <button class="icon-button" type="button" title="Избранное" data-nav="favorites.html">
            <i data-lucide="heart"></i>
            <span id="favoriteCount">0</span>
          </button>
          <button class="cart-button is-empty" type="button" data-open-cart title="Корзина" aria-label="Открыть корзину">
            <i data-lucide="shopping-cart"></i>
            <span>Корзина</span>
            <strong id="cartCount">0</strong>
            <em id="cartHeaderTotal">0 ₽</em>
            <small id="cartHeaderDiscount">30 000 ₽ до скидки 5%</small>
          </button>
        </div>
      </div>
    </nav>`,
      cart: `    <nav class="header">
      <div class="container header__inner">
        <a class="brand" href="/" aria-label="Sobag Opt">
          <span class="brand__mark">S</span>
          <span class="brand__name">Sobag <b>Opt</b></span>
        </a>
        <a class="catalog-button" href="catalog.html">
          <i data-lucide="layout-grid"></i>
          Каталог
        </a>
        <div class="cart-page__header-note">
          <i data-lucide="shopping-cart"></i>
          <span id="cartPageLabel">Корзина</span>
          <strong id="cartPageCount">0</strong>
        </div>
      </div>
    </nav>`,
    },
    footer: `    <footer class="footer" id="contacts">
      <div class="container footer__brand-row">
        <div><strong data-footer-brand>SOBAG OPT</strong><p data-footer-text>B2B-каталог для оптовых заказов текстиля с принтами, производства под макет и поставок партиями.</p></div>
        <div><span data-footer-sales-label>Отдел опта</span><a href="mailto:ip.burago@yandex.ru" data-footer-email>ip.burago@yandex.ru</a><a href="tel:+79018794162" data-footer-phone>+7 901 879-41-62</a></div>
      </div>
      <div class="container footer__columns">
        <section><h3 data-footer-company-title>Компания</h3><div data-footer-company-links><a href="about.html">О компании</a><a href="contacts.html">Контакты</a><a href="privacy.html">Политика конфиденциальности</a><a href="assets/legal/personal-data-consent.pdf" target="_blank" rel="noopener">Согласие на обработку персональных данных</a><a href="terms.html">Пользовательское соглашение</a></div></section>
        <section><h3 data-footer-clients-title>Клиентам</h3><div data-footer-clients-links><a href="how-to-order.html">Как оформить заказ</a><a href="delivery.html">Доставка товара</a><a href="payment.html">Оплата товара</a><a href="returns.html">Возврат товара</a><a href="custom.html">Изделия с вашим принтом</a></div></section>
        <section><h3 data-footer-partners-title>Партнерам</h3><div data-footer-partners-links><a href="business.html">Условия для бизнеса</a><a href="marketplaces.html">Мы на маркетплейсах</a><a href="seller-support.html">Поддержка селлеров</a><a href="wholesale.html">Оптовые партии</a></div></section>
        <section><h3 data-footer-contacts-title>Контакты</h3><div><a href="mailto:ip.burago@yandex.ru" data-footer-email>ip.burago@yandex.ru</a><a href="tel:+79018794162" data-footer-phone>+7 901 879-41-62</a><span data-footer-address>Филиал / производство: 305014, Курская область, г. Курск, ул. Литовская, д. 12</span><a href="contacts.html">Все контакты</a></div></section>
      </div>
    </footer>`,
  };

  function mount(selector, html, fallback = document.body) {
    const target = document.querySelector(selector);
    if (target) {
      target.outerHTML = html;
      return;
    }
    fallback.insertAdjacentHTML('afterbegin', html);
  }

  function renderSiteShell() {
    mount('[data-site-topline]', shells.topline);
    document.querySelectorAll('[data-site-header]').forEach((target) => {
      const mode = target.dataset.siteHeader || 'commerce';
      target.outerHTML = shells.header[mode] || shells.header.commerce;
    });
    document.querySelectorAll('[data-site-footer]').forEach((target) => {
      target.outerHTML = shells.footer;
    });
  }

  renderSiteShell();

  const SW_VERSION = "20260624-browser-cache";
  const PREFETCH_PAGES = [
    "/",
    "/catalog.html",
    "/delivery.html",
    "/payment.html",
    "/contacts.html",
    "/marketplaces.html",
    "/business.html",
    "/how-to-order.html",
    "/wholesale.html",
    "/favorites.html",
    "/cart.html",
  ];
  const PREFETCH_ASSETS = [
    "/styles.css?v=20260624-customer-flow",
    "/app.js?v=20260624-product-image-sizes",
    "/cart.js?v=20260624-customer-flow",
    "/components/site-shell.js?v=20260624-browser-cache",
    "/components/app-utils.js?v=20260615-modular-utils",
    "/components/app-data.js?v=20260624-public-cache-v3",
    "/components/app-content-utils.js?v=20260624-public-cache-v3",
    "/components/app-product-utils.js?v=20260624-product-image-sizes",
  ];
  const PREFETCH_PUBLIC_API = [
    "/api/catalog-query?pageSize=1&sort=popular",
    "/api/catalog-query?pageSize=48&sort=popular",
    "/api/price-list?format=json",
  ];

  function shouldSkipPublicPrefetch() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return Boolean(connection?.saveData || /2g/i.test(connection?.effectiveType || ""));
  }

  function idle(callback) {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(callback, { timeout: 2500 });
      return;
    }
    window.setTimeout(callback, 900);
  }

  function visiblePublicImages() {
    return [...document.images]
      .map((image) => image.currentSrc || image.src || "")
      .filter((src) => {
        if (!src) return false;
        try {
          const url = new URL(src, window.location.href);
          return url.origin === window.location.origin && /\.(webp|png|jpe?g|avif|svg)$/i.test(url.pathname);
        } catch {
          return false;
        }
      })
      .slice(0, 6);
  }

  function publicPrefetchUrls() {
    return [...PREFETCH_PAGES, ...PREFETCH_ASSETS, ...PREFETCH_PUBLIC_API, ...visiblePublicImages()];
  }

  function registerPublicCacheWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:" || location.pathname.startsWith("/admin-")) return;
    if (window.__sobagDisableServiceWorker === true && !/sw-public-cache/.test(location.search)) return;
    window.addEventListener("load", () => {
      idle(async () => {
        try {
          const registration = await navigator.serviceWorker.register(`/sw.js?v=${SW_VERSION}`, { scope: "/" });
          if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
          if (shouldSkipPublicPrefetch()) return;
          const worker = registration.active || registration.waiting || registration.installing;
          const ready = await navigator.serviceWorker.ready;
          (ready.active || worker)?.postMessage({ type: "SOBAG_PREFETCH_PUBLIC", urls: publicPrefetchUrls() });
        } catch {
          // Service workers are an optional public-cache speed layer.
        }
      });
    });
  }

  registerPublicCacheWorker();
  window.SobagSiteShell = { render: renderSiteShell };
})();
