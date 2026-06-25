#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();

const routeMatrix = [
  { file: "server-routes/catalog.js", route: "/api/catalog", methods: ["GET"], access: "public" },
  { file: "server-routes/catalog-query.js", route: "/api/catalog-query", methods: ["GET"], access: "public" },
  { file: "server-routes/catalog-detail.js", route: "/api/catalog-detail", methods: ["GET"], access: "public" },
  { file: "server-routes/price-list.js", route: "/api/price-list", methods: ["GET"], access: "public" },
  { file: "server-routes/content.js", route: "/api/content", methods: ["GET"], access: "public" },
  { file: "server-routes/health.js", route: "/api/health", methods: ["GET"], access: "public" },
  { file: "server-routes/rum.js", route: "/api/rum", methods: ["POST"], access: "public" },
  { file: "server-routes/auth/login.js", route: "/api/auth/login", methods: ["POST"], access: "public" },
  { file: "server-routes/auth/register.js", route: "/api/auth/register", methods: ["POST"], access: "public" },
  { file: "server-routes/auth/logout.js", route: "/api/auth/logout", methods: ["POST"], access: "optional-session" },
  { file: "server-routes/auth/me.js", route: "/api/auth/me", methods: ["GET", "PUT"], access: "session-owned", writeMethods: ["PUT"] },
  { file: "server-routes/orders.js", route: "/api/orders", methods: ["POST", "PATCH"], access: "mixed", writeMethods: ["POST", "PATCH"], ownerMethod: "PATCH" },
  { file: "server-routes/briefs.js", route: "/api/briefs", methods: ["POST"], access: "public" },
  { file: "server-routes/admin/catalog.js", route: "/api/admin/catalog", methods: ["GET", "PUT"], access: "role", roles: ["admin", "content"] },
  { file: "server-routes/admin/content.js", route: "/api/admin/content", methods: ["GET", "PATCH", "PUT"], access: "role", roles: ["admin", "content"] },
  { file: "server-routes/admin/import-batches.js", route: "/api/admin/import-batches", methods: ["GET", "POST"], access: "role", roles: ["admin", "content"] },
  { file: "server-routes/admin/orders.js", route: "/api/admin/orders", methods: ["GET", "PATCH"], access: "role", roles: ["admin", "manager"] },
  { file: "server-routes/admin/pim.js", route: "/api/admin/pim", methods: ["GET"], access: "role", roles: ["admin", "content"] },
  { file: "server-routes/admin/prices.js", route: "/api/admin/prices", methods: ["GET", "POST"], access: "role", roles: ["admin", "content"] },
  { file: "server-routes/admin/product-images.js", route: "/api/admin/product-images", methods: ["GET", "POST", "DELETE"], access: "role", roles: ["admin", "content"] },
  {
    file: "server-routes/admin/users.js",
    route: "/api/admin/users",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    access: "role",
    roles: ["admin", "manager"],
    methodGuards: [
      { method: "POST", pattern: /user\.role\s*!==\s*["']admin["']/, description: "employee creation requires admin" },
      { method: "PATCH", pattern: /user\.role\s*!==\s*["']admin["']/, description: "role changes require admin" },
      { method: "DELETE", pattern: /user\.role\s*!==\s*["']admin["']/, description: "employee deletion requires admin" },
    ],
  },
];

function walk(dir, found = []) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) walk(full, found);
    else if (item.name.endsWith(".js")) found.push(full);
  }
  return found;
}

function normalizePath(path) {
  return path.split(sep).join("/");
}

function apiRouteFiles() {
  return walk(join(root, "server-routes"))
    .map((file) => normalizePath(relative(root, file)))
    .filter((file) => !file.startsWith("server-routes/_lib/"))
    .sort();
}

function readRoute(file) {
  return readFileSync(join(root, file), "utf8");
}

function routeForFile(file) {
  return `/${file.replace(/\.js$/, "").replace(/\/index$/, "").replace(/^server-routes\//, "api/")}`;
}

function rolesLiteral(roles = []) {
  return roles.map((role) => `"${role}"`).join(", ");
}

function hasMethodGuard(source, method) {
  const escaped = method.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`req\\.method\\s*={2,3}\\s*["']${escaped}["']|req\\.method\\s*!={1,2}\\s*["']${escaped}["']`).test(source);
}

function parseRequireUserRoles(source) {
  const match = source.match(/requireUser\s*\(\s*req\s*,\s*\[([^\]]*)\]/);
  if (!match) return null;
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((item) => item[1]);
}

function sameSet(a = [], b = []) {
  return a.length === b.length && a.every((item) => b.includes(item));
}

function includesOwnerCheck(source, ownerMethod) {
  if (!ownerMethod) return true;
  const hasUserGate = /if\s*\(\s*!user\s*\)\s*return\s+sendJson\s*\(\s*res\s*,\s*401/.test(source);
  const hasOrderOwnership =
    /customerEmail\s*!==\s*String\s*\(\s*user\.email/.test(source) ||
    /ownerEmail\s*!==\s*String\s*\(\s*user\.email/.test(source) ||
    /order\.userEmail\s*===\s*freshUser\.email/.test(source);
  return hasUserGate && hasOrderOwnership;
}

function auditRoute(entry, actualFiles) {
  const errors = [];
  if (!actualFiles.includes(entry.file)) {
    return { ...entry, ok: false, errors: [`Missing route file ${entry.file}`] };
  }

  const source = readRoute(entry.file);
  const expectedRoute = routeForFile(entry.file);
  if (entry.route !== expectedRoute) errors.push(`Route ${entry.route} does not match file-derived ${expectedRoute}`);

  for (const method of entry.methods) {
    if (!hasMethodGuard(source, method)) errors.push(`${entry.file} does not mention req.method guard for ${method}`);
  }
  if (!/methodNotAllowed\s*\(/.test(source)) errors.push(`${entry.file} does not call methodNotAllowed for unsupported methods`);

  const roles = parseRequireUserRoles(source);
  if (entry.access === "role") {
    if (!roles) errors.push(`${entry.file} does not call requireUser(req, [${rolesLiteral(entry.roles)}])`);
    else if (!sameSet(roles, entry.roles)) errors.push(`${entry.file} roles [${roles.join(", ")}] do not match expected [${entry.roles.join(", ")}]`);
    if (roles?.includes("buyer")) errors.push(`${entry.file} admin route must not grant buyer role access`);
  } else if (roles) {
    errors.push(`${entry.file} is marked ${entry.access} but uses requireUser roles [${roles.join(", ")}]`);
  }

  if (entry.access === "session-owned" || entry.access === "mixed" || entry.access === "optional-session") {
    if (!/currentUser\s*\(\s*req\s*\)/.test(source)) errors.push(`${entry.file} should call currentUser(req)`);
  }

  if ((entry.writeMethods || []).length && !/if\s*\(\s*!user\s*\)\s*return\s+sendJson\s*\(\s*res\s*,\s*(req\.method\s*===\s*["']GET["']\s*\?\s*200\s*:\s*)?401/.test(source)) {
    if (entry.access !== "mixed" || entry.ownerMethod) errors.push(`${entry.file} write path should return 401 when user is missing`);
  }

  if (!includesOwnerCheck(source, entry.ownerMethod)) {
    errors.push(`${entry.file} ${entry.ownerMethod} path should verify order ownership`);
  }

  for (const guard of entry.methodGuards || []) {
    if (!guard.pattern.test(source)) errors.push(`${entry.file} ${guard.method} missing guard: ${guard.description}`);
  }

  if (/passwordHash|passwordSalt/.test(source) && !/publicUser/.test(source)) {
    errors.push(`${entry.file} references password fields without publicUser sanitization`);
  }

  return { ...entry, ok: errors.length === 0, errors };
}

function main() {
  const actualFiles = apiRouteFiles();
  const matrixFiles = routeMatrix.map((entry) => entry.file).sort();
  const errors = [];

  const missingFromMatrix = actualFiles.filter((file) => !matrixFiles.includes(file));
  const staleMatrix = matrixFiles.filter((file) => !actualFiles.includes(file));
  missingFromMatrix.forEach((file) => errors.push(`Route file ${file} is missing from access matrix`));
  staleMatrix.forEach((file) => errors.push(`Access matrix references missing file ${file}`));

  const results = routeMatrix.map((entry) => auditRoute(entry, actualFiles));
  results.flatMap((result) => result.errors).forEach((error) => errors.push(error));

  const rows = results.map((result) => {
    const principal = result.roles?.join("|") || result.access;
    return `${result.ok ? "OK" : "FAIL"} ${result.methods.join(",").padEnd(12)} ${principal.padEnd(16)} ${result.route}`;
  });
  console.log(["Access audit matrix:", ...rows].join("\n"));

  if (errors.length) {
    console.error(`Access audit failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`Access audit passed: ${results.length} routes covered, ${results.filter((result) => result.access === "role").length} role-protected routes.`);
}

main();
