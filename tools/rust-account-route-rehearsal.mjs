#!/usr/bin/env node

const ROUTE_GROUPS = {
  "auth-me": {
    publicRoutes: ["/api/auth/me"],
    rustRoutes: ["/rust/auth/me"],
    methods: ["GET", "PUT"],
  },
  "auth-write": {
    publicRoutes: ["/api/auth/login", "/api/auth/register", "/api/auth/logout"],
    rustRoutes: ["/rust/auth/login", "/rust/auth/register", "/rust/auth/logout"],
  },
  "orders-briefs": {
    publicRoutes: ["/api/orders", "/api/briefs"],
    rustRoutes: ["/rust/orders", "/rust/briefs"],
  },
  "admin-orders": {
    publicRoutes: ["/api/admin/orders"],
    rustRoutes: ["/rust/admin/orders"],
  },
  "admin-users": {
    publicRoutes: ["/api/admin/users"],
    rustRoutes: ["/rust/admin/users"],
  },
  "admin-content": {
    publicRoutes: ["/api/admin/content"],
    rustRoutes: ["/rust/admin/content"],
  },
  "admin-pim": {
    publicRoutes: ["/api/admin/pim"],
    rustRoutes: ["/rust/admin/pim"],
  },
  "admin-prices": {
    publicRoutes: ["/api/admin/prices"],
    rustRoutes: ["/rust/admin/prices"],
  },
  "admin-catalog": {
    publicRoutes: ["/api/admin/catalog"],
    rustRoutes: ["/rust/admin/catalog"],
    methods: ["GET", "PUT"],
  },
};

const BLOCKED_PUBLIC_ROUTES = [
  "/api/admin/product-images",
  "/api/admin/import-batches",
];

function parseArgs(argv = process.argv.slice(2)) {
  const args = { group: "all", selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--group") args.group = argv[++index] || args.group;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage: node tools/rust-account-route-rehearsal.mjs [--group ${Object.keys(ROUTE_GROUPS).join("|")}|all]`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function selectedGroups(group) {
  if (group === "all") return Object.entries(ROUTE_GROUPS);
  if (!ROUTE_GROUPS[group]) throw new Error(`Unknown route group: ${group}`);
  return [[group, ROUTE_GROUPS[group]]];
}

function assertSafeLocations(snippet) {
  const errors = [];
  if (/location\s+\^~\s+\/api\b/.test(snippet)) errors.push("generic /api prefix location is forbidden");
  if (/location\s+\^~\s+\/api\/admin\b/.test(snippet)) errors.push("generic /api/admin prefix location is forbidden");
  if (/location\s+\/api\b/.test(snippet)) errors.push("bare /api location is forbidden");
  if (/proxy_pass\s+http:\/\/127\.0\.0\.1:3001\/api\b/.test(snippet)) errors.push("proxying to Rust /api path is forbidden in rehearsal");
  for (const route of BLOCKED_PUBLIC_ROUTES) {
    if (snippet.includes(`location = ${route}`)) errors.push(`blocked public route must not be rehearsed: ${route}`);
  }
  if (errors.length) throw new Error(`Unsafe rehearsal snippet:\n${errors.join("\n")}`);
}

function renderLocation(publicRoute, rustRoute) {
  return [
    `location = ${publicRoute} {`,
    "    proxy_http_version 1.1;",
    "    proxy_set_header Host $host;",
    "    proxy_set_header X-Real-IP $remote_addr;",
    "    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
    "    proxy_set_header X-Forwarded-Proto $scheme;",
    `    proxy_pass http://127.0.0.1:3001${rustRoute};`,
    "}",
  ].join("\n");
}

function renderSnippet(group = "all") {
  const blocks = [];
  for (const [name, spec] of selectedGroups(group)) {
    if (spec.publicRoutes.length !== spec.rustRoutes.length) {
      throw new Error(`Route count mismatch for ${name}`);
    }
    blocks.push(`# Rust rehearsal group: ${name}${spec.methods ? ` (${spec.methods.join("+")})` : ""}`);
    for (let index = 0; index < spec.publicRoutes.length; index += 1) {
      blocks.push(renderLocation(spec.publicRoutes[index], spec.rustRoutes[index]));
    }
  }
  const snippet = `${blocks.join("\n\n")}\n`;
  assertSafeLocations(snippet);
  return snippet;
}

function selfTest() {
  const all = renderSnippet("all");
  for (const group of Object.keys(ROUTE_GROUPS)) renderSnippet(group);
  if (!all.includes("location = /api/auth/me")) throw new Error("auth/me location missing");
  if (!all.includes("auth-me (GET+PUT)")) throw new Error("auth/me rehearsal must document GET+PUT coupling");
  if (!all.includes("proxy_pass http://127.0.0.1:3001/rust/orders;")) throw new Error("orders rust proxy missing");
  let rejected = false;
  try {
    assertSafeLocations("location ^~ /api/admin/ { proxy_pass http://127.0.0.1:3001; }");
  } catch (error) {
    rejected = /api\/admin/.test(error.message);
  }
  if (!rejected) throw new Error("self-test should reject wildcard admin route");
  console.log("Rust account route rehearsal self-test passed");
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    return;
  }
  process.stdout.write(renderSnippet(args.group));
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

export { renderSnippet, assertSafeLocations, ROUTE_GROUPS };
