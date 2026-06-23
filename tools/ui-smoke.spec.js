const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = process.env.SOBAG_BASE_URL || "http://127.0.0.1:4173";
test.setTimeout(60000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      const key = "__sobagQaDocumentLoads";
      localStorage.setItem(key, String(Number(localStorage.getItem(key) || "0") + 1));
    } catch {
      // Cross-origin iframes, for example maps, do not expose localStorage to the test script.
    }
  });
  page.on("pageerror", (error) => {
    throw error;
  });
  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    if (status >= 400 && !url.endsWith("/favicon.ico") && !url.includes("/api/")) {
      throw new Error(`Failed resource ${status}: ${url}`);
    }
  });
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (/^https?:\/\//.test(url) && !url.startsWith(BASE_URL)) {
      route.abort();
      return;
    }
    const type = route.request().resourceType();
    if (type === "image" || type === "font") {
      route.abort();
      return;
    }
    route.continue();
  });
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.removeItem("sobag.cart.guest");
    localStorage.removeItem("sobag.favorites");
    localStorage.removeItem("sobag.currentUser");
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sobag.favorites.") || key.startsWith("sobag.cart."))
      .forEach((key) => localStorage.removeItem(key));
  });
});

test("header icon buttons keep visible fallbacks when external icons are unavailable", async ({ page }) => {
  await page.goto(`${BASE_URL}/catalog.html`, { waitUntil: "domcontentloaded" });
  const fallbacks = await page.evaluate(() =>
    [
      "#accountButton i[data-lucide='user']",
      "[data-nav='favorites.html'] i[data-lucide='heart']",
      "[data-open-cart] i[data-lucide='shopping-cart']",
      ".catalog-button i[data-lucide='layout-grid']",
    ].map((selector) => ({
      selector,
      content: getComputedStyle(document.querySelector(selector), "::before").content,
      box: document.querySelector(selector).getBoundingClientRect().toJSON(),
    }))
  );
  for (const fallback of fallbacks) {
    expect(fallback.content, `${fallback.selector} fallback content`).not.toBe('""');
    expect(fallback.box.width, `${fallback.selector} fallback width`).toBeGreaterThan(8);
    expect(fallback.box.height, `${fallback.selector} fallback height`).toBeGreaterThan(8);
  }
});

test("manager order pages can open guest customer history", async ({ page }) => {
  const qaSku = await page.evaluate(async () => {
    let response = await fetch("/api/catalog");
    if (!response.ok) response = await fetch("/data/products-live.json");
    const data = await response.json();
    const products = Array.isArray(data) ? data : data.products;
    return products?.[0]?.variants?.[0]?.sku || "opt_00104_РЕМ_13x3,5_ЛЕН";
  });
  const order = {
    id: "SO-QA-GUEST",
    status: "new",
    date: "01.06.2026",
    total: 12345,
    userEmail: "",
    customer: { email: "guest@example.com", name: "Guest Buyer", phone: "+79990000000", address: "Moscow" },
    items: [{ qty: 2, variant: { sku: qaSku, name: "Test item", price: 1000 } }],
  };
  await page.evaluate((record) => {
    localStorage.setItem("sobag.orders.v1", JSON.stringify([record]));
    localStorage.setItem("sobag.currentUser", "admin@sobag");
    localStorage.setItem("sobag.users", JSON.stringify({ "admin@sobag": { email: "admin@sobag", name: "Admin", role: "admin", orders: [] } }));
  }, order);
  let serverOrder = { ...order, crmThread: [] };
  await page.route("**/api/admin/orders", async (route) => {
    const request = route.request();
    if (request.method() === "PATCH") {
      const patch = request.postDataJSON();
      const statusHistoryEntry =
        patch.status && patch.status !== serverOrder.status
          ? {
              id: `H-QA-${Date.now()}`,
              at: new Date().toISOString(),
              actor: "admin@sobag",
              summary: "Статус: Новый -> В работе",
            }
          : null;
      const crmEntry = patch.commentText
        ? {
            id: `CRM-QA-${Date.now()}`,
            at: new Date().toISOString(),
            actor: "Admin",
            role: "admin",
            visibility: patch.commentVisibility === "customer" ? "customer" : "internal",
            text: patch.commentText,
          }
        : null;
      serverOrder = {
        ...serverOrder,
        ...(patch.status ? { status: patch.status } : {}),
        ...(Object.prototype.hasOwnProperty.call(patch, "managerEmail") ? { managerEmail: patch.managerEmail, managerName: patch.managerName || "" } : {}),
        ...(Object.prototype.hasOwnProperty.call(patch, "managerNote") ? { managerNote: patch.managerNote || "" } : {}),
        crmThread: crmEntry ? [crmEntry, ...(serverOrder.crmThread || [])] : serverOrder.crmThread || [],
        statusHistory: statusHistoryEntry ? [statusHistoryEntry, ...(serverOrder.statusHistory || [])] : serverOrder.statusHistory || [],
      };
      await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify({ order: serverOrder }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify({ orders: [serverOrder] }) });
  });

  await page.goto(`${BASE_URL}/admin-order?id=SO-QA-GUEST`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#adminOrderPage")).toContainText("SO-QA-GUEST");
  await expect(page.locator("#adminOrderPage")).toContainText("Guest Buyer");
  await expect(page.locator("#adminOrderPage")).toContainText("Экспорт XLSX");
  await page.locator('[data-order-status="SO-QA-GUEST"][data-status-value="processing"]').click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.orders.v1") || "[]")[0]?.status))
    .toBe("processing");
  await expect(page.locator("#adminOrderPage")).toContainText("История заказа");
  await page.locator('[data-order-manager-message-form] textarea[name="commentText"]').fill("QA internal CRM note");
  await page.locator("[data-order-manager-message-form]").getByRole("button", { name: /Добавить в ленту/i }).click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.orders.v1") || "[]")[0]?.crmThread?.[0]?.text))
    .toBe("QA internal CRM note");
  await expect(page.locator("#adminOrderPage")).toContainText("QA internal CRM note");
  await page.locator('[data-order-manager-message-form] textarea[name="commentText"]').fill("QA public buyer update");
  await page.locator('[data-order-manager-message-form] select[name="commentVisibility"]').selectOption("customer");
  await page.locator("[data-order-manager-message-form]").getByRole("button", { name: /Добавить в ленту/i }).click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.orders.v1") || "[]")[0]?.crmThread?.[0]?.text))
    .toBe("QA public buyer update");

  await page.goto(`${BASE_URL}/admin-customer?email=guest@example.com`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#adminCustomerPage")).toContainText("Guest Buyer");
  await expect(page.locator("#adminCustomerPage")).toContainText("SO-QA-GUEST");

  await page.goto(`${BASE_URL}/admin-orders?q=guest`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#adminOrdersPage")).toContainText("SO-QA-GUEST");
  await expect(page.locator("#adminOrdersPage")).toContainText("Guest Buyer");
  await expect(page.locator("#adminOrdersPage")).toContainText("Клиенты по текущему списку");

  await page.goto(`${BASE_URL}/admin-products?q=opt_`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelectorAll(".admin-product-card").length > 0);
  await expect(page.locator(".admin-product-card .copy-sku-button").first()).toHaveAttribute("aria-label", /^Скопировать артикул\s+\S+/);
  await expect(page.locator("#adminProductsPage")).toContainText("Экспорт вариантов");
  await expect(page.locator('.admin-products-filter select[name="status"]')).toContainText("Опубликованные");
  await page.goto(`${BASE_URL}/admin-products?status=all&q=opt_`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelectorAll(".admin-product-card").length > 0);
  await expect(page.locator('[data-admin-product-form] select[name="status"]').first()).toContainText("Черновик");
  await expect(page.locator(".admin-product-badge").first()).toContainText("Опубликован");
  await page.locator("[data-admin-toggle-product]").first().click();
  await expect(page.locator(".admin-product-badge").first()).toContainText("Скрыт");
  await expect(page.locator("[data-admin-toggle-product]").first()).toContainText("Опубликовать");
  await page.locator("[data-admin-toggle-product]").first().click();
  await expect(page.locator(".admin-product-badge").first()).toContainText("Опубликован");

  let priceImportPreviewRequests = 0;
  await page.route("**/api/admin/prices", async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          source: "postgres",
          rows: [],
          history: [
            {
              id: "PRICE-QA-1",
              status: "applied",
              source: "postgres",
              rowCount: 2,
              changeCount: 3,
              affectedSkuCount: 3,
              promoChangeCount: 1,
              createdAt: "2026-06-20T10:00:00.000Z",
            },
          ],
        }),
      });
    }
    if (route.request().method() !== "POST") return route.continue();
    priceImportPreviewRequests += 1;
    return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "preview unavailable" }) });
  });
  await page.goto(`${BASE_URL}/admin-prices?q=opt_`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelectorAll(".admin-price-row").length > 0);
  await expect(page.locator(".admin-price-preview h3")).toContainText("Предпросмотр изменений");
  await expect(page.locator('.admin-product-export a[href="/api/admin/prices?template=1"]')).toContainText("Шаблон импорта");
  await expect(page.locator(".admin-price-import-guide")).toContainText("promo_price");
  await expect(page.locator(".admin-price-import-guide")).toContainText("starts_at");
  await expect(page.locator(".admin-price-preview__empty")).toContainText("валидации");
  await expect(page.locator("[data-admin-apply-price-preview]")).toBeDisabled();
  await expect(page.locator('.admin-product-export a[href="/api/admin/prices?template=1"]')).toHaveAttribute("aria-label", "Скачать шаблон импорта цен");
  await expect(page.locator("[data-admin-price-import]")).toHaveAttribute("aria-label", "Импортировать цены из CSV или XLSX");
  await expect(page.locator(".admin-price-history")).toContainText("История импорта");
  await expect(page.locator(".admin-price-history")).toHaveAttribute("aria-live", "polite");
  await expect(page.locator(".admin-price-history [role='status']")).toBeVisible();
  await expect(page.locator(".admin-price-history")).toContainText("Применен");
  await expect(page.locator(".admin-price-history")).toContainText("3 изменений");
  await expect(page.locator(".admin-price-history")).toContainText("1 акций");
  await page.locator("[data-admin-price-select]").first().check();
  await page.locator("[data-admin-price-bulk-form]").evaluate((form) => form.requestSubmit());
  await expect(page.locator("[data-admin-apply-price-preview]")).toBeEnabled();
  await expect(page.locator("[data-admin-apply-price-preview]")).toHaveAttribute("title", "Применить проверенный предпросмотр цен");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Применить");
    await dialog.dismiss();
  });
  await page.locator("[data-admin-apply-price-preview]").click();
  await expect(page.locator("#toast")).toContainText("отменено");
  await page.locator("[data-admin-price-import]").setInputFiles({
    name: "prices.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("sku,price\nopt_1,123\n", "utf8"),
  });
  await expect.poll(() => priceImportPreviewRequests).toBe(1);
  await expect(page.locator(".admin-price-preview__errors")).toBeVisible();
  await expect(page.locator(".admin-price-history")).toContainText("История импорта");
  await expect(page.locator(".admin-price-history")).toContainText("Ошибка");
  await expect(page.locator(".admin-price-history")).toContainText("1 ошибок");
  await expect(page.locator(".admin-price-history")).not.toContainText("opt_1,123");
  await expect(page.locator("[data-admin-apply-price-preview]")).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page, "admin price import mobile");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("admin import page and custom print calculator render", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("sobag.currentUser", "admin@sobag");
    localStorage.setItem("sobag.users", JSON.stringify({ "admin@sobag": { email: "admin@sobag", name: "Admin", role: "admin" } }));
  });

  await page.goto(`${BASE_URL}/admin-import.html`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#adminImportPage")).toContainText("Импорт");
  await expect(page.locator("#adminImportPage")).toContainText("Партии импорта");
  await expect(page.locator("#adminImportPage")).toContainText("Фото текущего предпросмотра");
  await expect(page.locator("#importUpdateExisting")).toBeVisible();
  await page.locator("#importUpdateExisting").check();
  await page.locator("#excelInput").setInputFiles(path.join(process.cwd(), "templates", "sobag-products-template.csv"));
  await expect(page.locator(".import-batch-card").first()).toContainText("Режим: обновление");
  await expect(page.locator(".import-batch-card").first()).toContainText("Предпросмотр");
  await expect(page.locator("[data-apply-import-batch]").first()).toContainText("Применить");
  await expect(page.locator("[data-export-import-batch]").first()).toContainText("Скачать отчет CSV");
  await page.locator("#photoUploadInput").setInputFiles({
    name: "10345.jpg",
    mimeType: "image/png",
    buffer: fs.readFileSync(path.join(process.cwd(), "assets", "production-workshop-1.png")),
  });
  await expect(page.locator(".import-photo-table").first()).toContainText("10345");
  await expect(page.locator("[data-upload-import-photos]").first()).toBeEnabled();

  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.locator("#accountButton").click();
  await page.locator("[data-open-admin]").click();
  await expect(page.locator("#adminContentForm")).toBeVisible();
  await expect(page.locator(".admin-content-toolbar")).toContainText("Сохранить на сервере");
  await expect(page.locator(".admin-content-sidebar")).toContainText("Страницы");
  const adminCatalogPreviewGeometry = await page.evaluate(() => {
    const rect = document.querySelector(".admin-image-upload--catalogCollections img")?.getBoundingClientRect();
    return rect ? Math.abs(rect.width - rect.height) : 999;
  });
  expect(adminCatalogPreviewGeometry).toBeLessThanOrEqual(1);

  await page.goto(`${BASE_URL}/custom.html`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#customCalculator")).toBeVisible();
  await page.locator("#customCalcQty").fill("300");
  await page.locator("#customCalcPack").selectOption("marketplace");
  await expect(page.locator("#customCalcUnit")).toContainText("скидка 18%");
  await expect(page.locator("#customCalcTotal")).not.toHaveText("0 ₽");
});

