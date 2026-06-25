import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.SOBAG_FRONTEND_BASE_URL || "http://127.0.0.1:4173";
const CATEGORY = "\u041f\u043e\u0434\u0443\u0448\u043a\u0438";
const STALE_48_RE = /48\s+\u0442\u043e\u0432\u0430\u0440/i;
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1366, height: 900 },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}/catalog.html`);
      if (response.ok) return;
    } catch {
      // Keep polling while the local static server starts.
    }
    await wait(150);
  }
  throw new Error(`frontend server is not ready at ${BASE_URL}`);
}

function withQa(path, qa) {
  return `${path}${path.includes("?") ? "&" : "?"}qa=${encodeURIComponent(qa)}`;
}

async function pageMetrics(page) {
  const bodyText = await page.locator("body").innerText({ timeout: 1500 }).catch(() => "");
  const metrics = await page.evaluate(() => {
    const productImages = [...document.querySelectorAll('.product-card [data-product-image="true"]')];
    const catalogButton = document.querySelector(".catalog-button");
    const catalogRect = catalogButton?.getBoundingClientRect();
    const catalogCenter =
      catalogRect && catalogRect.width && catalogRect.height
        ? document.elementFromPoint(catalogRect.left + catalogRect.width / 2, catalogRect.top + catalogRect.height / 2)
        : null;
    return {
      categoryTiles: document.querySelectorAll("#categoryTiles .category-tile").length,
      categoryLoading: document.querySelectorAll("#categoryTiles .category-tile--loading").length,
      productCards: document.querySelectorAll("#productGrid .product-card:not(.product-card--skeleton)").length,
      skeletonCards: document.querySelectorAll("#productGrid .product-card--skeleton").length,
      firstImageLoading: productImages[0]?.getAttribute("loading") || "",
      firstImagePriority: productImages[0]?.getAttribute("fetchpriority") || "",
      fourthImageLoading: productImages[3]?.getAttribute("loading") || "",
      fifthImageLoading: productImages[4]?.getAttribute("loading") || "",
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      catalogButtonClickable: Boolean(catalogCenter?.closest?.(".catalog-button")),
    };
  });
  return { ...metrics, hasStale48: STALE_48_RE.test(bodyText) };
}

async function measureCatalogHome(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const startedAt = Date.now();
  await page.goto(`${BASE_URL}${withQa("/catalog.html", `speed-home-${viewport.name}`)}`, { waitUntil: "domcontentloaded" });
  await page.locator("#categoryTiles .category-tile, #categoryTiles .category-tile--loading").first().waitFor({ state: "visible", timeout: 1600 });
  const firstVisibleMs = Date.now() - startedAt;
  await page.locator("#categoryTiles .category-tile").first().waitFor({ state: "visible", timeout: 2500 });
  const readyMs = Date.now() - startedAt;
  await wait(120);
  const metrics = await pageMetrics(page);
  assert(metrics.categoryTiles >= 6, `${viewport.name} catalog home should show real category tiles`);
  assert(metrics.productCards === 0, `${viewport.name} catalog home should not render hidden product cards`);
  assert(metrics.skeletonCards === 0, `${viewport.name} catalog home should not keep product skeletons`);
  assert(!metrics.hasStale48, `${viewport.name} catalog home shows stale 48 товаров`);
  assert(metrics.overflow <= 1, `${viewport.name} catalog home has horizontal overflow ${metrics.overflow}`);
  assert(firstVisibleMs <= 1800, `${viewport.name} category first visible ${firstVisibleMs}ms is too slow`);
  await page.close();
  return { route: "catalog-home", viewport: viewport.name, firstVisibleMs, readyMs, ...metrics };
}

async function measureCategoryListing(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const apiRequests = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/")) apiRequests.push(url);
  });
  const startedAt = Date.now();
  const path = `/catalog?category=${encodeURIComponent(CATEGORY)}`;
  await page.goto(`${BASE_URL}${withQa(path, `speed-list-${viewport.name}`)}`, { waitUntil: "domcontentloaded" });
  await page.locator("#productGrid .product-card:not(.product-card--skeleton)").first().waitFor({ state: "visible", timeout: 4000 });
  const firstCardMs = Date.now() - startedAt;
  await wait(120);
  const metrics = await pageMetrics(page);
  assert(metrics.productCards > 0 && metrics.productCards <= 48, `${viewport.name} category listing should render a bounded first page`);
  assert(metrics.firstImageLoading === "eager", `${viewport.name} first product image should be eager`);
  assert(metrics.firstImagePriority === "high", `${viewport.name} first product image should be high priority`);
  assert(metrics.fourthImageLoading === "eager", `${viewport.name} fourth product image should be eager`);
  assert(metrics.fifthImageLoading === "lazy", `${viewport.name} fifth product image should stay lazy`);
  assert(!metrics.hasStale48, `${viewport.name} category listing shows stale 48 товаров text`);
  assert(metrics.overflow <= 1, `${viewport.name} category listing has horizontal overflow ${metrics.overflow}`);
  assert(firstCardMs <= 2500, `${viewport.name} first category card ${firstCardMs}ms is too slow`);
  const firstPageRequests = apiRequests.filter((url) => url.pathname === "/api/catalog-query" && url.searchParams.get("category") === CATEGORY && !url.searchParams.get("cursor"));
  assert(firstPageRequests.length <= 1, `${viewport.name} category listing made duplicate first-page catalog-query requests`);
  await page.close();
  return { route: "category-listing", viewport: viewport.name, firstCardMs, apiRequests: apiRequests.length, ...metrics };
}

async function measureRepeatAndSpa(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE_URL}/catalog.html?qa=speed-repeat-seed`, { waitUntil: "domcontentloaded" });
  await page.locator("#categoryTiles .category-tile:not(.category-tile--loading)").first().waitFor({ state: "visible", timeout: 3000 });

  let startedAt = Date.now();
  await page.goto(`${BASE_URL}/catalog.html?qa=speed-repeat`, { waitUntil: "domcontentloaded" });
  await page.locator("#categoryTiles .category-tile:not(.category-tile--loading)").first().waitFor({ state: "visible", timeout: 1200 });
  const repeatMs = Date.now() - startedAt;
  const repeatMetrics = await pageMetrics(page);
  assert(repeatMetrics.categoryTiles >= 6 && repeatMetrics.categoryLoading === 0, "repeat catalog home should show cached category counts immediately");
  assert(repeatMetrics.productCards === 0, "repeat catalog home should not render hidden product cards");
  assert(!repeatMetrics.hasStale48, "repeat catalog home shows stale 48 товаров");

  const listingPath = `/catalog?category=${encodeURIComponent(CATEGORY)}&qa=speed-spa-seed`;
  await page.goto(`${BASE_URL}${listingPath}`, { waitUntil: "domcontentloaded" });
  await page.locator("#productGrid .product-card:not(.product-card--skeleton)").first().waitFor({ state: "visible", timeout: 4000 });
  startedAt = Date.now();
  await page.locator('[data-nav="catalog.html"]').first().click({ timeout: 5000 });
  await page.locator("#catalogHome").waitFor({ state: "visible", timeout: 1500 });
  await page.locator("#categoryTiles .category-tile").first().waitFor({ state: "visible", timeout: 1500 });
  const spaMs = Date.now() - startedAt;
  const spaMetrics = await pageMetrics(page);
  assert(spaMetrics.catalogButtonClickable, "mobile Catalog header button is overlapped");
  assert(spaMetrics.productCards === 0, "SPA catalog home should not render hidden product cards");
  assert(!spaMetrics.hasStale48, "SPA catalog home shows stale 48 товаров");
  await page.close();
  return [
    { route: "catalog-repeat", viewport: "mobile", firstVisibleMs: repeatMs, ...repeatMetrics },
    { route: "spa-category-to-home", viewport: "mobile", firstVisibleMs: spaMs, ...spaMetrics },
  ];
}

