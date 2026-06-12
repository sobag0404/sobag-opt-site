#!/usr/bin/env node

const DEFAULT_BASE = "https://sobag-shop.online";

const RUST_ROUTES = [
  { path: "/catalog?pageSize=2", markers: ["rust-shell-header", "rust-grid"] },
  { path: "/search?q=opt_70190&pageSize=2", markers: ["rust-shell-header", "rust-grid"] },
  { path: "/product?baseSku=opt_70190", markers: ["rust-shell-header", "rust-product", "data-rust-add-cart"] },
  { path: "/catalog-fragment?pageSize=2", markers: ["rust-grid", "rust-card"] },
  { path: "/search-fragment?q=opt_70190&pageSize=2", markers: ["rust-grid", "rust-card"] },
  { path: "/product-fragment?baseSku=opt_70190", markers: ["rust-product", "rust-variant-table"] },
  { path: "/about", markers: ["rust-content-page", 'data-rust-content-page="about"'] },
  { path: "/business", markers: ["rust-content-page", 'data-rust-content-page="business"'] },
  { path: "/marketplaces", markers: ["rust-content-page", 'data-rust-content-page="marketplaces"'] },
  { path: "/contacts", markers: ["rust-content-page", "rust-address", 'data-rust-content-page="contacts"'] },
  { path: "/how-to-order", markers: ["rust-content-page", 'data-rust-content-page="how-to-order"'] },
  { path: "/delivery", markers: ["rust-content-page", 'data-rust-content-page="delivery"'] },
  { path: "/payment", markers: ["rust-content-page", 'data-rust-content-page="payment"'] },
  { path: "/returns", markers: ["rust-content-page", 'data-rust-content-page="returns"'] },
  { path: "/seller-support", markers: ["rust-content-page", 'data-rust-content-page="seller-support"'] },
  { path: "/wholesale", markers: ["rust-content-page", 'data-rust-content-page="wholesale"'] },
];

const NODE_FALLBACK_ROUTES = [
  { path: "/", markers: ["app.js"] },
  { path: "/cart", markers: ["cart.js"] },
];

const MOJIBAKE_MARKERS = [
  "\u0420\u0459",
  "\u0420\u040F",
  "\u0420\u0401",
  "\u0421\u0453",
  "\u0421\u201A",
  "\u0432\u0402",
  "\u0432\u201A",
  "\u0420\u0098",
  "\uFFFD",
];

function parseArgs(argv = process.argv.slice(2)) {
  const args = { base: DEFAULT_BASE, timeout: 10000, selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--base") args.base = argv[++index] || args.base;
    else if (token === "--timeout") args.timeout = Number(argv[++index] || args.timeout) || args.timeout;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log("Usage: node tools/rust-public-route-smoke.mjs --base https://sobag-shop.online");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  args.base = args.base.replace(/\/+$/, "");
  return args;
}

function assertRouteHtml({ path, html, markers, rust }) {
  for (const marker of markers) {
    if (!html.includes(marker)) throw new Error(`${path} missing marker ${marker}`);
  }
  const mojibake = MOJIBAKE_MARKERS.find((marker) => html.includes(marker));
  if (mojibake) throw new Error(`${path} contains mojibake marker ${JSON.stringify(mojibake)}`);
  if (html.includes("Rust Preview") || html.includes("Node fallback")) {
    throw new Error(`${path} exposes preview/service label`);
  }
  if (rust && !html.includes("rust-")) throw new Error(`${path} missing Rust markup`);
}

async function fetchText(base, path, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${base}${path}`, { signal: controller.signal, headers: { accept: "text/html" } });
    if (!response.ok) throw new Error(`${path} -> HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function selfTest() {
  assertRouteHtml({
    path: "/about",
    rust: true,
    markers: ["rust-content-page"],
    html: '<main class="rust-content-page" data-rust-content-page="about"></main>',
  });
  let rejected = false;
  try {
    assertRouteHtml({
      path: "/about",
      rust: true,
      markers: ["rust-content-page"],
      html: '<main class="rust-content-page">Rust Preview</main>',
    });
  } catch (error) {
    rejected = /preview/i.test(error.message);
  }
  if (!rejected) throw new Error("self-test should reject preview branding");
  console.log("Rust public route smoke self-test passed");
}

async function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    return;
  }
  for (const route of RUST_ROUTES) {
    const html = await fetchText(args.base, route.path, args.timeout);
    assertRouteHtml({ ...route, html, rust: true });
    console.log(`OK ${route.path}`);
  }
  for (const route of NODE_FALLBACK_ROUTES) {
    const html = await fetchText(args.base, route.path, args.timeout);
    assertRouteHtml({ ...route, html, rust: false });
    console.log(`OK ${route.path} Node fallback`);
  }
  console.log("Rust public route smoke passed");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

export { assertRouteHtml, RUST_ROUTES, NODE_FALLBACK_ROUTES };
