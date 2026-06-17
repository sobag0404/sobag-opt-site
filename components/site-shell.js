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
          <button class="cart-button is-empty" type="button" data-open-cart>
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
  window.SobagSiteShell = { render: renderSiteShell };
})();
