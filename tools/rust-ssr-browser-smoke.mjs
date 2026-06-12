#!/usr/bin/env node

import { chromium } from "playwright";

const DEFAULT_BASE = "http://127.0.0.1:3001";

function parseArgs(argv = process.argv.slice(2)) {
  const args = { base: DEFAULT_BASE, product: "opt_70190", timeout: 15000, headed: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--base") args.base = argv[++index] || args.base;
    else if (token === "--product") args.product = argv[++index] || args.product;
    else if (token === "--timeout") args.timeout = Number(argv[++index] || args.timeout) || args.timeout;
    else if (token === "--headed") args.headed = true;
    else if (token === "--help") {
      console.log("Usage: node tools/rust-ssr-browser-smoke.mjs --base http://127.0.0.1:3001 --product opt_70190");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  args.base = args.base.replace(/\/+$/, "");
  return args;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertCartLine(page, expectedQty) {
  const result = await page.evaluate(() => {
    const cart = JSON.parse(localStorage.getItem("sobag.cart.guest") || "[]");
    return {
      cart,
      header: document.querySelector(".rust-shell-cart")?.textContent || "",
    };
  });
  assert(Array.isArray(result.cart), "cart should be an array");
  assert(result.cart.length === 1, `cart should contain one line, got ${result.cart.length}`);
  const [key, line] = result.cart[0] || [];
  assert(typeof key === "string" && key.includes("opt_"), "cart key should include product SKU");
  assert(line?.qty === expectedQty, `cart qty should be ${expectedQty}, got ${line?.qty}`);
  assert(line?.variant?.sku, "cart line variant SKU is missing");
  assert(line?.productId, "cart line productId is missing");
  assert(line?.productName, "cart line productName is missing");
  assert(line?.productImage, "cart line productImage is missing");
  assert(result.header.includes(String(expectedQty)), `cart header did not update: ${result.header}`);
  return line.variant.sku;
}

async function addFirstVariantToCart(page, qty) {
  await page.evaluate(() => localStorage.removeItem("sobag.cart.guest"));
  await page.locator(".rust-variant-qty").first().fill(String(qty));
  await page.locator("[data-rust-add-cart]").first().click();
  return assertCartLine(page, qty);
}

async function verifyListingToProductFlow(page, args, path, label) {
  await page.goto(`${args.base}${path}`, { waitUntil: "domcontentloaded" });
  await page.locator(".rust-card a").first().click();
  await page.waitForURL(/\/product\?baseSku=/);
  await page.locator(".rust-product").waitFor();
  await page.locator("[data-rust-add-cart]").first().waitFor();
  const sku = await addFirstVariantToCart(page, 2);
  console.log(`OK ${label} -> product cart: ${sku}`);
}

async function main() {
  const args = parseArgs();
  const browser = await chromium.launch({ headless: !args.headed });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(args.timeout);

    await page.goto(`${args.base}/product?baseSku=${encodeURIComponent(args.product)}`, { waitUntil: "domcontentloaded" });
    const directSku = await addFirstVariantToCart(page, 3);
    console.log(`OK direct product cart: ${directSku}`);

    await verifyListingToProductFlow(page, args, "/catalog?pageSize=2", "catalog");
    await verifyListingToProductFlow(page, args, `/search?q=${encodeURIComponent(args.product)}&pageSize=2`, "search");
    console.log("Rust SSR browser smoke passed");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