test("business page exposes visible FAQ and FAQ schema", async ({ page }) => {
  await page.goto(`${BASE_URL}/business.html`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-faq-schema]")).toBeVisible();
  await expect(page.locator("[data-faq-schema] details")).toHaveCount(4);

  const schemaText = await page.locator("#sobag-faq-jsonld").textContent();
  const schema = JSON.parse(schemaText || "{}");
  expect(schema["@type"]).toBe("FAQPage");
  expect(schema.mainEntity).toHaveLength(4);
  expect(schema.mainEntity[0].acceptedAnswer.text).toContain("оптовая заявка");
});

test("contacts maps and marketplace badges stay visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/contacts.html`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".contacts-maps iframe")).toHaveCount(2);
  await expect(page.locator("[data-contacts-legal-address]")).toContainText("431815");
  await expect(page.locator("[data-contacts-production-address]")).toContainText("305014");
  await expect(page.locator(".map-panel")).toHaveCount(2);
  await expect(page.locator("#yandexMapLink-production")).toBeVisible();
  await expect(page.locator("#yandexMapLink-legal")).toHaveAttribute("rel", /noreferrer/);
  await expect(page.locator("#yandexMapLink-production")).toHaveAttribute("aria-label", /филиала/);
  await page.locator("#yandexMapLink-production").focus();
  await expect
    .poll(() =>
      page.locator("#yandexMapLink-production").evaluate((node) => {
        const styles = window.getComputedStyle(node);
        return (styles.outlineStyle !== "none" && Number.parseFloat(styles.outlineWidth) >= 2) || styles.boxShadow !== "none";
      })
    )
    .toBe(true);
  await expectNoHorizontalOverflow(page, "contacts maps mobile");

  await page.goto(`${BASE_URL}/marketplaces.html`, { waitUntil: "domcontentloaded" });
  const marketplaceLinks = [
    ["Wildberries", "https://www.wildberries.ru/seller/167187"],
    ["Ozon", "https://ozon.ru/s/sobag"],
    ["Яндекс Маркет", "https://market.yandex.ru/cc/84GXiW"],
  ];
  for (const [name, href] of marketplaceLinks) {
    const link = page.locator(`.marketplace-card[href="${href}"]`);
    await expect(link).toContainText(name);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("rel", /noreferrer/);
    await link.focus();
    await expect
      .poll(() =>
        link.evaluate((node) => {
          const styles = window.getComputedStyle(node);
          return (styles.outlineStyle !== "none" && Number.parseFloat(styles.outlineWidth) >= 2) || styles.boxShadow !== "none";
        })
      )
      .toBe(true);
  }
  await expectNoHorizontalOverflow(page, "marketplaces mobile");
});

test("favorites catalog does not expose removed helper copy", async ({ page }) => {
  await page.goto(`${BASE_URL}/favorites.html`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Каталог продукции", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Сначала раздел, потом товары и фильтры", { exact: true })).toHaveCount(0);
  await expect(page.locator(".favorites-page #catalogTitle")).toHaveClass(/sr-only/);
  await expectNoHorizontalOverflow(page, "favorites catalog cleanup");
});

test("account auth modal separates login and registration fields", async ({ page }) => {
  await page.goto(`${BASE_URL}/catalog.html`, { waitUntil: "domcontentloaded" });
  await page.locator("#accountButton").click();
  await expect(page.locator("#accountModal .modal__close")).toHaveAttribute("aria-label", "Закрыть личный кабинет");
  await expect(page.locator("#accountModalTitle")).toHaveText("Вход");
  await expect(page.locator('#authForm input[name="login"]')).toBeVisible();
  await expect(page.locator('#authForm input[name="email"]')).toHaveCount(0);
  await page.locator('[data-auth-mode-switch="register"]').click();
  await expect(page.locator("#accountModalTitle")).toHaveText("Регистрация");
  await expect(page.locator('#authForm input[name="name"]')).toBeVisible();
  await expect(page.locator('#authForm input[name="email"]')).toBeVisible();
  await expect(page.locator('#authForm input[name="phone"]')).toBeVisible();
  await expect(page.locator(".auth-password-hint")).toContainText("не менее 6");
});

