#!/usr/bin/env node
import { createServer } from "node:http";
import { once } from "node:events";
import { chromium } from "@playwright/test";

const DEFAULT_BASE_URL = "https://sobag-shop.online";
const CATEGORY = "\u041f\u043e\u0434\u0443\u0448\u043a\u0438";
const STALE_48_RE = /48\s+\u0442\u043e\u0432\u0430\u0440/i;

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.LIVE_BASE_URL || process.env.SOBAG_PRODUCTION_BASE_URL || DEFAULT_BASE_URL,
    timeoutMs: 20000,
    selfTest: false,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") args.baseUrl = argv[++index] || args.baseUrl;
    else if (arg === "--timeout") args.timeoutMs = Number(argv[++index]) || args.timeoutMs;
    else if (arg === "--self-test") args.selfTest = true;
    else if (arg === "--help") {
      console.log(`Usage: node tools/live-ui-smoke.mjs [--base-url ${DEFAULT_BASE_URL}] [--timeout 20000] [--self-test]`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  args.baseUrl = args.baseUrl.replace(/\/$/, "");
  return args;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeText(value) {
  return String(value || "").replace(/[^\x20-\x7e\u0400-\u04ff]/g, " ").slice(0, 500);
}

async function clickCatalogNav(page) {
  const locators = [
    page.locator('[data-nav="catalog.html"]').first(),
    page.locator('a[href="/catalog.html"]').first(),
    page.locator('a[href="catalog.html"]').first(),
    page.locator(".catalog-button").first(),
  ];
  for (const locator of locators) {
    if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => false))) {
      await locator.click({ timeout: 5000 });
      return;
    }
  }
  throw new Error("catalog navigation control not found");
}

async function collectPageText(page) {
  return page.locator("body").innerText({ timeout: 3000 }).catch(() => "");
}

