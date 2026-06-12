#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const RUNBOOK = "docs/rust-ssr-cutover-runbook.md";
const RUST_MAIN = "rust-server/src/main.rs";
const SSR_SMOKE = "tools/rust-ssr-smoke.mjs";
const SSR_BROWSER_SMOKE = "tools/rust-ssr-browser-smoke.mjs";
const SSR_REHEARSAL = "tools/rust-ssr-route-rehearsal.mjs";
const VPS_DEPLOY = ".github/workflows/vps-deploy.yml";

const PUBLIC_ROUTES = [
  "/catalog",
  "/search",
  "/product",
  "/catalog-fragment",
  "/search-fragment",
  "/product-fragment",
  "/about",
  "/business",
  "/marketplaces",
  "/contacts",
  "/how-to-order",
  "/delivery",
  "/payment",
  "/returns",
  "/seller-support",
  "/wholesale",
];

const NODE_FALLBACK_ROUTES = [
  "/cart",
  "/account",
  "/api/auth/*",
  "/api/orders",
  "/api/briefs",
  "/api/admin/*",
  "/api/content",
];

const REQUIRED_RUNBOOK_MARKERS = [
  "Node remains fallback",
  "Required Pre-Cutover Gates",
  "Nginx Cutover Shape",
  "Public Rust pages must not expose preview/debug branding",
  "Post-Cutover Checks",
  "Rollback",
  "Do not edit production env, secrets, database data, file-store data, or user data",
  "node tools/rust-ssr-smoke.mjs --base http://127.0.0.1:3001",
  "node tools/rust-ssr-browser-smoke.mjs --base http://127.0.0.1:3001",
  "node tools/rust-catalog-shadow-smoke.mjs --node-base http://127.0.0.1:3000 --rust-base http://127.0.0.1:3001",
  "npm run rehearse:rust-ssr-routes",
];

function assertIncludes(text, marker, label, errors) {
  if (!String(text || "").includes(marker)) errors.push(`${label} missing: ${marker}`);
}

function routeDeclaration(route) {
  return `.route("${route}",`;
}

function auditRustSsrCutover({ runbook, rustMain, smoke, browserSmoke, rehearsal, deploy }) {
  const errors = [];

  REQUIRED_RUNBOOK_MARKERS.forEach((marker) => assertIncludes(runbook, marker, RUNBOOK, errors));
  PUBLIC_ROUTES.forEach((route) => {
    assertIncludes(runbook, route, RUNBOOK, errors);
    assertIncludes(smoke, `"${route}`, SSR_SMOKE, errors);
    assertIncludes(rehearsal, `"${route}"`, SSR_REHEARSAL, errors);
    assertIncludes(rustMain, routeDeclaration(route), RUST_MAIN, errors);
  });
  NODE_FALLBACK_ROUTES.forEach((route) => assertIncludes(runbook, route, RUNBOOK, errors));

  [
    "cargo test --locked",
    "cargo build --release --locked",
    "node tools/rust-ssr-smoke.mjs --base http://127.0.0.1:3001",
  ].forEach((marker) => assertIncludes(deploy, marker, VPS_DEPLOY, errors));
  assertIncludes(smoke, "assertNotContains", SSR_SMOKE, errors);
  assertIncludes(smoke, "Rust Preview", SSR_SMOKE, errors);
  assertIncludes(smoke, "Node fallback", SSR_SMOKE, errors);
  assertIncludes(smoke, "sobag.cart.guest", SSR_SMOKE, errors);
  assertIncludes(smoke, "data-rust-add-cart", SSR_SMOKE, errors);
  assertIncludes(browserSmoke, "/catalog?pageSize=2", SSR_BROWSER_SMOKE, errors);
  assertIncludes(browserSmoke, "/search?q=", SSR_BROWSER_SMOKE, errors);
  assertIncludes(browserSmoke, "waitForURL(/\\/product\\?baseSku=/)", SSR_BROWSER_SMOKE, errors);
  assertIncludes(browserSmoke, "sobag.cart.guest", SSR_BROWSER_SMOKE, errors);
  assertIncludes(browserSmoke, "data-rust-add-cart", SSR_BROWSER_SMOKE, errors);
  assertIncludes(rehearsal, "assertSafeLocations", SSR_REHEARSAL, errors);
  assertIncludes(rehearsal, "generic location / is forbidden", SSR_REHEARSAL, errors);
  assertIncludes(rehearsal, "generic /api/admin prefix location is forbidden", SSR_REHEARSAL, errors);
  assertIncludes(rehearsal, "proxy_pass http://127.0.0.1:3001", SSR_REHEARSAL, errors);

  if (/location\s+\/\s+.*3001/s.test(runbook)) {
    errors.push("runbook must not suggest routing generic location / to Rust");
  }
  if (rustMain.includes("Rust Preview")) {
    errors.push("Rust SSR templates must not expose Rust Preview branding");
  }
  if (rustMain.includes("Node fallback")) {
    errors.push("Rust SSR templates must not expose Node fallback links");
  }
  if (rustMain.includes('hx-target="#rustProduct"')) {
    errors.push("Rust catalog cards must use normal product-page navigation before public SSR cutover");
  }
  if (/api\/admin\/\*/.test(rustMain)) {
    errors.push("Rust SSR cutover must not add public admin wildcard routes");
  }

  if (errors.length) throw new Error(`Rust SSR cutover audit failed:\n${errors.join("\n")}`);
  return { publicRoutes: PUBLIC_ROUTES.length, fallbackRoutes: NODE_FALLBACK_ROUTES.length };
}

