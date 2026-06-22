#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const RUNBOOK = "docs/rust-account-orders-admin-cutover-runbook.md";
const RUST_MAIN = "rust-server/src/main.rs";
const AUTH_SMOKE = "tools/rust-auth-me-shadow-smoke.mjs";
const AUTH_CUTOVER_SMOKE = "tools/rust-auth-me-cutover-smoke.mjs";
const AUTH_WRITE_CUTOVER_SMOKE = "tools/rust-auth-write-cutover-smoke.mjs";
const ORDER_SMOKE = "tools/rust-orders-write-smoke.mjs";
const ORDER_CUTOVER_SMOKE = "tools/rust-orders-briefs-cutover-smoke.mjs";
const ADMIN_ORDER_CUTOVER_SMOKE = "tools/rust-admin-orders-cutover-smoke.mjs";
const ADMIN_USERS_CUTOVER_SMOKE = "tools/rust-admin-users-cutover-smoke.mjs";
const ADMIN_CONTENT_CUTOVER_SMOKE = "tools/rust-admin-content-cutover-smoke.mjs";
const ROUTE_REHEARSAL = "tools/rust-account-route-rehearsal.mjs";

const PREVIEW_ROUTES = [
  "/rust/auth/me",
  "/rust/auth/login",
  "/rust/auth/register",
  "/rust/auth/logout",
  "/rust/orders",
  "/rust/briefs",
  "/rust/admin/orders",
  "/rust/admin/users",
  "/rust/admin/content",
  "/rust/admin/catalog",
  "/rust/admin/pim",
  "/rust/admin/prices",
  "/rust/admin/import-batches",
  "/rust/admin/product-images",
];

const SWITCHED_PUBLIC_ROUTES = [
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
  "/api/admin/prices",
  "/api/admin/import-batches",
  "/api/admin/product-images",
];