async function pageSummary(page) {
  return page.evaluate(() => {
    const categoryTiles = [...document.querySelectorAll("#categoryTiles .category-tile:not(.category-tile--loading)")];
    const productCards = [...document.querySelectorAll("#productGrid .product-card:not(.product-card--skeleton), .product-card:not(.product-card--skeleton)")];
    const productImages = productCards
      .flatMap((card) => [...card.querySelectorAll('img[data-product-image="true"], .product-card img')])
      .filter((image) => {
        const rect = image.getBoundingClientRect();
        return rect.width > 10 && rect.height > 10;
      })
      .slice(0, 8)
      .map((image) => ({
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        src: image.currentSrc || image.src || "",
      }));
    return {
      title: document.title || "",
      header: Boolean(document.querySelector("header, .site-header, .topline, .catalog-button")),
      catalogNav: Boolean(document.querySelector('[data-nav="catalog.html"], a[href="/catalog.html"], a[href="catalog.html"], .catalog-button')),
      categoryTiles: categoryTiles.length,
      productCards: productCards.length,
      productImages,
      cartShell: Boolean(document.querySelector("#cartPage, [data-cart-page], .cart-page, [data-open-cart], #cartItems, #checkoutForm")),
      checkoutShell: Boolean(document.querySelector("#checkoutForm, [data-checkout], [data-open-checkout], .checkout-modal, .cart-summary")),
      swSupported: "serviceWorker" in navigator,
      cacheSupported: "caches" in window,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

function wireErrorCapture(page, label, errors) {
  page.on("pageerror", (error) => {
    errors.push(`${label} pageerror ${safeText(error.message)}`);
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = safeText(message.text());
    if (/favicon|Failed to load resource: the server responded with a status of 404/i.test(text)) return;
    errors.push(`${label} console ${text}`);
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status < 400) return;
    const url = response.url();
    const resourceType = response.request().resourceType();
    const expectedAnonymous =
      /\/api\/admin\//.test(url) ||
      /\/api\/orders(?:$|\?)/.test(url) ||
      /\/api\/auth\/me(?:$|\?)/.test(url);
    if (expectedAnonymous && [200, 401, 403, 405].includes(status)) return;
    if (url.endsWith("/favicon.ico")) return;
    if (["document", "script", "stylesheet", "image", "fetch", "xhr"].includes(resourceType)) {
      errors.push(`${label} response ${status} ${safeText(url)}`);
    }
  });
}

async function gotoChecked(page, path, label, timeoutMs) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  assert(response && response.status() < 400, `${label} navigation returned ${response?.status() || "no response"}`);
}

async function verifyRoot(page, baseUrl, timeoutMs) {
  await gotoChecked(page, `${baseUrl}/`, "root", timeoutMs);
  await page.locator("body").waitFor({ state: "visible", timeout: 5000 });
  const summary = await pageSummary(page);
  assert(summary.header, "root should render main shell/header");
  assert(summary.catalogNav, "root should expose catalog navigation");
  return { route: "/", header: summary.header, catalogNav: summary.catalogNav, overflow: summary.overflow };
}

async function verifyCatalogHome(page, baseUrl, timeoutMs) {
  await gotoChecked(page, `${baseUrl}/catalog.html?live-ui-smoke=home`, "catalog home", timeoutMs);
  await page.locator("#categoryTiles .category-tile, #categoryTiles .category-tile--loading").first().waitFor({ state: "visible", timeout: 8000 });
  await page.locator("#categoryTiles .category-tile:not(.category-tile--loading)").first().waitFor({ state: "visible", timeout: 12000 });
  await wait(250);
  const text = await collectPageText(page);
  const summary = await pageSummary(page);
  assert(summary.categoryTiles >= 4, `catalog home should show category tiles, got ${summary.categoryTiles}`);
  assert(!STALE_48_RE.test(text), "catalog home shows stale page-sized 48 \u0442\u043e\u0432\u0430\u0440\u043e\u0432");
  assert(summary.overflow <= 2, `catalog home has horizontal overflow ${summary.overflow}`);
  return { route: "/catalog.html", categoryTiles: summary.categoryTiles, overflow: summary.overflow };
}

async function verifyListingToCatalog(page, baseUrl, timeoutMs) {
  await gotoChecked(page, `${baseUrl}/catalog.html?live-ui-smoke=listing-source`, "catalog home before listing", timeoutMs);
  await page.locator("#categoryTiles .category-tile:not(.category-tile--loading)").first().waitFor({ state: "visible", timeout: 12000 });
  const categoryTile = page.locator("#categoryTiles .category-tile", { hasText: CATEGORY }).first();
  if ((await categoryTile.count()) > 0) await categoryTile.click({ timeout: 5000 });
  else await page.locator("#categoryTiles .category-tile").first().click({ timeout: 5000 });
  await page.locator("#productGrid .product-card:not(.product-card--skeleton), .product-card:not(.product-card--skeleton)").first().waitFor({
    state: "visible",
    timeout: 12000,
  });
  await wait(250);
  const listingSummary = await pageSummary(page);
  assert(listingSummary.productCards > 0, "category listing should show product cards");
  assert(listingSummary.productImages.some((image) => image.complete && image.naturalWidth > 0), "category listing should load at least one product image");
  await clickCatalogNav(page);
  await page.locator("#catalogHome, #categoryTiles").first().waitFor({ state: "visible", timeout: 8000 });
  await page.locator("#categoryTiles .category-tile:not(.category-tile--loading)").first().waitFor({ state: "visible", timeout: 12000 });
  await wait(250);
  const text = await collectPageText(page);
  const summary = await pageSummary(page);
  assert(summary.categoryTiles >= 4, "SPA catalog return should show category tiles");
  assert(!STALE_48_RE.test(text), "SPA category->catalog return shows stale page-sized 48 \u0442\u043e\u0432\u0430\u0440\u043e\u0432");
  return {
    route: "category->catalog",
    listingCards: listingSummary.productCards,
    categoryTiles: summary.categoryTiles,
    productImageLoaded: true,
  };
}

async function verifyProductAndCart(page, baseUrl, timeoutMs) {
  await gotoChecked(page, `${baseUrl}/product?baseSku=opt_70190&live-ui-smoke=product`, "product page", timeoutMs);
  await page.locator("main, body").first().waitFor({ state: "visible", timeout: 5000 });
  const productText = await collectPageText(page);
  assert(/opt_?70190|70190|Подуш|товар|каталог/i.test(productText), "product page should render product or catalog content");

  await gotoChecked(page, `${baseUrl}/cart?live-ui-smoke=cart`, "cart page", timeoutMs);
  await page.locator("main, body").first().waitFor({ state: "visible", timeout: 5000 });
  const summary = await pageSummary(page);
  assert(summary.cartShell, "cart page should render cart shell");
  return { route: "product+cart", cartShell: summary.cartShell, checkoutShell: summary.checkoutShell };
}

async function verifyServiceWorker(page) {
  const result = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return { supported: false, registrations: 0, active: false };
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const registrations = await navigator.serviceWorker.getRegistrations();
    return {
      supported: true,
      registrations: registrations.length,
      active: registrations.some((registration) => Boolean(registration.active || registration.installing || registration.waiting)),
    };
  });
  return { route: "service-worker", ...result };
}