function selfTest() {
  const goodRouteDecls = PUBLIC_ROUTES.map((route) => routeDeclaration(route)).join("\n");
  const goodSmoke = `${PUBLIC_ROUTES.map((route) => `["${route}`, []).join("\n")}\nassertNotContains\nRust Preview\nNode fallback\nsobag.cart.guest\ndata-rust-add-cart`;
  const goodBrowserSmoke = "/catalog?pageSize=2\n/search?q=\nwaitForURL(/\\/product\\?baseSku=/)\nsobag.cart.guest\ndata-rust-add-cart";
  const goodRehearsal = `${PUBLIC_ROUTES.map((route) => `"${route}"`).join("\n")}\nassertSafeLocations\ngeneric location / is forbidden\ngeneric /api/admin prefix location is forbidden\nproxy_pass http://127.0.0.1:3001`;
  const goodRunbook = [...REQUIRED_RUNBOOK_MARKERS, ...PUBLIC_ROUTES, ...NODE_FALLBACK_ROUTES].join("\n");
  const goodDeploy = [
    "cargo test --locked",
    "cargo build --release --locked",
    "node tools/rust-ssr-smoke.mjs --base http://127.0.0.1:3001",
  ].join("\n");
  const summary = auditRustSsrCutover({
    runbook: goodRunbook,
    rustMain: goodRouteDecls,
    smoke: goodSmoke,
    browserSmoke: goodBrowserSmoke,
    rehearsal: goodRehearsal,
    deploy: goodDeploy,
  });
  if (summary.publicRoutes !== PUBLIC_ROUTES.length) throw new Error("self-test public route count mismatch");

  let rejected = false;
  try {
    auditRustSsrCutover({
      runbook: goodRunbook.replace("/cart", ""),
      rustMain: goodRouteDecls,
      smoke: goodSmoke,
      browserSmoke: goodBrowserSmoke,
      rehearsal: goodRehearsal,
      deploy: goodDeploy,
    });
  } catch (error) {
    rejected = /fallback|runbook/i.test(error.message);
  }
  if (!rejected) throw new Error("self-test should reject missing Node fallback marker");
}

function readRequired(file) {
  const path = join(root, file);
  if (!existsSync(path)) throw new Error(`Missing ${file}`);
  return readFileSync(path, "utf8");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    console.log("Rust SSR cutover audit self-test passed");
    return;
  }
  const summary = auditRustSsrCutover({
    runbook: readRequired(RUNBOOK),
    rustMain: readRequired(RUST_MAIN),
    smoke: readRequired(SSR_SMOKE),
    browserSmoke: readRequired(SSR_BROWSER_SMOKE),
    rehearsal: readRequired(SSR_REHEARSAL),
    deploy: readRequired(VPS_DEPLOY),
  });
  console.log(`Rust SSR cutover audit passed: ${summary.publicRoutes} public routes, ${summary.fallbackRoutes} fallback routes`);
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

export { auditRustSsrCutover };
