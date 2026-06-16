function orderManagerOptions(selectedEmail = "") {
  const users = getUsers();
  const managers = Object.values(users).filter((user) => user.role === "admin" || user.role === "manager");
  const options = ['<option value="">Не назначен</option>'];
  managers.forEach((user) => {
    const email = user.email || "";
    options.push(`<option value="${escapeHtml(email)}"${email === selectedEmail ? " selected" : ""}>${escapeHtml(user.name || email)} · ${escapeHtml(roleLabel(user.role, user))}</option>`);
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
function orderTypeLabel(order) {
  return order?.requestType === "custom_print" || order?.source === "custom_brief" ? "Заявка: свой принт" : "";
}
function customBriefHtml(order) {
  const brief = order?.customBrief;
  if (!brief) return "";
  return `
    <div class="order-card__brief">
      <b>Изделие: ${escapeHtml(brief.product || "")}</b>
      <span>Тираж: ${Number(brief.quantity || 0)} шт.</span>
      ${brief.contact ? `<span>Контакт: ${escapeHtml(brief.contact)}</span>` : ""}
      ${brief.layoutReference ? `<span>Макет/референс: ${escapeHtml(brief.layoutReference)}</span>` : ""}
      ${brief.comment ? `<p>${escapeHtml(brief.comment)}</p>` : ""}
    </div>
  `;
}
function orderCardHtml(order, managerMode = false) {
  const items = order.items || [];
  const customer = order.customer || {};
  const managerEmail = order.managerEmail || "";
  const managerName = order.managerName || managerEmail || "";
  const customerEmail = customer.email || order.userEmail || "";
  const typeLabel = orderTypeLabel(order);
  const canMessageAsBuyer = !managerMode && (items.length || order.requestType === "custom_print");
  return `
    <article class="order-card">
      <div class="order-card__head">
        <strong>${escapeHtml(order.id || "")}</strong>
        <span class="order-status order-status--${escapeHtml(order.status || "new")}">${escapeHtml(orderStatusLabel(order.status))}</span>
      </div>
      ${typeLabel ? `<span class="order-card__type">${escapeHtml(typeLabel)}</span>` : ""}
      <span>${escapeHtml(order.date || "")}</span>
      <span>${items.length} ${productWord(items.length)} · ${formatMoney(order.total || 0)}</span>
      <span>${escapeHtml(customer.name || customer.company || order.userEmail || "Покупатель")} · ${escapeHtml(customer.phone || customer.email || "")}</span>
      ${managerName ? `<span>Менеджер: ${escapeHtml(managerName)}</span>` : ""}
      ${order.managerNote ? `<p class="order-card__note">${escapeHtml(order.managerNote)}</p>` : ""}
      ${customBriefHtml(order)}
      ${orderItemsPreview(items)}
      ${managerMode ? orderHistoryHtml(order) : ""}
      ${orderThreadHtml(order, managerMode)}
      ${
        canMessageAsBuyer
          ? `<div class="order-actions">${items.length ? `<button class="ghost-button" type="button" data-repeat-order="${escapeHtml(order.id || "")}">Повторить заказ</button>` : ""}</div>${orderCustomerMessageForm(order)}`
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
          <button class="ghost-button" type="button" data-refresh-admin-orders>Обновить заказы</button>
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
    order.source,
    order.requestType,
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
    order.customBrief?.product,
    order.customBrief?.quantity,
    order.customBrief?.contact,
    order.customBrief?.layoutReference,
    order.customBrief?.comment,
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
        <button class="ghost-button" type="button" data-refresh-admin-orders>Обновить заказы</button>
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
        ${productPictureHtml(product, product.image, product.name, imageAttrs(160, 160))}
      </div>
      <form class="admin-product-card__body" data-admin-product-form="${escapeHtml(product.id)}">
        <div class="admin-product-card__head">
          <div>
            <strong>${escapeHtml(product.baseSku)}</strong>
            ${statusLabel}
            <button class="copy-sku-button" type="button" data-copy-sku="${escapeHtml(product.baseSku)}" title="Скопировать артикул" aria-label="Скопировать артикул ${escapeHtml(product.baseSku)}">
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
function requiresServerRole(predicate) {
  const localDevelopment = typeof isLocalDevelopmentHost === "function" && isLocalDevelopmentHost();
  return !localDevelopment && (!state.backendSession.checked || !state.backendSession.available || !predicate(state.backendSession.user));
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
          <span>Роль: <b>${escapeHtml(roleLabel(customer.role, customer))}</b></span>
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
function managementServerAccessHtml() {
  return `
    <article class="info-page__panel">
      <h2>Нужен серверный вход</h2>
      <p>Заказы хранятся на сервере. Войдите в серверный аккаунт администратора или менеджера, чтобы видеть новые заявки.</p>
      <button class="primary-button" type="button" data-open-account><i data-lucide="user"></i> Войти</button>
    </article>
  `;
}
function renderManagementPages() {
  const user = currentManagerUser();
  const ordersNode = document.querySelector("#adminOrdersPage");
  const orderNode = document.querySelector("#adminOrderPage");
  const customerNode = document.querySelector("#adminCustomerPage");
  if (!ordersNode && !orderNode && !customerNode) return;
  if (requiresServerRole(canManageOrders)) {
    if (ordersNode) ordersNode.innerHTML = managementServerAccessHtml();
    if (orderNode) orderNode.innerHTML = managementServerAccessHtml();
    if (customerNode) customerNode.innerHTML = managementServerAccessHtml();
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  if (state.backendSession.checked && state.backendSession.available && !canManageOrders(state.backendSession.user)) {
    if (ordersNode) ordersNode.innerHTML = managementServerAccessHtml();
    if (orderNode) orderNode.innerHTML = managementServerAccessHtml();
    if (customerNode) customerNode.innerHTML = managementServerAccessHtml();
    if (window.lucide) window.lucide.createIcons();
    return;
  }
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
  if (requiresServerRole(canManageProducts)) {
    node.innerHTML = managementServerAccessHtml();
    if (window.lucide) window.lucide.createIcons();
    return;
  }
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
  if (requiresServerRole(canManageProducts)) {
    node.innerHTML = managementServerAccessHtml();
    if (window.lucide) window.lucide.createIcons();
    return;
  }
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
  if (requiresServerRole(canManageProducts)) {
    node.innerHTML = managementServerAccessHtml();
    if (window.lucide) window.lucide.createIcons();
    return;
  }
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
  const managers = Object.entries(users).filter(([, item]) => item.role === "manager" || item.employee);
  return `
    <div class="account-section">
      <h3>Сотрудники</h3>
      <form class="employee-form account-profile-grid" data-employee-form>
        <label>
          Email менеджера
          <input name="email" type="email" placeholder="manager@example.com" autocomplete="email" required />
        </label>
        <label>
          Имя
          <input name="name" type="text" placeholder="Имя сотрудника" autocomplete="name" />
        </label>
        <label>
          Телефон
          <input name="phone" type="tel" placeholder="+7 999 999-99-99" autocomplete="tel" />
        </label>
        <button class="ghost-button" type="submit">Добавить менеджера</button>
      </form>
      <div class="orders-list">
        ${
          managers.length
            ? managers
                .map(
                  ([email, item]) => `
                    <article>
                      <strong>${escapeHtml(item.name || email)}</strong>
                      <span>${escapeHtml(email)}</span>
                      ${item.phone ? `<span>${escapeHtml(item.phone)}</span>` : ""}
                      <span>${escapeHtml(roleLabel(item.role, item))}</span>
                      <div class="order-actions">
                        <button class="ghost-button" type="button" data-remove-manager="${escapeHtml(email)}">Удалить менеджера</button>
                      </div>
                    </article>
                  `
                )
                .join("")
            : "<p>Менеджеров пока нет.</p>"
        }
      </div>
    </div>
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
                <span>${roleLabel(item.role, item)}</span>
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
function savedAddressesHtml(user) {
  if (!(user?.addresses || []).length) return "";
  return `
    <div class="account-section account-section--compact">
      <h3>Сохраненные адреса</h3>
      <div class="admin-detail-list">
        ${user.addresses.map((address) => `<span>${escapeHtml(address)}</span>`).join("")}
      </div>
    </div>
  `;
}
function buyerOrdersHtml(user) {
  const orders = user?.orders || [];
  return `
    <div class="account-section">
      <div class="account-section__head">
        <div>
          <h3>Заказы</h3>
          <span>История, статусы, комментарии и сообщения по заказам</span>
        </div>
      </div>
      <div class="orders-list">
        ${
          orders.length
            ? orders.map((order) => orderCardHtml(order)).join("")
            : "<p>Заказов пока нет. После отправки заявки они появятся здесь.</p>"
        }
      </div>
    </div>
  `;
}
function accountTabButton(id, label, activeTab, count = 0) {
  const active = id === activeTab;
  return `
    <button class="account-tab${active ? " is-active" : ""}" type="button" role="tab" aria-selected="${active ? "true" : "false"}" data-account-tab="${id}">
      <span class="account-tab__label">${escapeHtml(label)}</span>
      ${count ? `<span class="account-tab__count" aria-label="${count}">${count}</span>` : ""}
    </button>
  `;
}
function accountTabPanel(id, activeTab, html) {
  return `<div class="account-tab-panel${id === activeTab ? " is-active" : ""}" role="tabpanel" data-account-tab-panel="${id}">${html}</div>`;
}
function buyerAccountTabsHtml(user) {
  const orders = user?.orders || [];
  const allowedTabs = new Set(["profile", "orders", "quotes"]);
  const activeTab = allowedTabs.has(state.accountTab) ? state.accountTab : orders.length ? "orders" : "profile";
  return `
    <div class="account-tabs" role="tablist" aria-label="Разделы личного кабинета">
      ${accountTabButton("profile", "Профиль", activeTab)}
      ${accountTabButton("orders", "Заказы", activeTab, orders.length)}
      ${accountTabButton("quotes", "КП", activeTab)}
    </div>
    <div class="account-tab-panels">
      ${accountTabPanel("profile", activeTab, `${savedAddressesHtml(user)}${buyerProfileHtml(user)}`)}
      ${accountTabPanel("orders", activeTab, buyerOrdersHtml(user))}
      ${accountTabPanel("quotes", activeTab, savedCartsHtml())}
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
function authModeButton(mode, label) {
  const active = state.authMode === mode;
  return `<button class="auth-mode-button${active ? " is-active" : ""}" type="button" aria-pressed="${active ? "true" : "false"}" data-auth-mode-switch="${mode}">${label}</button>`;
}
function authFormHtml() {
  const isRegister = state.authMode === "register";
  return `
    <div class="auth-mode-switch" aria-label="Режим аккаунта">
      ${authModeButton("login", "Вход")}
      ${authModeButton("register", "Регистрация")}
    </div>
    <form class="auth-form" id="authForm" data-auth-mode="${isRegister ? "register" : "login"}" novalidate>
      ${
        isRegister
          ? `
            <input name="name" type="text" placeholder="Имя или компания" autocomplete="name" required />
            <input name="email" type="email" placeholder="Email" autocomplete="email" required />
            <input name="phone" type="tel" placeholder="Телефон" autocomplete="tel" required />
            <input name="password" type="password" placeholder="Пароль" autocomplete="new-password" required />
            <small class="auth-password-hint">Пароль: не менее 6 символов.</small>
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
              <button class="primary-button" type="submit">Зарегистрироваться</button>
            </div>
          `
          : `
            <input name="login" type="text" placeholder="Почта или телефон" autocomplete="username" required />
            <input name="password" type="password" placeholder="Пароль" autocomplete="current-password" required />
            <div class="auth-actions">
              <button class="primary-button" type="submit">Войти</button>
            </div>
          `
      }
    </form>
  `;
}
function accountModalHtml() {
  const users = getUsers();
  const user = users[state.currentUser];
  return `
    <div class="modal is-visible" id="accountModal" role="dialog" aria-modal="true" aria-labelledby="accountModalTitle">
      <div class="modal__backdrop" data-close-modal></div>
      <section class="modal__panel account-panel">
        <button class="modal__close" type="button" data-close-modal><i data-lucide="x"></i></button>
        <div>
          <p class="eyebrow">Account</p>
          <h2 id="accountModalTitle">${user ? "Личный кабинет" : state.authMode === "register" ? "Регистрация" : "Вход"}</h2>
        </div>
        ${
          user
            ? `
              <div class="account-summary">
                <strong>${user.name || user.email}</strong>
                <span>${user.email}</span>
                ${user.phone ? `<span>${user.phone}</span>` : ""}
                ${user.address ? `<span>${user.address}</span>` : ""}
                <span>${roleLabel(user.role, user)}</span>
              </div>
              <div class="account-actions">
                ${canManageContent(user) ? '<button class="primary-button" type="button" data-open-admin><i data-lucide="settings"></i> Админка</button>' : ""}
                ${canManageContent(user) ? '<a class="ghost-button" href="admin-products.html" target="_blank" rel="noopener">Товары</a>' : ""}
                ${canManageContent(user) ? '<a class="ghost-button" href="admin-prices.html" target="_blank" rel="noopener">Цены</a>' : ""}
                ${canManageContent(user) ? '<a class="ghost-button" href="admin-import.html" target="_blank" rel="noopener">Импорт</a>' : ""}
                ${canManageOrders(user) ? '<a class="ghost-button" href="admin-orders.html" target="_blank" rel="noopener">Заказы</a>' : ""}
                <button class="ghost-button" type="button" data-logout>Выйти</button>
              </div>
              ${buyerAccountTabsHtml(user)}
              ${managementOrdersHtml(user)}
              ${userManagementHtml(user)}
            `
            : authFormHtml()
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
  const squareClass = ["catalogCollections", "catalogHolidays"].includes(kind) ? " admin-image-upload--square" : "";
  return `
    <label class="admin-image-upload admin-image-upload--${kind}${squareClass}">
      <span>${title}</span>
      <span class="admin-image-upload__preview">
        <img src="${escapeHtml(image || adminImageFallback(kind))}" alt="${escapeHtml(title)}" ${imageAttrs(520, 320)} />
      </span>
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
  return items
    .map((item) => {
      const parts = item.description ? [item.name, item.description, item.icon] : [item.name, item.icon];
      return parts.map((value) => value || "").join(" | ");
    })
    .join("\n");
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
      global: "/",
      home: "/",
      catalog: "catalog.html",
      marketplaces: "marketplaces.html",
      custom: "custom.html",
      business: "business.html",
      about: "about.html",
      contacts: "contacts.html",
      "how-to-order": "how-to-order.html",
      delivery: "delivery.html",
      payment: "payment.html",
      returns: "returns.html",
      "seller-support": "seller-support.html",
      wholesale: "wholesale.html",
      cart: "cart.html",
      footer: "/#footer",
    }[anchor] || "/"
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
    { anchor: "how-to-order", title: "Как оформить заказ", note: "Инструкция из подвала", shot: "page" },
    { anchor: "delivery", title: "Доставка товара", note: "Условия доставки", shot: "page" },
    { anchor: "payment", title: "Оплата товара", note: "Условия оплаты", shot: "page" },
    { anchor: "returns", title: "Возврат товара", note: "Возврат и претензии", shot: "page" },
    { anchor: "seller-support", title: "Поддержка селлеров", note: "Маркировка и упаковка", shot: "page" },
    { anchor: "wholesale", title: "Оптовые партии", note: "Партии и условия", shot: "page" },
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
              ${adminListTextarea("catalogCollectionsText", "Подборки", serializeSimpleList(content.catalogCollections), "Одна строка = подборка. Формат: название | описание | иконка. Старый формат название | иконка тоже поддерживается.")}
              ${adminListTextarea("catalogHolidaysText", "Праздники", serializeSimpleList(content.catalogHolidays), "Одна строка = праздник. Формат: название | описание | иконка. Старый формат название | иконка тоже поддерживается.")}
            </div>
            ${adminCatalogImagesHtml("catalogCollections", content.catalogCollections, "Фото подборок", "Рекомендуем: квадрат 900x900 px, JPG/WebP до 1.5 МБ.")}
            ${adminCatalogImagesHtml("catalogHolidays", content.catalogHolidays, "Фото праздников", "Рекомендуем: квадрат 900x900 px, JPG/WebP до 1.5 МБ.")}
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
async function readProductRowsFromFile(file) {
  return readTabularFileRows(file, {
    onXlsxUnavailable: () => showToast("XLSX библиотека недоступна. Загрузите CSV или повторите позже."),
  });
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