function createSelfTestServer() {
  const html = (body) => `<!doctype html><html><head><title>Sobag fixture</title></head><body><header><a class="catalog-button" data-nav="catalog.html" href="/catalog.html">Каталог</a></header><main>${body}</main><script>navigator.serviceWorker?.getRegistrations?.();</script></body></html>`;
  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html('<a href="/catalog.html">Каталог</a>'));
      return;
    }
    if (url.pathname === "/catalog.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html('<section id="catalogHome"><div id="categoryTiles"><a class="category-tile" href="/catalog?category=%D0%9F%D0%BE%D0%B4%D1%83%D1%88%D0%BA%D0%B8">Подушки 517 товаров</a><a class="category-tile">Наволочки 517 товаров</a><a class="category-tile">Флаги 65 товаров</a><a class="category-tile">Ремувки 19 товаров</a></div></section>'));
      return;
    }
    if (url.pathname === "/catalog") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html('<section id="productGrid"><article class="product-card"><img data-product-image="true" src="/fixture.webp" width="120" height="120"><span>opt_70190</span></article></section>'));
      return;
    }
    if (url.pathname === "/product") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html("<h1>opt_70190 Подушка</h1>"));
      return;
    }
    if (url.pathname === "/cart") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html('<section id="cartPage"><form id="checkoutForm"></form></section>'));
      return;
    }
    if (url.pathname === "/fixture.webp") {
      const pixel = Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AA/vuUAAA=", "base64");
      res.writeHead(200, { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable" });
      res.end(pixel);
      return;
    }
    res.writeHead(404);
    res.end("not found");
  });
  return server;
}

async function runSmoke(baseUrl, timeoutMs) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: false,
    serviceWorkers: "allow",
  });
  const errors = [];
  const page = await context.newPage();
  wireErrorCapture(page, "live-ui", errors);
  const results = [];
  try {
    results.push(await verifyRoot(page, baseUrl, timeoutMs));
    results.push(await verifyCatalogHome(page, baseUrl, timeoutMs));
    results.push(await verifyListingToCatalog(page, baseUrl, timeoutMs));
    results.push(await verifyProductAndCart(page, baseUrl, timeoutMs));
    results.push(await verifyServiceWorker(page));
    if (errors.length) throw new Error(`live UI browser errors: ${errors.slice(0, 5).join(" | ")}`);
    return results;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  let server;
  let baseUrl = args.baseUrl;
  if (args.selfTest) {
    server = createSelfTestServer();
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  } else {
    const parsed = new URL(baseUrl);
    assert(parsed.protocol === "https:", "live UI smoke requires https base URL");
    assert(parsed.hostname === "sobag-shop.online", "live UI smoke base URL must stay on sobag-shop.online");
  }
  try {
    const results = await runSmoke(baseUrl, args.timeoutMs);
    console.log(`Live UI smoke passed: ${baseUrl}`);
    console.log(JSON.stringify(results, null, 2));
  } finally {
    server?.close();
  }
}

main().catch((error) => {
  console.error(`live-ui-smoke failed: ${safeText(error.message || error)}`);
  process.exit(1);
});