test("admin audit summary fails closed without raw rows", async ({ page }) => {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: { email: "admin@sobag", name: "Admin", role: "admin" }, cartItems: [], favoriteItems: [], savedCarts: [] }),
    });
  });
  await page.route("**/api/admin/users**", async (route) => {
    const url = route.request().url();
    if (url.includes("audit=1")) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "raw secret@example.com audit row unavailable" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ users: [{ email: "admin@sobag", name: "Admin", role: "admin" }] }),
    });
  });
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.setItem("sobag.currentUser", "admin@sobag");
    localStorage.setItem("sobag.users", JSON.stringify({ "admin@sobag": { email: "admin@sobag", name: "Admin", role: "admin" } }));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#accountButton").click();
  await expect(page.locator(".admin-audit-summary")).toContainText("Аудит админ-действий");
  await expect(page.locator(".admin-audit-summary")).toContainText("Ждет backend audit endpoint");
  await expect(page.locator(".admin-audit-summary")).not.toContainText("secret@example.com");
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

async function waitForLiveProducts(page, minCount = 10) {
  await page.waitForFunction((min) => document.querySelectorAll(".product-card").length > min, minCount);
}

async function largestCategory(page) {
  return page.evaluate(async () => {
    let response = await fetch("/api/catalog");
    if (!response.ok) response = await fetch("/data/products-live.json");
    const data = await response.json();
    const products = Array.isArray(data) ? data : data.products;
    const counts = new Map();
    (products || []).forEach((product) => {
      const name = product.category || product.type || "";
      if (!name) return;
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  });
}

async function largestCategoryInfo(page) {
  return page.evaluate(async () => {
    let response = await fetch("/api/catalog");
    if (!response.ok) response = await fetch("/data/products-live.json");
    const data = await response.json();
    const products = Array.isArray(data) ? data : data.products;
    const counts = new Map();
    (products || [])
      .filter((product) => (product.status || "published") === "published" && product.hidden !== true)
      .forEach((product) => {
        const values = Array.isArray(product.categories) && product.categories.length ? product.categories : [product.category || product.type || ""];
        values.filter(Boolean).forEach((name) => counts.set(name, (counts.get(name) || 0) + 1));
      });
    const [category, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || ["", 0];
    return { category, count };
  });
}

async function expectNoHorizontalOverflow(page, label = page.url()) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return Math.ceil(root.scrollWidth - root.clientWidth);
  });
  expect(overflow, label).toBeLessThanOrEqual(1);
}

async function expectMobileHeaderActionsStable(page, label = page.url()) {
  const geometry = await page.evaluate(() => {
    const nodes = [
      document.querySelector("#accountButton"),
      document.querySelector('[data-nav="favorites.html"]'),
      document.querySelector("[data-open-cart]"),
    ].filter(Boolean);
    const boxes = nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    });
    const overlaps = boxes.some((box, index) =>
      boxes
        .slice(index + 1)
        .some((next) => box.left < next.right && box.right > next.left && box.top < next.bottom && box.bottom > next.top)
    );
    const smallTargets = boxes.some((box) => box.width < 32 || box.height < 32);
    return { count: boxes.length, overlaps, smallTargets };
  });
  expect(geometry.count, label).toBe(3);
  expect(geometry.overlaps, label).toBe(false);
  expect(geometry.smallTargets, label).toBe(false);
}

async function expectSkuCopyControlsInline(page, label = page.url()) {
  const geometry = await page.evaluate(() => {
    const pairs = [
      [document.querySelector(".product-card__sku-row .product-card__sku"), document.querySelector(".product-card__sku-row .copy-sku-button"), document.querySelector(".product-card__sku-row")],
      [document.querySelector("#selectedSku"), document.querySelector(".copy-sku-button--detail"), document.querySelector(".sku-line__value")],
    ].filter(([sku, button, container]) => sku && button && container);
    return pairs.map(([sku, button, container]) => {
      const skuRect = sku.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const sameLine = Math.abs((skuRect.top + skuRect.bottom) / 2 - (buttonRect.top + buttonRect.bottom) / 2) <= 12;
      const inlineGap = Math.max(0, buttonRect.left - skuRect.right);
      const wrappedGap = Math.max(0, buttonRect.top - skuRect.bottom);
      return {
        overflow: container.scrollWidth - container.clientWidth,
        sameLine,
        inlineGap,
        wrappedGap,
        targetWidth: buttonRect.width,
        targetHeight: buttonRect.height,
        insideContainer: buttonRect.left >= containerRect.left - 1 && buttonRect.right <= containerRect.right + 1,
      };
    });
  });
  expect(geometry.length, label).toBeGreaterThanOrEqual(2);
  for (const item of geometry) {
    expect(item.overflow, label).toBeLessThanOrEqual(1);
    expect(item.insideContainer, label).toBe(true);
    expect(item.sameLine ? item.inlineGap : item.wrappedGap, label).toBeLessThanOrEqual(8);
    expect(item.targetWidth, label).toBeGreaterThanOrEqual(22);
    expect(item.targetHeight, label).toBeGreaterThanOrEqual(19);
  }
}

test("mobile pages do not create horizontal overflow", async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  const routes = [
    "/",
    `/catalog?category=${encodeURIComponent(await largestCategory(page))}`,
    "/search?q=opt_22434",
    "/cart.html",
    "/quotes.html",
    "/favorites.html",
    "/admin-orders.html",
    "/admin-products.html",
    "/admin-prices.html",
    "/admin-import.html",
    "/marketplaces.html",
    "/business.html",
    "/custom.html",
    "/about.html",
    "/contacts.html",
    "/terms.html",
  ];

  for (const route of routes) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "commit" });
    await page.locator("body").waitFor();
    await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
    if (route.includes("catalog")) await waitForLiveProducts(page);
    if (route.includes("search")) await waitForLiveProducts(page, 0);
    if (["/", "/favorites.html", "/marketplaces.html", "/contacts.html"].includes(route) || route.includes("catalog")) {
      await expect(page.locator("#accountButton")).toHaveAttribute("aria-label", /Войти|аккаунт/i);
      await expect(page.locator("#accountButton")).not.toContainText(/Вход|регистрация/i);
      await expectMobileHeaderActionsStable(page, route);
    }
    if (route.includes("catalog")) {
      await expect(page.locator(".catalog-price-button")).toContainText("Прайс");
      await expect(page.getByText("Каталог продукции", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Сначала раздел, потом товары и фильтры", { exact: true })).toHaveCount(0);
    }
    await expectNoHorizontalOverflow(page, route);
  }
});

test("empty cart and anonymous account states stay safe", async ({ page }) => {
  await page.goto(`${BASE_URL}/cart.html`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.removeItem("sobag.currentUser");
    localStorage.removeItem("sobag.cart.guest");
    localStorage.removeItem("sobag.cart");
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sobag.cart."))
      .forEach((key) => localStorage.removeItem(key));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-footer-email]').first()).toHaveText("ip.burago@yandex.ru");
  await expect(page.locator('[data-footer-phone]').first()).toContainText("+7 901 879-41-62");
  await expect(page.locator("[data-footer-address]")).toContainText("305014");
  await expect(page.locator('.marketplace-links--footer a[href="https://www.wildberries.ru/seller/167187"]')).toBeVisible();
  await expect(page.locator('.marketplace-links--footer a[href="https://ozon.ru/s/sobag"]')).toBeVisible();
  await expect(page.locator('.marketplace-links--footer a[href="https://market.yandex.ru/cc/84GXiW"]')).toBeVisible();
  const cartIconFallbacks = await page.evaluate(() =>
    ["save", "download", "printer", "file-text", "send"].map((name) => getComputedStyle(document.querySelector(`i[data-lucide='${name}']`), "::before").content)
  );
  expect(cartIconFallbacks).not.toContain('"•"');
  await expect(page.locator("#cartPageEmpty")).toBeVisible();
  await expect(page.locator("#checkoutButton")).toBeDisabled();
  await expect(page.locator("#cartPageMinHint")).toContainText("До минимальной суммы осталось");
  await page.locator("#saveCartDraftButton").click();
  await expect(page.locator("#toast")).toContainText("Корзина пока пустая");
  await expectNoHorizontalOverflow(page, "empty cart");

  await page.goto(`${BASE_URL}/quotes.html`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#savedQuotesPage")).toContainText("Войдите");
  await expect(page.locator("[data-restore-saved-cart]")).toHaveCount(0);

  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.locator("#accountButton").click();
  await expect(page.locator("#accountModalTitle")).toContainText("Вход");
  await expect(page.locator("[data-open-admin]")).toHaveCount(0);
});

test("catalog navigation and favorite toggles do not reload the same document", async ({ page }) => {
  const category = await largestCategory(page);
  await page.goto(`${BASE_URL}/catalog?category=${encodeURIComponent(category)}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page, 0);

  await page.evaluate(() => localStorage.setItem("__sobagQaDocumentLoads", "0"));
  await page.getByRole("button", { name: /^каталог$/i }).first().click();
  await page.waitForTimeout(250);
  await expect(page).toHaveURL(/\/catalog(?:\.html)?$/);
  await expect(page.locator("#catalogHome")).toBeVisible();
  await expect(page.locator("#catalogPageBack")).toContainText("На главную");
  await expect.poll(() => page.evaluate(() => Number(localStorage.getItem("__sobagQaDocumentLoads") || "0"))).toBe(0);

  await page.goto(`${BASE_URL}/catalog?category=${encodeURIComponent(category)}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page, 0);
  await page.evaluate(() => localStorage.setItem("__sobagQaDocumentLoads", "0"));
  const favorite = page.locator(".favorite-button").first();
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => page.evaluate(() => Number(localStorage.getItem("__sobagQaDocumentLoads") || "0"))).toBe(0);
});