const REQUIRED_MARKERS = [
  "Rust cutover complete",
  "Node remains compatibility fallback",
  "temporary-store tests",
  "route-level rollback",
  "Internal Rust Preview Routes",
  "Route Group Order",
  "Current Candidate",
  "All listed candidate route groups are now switched",
  "GET+PUT",
  "Required Gates Per Route Group",
  "Nginx Cutover Shape",
  "rehearse:rust-account-routes",
  "must reject generic `/api` and wildcard `/api/admin`",
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

function auditCutover({ runbook, rustMain, authSmoke, authCutoverSmoke, authWriteCutoverSmoke, orderSmoke, orderCutoverSmoke, adminOrderCutoverSmoke, adminUsersCutoverSmoke, adminContentCutoverSmoke, routeRehearsal }) {
  const errors = [];
  REQUIRED_MARKERS.forEach((marker) => assertIncludes(runbook, marker, RUNBOOK, errors));
  PREVIEW_ROUTES.forEach((route) => {
    assertIncludes(runbook, route, RUNBOOK, errors);
    assertIncludes(rustMain, routeDeclaration(route), RUST_MAIN, errors);
  });
  SWITCHED_PUBLIC_ROUTES.forEach((route) => assertIncludes(runbook, route, RUNBOOK, errors));
  [
    "/rust/auth/me",
    "auth-me unsupported method guards",
    "POST",
    "DELETE",
    "/rust/admin/orders",
    "/rust/admin/users",
  ].forEach((route) => assertIncludes(authSmoke, route, AUTH_SMOKE, errors));
  [
    "routeTarget",
    "/api/auth/me",
    "/rust/auth/me",
    "Node fallback reads Rust-auth state",
    "GET /api/auth/me through Rust",
    "PUT /api/auth/me through Rust",
    "non-auth API remains Node fallback",
  ].forEach((marker) => assertIncludes(authCutoverSmoke, marker, AUTH_CUTOVER_SMOKE, errors));
  [
    "routeTarget",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
    "/rust/auth/login",
    "/rust/auth/register",
    "/rust/auth/logout",
    "POST /api/auth/register through Rust",
    "POST /api/auth/login through Rust",
    "POST /api/auth/logout through Rust",
    "Node fallback reads Rust auth session",
    "auth write guards through Rust",
    "unrelated API remains Node fallback",
  ].forEach((marker) => assertIncludes(authWriteCutoverSmoke, marker, AUTH_WRITE_CUTOVER_SMOKE, errors));
  [
    "/rust/orders",
    "/rust/briefs",
    "/rust/admin/orders",
  ].forEach((route) => assertIncludes(orderSmoke, route, ORDER_SMOKE, errors));
  [
    "routeTarget",
    "/api/orders",
    "/api/briefs",
    "/rust/orders",
    "/rust/briefs",
    "Node admin fallback sees Rust-created order",
    "Node account fallback sees Rust order side effects",
    "Node admin fallback sees Rust-created brief",
    "unrelated API remains Node fallback",
  ].forEach((marker) => assertIncludes(orderCutoverSmoke, marker, ORDER_CUTOVER_SMOKE, errors));
  [
    "routeTarget",
    "/api/admin/orders",
    "/rust/admin/orders",
    "GET /api/admin/orders through Rust",
    "PATCH /api/admin/orders through Rust",
    "Node account fallback sees safe Rust admin update",
    "admin orders guards through Rust",
    "unrelated API remains Node fallback",
  ].forEach((marker) => assertIncludes(adminOrderCutoverSmoke, marker, ADMIN_ORDER_CUTOVER_SMOKE, errors));
  [
    "routeTarget",
    "/api/admin/users",
    "/rust/admin/users",
    "GET /api/admin/users through Rust",
    "POST /api/admin/users through Rust",
    "PATCH/DELETE /api/admin/users through Rust",
    "Node account fallback sees Rust-created employee",
    "admin users guards through Rust",
    "unrelated API remains Node fallback",
  ].forEach((marker) => assertIncludes(adminUsersCutoverSmoke, marker, ADMIN_USERS_CUTOVER_SMOKE, errors));
  [
    "routeTarget",
    "/api/admin/content",
    "/rust/admin/content",
    "GET /api/admin/content through Rust",
    "Node content fallback sees Rust content update",
    "PATCH /api/admin/content reviews through Rust",
    "admin content guards through Rust",
    "unrelated API remains Node fallback",
  ].forEach((marker) => assertIncludes(adminContentCutoverSmoke, marker, ADMIN_CONTENT_CUTOVER_SMOKE, errors));
  [
    "auth-me",
    "GET+PUT",
    "auth-write",
    "orders-briefs",
    "admin-orders",
    "admin-users",
    "admin-content",
    "assertSafeLocations",
  ].forEach((marker) => assertIncludes(routeRehearsal, marker, ROUTE_REHEARSAL, errors));
  if (/location\s+\/api\/\s+.*3001/s.test(runbook)) errors.push("runbook must not route generic /api/ to Rust");
  if (/location\s+\^~\s+\/api\/admin/.test(runbook)) errors.push("runbook must not route wildcard /api/admin/ to Rust");
  if (/password\s*=|token\s*=|BEGIN RSA/i.test(runbook)) errors.push("runbook must not contain secrets or env values");
  if (errors.length) throw new Error(`Rust account/orders/admin cutover audit failed:\n${errors.join("\n")}`);
  return { previewRoutes: PREVIEW_ROUTES.length, switchedRoutes: SWITCHED_PUBLIC_ROUTES.length };
}

function selfTest() {
  const runbook = [...REQUIRED_MARKERS, ...PREVIEW_ROUTES, ...SWITCHED_PUBLIC_ROUTES].join("\n");
  const rustMain = PREVIEW_ROUTES.map(routeDeclaration).join("\n");
  const authSmoke = ["/rust/auth/me", "auth-me unsupported method guards", "POST", "DELETE", "/rust/admin/orders", "/rust/admin/users"].join("\n");
  const authCutoverSmoke = ["routeTarget", "/api/auth/me", "/rust/auth/me", "Node fallback reads Rust-auth state", "GET /api/auth/me through Rust", "PUT /api/auth/me through Rust", "non-auth API remains Node fallback"].join("\n");
  const authWriteCutoverSmoke = ["routeTarget", "/api/auth/login", "/api/auth/register", "/api/auth/logout", "/rust/auth/login", "/rust/auth/register", "/rust/auth/logout", "POST /api/auth/register through Rust", "POST /api/auth/login through Rust", "POST /api/auth/logout through Rust", "Node fallback reads Rust auth session", "auth write guards through Rust", "unrelated API remains Node fallback"].join("\n");
  const orderSmoke = ["/rust/orders", "/rust/briefs", "/rust/admin/orders"].join("\n");
  const orderCutoverSmoke = ["routeTarget", "/api/orders", "/api/briefs", "/rust/orders", "/rust/briefs", "Node admin fallback sees Rust-created order", "Node account fallback sees Rust order side effects", "Node admin fallback sees Rust-created brief", "unrelated API remains Node fallback"].join("\n");
  const adminOrderCutoverSmoke = ["routeTarget", "/api/admin/orders", "/rust/admin/orders", "GET /api/admin/orders through Rust", "PATCH /api/admin/orders through Rust", "Node account fallback sees safe Rust admin update", "admin orders guards through Rust", "unrelated API remains Node fallback"].join("\n");
  const adminUsersCutoverSmoke = ["routeTarget", "/api/admin/users", "/rust/admin/users", "GET /api/admin/users through Rust", "POST /api/admin/users through Rust", "PATCH/DELETE /api/admin/users through Rust", "Node account fallback sees Rust-created employee", "admin users guards through Rust", "unrelated API remains Node fallback"].join("\n");
  const adminContentCutoverSmoke = ["routeTarget", "/api/admin/content", "/rust/admin/content", "GET /api/admin/content through Rust", "Node content fallback sees Rust content update", "PATCH /api/admin/content reviews through Rust", "admin content guards through Rust", "unrelated API remains Node fallback"].join("\n");
  const routeRehearsal = ["auth-me", "GET+PUT", "auth-write", "orders-briefs", "admin-orders", "admin-users", "admin-content", "assertSafeLocations"].join("\n");
  const summary = auditCutover({ runbook, rustMain, authSmoke, authCutoverSmoke, authWriteCutoverSmoke, orderSmoke, orderCutoverSmoke, adminOrderCutoverSmoke, adminUsersCutoverSmoke, adminContentCutoverSmoke, routeRehearsal });
  if (summary.previewRoutes !== PREVIEW_ROUTES.length) throw new Error("self-test preview route count mismatch");
  let rejected = false;
  try {
    auditCutover({ runbook: runbook.replace("Rust cutover complete", ""), rustMain, authSmoke, authCutoverSmoke, authWriteCutoverSmoke, orderSmoke, orderCutoverSmoke, adminOrderCutoverSmoke, adminUsersCutoverSmoke, adminContentCutoverSmoke, routeRehearsal });
  } catch (error) {
    rejected = /Rust cutover complete/.test(error.message);
  }
  if (!rejected) throw new Error("self-test should reject missing Rust cutover marker");
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
    authCutoverSmoke: readRequired(AUTH_CUTOVER_SMOKE),
    authWriteCutoverSmoke: readRequired(AUTH_WRITE_CUTOVER_SMOKE),
    orderSmoke: readRequired(ORDER_SMOKE),
    orderCutoverSmoke: readRequired(ORDER_CUTOVER_SMOKE),
    adminOrderCutoverSmoke: readRequired(ADMIN_ORDER_CUTOVER_SMOKE),
    adminUsersCutoverSmoke: readRequired(ADMIN_USERS_CUTOVER_SMOKE),
    adminContentCutoverSmoke: readRequired(ADMIN_CONTENT_CUTOVER_SMOKE),
    routeRehearsal: readRequired(ROUTE_REHEARSAL),
  });
  console.log(
    `Rust account/orders/admin cutover audit passed: ${summary.previewRoutes} internal routes, ${summary.switchedRoutes} switched public routes`
  );
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

export { auditCutover };