async function measureStaticPage(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const startedAt = Date.now();
  await page.goto(`${BASE_URL}/delivery.html?qa=speed-static`, { waitUntil: "domcontentloaded" });
  await page.locator("main").waitFor({ state: "visible", timeout: 1000 });
  const visibleMs = Date.now() - startedAt;
  const metrics = await pageMetrics(page);
  assert(metrics.productCards === 0, "static content page should not render catalog product cards");
  assert(metrics.overflow <= 1, `static content page has horizontal overflow ${metrics.overflow}`);
  await page.close();
  return { route: "static-delivery", viewport: "mobile", firstVisibleMs: visibleMs, ...metrics };
}

async function assertResponsiveProductImageSizes(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE_URL}/catalog.html?qa=speed-image-sizes`, { waitUntil: "domcontentloaded" });
  const sizes = await page.evaluate(() => {
    const utils = window.SobagProductUtils;
    const product = {
      image: "/media/products/test/cover.jpg",
      images: [
        {
          url: "/media/products/test/cover.jpg",
          variants: [
            { url: "/media/products/test/cover-320.webp", width: 320, format: "webp" },
            { url: "/media/products/test/cover-640.webp", width: 640, format: "webp" },
            { url: "/media/products/test/cover-960.avif", width: 960, format: "avif" },
          ],
        },
      ],
    };
    const extract = (html) => {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      return wrapper.querySelector("source")?.getAttribute("sizes") || "";
    };
    return {
      card: extract(utils.productPictureHtml(product, product.image, "card", "", utils.PRODUCT_CARD_IMAGE_SIZES)),
      detail: extract(utils.productPictureHtml(product, product.image, "detail", "", utils.PRODUCT_DETAIL_IMAGE_SIZES)),
      thumb: extract(utils.productPictureHtml(product, product.image, "thumb", "", utils.PRODUCT_THUMB_IMAGE_SIZES)),
    };
  });
  assert(sizes.card.includes("260px"), "product card responsive sources should use card-sized candidates");
  assert(sizes.detail.includes("520px"), "detail image responsive sources should use detail-sized candidates");
  assert(sizes.thumb === "80px", "thumbnail responsive sources should use compact candidates");
  await page.close();
  return { route: "responsive-product-image-sizes", viewport: "mobile", ...sizes };
}

async function main() {
  const server = process.env.SOBAG_FRONTEND_BASE_URL
    ? null
    : spawn(process.execPath, ["tools/static-server.mjs", "--port", "4173"], { cwd: process.cwd(), stdio: "ignore" });
  try {
    await waitForServer();
    const browser = await chromium.launch({ headless: true });
    const results = [];
    for (const viewport of VIEWPORTS) {
      results.push(await measureCatalogHome(browser, viewport));
      results.push(await measureCategoryListing(browser, viewport));
    }
    results.push(...(await measureRepeatAndSpa(browser)));
    results.push(await measureStaticPage(browser));
    results.push(await assertResponsiveProductImageSizes(browser));
    await browser.close();
    console.log("Frontend perceived speed smoke passed");
    console.log(JSON.stringify(results, null, 2));
  } finally {
    server?.kill();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
