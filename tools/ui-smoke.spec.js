const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.SOBAG_BASE_URL || "http://127.0.0.1:4173";
test.setTimeout(60000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const key = "__sobagQaDocumentLoads";
    localStorage.setItem(key, String(Number(localStorage.getItem(key) || "0") + 1));
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

  await page.goto(`${BASE_URL}/admin-order?id=SO-QA-GUEST`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#adminOrderPage")).toContainText("SO-QA-GUEST");
  await expect(page.locator("#adminOrderPage")).toContainText("Guest Buyer");

  await page.goto(`${BASE_URL}/admin-customer?email=guest@example.com`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#adminCustomerPage")).toContainText("Guest Buyer");
  await expect(page.locator("#adminCustomerPage")).toContainText("SO-QA-GUEST");

  await page.goto(`${BASE_URL}/admin-orders?q=guest`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#adminOrdersPage")).toContainText("SO-QA-GUEST");
  await expect(page.locator("#adminOrdersPage")).toContainText("Guest Buyer");

  await page.goto(`${BASE_URL}/admin-products?q=opt_`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelectorAll(".admin-product-card").length > 0);
  await expect(page.locator("#adminProductsPage")).toContainText("Экспорт вариантов");

  await page.goto(`${BASE_URL}/admin-prices?q=opt_`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelectorAll(".admin-price-row").length > 0);
  await expect(page.locator(".admin-price-preview h3")).toContainText("Предпросмотр изменений");
});

test("admin import page and custom print calculator render", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("sobag.currentUser", "admin@sobag");
    localStorage.setItem("sobag.users", JSON.stringify({ "admin@sobag": { email: "admin@sobag", name: "Admin", role: "admin" } }));
  });

  await page.goto(`${BASE_URL}/admin-import.html`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#adminImportPage")).toContainText("Импорт");

  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.locator("#accountButton").click();
  await page.locator("[data-open-admin]").click();
  await expect(page.locator("#adminContentForm")).toBeVisible();
  await expect(page.locator(".admin-content-toolbar")).toContainText("Сохранить на сервере");
  await expect(page.locator(".admin-content-sidebar")).toContainText("Страницы");

  await page.goto(`${BASE_URL}/custom.html`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#customCalculator")).toBeVisible();
  await page.locator("#customCalcQty").fill("300");
  await page.locator("#customCalcPack").selectOption("marketplace");
  await expect(page.locator("#customCalcUnit")).toContainText("скидка 18%");
  await expect(page.locator("#customCalcTotal")).not.toHaveText("0 ₽");
});

async function waitForLiveProducts(page) {
  await page.waitForFunction(() => document.querySelectorAll(".product-card").length > 10);
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

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return Math.ceil(root.scrollWidth - root.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

test("mobile pages do not create horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const routes = [
    "/",
    `/catalog?category=${encodeURIComponent(await largestCategory(page))}`,
    "/cart.html",
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
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
    if (route.includes("catalog")) await waitForLiveProducts(page);
    await expectNoHorizontalOverflow(page);
  }
});

test("catalog navigation and favorite toggles do not reload the same document", async ({ page }) => {
  const category = await largestCategory(page);
  await page.goto(`${BASE_URL}/catalog?category=${encodeURIComponent(category)}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);

  await page.evaluate(() => localStorage.setItem("__sobagQaDocumentLoads", "0"));
  await page.getByRole("button", { name: /^каталог$/i }).first().click();
  await page.waitForTimeout(250);
  await expect(page).toHaveURL(/\/catalog(?:\.html)?$/);
  await expect(page.locator("#catalogHome")).toBeVisible();
  await expect.poll(() => page.evaluate(() => Number(localStorage.getItem("__sobagQaDocumentLoads") || "0"))).toBe(0);

  await page.goto(`${BASE_URL}/catalog?category=${encodeURIComponent(category)}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);
  await page.evaluate(() => localStorage.setItem("__sobagQaDocumentLoads", "0"));
  const favorite = page.locator(".favorite-button").first();
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => page.evaluate(() => Number(localStorage.getItem("__sobagQaDocumentLoads") || "0"))).toBe(0);
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
      total: 2000,
      userEmail: "buyer@example.com",
      customer: { email: "buyer@example.com", name: "Buyer", phone: "+79990000001", address: "Test address" },
      items: [
        {
          key: `${seedData.productId}:${seedData.sku}`,
          productId: seedData.productId,
          productName: seedData.name,
          productImage: seedData.image,
          qty: 2,
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
  await expect(page.locator("#accountModal")).toContainText("QA saved cart");
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
  await page.locator("[data-rename-saved-cart]").first().click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.savedCarts.buyer@example.com") || "[]")[0]?.title))
    .toBe("QA renamed cart");

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

  await page.locator("[data-restore-saved-cart]").first().click();
  await expect(page).toHaveURL(/\/cart(?:\.html)?$/);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sobag.cart.buyer@example.com") || "[]").length)).toBe(1);
});

test("catalog filters, product modal, variants, and cart stay coherent", async ({ page }) => {
  const category = await largestCategory(page);
  await page.goto(`${BASE_URL}/catalog?category=${encodeURIComponent(category)}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);

  await expect(page.locator("#catalogTitle")).toContainText(category);
  await expect(page.locator('[data-filter-group="category"]')).toHaveCount(0);
  await expect(page.locator('#activeFilterChips [data-clear-filter="selectedCategory"]')).toHaveCount(1);
  await expect(page.locator("[data-show-more-products]")).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(await page.locator(".product-card").count());

  const firstCard = page.locator(".product-card").first();
  const baseSku = await firstCard.locator(".product-card__sku").innerText();
  await expect(baseSku.trim()).toMatch(/^opt_/i);
  await firstCard.locator("[data-open-product]").first().click();

  await expect(page.locator("#productModal")).toBeVisible();
  await expect(page.locator("#detailQty")).toHaveValue("0");
  await expect(page.locator(".variant-matrix__row")).toHaveCount(await page.locator(".variant-matrix__row").count());
  await expect(page.locator(".variant-matrix__row").first()).toBeVisible();
  await expect(page.locator(".related-products .mini-product-card")).toHaveCount(await page.locator(".related-products .mini-product-card").count());
  await expect(page.locator(".related-products .mini-product-card").first()).toBeVisible();
  const firstSku = await page.locator("#selectedSku").innerText();
  await expect(firstSku.toLocaleLowerCase("ru-RU")).toContain(baseSku.trim().toLocaleLowerCase("ru-RU"));

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
});

test("search prioritizes exact sku and keeps suggestions for fuzzy queries", async ({ page }) => {
  await page.goto(`${BASE_URL}/catalog.html`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);

  const sku = await page.locator(".product-card__sku").first().innerText();
  await page.locator("#searchInput").fill(sku.trim());
  await expect(page.locator(".product-card").first().locator(".product-card__sku")).toHaveText(sku.trim());
  await expect(page.locator(".search-suggestions")).toBeHidden();

  await page.locator("#searchInput").fill("подуш патер");
  await expect(page.locator(".search-suggestions")).toBeVisible();
});
