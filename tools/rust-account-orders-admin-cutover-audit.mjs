#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const RUNBOOK = "docs/rust-account-orders-admin-cutover-runbook.md";
const RUST_MAIN = "rust-server/src/main.rs";
const AUTH_SMOKE = "tools/rust-auth-me-shadow-smoke.mjs";
const ORDER_SMOKE = "tools/rust-orders-write-smoke.mjs";

const PREVIEW_ROUTES = [
  "/rust/auth/me",
  "/rust/auth/login",
  "/rust/auth/register",
  "/rust/auth/logout",
  "/rust/orders",
  "/rust/briefs",
  "/rust/admin/orders",
  "/rust/admin/content",
];

const DO_NOT_SWITCH_YET = [
  "/api/auth/me",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/orders",
  "/api/briefs",
  "/api/admin/orders",
  "/api/admin/users",
  "/api/admin/content",
  "/api/admin/catalog",
  "/api/admin/pim",
  "/api/admin/product-images",
  "/api/admin/import-batches",
];

const REQUIRED_MARKERS = [
  "Node remains authoritative",
  "temporary-store tests",
  "route-level rollback",
  "Do not switch these route groups yet",
  "Internal Rust Preview Routes",
  "Route Group Order",
  "Required Gates Per Route Group",
  "Nginx Cutover Shape",
  "Post-Cutover Checks",
  "Rollback",
  "Do not add wildcard `/api/admin/` or generic `/api/` proxy to Rust",
  "no secrets, tokens, cookies, passwords, DB dumps, or private keys in logs",
  "buyer cannot read admin/internal fields",
  "unsupported methods return 405",
];

function assertIncludes(text, marker, label, errors) {
  if (!String(text || "").includes(marker)) errors.push(`${label} missing: ${marker}`);
}

function routeDeclaration(route) {
  return `"${route}"`;
}

function auditCutover({ runbook, rustMain, authSmoke, orderSmoke }) {
  const errors = [];
  REQUIRED_MARKERS.forEach((marker) => assertIncludes(runbook, marker, RUNBOOK, errors));
  PREVIEW_ROUTES.forEach((route) => {
    assertIncludes(runbook, route, RUNBOOK, errors);
    assertIncludes(rustMain, routeDeclaration(route), RUST_MAIN, errors);
  });
  DO_NOT_SWITCH_YET.forEach((route) => assertIncludes(runbook, route, RUNBOOK, errors));
  [
    "/rust/auth/me",
    "/rust/admin/orders",
  ].forEach((route) => assertIncludes(authSmoke, route, AUTH_SMOKE, errors));
  [
    "/rust/orders",
    "/rust/briefs",
    "/rust/admin/orders",
  ].forEach((route) => assertIncludes(orderSmoke, route, ORDER_SMOKE, errors));
  if (/location\s+\/api\/\s+.*3001/s.test(runbook)) errors.push("runbook must not route generic /api/ to Rust");
  if (/location\s+\^~\s+\/api\/admin/.test(runbook)) errors.push("runbook must not route wildcard /api/admin/ to Rust");
  if (/password\s*=|token\s*=|BEGIN RSA/i.test(runbook)) errors.push("runbook must not contain secrets or env values");
  if (errors.length) throw new Error(`Rust account/orders/admin cutover audit failed:\n${errors.join("\n")}`);
  return { previewRoutes: PREVIEW_ROUTES.length, blockedRoutes: DO_NOT_SWITCH_YET.length };
}

function selfTest() {
  const runbook = [...REQUIRED_MARKERS, ...PREVIEW_ROUTES, ...DO_NOT_SWITCH_YET].join("\n");
  const rustMain = PREVIEW_ROUTES.map(routeDeclaration).join("\n");
  const authSmoke = ["/rust/auth/me", "/rust/admin/orders"].join("\n");
  const orderSmoke = ["/rust/orders", "/rust/briefs", "/rust/admin/orders"].join("\n");
  const summary = auditCutover({ runbook, rustMain, authSmoke, orderSmoke });
  if (summary.previewRoutes !== PREVIEW_ROUTES.length) throw new Error("self-test preview route count mismatch");
  let rejected = false;
  try {
    auditCutover({ runbook: runbook.replace("Node remains authoritative", ""), rustMain, authSmoke, orderSmoke });
  } catch (error) {
    rejected = /Node remains authoritative/.test(error.message);
  }
  if (!rejected) throw new Error("self-test should reject missing authoritative Node marker");
}

function readRequired(file) {
  const path = join(root, file);
  if (!existsSync(path)) throw new Error(`Missing ${file}`);
  return readFileSync(path, "utf8");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    console.log("Rust account/orders/admin cutover audit self-test passed");
    return;
  }
  const summary = auditCutover({
    runbook: readRequired(RUNBOOK),
    rustMain: readRequired(RUST_MAIN),
    authSmoke: readRequired(AUTH_SMOKE),
    orderSmoke: readRequired(ORDER_SMOKE),
  });
  console.log(
    `Rust account/orders/admin cutover audit passed: ${summary.previewRoutes} preview routes, ${summary.blockedRoutes} blocked public routes`
  );
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

export { auditCutover };