test("catalog local fallback renders compact product pages", async ({ page }) => {
  const { category, count } = await largestCategoryInfo(page);
  test.skip(count <= 48, "largest fixture category is too small for compact fallback pagination");
  await page.route("**/api/catalog-query?**", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({ error: "qa_server_query_unavailable" }),
    });
  });
  await page.goto(`${BASE_URL}/catalog?category=${encodeURIComponent(category)}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page, 0);
  await expect(page.locator(".product-card")).toHaveCount(48);
  await expect(page.locator("[data-show-more-products]")).toContainText(`Показать ещё ${Math.min(48, count - 48)} из ${count - 48}`);
  await page.locator("[data-show-more-products]").click();
  await expect(page.locator(".product-card")).toHaveCount(Math.min(96, count));
});

test("catalog home first load uses server category summary over stale fallback", async ({ page }) => {
  const categoryRows = [
    { value: "Подушки", count: 517 },
    { value: "Наволочки", count: 517 },
    { value: "Мешки для обуви", count: 170 },
    { value: "Чехлы на чемодан", count: 37 },
    { value: "Ремувки", count: 19 },
    { value: "Флаги", count: 65 },
  ];
  await page.evaluate(() => {
    localStorage.removeItem("sobag.products.v8");
    localStorage.removeItem("sobag.products.v9");
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sobag.publicApiCache.v1.") || key.startsWith("sobag.publicApiCache.v2."))
      .forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(
      "sobag.publicApiCache.v2./api/catalog-query?pageSize=1&sort=popular",
      JSON.stringify({
        savedAt: Date.now(),
        data: {
          facets: { categories: [{ value: "Подушки", count: 48 }, { value: "Наволочки", count: 48 }] },
          facetOptions: { categories: [{ value: "Подушки", count: 48 }, { value: "Наволочки", count: 48 }] },
          source: "qa-stale-category-summary",
        },
      })
    );
  });
  await page.route("**/api/catalog", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({ error: "qa_full_catalog_unavailable" }),
    });
  });
  await page.route("**/data/products-live.json", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify([]),
    });
  });
  await page.route("**/api/catalog-query?**", async (route) => {
    await page.waitForTimeout(250);
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({
        items: [],
        total: 808,
        facets: { categories: categoryRows, collections: [], holidays: [], tags: [], types: [], sizes: [], materials: [], stock: [] },
        facetOptions: { categories: categoryRows, collections: [], holidays: [], tags: [], types: [], sizes: [], materials: [], stock: [] },
        pageInfo: { page: 1, pageSize: 1, offset: 0, total: 808, totalPages: 808, hasMore: true, nextCursor: "MQ" },
        source: "qa-category-summary",
      }),
    });
  });
  let priceListStatus = 200;
  let priceListRows = [
    { type: "base", label: "Подушка велюр 40х40", price: 220, productCount: 12, skuCount: 12 },
    { type: "promo", label: "Акция Подушка велюр 40х40", price: 199, productCount: 12, skuCount: 12, promoStartsAt: "2026-01-01", promoEndsAt: "2026-01-31" },
  ];
  await page.route("**/api/price-list?format=json", async (route) => {
    await route.fulfill({
      status: priceListStatus,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(priceListStatus === 200 ? { rows: priceListRows } : { error: "qa_price_list_down", message: "QA price list error" }),
    });
  });
  await page.route("**/api/price-list", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/csv; charset=utf-8",
      headers: { "content-disposition": 'attachment; filename="sobag-price-list.csv"' },
      body: "Категория;Цена\nПодушка велюр 40x40;220\n",
    });
  });

  await page.goto(`${BASE_URL}/catalog.html?qa=category-summary`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(100);
  await expect(page.locator("#categoryTiles .category-tile")).toHaveCount(0);
  await expect(page.locator("#categoryTiles")).not.toContainText("48");
  await expect.poll(() => page.locator("#categoryTiles .category-tile").count()).toBe(6);
  const tileText = await page.locator("#categoryTiles").innerText();
  const normalizedTileText = tileText.toLocaleLowerCase("ru-RU");
  for (const row of categoryRows) {
    expect(normalizedTileText).toContain(row.value.toLocaleLowerCase("ru-RU"));
    expect(tileText).toContain(String(row.count));
  }
  await expect(page.locator(".catalog-price-button")).toContainText("Прайс");
  await expect(page.locator(".catalog-price-button")).toHaveAttribute("download", "sobag-price-list.csv");
  await expect(page.locator(".catalog-price-button")).toHaveAttribute("title", "Скачать прайс CSV для Excel");
  const priceDownload = page.waitForEvent("download");
  await page.locator(".catalog-price-button").click();
  expect((await priceDownload).suggestedFilename()).toMatch(/sobag-price-list\.csv/);
  await expect(page.locator("#toast")).toContainText("Прайс CSV скачивается");
  await expect(page.locator(".price-list-preview__row--promo .price-list-preview__badge")).toContainText("Акция");
  await expect(page.locator(".price-list-preview")).toContainText("199");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect.poll(() => page.locator("#categoryTiles .category-tile").count()).toBe(6);
  const reloadTileText = await page.locator("#categoryTiles").innerText();
  expect(reloadTileText).toBe(tileText);

  await page.goto(`${BASE_URL}/catalog?qa=category-summary`, { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.locator("#categoryTiles .category-tile").count()).toBe(6);
  expect(await page.locator("#categoryTiles").innerText()).toBe(tileText);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/catalog.html?qa=category-summary-mobile`, { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.locator("#categoryTiles .category-tile").count()).toBe(6);
  const mobileTileText = await page.locator("#categoryTiles").innerText();
  expect(mobileTileText).toBe(tileText);
  const categoryTileGeometry = await page.locator("#categoryTiles .category-tile").evaluateAll((tiles) =>
    tiles.map((tile) => ({
      overflow: tile.scrollWidth - tile.clientWidth,
      strongOverflow: [...tile.querySelectorAll("strong, small, b")].some((node) => node.scrollWidth - node.clientWidth > 1),
    }))
  );
  for (const tile of categoryTileGeometry) {
    expect(tile.overflow, "mobile category tile overflow").toBeLessThanOrEqual(1);
    expect(tile.strongOverflow, "mobile category text overflow").toBe(false);
  }
  for (const selector of ["#categoryTiles .category-tile", ".theme-tile", ".actual-tile"]) {
    const tile = page.locator(selector).first();
    if ((await tile.count()) === 0) continue;
    await tile.focus();
    await expect
      .poll(() =>
        tile.evaluate((node) => {
          const styles = window.getComputedStyle(node);
          return (styles.outlineStyle !== "none" && Number.parseFloat(styles.outlineWidth) >= 2) || styles.boxShadow !== "none";
        })
      )
      .toBe(true);
  }
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect.poll(() => page.locator("#categoryTiles .category-tile").count()).toBe(6);
  expect(await page.locator("#categoryTiles").innerText()).toBe(mobileTileText);
  await page.setViewportSize({ width: 1280, height: 720 });

  priceListRows = [];
  await page.goto(`${BASE_URL}/catalog.html?qa=price-empty`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".price-list-preview__state")).toContainText("нет строк");
  priceListStatus = 500;
  await page.goto(`${BASE_URL}/catalog.html?qa=price-error`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".price-list-preview__state")).toContainText("не загрузился");
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("catalog home never renders page-sized category counts as final totals", async ({ page }) => {
  const partialProducts = Array.from({ length: 48 }, (_, index) => {
    const category = index < 24 ? "Подушки" : "Наволочки";
    return {
      id: `qa-partial-${index}`,
      baseSku: `qa-partial-${index}`,
      name: `QA partial ${index}`,
      category,
      categories: [category],
      image: "assets/production-workshop-1.png",
      variants: [{ sku: `qa-partial-${index}-v`, name: `QA partial ${index}`, type: "QA", size: "QA", material: "QA", price: 1000 }],
    };
  });
  await page.route("**/api/catalog", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({ source: "server", products: partialProducts }),
    });
  });
  await page.route("**/data/products-live.json", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify([]) });
  });
  await page.route("**/api/catalog-query?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({
        items: [],
        total: 808,
        facets: { categories: [{ value: "Подушки", count: 48 }, { value: "Наволочки", count: 48 }], collections: [], holidays: [], tags: [], types: [], sizes: [], materials: [], stock: [] },
        facetOptions: { categories: [{ value: "Подушки", count: 48 }, { value: "Наволочки", count: 48 }], collections: [], holidays: [], tags: [], types: [], sizes: [], materials: [], stock: [] },
        pageInfo: { page: 1, pageSize: 1, offset: 0, total: 808, totalPages: 808, hasMore: true, nextCursor: "MQ" },
        source: "qa-partial-summary",
      }),
    });
  });
  await page.goto(`${BASE_URL}/catalog.html?qa=partial-count-guard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await expect(page.locator("#categoryTiles")).not.toContainText(/48\s+товар/);
  await expect(page.locator("#categoryTiles .category-tile")).toHaveCount(0);
  await expect(page.locator("#categoryTiles .category-tile-skeleton")).toHaveCount(6);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("account favorites are per-user and orders can be repeated into cart", async ({ page }) => {
  const category = await largestCategory(page);
  await page.goto(`${BASE_URL}/catalog?category=${encodeURIComponent(category)}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);
  const seed = await page.locator(".product-card").first().evaluate((card) => ({
    productId: card.querySelector("[data-favorite]")?.getAttribute("data-favorite") || "",
    sku: card.querySelector(".product-card__sku")?.textContent?.trim() || "QA-SKU",
    name: card.querySelector(".product-card__name")?.textContent?.trim() || "QA product",
    image: card.querySelector("img")?.getAttribute("src") || "",
  }));
  await page.evaluate((seedData) => {
    const order = {
      id: "SO-QA-REPEAT",
      status: "done",
      date: "02.06.2026",
      total: 40000,
      userEmail: "buyer@example.com",
      customer: { email: "buyer@example.com", name: "Buyer", phone: "+79990000001", address: "Test address" },
      items: [
        {
          key: `${seedData.productId}:${seedData.sku}`,
          productId: seedData.productId,
          productName: seedData.name,
          productImage: seedData.image,
          qty: 40,
          variant: { sku: seedData.sku, name: seedData.name, type: "QA", size: "QA", material: "QA", price: 1000 },
        },
      ],
    };
    localStorage.setItem(
      "sobag.users",
      JSON.stringify({
        "buyer@example.com": { email: "buyer@example.com", name: "Buyer", role: "buyer", orders: [order], addresses: ["Test address"] },
        "second@example.com": { email: "second@example.com", name: "Second", role: "buyer", orders: [] },
      })
    );
    localStorage.setItem("sobag.orders.v1", JSON.stringify([order]));
    localStorage.setItem("sobag.currentUser", "buyer@example.com");
  }, seed);

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);
  const favorite = page.locator(`[data-favorite="${seed.productId}"]`).first();
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.favorites.buyer@example.com") || "[]").length))
    .toBeGreaterThan(0);
  await page.route("**/api/orders", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      const order = {
        id: "SO-QA-SAVED-CART",
        date: "02.06.2026",
        createdAt: new Date().toISOString(),
        status: "new",
        userEmail: "buyer@example.com",
        customer: body.customer || {},
        items: body.items || [],
        total: body.total || 0,
        source: body.source || "site",
      };
      await route.fulfill({ status: 201, contentType: "application/json; charset=utf-8", body: JSON.stringify({ order }) });
      return;
    }
    if (request.method() !== "PATCH") {
      await route.continue();
      return;
    }
    const patch = request.postDataJSON();
    const current = await page.evaluate(() => JSON.parse(localStorage.getItem("sobag.orders.v1") || "[]")[0]);
    const updated = {
      ...current,
      crmThread: [
        {
          id: `CRM-QA-${Date.now()}`,
          at: new Date().toISOString(),
          actor: "Buyer",
          role: "buyer",
          visibility: "customer",
          text: patch.commentText,
        },
        ...(current.crmThread || []),
      ],
    };
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify({ order: updated }) });
  });
  await page.locator("#accountButton").click();
  await page.locator('[data-order-customer-message-form] textarea[name="commentText"]').fill("QA buyer order reply");
  await page.locator("[data-order-customer-message-form]").getByRole("button", { name: /Отправить сообщение/i }).click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.orders.v1") || "[]")[0]?.crmThread?.[0]?.text))
    .toBe("QA buyer order reply");
  await expect(page.locator("#accountModal")).toContainText("QA buyer order reply");
  await page.locator(".modal__close").click();

  await page.evaluate(() => {
    localStorage.setItem("sobag.currentUser", "second@example.com");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);
  await expect(page.locator(`[data-favorite="${seed.productId}"]`).first()).toHaveAttribute("aria-pressed", "false");

  await page.evaluate(() => {
    localStorage.setItem("sobag.currentUser", "buyer@example.com");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#accountButton").click();
  await expect(page.locator("#accountModal")).toContainText("SO-QA-REPEAT");
  await page.locator('[data-repeat-order="SO-QA-REPEAT"]').click();
  await expect(page).toHaveURL(/\/cart(?:\.html)?$/);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.cart.buyer@example.com") || "[]").length)).toBe(1);
  let cartConflictHits = 0;
  await page.route("**/api/auth/me", async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    const body = route.request().postDataJSON();
    if (!body.cartItems) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { email: "buyer@example.com" } }) });
    cartConflictHits += 1;
    if (cartConflictHits === 1) {
      const serverItems = body.cartItems.map(([key, line]) => [key, { ...line, qty: Number(line.qty || 0) + 1 }]);
      return route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ error: "cart_conflict", message: "Cart changed on another device.", cartItems: serverItems, cartUpdatedAt: "qa-cart-server-2" }),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ cartUpdatedAt: "qa-cart-server-3" }) });
  });
  await page.locator("[data-qty-input]").first().fill("41");
  await expect(page.locator("#toast")).toContainText("Корзина изменилась");
  await expect(page.locator("[data-qty-input]").first()).toHaveValue("42");
  await expect.poll(() => cartConflictHits).toBeGreaterThan(0);

  await expect(page.locator("#saveCartDraftButton")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept("QA saved cart"));
  await page.locator("#saveCartDraftButton").click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.savedCarts.buyer@example.com") || "[]").length))
    .toBe(1);

  await page.evaluate(() => localStorage.setItem("sobag.cart.buyer@example.com", "[]"));
  await page.goto(`${BASE_URL}/catalog?category=${encodeURIComponent(category)}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);
  await page.locator("#accountButton").click();
  await page.locator('[data-account-tab="quotes"]').click();
  await expect(page.locator("#accountModal")).toContainText("QA saved cart");
  await page.locator('[data-account-tab="profile"]').click();
  await page.locator('[data-profile-form] input[name="phone"]').fill("+79990000002");
  await page.locator('[data-profile-form] input[name="company"]').fill("QA Company");
  await page.locator('[data-profile-form] input[name="inn"]').fill("1234567890");
  await page.locator('[data-profile-form] input[name="kpp"]').fill("123456789");
  await page.locator('[data-profile-form] input[name="legalAddress"]').fill("QA legal address");
  await page.locator('[data-profile-form] textarea[name="addresses"]').fill("QA address one\nQA address two");
  await page.locator('[data-profile-form] textarea[name="layoutFiles"]').fill("qa-layout.pdf\nhttps://example.com/qa-layout");
  await page.locator('[data-profile-form] textarea[name="orderComment"]').fill("QA default order comment");
  await page.locator("[data-profile-form]").getByRole("button", { name: /Сохранить профиль/i }).click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.users") || "{}")["buyer@example.com"]?.company))
    .toBe("QA Company");
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.users") || "{}")["buyer@example.com"]?.kpp))
    .toBe("123456789");
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.users") || "{}")["buyer@example.com"]?.addresses || []))
    .toContain("QA address two");
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.users") || "{}")["buyer@example.com"]?.layoutFiles || []))
    .toContain("qa-layout.pdf");
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.users") || "{}")["buyer@example.com"]?.orderComment))
    .toBe("QA default order comment");

  page.once("dialog", (dialog) => dialog.accept("QA renamed cart"));
  await page.locator('[data-account-tab="quotes"]').click();
  await page.locator("[data-rename-saved-cart]").first().click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.savedCarts.buyer@example.com") || "[]")[0]?.title))
    .toBe("QA renamed cart");

  await page.locator(".modal__close").click();
  await page.goto(`${BASE_URL}/quotes.html`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#savedQuotesPage")).toContainText("QA renamed cart");
  await page.locator('[data-saved-cart-comment-form] textarea[name="customerComment"]').first().fill("QA quote customer comment");
  await page.locator("[data-saved-cart-comment-form]").first().getByRole("button", { name: /Сохранить комментарии/i }).click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.savedCarts.buyer@example.com") || "[]")[0]?.customerComment))
    .toBe("QA quote customer comment");
  await page.evaluate(() => {
    const key = "sobag.savedCarts.buyer@example.com";
    const carts = JSON.parse(localStorage.getItem(key) || "[]");
    carts[0].managerComment = "QA internal manager secret";
    carts[0].commentHistory = [
      ...(carts[0].commentHistory || []),
      {
        at: new Date().toISOString(),
        actor: "Manager",
        role: "manager",
        type: "manager_comment",
        visibility: "internal",
        text: "QA internal manager secret",
      },
    ];
    localStorage.setItem(key, JSON.stringify(carts));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#savedQuotesPage")).not.toContainText("QA internal manager secret");

  const downloadPromise = page.waitForEvent("download");
  await page.locator("[data-download-saved-cart]").first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/sobag-.*\.(xlsx|csv)$/);
  await expect(page.locator("[data-print-saved-cart]").first()).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("[data-send-saved-cart]").first().click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.savedCarts.buyer@example.com") || "[]")[0]?.status))
    .toBe("sent");
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.orders.v1") || "[]").some((order) => order.source === "saved_cart")))
    .toBe(true);

  page.once("dialog", (dialog) => {
    expect(dialog.message()).toContain("расхождения");
    expect(dialog.message()).toMatch(/было|Не найдены/);
    dialog.accept();
  });
  await page.evaluate(() => {
    const key = "sobag.savedCarts.buyer@example.com";
    const carts = JSON.parse(localStorage.getItem(key) || "[]");
    if (carts[0]?.items?.[0]?.[1]?.variant) carts[0].items[0][1].variant.price = 1;
    localStorage.setItem(key, JSON.stringify(carts));
  });
  await page.locator("[data-restore-saved-cart]").first().click();
  await expect(page).toHaveURL(/\/cart(?:\.html)?$/);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.cart.buyer@example.com") || "[]").length)).toBe(1);
});

test("catalog filters, product modal, variants, and cart stay coherent", async ({ page }) => {
  const category = await largestCategory(page);
  await page.goto(`${BASE_URL}/catalog?category=${encodeURIComponent(category)}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);

  await expect(page.locator("#catalogTitle")).toContainText(category);
  await expect(page.locator("#catalogCompactTitle")).toContainText(category);
  await expect(page.locator("#catalogListingBack")).toContainText("В каталог");
  await expect(page.locator(".page-back")).toBeHidden();
  await expect(page.locator("#catalogSeoCopy")).toBeHidden();

  await page.goto(`${BASE_URL}/catalog?collection=${encodeURIComponent("Паттерны")}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);
  await expect(page.locator("#catalogSeoCopy")).toBeHidden();

  await page.goto(`${BASE_URL}/catalog?holiday=${encodeURIComponent("23 февраля")}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);
  await expect(page.locator("#catalogSeoCopy")).toBeHidden();

  await page.goto(`${BASE_URL}/catalog?category=${encodeURIComponent(category)}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);
  await expect(page.locator('[data-filter-group="category"]')).toHaveCount(0);
  await expect(page.locator('#activeFilterChips [data-clear-filter="selectedCategory"]')).toHaveCount(1);
  await expect(page.locator("[data-show-more-products]")).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(await page.locator(".product-card").count());

  const firstCard = page.locator(".product-card").first();
  const baseSku = await firstCard.locator(".product-card__sku").innerText();
  await expect(baseSku.trim()).toMatch(/^opt_/i);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__sobagCopiedSku = text;
        },
      },
    });
  });
  await firstCard.locator(".copy-sku-button").click();
  await expect
    .poll(() => page.evaluate(() => String(window.__sobagCopiedSku || "").toLocaleLowerCase("ru-RU")))
    .toBe(baseSku.trim().toLocaleLowerCase("ru-RU"));
  await firstCard.locator(".copy-sku-button").focus();
  await expect
    .poll(() =>
      firstCard.locator(".copy-sku-button").evaluate((button) => {
        const styles = getComputedStyle(button);
        return styles.outlineStyle !== "none" && Number.parseFloat(styles.outlineWidth) >= 2;
      })
    )
    .toBe(true);
  await firstCard.locator("[data-open-product]").first().click();

  await expect(page.locator("#productModal")).toBeVisible();
  await expect(page.locator("#detailQty")).toHaveValue("1");
  await page.locator("#detailQty").fill("100");
  await expect(page.locator("#detailQty")).toHaveValue("100");
  await page.locator("#detailQty").fill("0");
  await expect(page.locator("#detailQty")).toHaveValue("0");
  await expect(page.locator(".variant-matrix")).toHaveCount(0);
  await expect(page.locator('.detail-price-download[href="/api/price-list"]')).toBeVisible();
  await expect(page.locator('.detail-price-download[href="/api/price-list"]')).toHaveAttribute("download", "sobag-price-list.csv");
  await expect(page.locator('.detail-price-download[href="/api/price-list"]')).toHaveAttribute("aria-label", "Скачать прайс CSV");
  await expect(page.locator(".copy-sku-button--detail")).toHaveAttribute("title", "Скопировать артикул");
  await expect(page.locator(".copy-sku-button--detail")).toHaveAttribute("data-tooltip", "Скопировать артикул");
  await expect(page.locator("#selectedSku")).toContainText(/^opt_/i);
  await expect(page.locator(".detail-price strong")).not.toContainText(/^0\s*₽$/);
  await expectSkuCopyControlsInline(page, "desktop sku copy");
  await page.setViewportSize({ width: 390, height: 844 });
  await expectSkuCopyControlsInline(page, "mobile sku copy");
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator(".related-products .mini-product-card")).toHaveCount(await page.locator(".related-products .mini-product-card").count());
  await expect(page.locator(".related-products .mini-product-card").first()).toBeVisible();
  const imageGeometry = await page.evaluate(() => {
    const squareDiff = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      if (!rect) return 999;
      return Math.abs(rect.width - rect.height);
    };
    return {
      card: squareDiff(".product-card__image"),
      main: squareDiff("#detailMainImage"),
      thumb: squareDiff(".product-gallery__thumb img"),
    };
  });
  expect(imageGeometry.card).toBeLessThanOrEqual(1);
  expect(imageGeometry.main).toBeLessThanOrEqual(1);
  expect(imageGeometry.thumb).toBeLessThanOrEqual(1);
  const firstSku = await page.locator("#selectedSku").innerText();
  await expect(firstSku.toLocaleLowerCase("ru-RU")).toContain(baseSku.trim().toLocaleLowerCase("ru-RU"));
  await page.locator(".copy-sku-button--detail").click();
  await expect
    .poll(() => page.evaluate(() => String(window.__sobagCopiedSku || "").toLocaleLowerCase("ru-RU")))
    .toBe(firstSku.trim().toLocaleLowerCase("ru-RU"));
  await page.locator(".copy-sku-button--detail").focus();
  await expect
    .poll(() =>
      page.locator(".copy-sku-button--detail").evaluate((button) => {
        const styles = getComputedStyle(button);
        return styles.outlineStyle !== "none" && Number.parseFloat(styles.outlineWidth) >= 2;
      })
    )
    .toBe(true);

  const navolochka = page.locator('[data-variant-key="type"][data-variant-value="Наволочка"]');
  if (await navolochka.count()) {
    await navolochka.click();
    await expect(page.locator("#selectedSku")).not.toHaveText(firstSku);
  }

  await page.locator('[data-detail-qty-step="1"]').click();
  await expect(page.locator("#detailQty")).toHaveValue("1");
  await page.locator("[data-add-variant]").click();
  await expect(page.locator("#productModal")).toHaveCount(0);
  await expect(page.locator("#cartCount")).not.toHaveText("0");

  await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#saveCartDraftButton")).toBeVisible();
  await expect(page.locator("#downloadCartQuoteButton")).toBeVisible();
  await expect(page.locator("#printCartQuoteButton")).toBeVisible();
  await expect(page.locator(".cart-scale-step")).toHaveCount(4);
  await expect(page.locator("[data-qty-input]").first()).toHaveValue("1");
  await page.locator("[data-qty-plus]").first().click();
  await expect(page.locator("[data-qty-input]").first()).toHaveValue("2");
  await expect(page.locator("#checkoutButton")).toBeDisabled();
  await expect(page.locator("#cartPageMinHint")).toContainText("До минимальной суммы осталось");
  await page.locator("[data-qty-input]").first().fill("200");
  await expect(page.locator("#checkoutButton")).toBeEnabled();
  await page.locator("#checkoutButton").click();
  await expect(page.locator("#checkoutModal")).toBeVisible();
  await expect(page.locator("#checkoutModal .modal__close")).toHaveAttribute("aria-label", "Закрыть оформление заказа");
  await expect(page.locator('#checkoutForm input[name="name"]')).toBeVisible();
  await expect(page.locator('#checkoutForm input[name="email"]')).toBeVisible();
  await expect(page.locator('#checkoutForm input[name="phone"]')).toBeVisible();
  await expectNoHorizontalOverflow(page, "checkout modal");
  await page.locator('#checkoutForm button[type="submit"]').click();
  await expect(page.locator('#checkoutForm input[name="name"]')).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator('#checkoutForm input[name="name"]')).toBeFocused();
  await expect(page.locator("#checkoutForm .field-error").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#checkoutModal")).not.toHaveClass(/is-visible/);
});

test("product modal hydrates detail from server detail endpoint", async ({ page }) => {
  const sourceProducts = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "products-live.json"), "utf8"));
  const source = sourceProducts[0];
  const detailMarker = "QA detail endpoint marker";
  const imageUrl = source.image || "assets/production-workshop-1.png";
  const secondImageUrl = `${imageUrl}?qa-gallery=2`;
  const responsiveImage = {
    url: imageUrl,
    width: 900,
    height: 900,
    mime: "image/png",
    variants: [
      { url: `${imageUrl}?qa-detail-avif=320`, width: 320, height: 320, mime: "image/avif", format: "avif" },
      { url: `${imageUrl}?qa-detail-avif=640`, width: 640, height: 640, mime: "image/avif", format: "avif" },
      { url: `${imageUrl}?qa-detail-webp=320`, width: 320, height: 320, mime: "image/webp", format: "webp" },
    ],
  };
  const secondResponsiveImage = {
    url: secondImageUrl,
    width: 900,
    height: 900,
    mime: "image/png",
    variants: [
      { url: `${imageUrl}?qa-detail-second-avif=320`, width: 320, height: 320, mime: "image/avif", format: "avif" },
      { url: `${imageUrl}?qa-detail-second-webp=320`, width: 320, height: 320, mime: "image/webp", format: "webp" },
    ],
  };
  let detailRequested = false;

  await page.route("**/api/catalog-detail?**", async (route) => {
    detailRequested = true;
    const url = new URL(route.request().url());
    expect(url.searchParams.get("id")).toBeTruthy();
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({
        product: {
          ...source,
          status: "published",
          hidden: false,
          image: imageUrl,
          gallery: [imageUrl, secondImageUrl],
          images: [responsiveImage, secondResponsiveImage],
          description: "QA detail endpoint description",
          detailDescription: detailMarker,
        },
        source: "qa-detail",
      }),
    });
  });

  await page.goto(`${BASE_URL}/search?q=${encodeURIComponent(source.baseSku)}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page, 0);
  await page.locator(".product-card").first().locator("[data-open-product]").first().click();
  await expect.poll(() => detailRequested).toBe(true);
  await expect(page.locator("#productModal")).toContainText(detailMarker);
  await expect(page.locator("#productModal picture source[type='image/avif']").first()).toHaveAttribute("srcset", /qa-detail-avif=320/);
  await expect(page.locator("#productModal picture source[type='image/webp']").first()).toHaveAttribute("srcset", /qa-detail-webp=320/);
  await page.locator(".product-gallery__thumb").nth(1).click();
  await expect(page.locator("#detailMainImage")).toHaveAttribute("src", /qa-gallery=2/);
  const detailSourceOrder = await page.locator("#detailMainImage").evaluate((image) =>
    [...image.closest("picture").querySelectorAll("source")].map((source) => ({
      type: source.getAttribute("type"),
      srcset: source.getAttribute("srcset"),
    }))
  );
  expect(detailSourceOrder.map((source) => source.type)).toEqual(["image/avif", "image/webp"]);
  expect(detailSourceOrder[0].srcset).toContain("qa-detail-second-avif=320");

  const schemaText = await page.locator("#sobag-product-jsonld").textContent();
  const schema = JSON.parse(schemaText || "{}");
  expect(schema["@type"]).toBe("Product");
  expect(schema.sku).toBe(source.baseSku);
  expect(schema.description).toContain(detailMarker);
  expect(schema.offers.priceCurrency).toBe("RUB");

  await page.locator("#productModal .modal__close").click();
  await expect(page.locator("#sobag-product-jsonld")).toHaveCount(0);
});

