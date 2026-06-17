#!/usr/bin/env node

const DEFAULT_BASE_URL = "https://sobag-shop.online";
const ONE_PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

function routeTarget(pathname, nodeBase, rustBase) {
  if (pathname === "/api/admin/product-images") return `${rustBase}/rust/admin/product-images`;
  return `${nodeBase}${pathname}`;
}

function mediaFixture(productKey = "MEDIA-SMOKE") {
  return {
    productKey,
    fileName: "rust-media-smoke.png",
    mime: "image/png",
    base64: ONE_PIXEL_PNG,
    width: 1,
    height: 1,
  };
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = { baseUrl: DEFAULT_BASE_URL, productKey: `rust-media-smoke-${Date.now()}` };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--self-test") args.selfTest = true;
    else if (arg === "--base-url") args.baseUrl = argv[++index];
    else if (arg === "--product-key") args.productKey = argv[++index];
  }
  return args;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sessionCookie(response) {
  const raw = response.headers.get("set-cookie") || "";
  const match = raw.match(/(?:^|,\s*)(sobag_session=[^;,]+)/i);
  return match ? match[1] : "";
}

async function requestJson(baseUrl, pathname, { method = "GET", body, cookie } = {}) {
  const response = await fetch(new URL(pathname, baseUrl), {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      origin: baseUrl.replace(/\/+$/g, ""),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  return { response, status: response.status, payload, cookie: sessionCookie(response) };
}

function selfTest() {
  assert(
    routeTarget("/api/admin/product-images", "node", "rust") ===
      "rust/rust/admin/product-images",
    "admin product images should route to Rust",
  );
  assert(
    routeTarget("/api/admin/import-batches", "node", "rust") ===
      "node/api/admin/import-batches",
    "admin import batches route is not part of media cutover",
  );
  const fixture = mediaFixture("SELF-TEST");
  assert(fixture.mime === "image/png" && fixture.base64.length > 20, "fixture should be a PNG upload");
  console.log("Rust admin media cutover smoke self-test passed");
}

async function liveSmoke(args) {
  const email = process.env.SOBAG_ADMIN_EMAIL || "";
  const password = process.env.SOBAG_ADMIN_PASSWORD || "";
  assert(email && password, "SOBAG_ADMIN_EMAIL and SOBAG_ADMIN_PASSWORD are required for live media smoke");
  const anonymous = await requestJson(args.baseUrl, "/api/admin/product-images");
  assert([401, 403].includes(anonymous.status), `anonymous media route should be denied, got ${anonymous.status}`);

  const login = await requestJson(args.baseUrl, "/api/auth/login", {
    method: "POST",
    body: { login: email, password },
  });
  assert(login.status === 200 && login.cookie, `admin login failed: ${login.status}`);

  let uploaded = null;
  try {
    const upload = await requestJson(args.baseUrl, "/api/admin/product-images", {
      method: "POST",
      cookie: login.cookie,
      body: mediaFixture(args.productKey),
    });
    assert(upload.status === 200, `media upload failed: ${upload.status} ${JSON.stringify(upload.payload)}`);
    uploaded = upload.payload?.image;
    assert(uploaded?.storageKey && uploaded?.url, "upload response should include storageKey and url");
    assert(uploaded.storageKey.startsWith(`products/${args.productKey}/`), "upload storage key should stay under product prefix");

    const list = await requestJson(
      args.baseUrl,
      `/api/admin/product-images?product=${encodeURIComponent(args.productKey)}`,
      { cookie: login.cookie },
    );
    assert(list.status === 200, `media list failed: ${list.status}`);
    assert(Array.isArray(list.payload?.images), "media list should return images array");

    const deleted = await requestJson(args.baseUrl, "/api/admin/product-images", {
      method: "DELETE",
      cookie: login.cookie,
      body: { storageKey: uploaded.storageKey, url: uploaded.url },
    });
    assert(deleted.status === 200, `media delete failed: ${deleted.status} ${JSON.stringify(deleted.payload)}`);
    uploaded = null;
    console.log("Rust admin media live smoke passed");
  } finally {
    if (uploaded?.storageKey) {
      await requestJson(args.baseUrl, "/api/admin/product-images", {
        method: "DELETE",
        cookie: login.cookie,
        body: { storageKey: uploaded.storageKey, url: uploaded.url },
      }).catch(() => {});
    }
  }
}

async function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    return;
  }
  await liveSmoke(args);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

export { routeTarget, mediaFixture };
