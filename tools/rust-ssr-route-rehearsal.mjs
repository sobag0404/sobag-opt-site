#!/usr/bin/env node

const ROUTE_GROUPS = {
  "catalog-pages": {
    publicRoutes: ["/catalog", "/search", "/product"],
    rustRoutes: ["/catalog", "/search", "/product"],
  },
  "catalog-fragments": {
    publicRoutes: ["/catalog-fragment", "/search-fragment", "/product-fragment"],
    rustRoutes: ["/catalog-fragment", "/search-fragment", "/product-fragment"],
  },
  "content-pages": {
    publicRoutes: [
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
    ],
    rustRoutes: [
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
    ],
  },
};

const BLOCKED_PUBLIC_ROUTES = [
  "/",
  "/cart",
  "/account",
  "/quotes",
  "/favorites",
  "/custom",
  "/api/auth",
  "/api/orders",
  "/api/briefs",
  "/api/admin",
  "/api/content",
];

function parseArgs(argv = process.argv.slice(2)) {
  const args = { group: "all", selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--group") args.group = argv[++index] || args.group;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage: node tools/rust-ssr-route-rehearsal.mjs [--group ${Object.keys(ROUTE_GROUPS).join("|")}|all]`);
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
  if (/location\s+\/\s*\{/.test(snippet)) errors.push("generic location / is forbidden");
  if (/location\s+\^~\s+\/\b/.test(snippet)) errors.push("generic root prefix location is forbidden");
  if (/location\s+\^~\s+\/api\b/.test(snippet)) errors.push("generic /api prefix location is forbidden");
  if (/location\s+\/api\b/.test(snippet)) errors.push("bare /api location is forbidden");
  if (/location\s+\^~\s+\/api\/admin\b/.test(snippet)) errors.push("generic /api/admin prefix location is forbidden");
  if (/proxy_pass\s+http:\/\/127\.0\.0\.1:3001\/api\b/.test(snippet)) errors.push("proxying SSR rehearsal to Rust /api path is forbidden");
  for (const route of BLOCKED_PUBLIC_ROUTES) {
    const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`location\\s+=\\s+${escaped}\\s*\\{`).test(snippet)) {
      errors.push(`blocked public route must not be rehearsed: ${route}`);
    }
  }
  if (errors.length) throw new Error(`Unsafe SSR rehearsal snippet:\n${errors.join("\n")}`);
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
    blocks.push(`# Rust SSR rehearsal group: ${name}`);
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
  if (!all.includes("location = /catalog")) throw new Error("catalog location missing");
  if (!all.includes("proxy_pass http://127.0.0.1:3001/product;")) throw new Error("product rust proxy missing");
  let rejectedRoot = false;
  try {
    assertSafeLocations("location / { proxy_pass http://127.0.0.1:3001; }");
  } catch (error) {
    rejectedRoot = /location \//.test(error.message);
  }
  if (!rejectedRoot) throw new Error("self-test should reject generic root route");
  let rejectedApi = false;
  try {
    assertSafeLocations("location ^~ /api/admin/ { proxy_pass http://127.0.0.1:3001; }");
  } catch (error) {
    rejectedApi = /api\/admin/.test(error.message);
  }
  if (!rejectedApi) throw new Error("self-test should reject wildcard admin API route");
  console.log("Rust SSR route rehearsal self-test passed");
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