test("catalog list renders server query cards and cursor pages", async ({ page }) => {
  const responsiveImage = {
    url: "assets/production-workshop-1.png",
    width: 900,
    height: 900,
    mime: "image/png",
    variants: [
      { url: "assets/production-workshop-1.png?qa-card-avif=320", width: 320, height: 320, mime: "image/avif", format: "avif" },
      { url: "assets/production-workshop-1.png?qa-card-avif=640", width: 640, height: 640, mime: "image/avif", format: "avif" },
      { url: "assets/production-workshop-1.png?qa-card-webp=320", width: 320, height: 320, mime: "image/webp", format: "webp" },
    ],
  };
  const firstCard = {
    id: "qa-server-query-1",
    baseSku: "QA-SERVER-001",
    name: "QA Server Query Card One",
    category: "QA Server",
    categories: ["QA Server"],
    collections: [],
    holidays: [],
    tags: ["qa-server"],
    image: "assets/production-workshop-1.png",
    imageMeta: responsiveImage,
    minPrice: 101,
    maxPrice: 101,
    variantCount: 1,
  };
  const secondCard = {
    ...firstCard,
    id: "qa-server-query-2",
    baseSku: "QA-SERVER-002",
    name: "QA Server Query Card Two",
    minPrice: 202,
    maxPrice: 202,
  };
  const requestedUrls = [];
  let fullCatalogRequested = false;

  await page.route("**/api/catalog", async (route) => {
    fullCatalogRequested = true;
    await route.fulfill({
      status: 500,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({ error: "unexpected_full_catalog_bootstrap" }),
    });
  });

  await page.route("**/api/catalog-query?**", async (route) => {
    const url = new URL(route.request().url());
    requestedUrls.push(url);
    const isSecondPage = url.searchParams.get("cursor") === "MQ";
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({
        items: [isSecondPage ? secondCard : firstCard],
        total: 2,
        facets: {
          categories: [{ value: "QA Server", count: 2 }],
          collections: [],
          holidays: [],
          tags: [{ value: "qa-server", count: 2 }],
          types: [],
          sizes: [],
          materials: [],
          stock: [],
        },
        facetOptions: {
          categories: [{ value: "QA Server", count: 2 }],
          collections: [],
          holidays: [],
          tags: [{ value: "qa-server", count: 2 }],
          types: [],
          sizes: [{ value: "QA Size", count: 2 }],
          materials: [{ value: "QA Material", count: 2 }],
          stock: [],
        },
        pageInfo: {
          page: isSecondPage ? 2 : 1,
          pageSize: 1,
          offset: isSecondPage ? 1 : 0,
          total: 2,
          totalPages: 2,
          hasMore: !isSecondPage,
          nextCursor: isSecondPage ? "" : "MQ",
        },
        source: "qa-query",
      }),
    });
  });

  await page.goto(`${BASE_URL}/catalog?category=${encodeURIComponent("QA Server")}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".product-card__sku").first()).toHaveText("QA-SERVER-001");
  await expect(page.locator(".product-card picture source[type='image/avif']").first()).toHaveAttribute("srcset", /qa-card-avif=320/);
  await expect(page.locator(".product-card picture source[type='image/webp']").first()).toHaveAttribute("srcset", /qa-card-webp=320/);
  await expect(page.locator("#productCount")).toContainText("2");
  await expect(page.locator('[data-filter-group="size"] .filter-options')).toContainText("QA Size");
  await expect(page.locator('[data-filter-group="material"] .filter-options')).toContainText("QA Material");
  await page.locator('[data-filter="size"][value="QA Size"]').check();
  await expect.poll(() => requestedUrls.some((url) => url.searchParams.get("size") === "QA Size")).toBe(true);
  await expect(page.locator("[data-show-more-products]")).toBeVisible();
  await page.locator(".product-card").first().evaluate((card) => {
    card.setAttribute("data-qa-stable-node", "server-first-page");
  });
  await page.locator("[data-show-more-products]").click();
  await expect(page.locator(".product-card__sku")).toHaveText(["QA-SERVER-001", "QA-SERVER-002"]);
  await expect(page.locator('.product-card[data-qa-stable-node="server-first-page"]')).toHaveCount(1);
  expect(requestedUrls[0].searchParams.get("category")).toBe("QA Server");
  expect(requestedUrls[0].searchParams.get("pageSize")).toBe("48");
  expect(requestedUrls.every((url) => url.searchParams.get("pageSize") === "48")).toBe(true);
  expect(requestedUrls.some((url) => url.searchParams.get("cursor") === "MQ")).toBe(true);
  expect(fullCatalogRequested).toBe(false);
});

test("catalog query cache renders repeat navigation while API refreshes", async ({ page }) => {
  const cachedCard = {
    id: "qa-cache-card-1",
    baseSku: "QA-CACHE-001",
    name: "QA Cached Catalog Card",
    category: "QA Cache",
    categories: ["QA Cache"],
    collections: [],
    holidays: [],
    tags: [],
    image: "assets/production-workshop-1.png",
    minPrice: 321,
    maxPrice: 321,
    variantCount: 1,
  };
  let queryRequests = 0;
  let fullCatalogRequested = false;
  let failApiAfterCache = false;

  await page.route("**/api/catalog", async (route) => {
    fullCatalogRequested = true;
    await route.fulfill({
      status: 500,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({ error: "unexpected_full_catalog_bootstrap" }),
    });
  });

  await page.route("**/api/catalog-query?**", async (route) => {
    queryRequests += 1;
    if (failApiAfterCache) {
      await route.fulfill({
        status: 503,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({ error: "temporary_unavailable" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({
        items: [cachedCard],
        total: 1,
        facets: { categories: [{ value: "QA Cache", count: 1 }], collections: [], holidays: [], tags: [], types: [], sizes: [], materials: [], stock: [] },
        facetOptions: { categories: [{ value: "QA Cache", count: 1 }], collections: [], holidays: [], tags: [], types: [], sizes: [], materials: [], stock: [] },
        pageInfo: { page: 1, pageSize: 48, offset: 0, total: 1, totalPages: 1, hasMore: false, nextCursor: "" },
        source: "qa-cache",
      }),
    });
  });

  await page.goto(`${BASE_URL}/catalog?category=${encodeURIComponent("QA Cache")}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".product-card__sku").first()).toHaveText("QA-CACHE-001");
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith("sobag.publicApiCache.v2./api/catalog-query?")))).toBe(true);

  failApiAfterCache = true;
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".product-card__sku").first()).toHaveText("QA-CACHE-001");
  expect(queryRequests).toBeGreaterThan(1);
  expect(fullCatalogRequested).toBe(false);
});

