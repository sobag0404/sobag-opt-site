const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.SOBAG_BASE_URL || "http://127.0.0.1:4173";

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
  });
});

test("manager order pages can open guest customer history", async ({ page }) => {
  const order = {
    id: "SO-QA-GUEST",
    status: "new",
    date: "01.06.2026",
    total: 12345,
    userEmail: "",
    customer: { email: "guest@example.com", name: "Guest Buyer", phone: "+79990000000", address: "Moscow" },
    items: [{ qty: 2, variant: { sku: "opt_test_POD_40x40_VEL", name: "Test pillow", price: 1000 } }],
  };
  await page.evaluate((record) => {
    localStorage.setItem("sobag.orders.v1", JSON.stringify([record]));
    localStorage.setItem("sobag.currentUser", "admin@sobag");
    localStorage.setItem("sobag.users", JSON.stringify({ "admin@sobag": { email: "admin@sobag", name: "Admin", role: "admin", orders: [] } }));
  }, order);

  await page.goto(`${BASE_URL}/admin-order.html?id=SO-QA-GUEST`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#adminOrderPage")).toContainText("SO-QA-GUEST");
  await expect(page.locator("#adminOrderPage")).toContainText("Guest Buyer");

  await page.goto(`${BASE_URL}/admin-customer.html?email=guest@example.com`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#adminCustomerPage")).toContainText("Guest Buyer");
  await expect(page.locator("#adminCustomerPage")).toContainText("SO-QA-GUEST");

  await page.goto(`${BASE_URL}/admin-orders.html?q=guest`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#adminOrdersPage")).toContainText("SO-QA-GUEST");
  await expect(page.locator("#adminOrdersPage")).toContainText("Guest Buyer");
});

async function waitForLiveProducts(page) {
  await page.waitForFunction(() => document.querySelectorAll(".product-card").length > 10);
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
    `/catalog.html?category=${encodeURIComponent("Подушки")}`,
    "/cart.html",
    "/favorites.html",
    "/admin-orders.html",
    "/marketplaces.html",
    "/about.html",
    "/contacts.html",
  ];

  for (const route of routes) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
    if (route.includes("catalog")) await waitForLiveProducts(page);
    await expectNoHorizontalOverflow(page);
  }
});

test("catalog navigation and favorite toggles do not reload the same document", async ({ page }) => {
  await page.goto(`${BASE_URL}/catalog.html?category=${encodeURIComponent("Подушки")}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);

  await page.evaluate(() => localStorage.setItem("__sobagQaDocumentLoads", "0"));
  await page.getByRole("button", { name: /^каталог$/i }).first().click();
  await page.waitForTimeout(250);
  await expect(page).toHaveURL(/\/catalog(?:\.html)?$/);
  await expect(page.locator("#catalogHome")).toBeVisible();
  await expect.poll(() => page.evaluate(() => Number(localStorage.getItem("__sobagQaDocumentLoads") || "0"))).toBe(0);

  await page.goto(`${BASE_URL}/catalog.html?category=${encodeURIComponent("Подушки")}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);
  await page.evaluate(() => localStorage.setItem("__sobagQaDocumentLoads", "0"));
  const favorite = page.locator(".favorite-button").first();
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => page.evaluate(() => Number(localStorage.getItem("__sobagQaDocumentLoads") || "0"))).toBe(0);
});

test("catalog filters, product modal, variants, and cart stay coherent", async ({ page }) => {
  await page.goto(`${BASE_URL}/catalog.html?category=${encodeURIComponent("Подушки")}`, { waitUntil: "domcontentloaded" });
  await waitForLiveProducts(page);

  await expect(page.locator("#catalogTitle")).toContainText("Подушки");
  await expect(page.locator('[data-filter-group="category"]')).toHaveCount(0);
  await expect(page.locator(".product-card")).toHaveCount(await page.locator(".product-card").count());

  const firstCard = page.locator(".product-card").first();
  const baseSku = await firstCard.locator(".product-card__sku").innerText();
  await expect(baseSku.trim()).toMatch(/^opt_/i);
  await firstCard.locator("[data-open-product]").first().click();

  await expect(page.locator("#productModal")).toBeVisible();
  await expect(page.locator("#detailQty")).toHaveValue("0");
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
