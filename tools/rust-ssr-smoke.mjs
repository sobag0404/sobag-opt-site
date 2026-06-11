#!/usr/bin/env node

const DEFAULT_BASE = "http://127.0.0.1:3001";

function parseArgs(argv = process.argv.slice(2)) {
  const args = { base: DEFAULT_BASE, timeout: 10000 };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--base") args.base = argv[++index] || args.base;
    else if (token === "--timeout") args.timeout = Number(argv[++index] || args.timeout) || args.timeout;
    else if (token === "--help") {
      console.log("Usage: node tools/rust-ssr-smoke.mjs --base http://127.0.0.1:3001");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  args.base = args.base.replace(/\/+$/, "");
  return args;
}

async function getText(base, path, timeout) {
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

async function getJson(base, path, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${base}${path}`, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`${path} -> HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function assertContains(text, needle, label) {
  if (!text.includes(needle)) throw new Error(`${label} missing ${needle}`);
}

async function main() {
  const args = parseArgs();
  const checks = [
    ["/rust/catalog?pageSize=2", ["Sobag Opt Rust Preview", "rust-grid", "rust-filter-panel", "hx-get"]],
    ["/rust/search?q=opt_70190&pageSize=2", ["Sobag Opt Rust Preview", "rust-grid", "opt_70190"]],
    ["/rust/catalog?category=%D0%9F%D0%BE%D0%B4%D1%83%D1%88%D0%BA%D0%B8&pageSize=2", ["rust-filter-panel", "checked", "rust-clear-filters"]],
    ["/rust/catalog-fragment?pageSize=2", ["rust-grid", "rust-card"]],
    ["/rust/product?baseSku=opt_70190", ["Sobag Opt Rust Preview", "rust-product", "rust-product-gallery", "rust-variant-qty", "rust-related", "opt_70190"]],
    ["/rust/product-fragment?baseSku=opt_70190", ["rust-product", "rust-product-main-image", "rust-variant-table", "rust-related", "opt_70190"]],
    ["/rust/pages/about", ["Sobag Opt Rust Preview", "rust-content-page", "data-rust-content-page=\"about\""]],
    ["/rust/pages/business", ["rust-content-page", "data-rust-content-page=\"business\""]],
    ["/rust/pages/contacts", ["rust-content-page", "rust-address", "data-rust-content-page=\"contacts\""]],
    ["/rust/pages/delivery", ["rust-content-page", "data-rust-content-page=\"delivery\""]],
  ];
  for (const [path, needles] of checks) {
    const text = await getText(args.base, path, args.timeout);
    needles.forEach((needle) => assertContains(text, needle, path));
    console.log(`OK ${path}`);
  }
  const authPreview = await getJson(args.base, "/rust/auth/me", args.timeout);
  if (!authPreview || authPreview.user !== null) throw new Error("/rust/auth/me anonymous preview mismatch");
  console.log("OK /rust/auth/me");
  console.log("Rust SSR smoke passed");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