test("catalog server query keeps 10k pages bounded in DOM", async ({ page }) => {
  const pageSize = 48;
  const total = 10000;
  const requestedUrls = [];
  let fullCatalogRequested = false;
  const cardAt = (index) => ({
    id: `qa-scale-card-${String(index + 1).padStart(5, "0")}`,
    baseSku: `QA-SCALE-${String(index + 1).padStart(5, "0")}`,
    name: `QA Scale Card ${String(index + 1).padStart(5, "0")}`,
    category: "QA Scale",
    categories: ["QA Scale"],
    collections: [],
    holidays: [],
    tags: [],
    image: "assets/production-workshop-1.png",
    minPrice: 100 + index,
    maxPrice: 100 + index,
    variantCount: 1,
  });

  await page.route("**/api/catalog", async (route) => {
    fullCatalogRequested = true;
    await route.fulfill({
      status: 500,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({ error: "unexpected_full_catalog_bootstrap" }),
    });
  });

  await page.route("**/api/catalog-query?**", async (route) => {
    const url = new URL(route.request().url());
    requestedUrls.push(url);
    const offset = Number(url.searchParams.get("cursor") || 0) || 0;
    const items = Array.from({ length: pageSize }, (_, index) => cardAt(offset + index));
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({
        items,
        total,
        facets: { categories: [{ value: "QA Scale", count: total }], collections: [], holidays: [], tags: [], types: [], sizes: [], materials: [], stock: [] },
        facetOptions: { categories: [{ value: "QA Scale", count: total }], collections: [], holidays: [], tags: [], types: [], sizes: [], materials: [], stock: [] },
        pageInfo: {
          page: Math.floor(offset / pageSize) + 1,
          pageSize,
          offset,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasMore: offset + pageSize < total,
          nextCursor: String(offset + pageSize),
        },
        source: "qa-scale-query",
      }),
    });
  });

  await page.goto(`${BASE_URL}/catalog?category=${encodeURIComponent("QA Scale")}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".product-card")).toHaveCount(pageSize);
  await expect(page.locator("#productCount")).toContainText("10000");
  await page.locator(".product-card").first().evaluate((card) => card.setAttribute("data-qa-stable-node", "scale-first-page"));

  for (const expectedCount of [96, 144, 192]) {
    await page.locator("[data-show-more-products]").click();
    await expect(page.locator(".product-card")).toHaveCount(expectedCount);
  }

  await expect(page.locator('.product-card[data-qa-stable-node="scale-first-page"]')).toHaveCount(1);
  expect(requestedUrls.every((url) => url.searchParams.get("pageSize") === "48")).toBe(true);
  expect(requestedUrls.length).toBeLessThanOrEqual(5);
  expect([...new Set(requestedUrls.map((url) => url.searchParams.get("cursor") || "0"))]).toEqual(["0", "48", "96", "144"]);
  expect(fullCatalogRequested).toBe(false);
});

test("search prioritizes exact sku and shows case-insensitive image suggestions", async ({ page }) => {
  await page.goto(`${BASE_URL}/catalog.html`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);

  const sku = await page.locator(".product-card__sku").first().innerText();
  await page.locator("#searchInput").fill(sku.trim());
  await page.locator("#searchInput").press("Enter");
  await expect(page).toHaveURL(/\/search(?:\.html)?\?q=/);
  await waitForLiveProducts(page, 0);
  await expect(page.locator(".product-card").first().locator(".product-card__sku")).toHaveText(sku.trim());
  await expect(page.locator("#searchResultsPanel")).toBeVisible();

  await page.locator("#searchInput").fill("ПодУШКа");
  await expect(page.locator(".search-suggestions")).toBeVisible();
  await expect(page.locator(".search-suggestions img").first()).toBeVisible();
  await expect(page.locator(".search-suggestions em").first()).toContainText(/подушка/i);
  await expect(page.locator(".search-results-panel__quick button").first()).toBeVisible();
});

test("product reviews require login and can be moderated by admin", async ({ page }) => {
  test.setTimeout(90000);
  const category = await largestCategory(page);
  await page.goto(`${BASE_URL}/catalog?category=${encodeURIComponent(category)}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);
  const reviewedProductId = (await page.locator("[data-open-product]").first().getAttribute("data-open-product")) || "";
  const reviewedBaseSku = await page.locator(".product-card__sku").first().innerText();
  await page.locator("[data-open-product]").first().click();
  await expect(page.locator(".product-reviews")).toBeVisible();
  await expect(page.locator(".review-login-note")).toContainText("зарегистрированные покупатели");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".review-login-note .ghost-button")).toBeVisible();
  await expectNoHorizontalOverflow(page, "anonymous review mobile notice");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator(".modal__close").click();
  await expect(page.locator("#productModal")).toHaveCount(0);

  let authUser = { email: "buyer@example.com", name: "Buyer", role: "buyer" };
  let buyerOrders = [];
  let buyerReviews = [];
  const review = {
    id: "REV-QA-1",
    productId: reviewedProductId,
    baseSku: reviewedBaseSku.trim(),
    productName: "QA product",
    rating: 3,
    text: "QA review text",
    status: "pending",
    userEmail: "buyer@example.com",
    authorName: "Buyer",
    createdAt: new Date().toISOString(),
  };

  await page.route("**/api/auth/me", async (route) => {
    if (route.request().method() === "PUT") {
      const body = JSON.parse(route.request().postData() || "{}");
      if (body.review) {
        expect(body.review.rating).toBe(3);
        expect(body.review.text).toContain("QA review");
        buyerReviews = [review];
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: { ...authUser, reviews: buyerReviews, orders: buyerOrders }, cartItems: [], favoriteItems: [], savedCarts: [] }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: { ...authUser, orders: buyerOrders, reviews: buyerReviews }, cartItems: [], favoriteItems: [], savedCarts: [] }),
    });
  });
  await page.route("**/api/admin/content**", async (route) => {
    if (!route.request().url().includes("reviews=1")) return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reviews: [review] }),
    });
  });
  await page.route("**/api/admin/users**", async (route) => {
    const url = route.request().url();
    if (url.includes("audit=1")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          audit: [
            {
              id: "AUD-QA-REVIEW",
              type: "review_update",
              action: "review_update",
              actor: "admin@sobag",
              reviewId: "REV-QA-1",
              status: "approved",
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ users: [{ email: "admin@sobag", name: "Admin", role: "admin" }] }),
    });
  });

  await page.evaluate(() => {
    localStorage.setItem("sobag.currentUser", "buyer@example.com");
    localStorage.setItem("sobag.users", JSON.stringify({ "buyer@example.com": { email: "buyer@example.com", name: "Buyer", role: "buyer" } }));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);
  await page.locator("[data-open-product]").first().click();
  await expect(page.locator(".review-login-note")).toContainText("после заказа");
  await expect(page.locator(".review-form")).toHaveCount(0);
  await page.locator(".modal__close").click();
  buyerOrders = [
    {
      id: "SO-QA-REVIEW-ORDER",
      status: "done",
      userEmail: "buyer@example.com",
      items: [
        {
          productId: reviewedProductId,
          baseSku: reviewedBaseSku.trim(),
          key: reviewedBaseSku.trim(),
          variant: { sku: reviewedBaseSku.trim(), name: "QA product", price: 1000 },
          qty: 1,
        },
      ],
    },
  ];
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);
  await page.locator("[data-open-product]").first().click();
  await expect(page.locator(".review-form")).toBeVisible();
  await expect(page.locator('[data-review-star="5"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-review-star="3"]').click();
  await expect(page.locator('[data-review-star="3"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-review-star="4"]')).toHaveAttribute("aria-pressed", "false");
  await page.locator('.review-form textarea[name="text"]').fill("QA review text");
  await page.locator(".review-form").getByRole("button", { name: /Отправить отзыв/i }).click();
  await expect(page.locator("#toast")).toContainText("Отзыв отправлен");
  await page.locator(".modal__close").click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);
  await page.locator("[data-open-product]").first().click();
  await expect(page.locator(".review-login-note")).toContainText("уже отправили отзыв");
  await expect(page.locator(".review-form")).toHaveCount(0);
  await page.locator(".modal__close").click();

  authUser = { email: "admin@sobag", name: "Admin", role: "admin" };
  await page.evaluate(() => {
    localStorage.setItem("sobag.currentUser", "admin@sobag");
    localStorage.setItem("sobag.users", JSON.stringify({ "admin@sobag": { email: "admin@sobag", name: "Admin", role: "admin" } }));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#accountButton").click();
  await expect(page.locator(".admin-audit-summary")).toContainText("Аудит админ-действий");
  await expect(page.locator(".admin-audit-summary")).toContainText("Отзыв обновлен");
  await expect(page.locator(".admin-audit-summary")).toContainText("REV-QA-1");
  await page.locator("[data-open-admin]").click();
  await expect(page.locator("#adminReviewsPanel")).toContainText("QA review text");
  await expect(page.locator('[data-review-status="REV-QA-1"][data-review-status-value="approved"]')).toBeVisible();
  await expect(page.locator('[data-delete-review="REV-QA-1"]')).toBeVisible();
});
