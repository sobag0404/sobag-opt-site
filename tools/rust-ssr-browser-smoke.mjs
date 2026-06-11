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

async function main() {
  const args = parseArgs();
  const browser = await chromium.launch({ headless: !args.headed });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(args.timeout);
    await page.goto(`${args.base}/product?baseSku=${encodeURIComponent(args.product)}`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.removeItem("sobag.cart.guest"));
    await page.locator(".rust-variant-qty").first().fill("3");
    await page.locator("[data-rust-add-cart]").first().click();
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
    assert(line?.qty === 3, `cart qty should be 3, got ${line?.qty}`);
    assert(line?.variant?.sku, "cart line variant SKU is missing");
    assert(line?.productId, "cart line productId is missing");
    assert(line?.productName, "cart line productName is missing");
    assert(line?.productImage, "cart line productImage is missing");
    assert(/Корзина\s+3/.test(result.header), `cart header did not update: ${result.header}`);
    console.log(`Rust SSR browser smoke passed: ${line.variant.sku}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
