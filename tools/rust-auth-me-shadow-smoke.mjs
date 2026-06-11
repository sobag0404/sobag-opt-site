#!/usr/bin/env node

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const DEFAULT_NODE_ENTRY = "server.mjs";
const DEFAULT_RUST_BIN = "rust-server/target/release/sobag-opt-rust";
const SESSION_COOKIE = "sobag_session";

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    nodeEntry: DEFAULT_NODE_ENTRY,
    rustBin: DEFAULT_RUST_BIN,
    timeout: 20000,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--node-entry") args.nodeEntry = argv[++index] || args.nodeEntry;
    else if (token === "--rust-bin") args.rustBin = argv[++index] || args.rustBin;
    else if (token === "--timeout") args.timeout = Number(argv[++index] || args.timeout) || args.timeout;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log("Usage: node tools/rust-auth-me-shadow-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function keyFileName(key) {
  return `${Buffer.from(String(key || ""), "utf8").toString("hex")}.json`;
}

function wrap(value, ttlSeconds = 0) {
  return {
    version: 1,
    expiresAt: ttlSeconds !== 0 ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : "",
    value,
  };
}

async function writeStoreValue(dir, key, value, ttlSeconds = 0) {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, keyFileName(key)), `${JSON.stringify(wrap(value, ttlSeconds), null, 2)}\n`, "utf8");
}

function fixtureStore() {
  const customerThread = [
    { at: "2026-06-11T00:00:00.000Z", visibility: "customer", text: "visible" },
    { at: "2026-06-11T00:01:00.000Z", visibility: "internal", text: "hidden" },
  ];
  return {
    users: {
      "buyer@example.test": {
        email: "buyer@example.test",
        name: "Buyer",
        role: "buyer",
        phone: "+7 968 959-32-54",
        passwordHash: "642284d450b3032d40340ccc7fc96fdaca2ffd9564761ecf7615269b4bef46f8",
        passwordSalt: "00112233445566778899aabbccddeeff",
      },
      "manager@example.test": { email: "manager@example.test", name: "Manager", role: "manager", passwordHash: "hidden", passwordSalt: "hidden" },
      "content@example.test": { email: "content@example.test", name: "Content", role: "content", passwordHash: "hidden", passwordSalt: "hidden" },
      "admin@example.test": { email: "admin@example.test", name: "Admin", role: "admin", owner: true, passwordHash: "hidden", passwordSalt: "hidden" },
    },
    orders: [
      { id: "SO-1", userEmail: "buyer@example.test", total: 30000, customer: { email: "buyer@example.test" }, crmThread: customerThread },
      { id: "SO-2", userEmail: "other@example.test", total: 40000, customer: { email: "other@example.test" }, crmThread: [] },
    ],
    carts: { "buyer@example.test": { items: [{ key: "sku-1", variant: { sku: "sku-1" }, qty: 3 }] } },
    favorites: { "buyer@example.test": { items: ["p1", "p2"] } },
    savedCarts: {},
    reviews: [
      { id: "REV-1", userEmail: "buyer@example.test", text: "ok", status: "approved", createdAt: "2026-06-11T00:02:00.000Z" },
      { id: "REV-2", userEmail: "buyer@example.test", text: "delete me", status: "pending", createdAt: "2026-06-11T00:01:00.000Z" },
    ],
    briefs: [],
    audit: [],
    version: 1,
  };
}

async function createFixtureStore(dir) {
  await writeStoreValue(dir, "sobag:store:v1", fixtureStore());
  await writeStoreValue(dir, "sobag:content:v1", {
    content: { brandName: "Sobag Preview", footerPhone: "+7 901 879-41-62" },
    updatedAt: "2026-06-11T00:00:00.000Z",
    updatedBy: "content@example.test",
    version: 1,
  });
  const sessions = {
    buyer: "buyer@example.test",
    manager: "manager@example.test",
    content: "content@example.test",
    admin: "admin@example.test",
  };
  for (const [token, email] of Object.entries(sessions)) {
    await writeStoreValue(dir, `sobag:session:${token}`, { email, createdAt: "2026-06-11T00:00:00.000Z" }, 3600);
  }
  await writeStoreValue(dir, "sobag:session:expired", { email: "buyer@example.test", createdAt: "2026-06-11T00:00:00.000Z" }, -60);
  return { ...sessions, expired: "buyer@example.test" };
}

function startProcess(command, args, env) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
  return { child, output: () => output };
}

async function waitForJson(url, timeout) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
      lastError = new Error(`${url} -> HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(300);
  }
  throw lastError || new Error(`Timeout waiting for ${url}`);
}

async function getJson(url, token = "") {
  const result = await getJsonResponse(url, token);
  if (!result.ok) throw new Error(`${url} -> HTTP ${result.status}`);
  return result.payload;
}

async function getJsonResponse(url, token = "") {
  const headers = token ? { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` } : {};
  const response = await fetch(url, { headers });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

async function requestJson(url, { token = "", method = "GET", body = null } = {}) {
  const headers = token ? { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` } : {};
  if (body) headers["content-type"] = "application/json";
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, headers: response.headers, payload };
}

function sessionTokenFromSetCookie(response) {
  const cookie = response.headers.get("set-cookie") || "";
  const match = cookie.match(/sobag_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex").slice(0, 12);
}

function assertSame(label, nodePayload, rustPayload) {
  const left = JSON.stringify(stable(nodePayload));
  const right = JSON.stringify(stable(rustPayload));
  if (left !== right) {
    throw new Error(`${label} mismatch\nnode=${left}\nrust=${right}`);
  }
}

async function runSmoke(args) {
  const temp = await mkdtemp(join(tmpdir(), "sobag-rust-auth-shadow-"));
  const nodePort = 53000 + Math.floor(Math.random() * 1000);
  const rustPort = nodePort + 1000;
  const sessions = await createFixtureStore(temp);
  const env = {
    NODE_ENV: "test",
    SOBAG_STORE_PROVIDER: "file",
    SOBAG_FILE_STORE_DIR: temp,
    SOBAG_ADMIN_EMAIL: "",
    SOBAG_ADMIN_PASSWORD: "",
  };
  const node = startProcess(process.execPath, [resolve(args.nodeEntry)], { ...env, PORT: String(nodePort), HOST: "127.0.0.1" });
  const rust = startProcess(resolve(args.rustBin), [], { ...env, SOBAG_RUST_BIND: `127.0.0.1:${rustPort}` });
  try {
    await waitForJson(`http://127.0.0.1:${nodePort}/api/health`, args.timeout);
    await waitForJson(`http://127.0.0.1:${rustPort}/api/health-rust`, args.timeout);
    const checks = [["anonymous", ""], ...Object.entries(sessions)];
    for (const [label, token] of checks) {
      const nodePayload = await getJson(`http://127.0.0.1:${nodePort}/api/auth/me`, token);
      const rustPayload = await getJson(`http://127.0.0.1:${rustPort}/rust/auth/me`, token);
      assertSame(label, nodePayload, rustPayload);
      if (JSON.stringify(rustPayload).includes("passwordHash") || JSON.stringify(rustPayload).includes("passwordSalt")) {
        throw new Error(`${label} leaked password fields`);
      }
      console.log(`OK ${label} ${digest(rustPayload)}`);
    }
    for (const [label, token] of [
      ["admin orders admin", "admin"],
      ["admin orders manager", "manager"],
    ]) {
      const nodePayload = await getJson(`http://127.0.0.1:${nodePort}/api/admin/orders`, token);
      const rustPayload = await getJson(`http://127.0.0.1:${rustPort}/rust/admin/orders`, token);
      assertSame(label, nodePayload, rustPayload);
      console.log(`OK ${label} ${digest(rustPayload)}`);
    }
    for (const [label, token, email] of [
      ["admin users buyer detail", "admin", "buyer@example.test"],
      ["admin users order-only customer", "manager", "other@example.test"],
    ]) {
      const query = `email=${encodeURIComponent(email)}`;
      const nodePayload = await getJson(`http://127.0.0.1:${nodePort}/api/admin/users?${query}`, token);
      const rustPayload = await getJson(`http://127.0.0.1:${rustPort}/rust/admin/users?${query}`, token);
      assertSame(label, nodePayload, rustPayload);
      if (JSON.stringify(rustPayload).includes("passwordHash") || JSON.stringify(rustPayload).includes("passwordSalt")) {
        throw new Error(`${label} leaked password fields`);
      }
      console.log(`OK ${label} ${digest(rustPayload)}`);
    }
    const rustUsers = await getJson(`http://127.0.0.1:${rustPort}/rust/admin/users`, "admin");
    if (!Array.isArray(rustUsers.users) || rustUsers.users.length < 4) {
      throw new Error(`admin users list mismatch: ${JSON.stringify(rustUsers)}`);
    }
    if (JSON.stringify(rustUsers).includes("passwordHash") || JSON.stringify(rustUsers).includes("passwordSalt")) {
      throw new Error("admin users list leaked password fields");
    }
    console.log(`OK admin users list ${digest(rustUsers)}`);
    const managerInviteForbidden = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/users`, {
      token: "manager",
      method: "POST",
      body: { email: "blocked-manager@example.test" },
    });
    if (managerInviteForbidden.status !== 403 || managerInviteForbidden.payload.error !== "forbidden") {
      throw new Error(`admin users manager invite mismatch: ${managerInviteForbidden.status} ${JSON.stringify(managerInviteForbidden.payload)}`);
    }
    const invalidEmployee = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/users`, {
      token: "admin",
      method: "POST",
      body: { email: "bad-email" },
    });
    if (invalidEmployee.status !== 400 || invalidEmployee.payload.error !== "invalid_email") {
      throw new Error(`admin users invalid invite mismatch: ${invalidEmployee.status} ${JSON.stringify(invalidEmployee.payload)}`);
    }
    const invitedEmployee = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/users`, {
      token: "admin",
      method: "POST",
      body: { email: "employee@example.test", name: "Employee", phone: "89001234567" },
    });
    if (
      invitedEmployee.status !== 201 ||
      invitedEmployee.payload.user?.role !== "manager" ||
      invitedEmployee.payload.user?.employee !== true ||
      invitedEmployee.payload.user?.phone !== "+7 900 123-45-67"
    ) {
      throw new Error(`admin users invite mismatch: ${invitedEmployee.status} ${JSON.stringify(invitedEmployee.payload)}`);
    }
    if (JSON.stringify(invitedEmployee.payload).includes("passwordHash") || JSON.stringify(invitedEmployee.payload).includes("passwordSalt")) {
      throw new Error("admin users invite leaked password fields");
    }
    const patchedEmployee = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/users`, {
      token: "admin",
      method: "PATCH",
      body: { email: "employee@example.test", role: "content" },
    });
    if (patchedEmployee.status !== 200 || patchedEmployee.payload.user?.role !== "content") {
      throw new Error(`admin users role patch mismatch: ${patchedEmployee.status} ${JSON.stringify(patchedEmployee.payload)}`);
    }
    const invalidRole = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/users`, {
      token: "admin",
      method: "PATCH",
      body: { email: "employee@example.test", role: "admin" },
    });
    if (invalidRole.status !== 400 || invalidRole.payload.error !== "invalid_role") {
      throw new Error(`admin users invalid role mismatch: ${invalidRole.status} ${JSON.stringify(invalidRole.payload)}`);
    }
    const deletedEmployee = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/users`, {
      token: "admin",
      method: "DELETE",
      body: { email: "employee@example.test" },
    });
    if (deletedEmployee.status !== 200 || deletedEmployee.payload.user?.role !== "buyer" || deletedEmployee.payload.user?.employee !== false) {
      throw new Error(`admin users delete mismatch: ${deletedEmployee.status} ${JSON.stringify(deletedEmployee.payload)}`);
    }
    const adminLocked = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/users`, {
      token: "admin",
      method: "DELETE",
      body: { email: "admin@example.test" },
    });
    if (adminLocked.status !== 403 || adminLocked.payload.error !== "admin_locked") {
      throw new Error(`admin users admin-locked mismatch: ${adminLocked.status} ${JSON.stringify(adminLocked.payload)}`);
    }
    console.log("OK admin users write preview invite/role/delete");
    for (const [label, token, status, code] of [
      ["admin orders anonymous", "", 401, "unauthorized"],
      ["admin orders buyer", "buyer", 403, "forbidden"],
      ["admin orders expired", "expired", 401, "unauthorized"],
    ]) {
      const nodeResult = await getJsonResponse(`http://127.0.0.1:${nodePort}/api/admin/orders`, token);
      const rustResult = await getJsonResponse(`http://127.0.0.1:${rustPort}/rust/admin/orders`, token);
      if (nodeResult.status !== status || rustResult.status !== status) {
        throw new Error(`${label} status mismatch: node=${nodeResult.status} rust=${rustResult.status}`);
      }
      if (nodeResult.payload.error !== code || rustResult.payload.error !== code) {
        throw new Error(`${label} error mismatch: node=${nodeResult.payload.error} rust=${rustResult.payload.error}`);
      }
      console.log(`OK ${label} ${status}`);
    }
    for (const [label, token, status, code] of [
      ["admin users anonymous", "", 401, "unauthorized"],
      ["admin users buyer", "buyer", 403, "forbidden"],
      ["admin users missing", "admin", 404, "not_found"],
    ]) {
      const nodeResult = await getJsonResponse(`http://127.0.0.1:${nodePort}/api/admin/users?email=missing@example.test`, token);
      const rustResult = await getJsonResponse(`http://127.0.0.1:${rustPort}/rust/admin/users?email=missing@example.test`, token);
      if (nodeResult.status !== status || rustResult.status !== status) {
        throw new Error(`${label} status mismatch: node=${nodeResult.status} rust=${rustResult.status}`);
      }
      if (nodeResult.payload.error !== code || rustResult.payload.error !== code) {
        throw new Error(`${label} error mismatch: node=${nodeResult.payload.error} rust=${rustResult.payload.error}`);
      }
      console.log(`OK ${label} ${status}`);
    }
    const invalidOrderStatus = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/orders`, {
      token: "admin",
      method: "PATCH",
      body: { id: "SO-1", status: "bad" },
    });
    if (invalidOrderStatus.status !== 400 || invalidOrderStatus.payload.error !== "invalid_status") {
      throw new Error(`admin orders invalid status mismatch: ${invalidOrderStatus.status} ${JSON.stringify(invalidOrderStatus.payload)}`);
    }
    const invalidOrderManager = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/orders`, {
      token: "admin",
      method: "PATCH",
      body: { id: "SO-1", managerEmail: "buyer@example.test" },
    });
    if (invalidOrderManager.status !== 400 || invalidOrderManager.payload.error !== "invalid_manager") {
      throw new Error(`admin orders invalid manager mismatch: ${invalidOrderManager.status} ${JSON.stringify(invalidOrderManager.payload)}`);
    }
    const patchedOrder = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/orders`, {
      token: "manager",
      method: "PATCH",
      body: {
        id: "SO-1",
        status: "processing",
        managerEmail: "manager@example.test",
        managerNote: "Call client",
        commentText: "Visible update",
        commentVisibility: "customer",
      },
    });
    if (
      patchedOrder.status !== 200 ||
      patchedOrder.payload.order?.status !== "processing" ||
      patchedOrder.payload.order?.managerName !== "Manager" ||
      patchedOrder.payload.order?.crmThread?.[0]?.visibility !== "customer" ||
      !patchedOrder.payload.order?.statusHistory?.length
    ) {
      throw new Error(`admin orders patch mismatch: ${patchedOrder.status} ${JSON.stringify(patchedOrder.payload)}`);
    }
    const missingOrder = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/orders`, {
      token: "admin",
      method: "PATCH",
      body: { id: "missing", status: "processing" },
    });
    if (missingOrder.status !== 404 || missingOrder.payload.error !== "not_found") {
      throw new Error(`admin orders missing mismatch: ${missingOrder.status} ${JSON.stringify(missingOrder.payload)}`);
    }
    console.log("OK admin orders patch preview status/manager/comment");
    const invalidLogin = await requestJson(`http://127.0.0.1:${rustPort}/rust/auth/login`, {
      method: "POST",
      body: { login: "buyer@example.test", password: "wrong" },
    });
    if (invalidLogin.status !== 401 || invalidLogin.payload.error !== "unauthorized") {
      throw new Error(`invalid login mismatch: ${invalidLogin.status} ${JSON.stringify(invalidLogin.payload)}`);
    }

    const login = await requestJson(`http://127.0.0.1:${rustPort}/rust/auth/login`, {
      method: "POST",
      body: { login: "89689593254", password: "Qwerty1234567899" },
    });
    const loginToken = sessionTokenFromSetCookie(login);
    if (login.status !== 200 || !loginToken) throw new Error(`login mismatch: ${login.status}`);
    if (JSON.stringify(login.payload).includes("passwordHash") || JSON.stringify(login.payload).includes("passwordSalt")) {
      throw new Error("login leaked password fields");
    }

    const profile = await requestJson(`http://127.0.0.1:${rustPort}/rust/auth/me`, {
      token: loginToken,
      method: "PUT",
      body: { profile: { name: "Updated Buyer", phone: "89001234567", inn: "123abc456789012" } },
    });
    if (profile.status !== 200 || profile.payload.user?.phone !== "+7 900 123-45-67") {
      throw new Error(`profile update mismatch: ${profile.status} ${JSON.stringify(profile.payload)}`);
    }
    if (profile.payload.user?.inn !== "123456789012") throw new Error("profile inn sanitize mismatch");

    const accountState = await requestJson(`http://127.0.0.1:${rustPort}/rust/auth/me`, {
      token: loginToken,
      method: "PUT",
      body: {
        cartItems: [
          ["line-1", { qty: 100000, variant: { sku: "sku-1", price: -5 } }],
          { key: "bad", variant: {} },
        ],
        favoriteItems: ["p1", "p1", "", "p2"],
        savedCarts: [{
          id: "SC-1",
          title: "Quote",
          items: [["line-1", { variant: { sku: "sku-1" } }]],
          status: "sent",
          managerComment: "hidden",
          commentHistory: [
            { visibility: "customer", text: "visible" },
            { visibility: "internal", text: "hidden" },
          ],
        }],
      },
    });
    if (accountState.status !== 200) throw new Error(`account state status ${accountState.status}: ${JSON.stringify(accountState.payload)}`);
    if (accountState.payload.cartItems?.[0]?.[1]?.qty !== 99999) throw new Error("cart qty sanitize mismatch");
    if (accountState.payload.cartItems?.[0]?.[1]?.variant?.price !== 0) throw new Error("cart price sanitize mismatch");
    if (JSON.stringify(accountState.payload.favoriteItems) !== JSON.stringify(["p1", "p2"])) throw new Error("favorites sanitize mismatch");
    if (accountState.payload.savedCarts?.[0]?.managerComment) throw new Error("buyer saved cart leaked manager comment");
    if (accountState.payload.savedCarts?.[0]?.commentHistory?.length !== 1) throw new Error("buyer saved cart leaked internal history");

    const invalidBuyerReview = await requestJson(`http://127.0.0.1:${rustPort}/rust/auth/me`, {
      token: loginToken,
      method: "PUT",
      body: { review: { productId: "p1", baseSku: "opt_1", rating: 5, text: "bad" } },
    });
    if (invalidBuyerReview.status !== 400 || invalidBuyerReview.payload.error !== "invalid_review") {
      throw new Error(`invalid buyer review mismatch: ${invalidBuyerReview.status} ${JSON.stringify(invalidBuyerReview.payload)}`);
    }

    const logout = await requestJson(`http://127.0.0.1:${rustPort}/rust/auth/logout`, { token: loginToken, method: "POST" });
    if (logout.status !== 200 || !String(logout.headers.get("set-cookie") || "").includes("Max-Age=0")) {
      throw new Error(`logout mismatch: ${logout.status}`);
    }
    const afterLogout = await getJson(`http://127.0.0.1:${rustPort}/rust/auth/me`, loginToken);
    if (afterLogout.user !== null) throw new Error("logout session still active");

    const registered = await requestJson(`http://127.0.0.1:${rustPort}/rust/auth/register`, {
      method: "POST",
      body: {
        email: "new@example.test",
        password: "secret123",
        name: "New Buyer",
        phone: "89689593255",
        personalDataConsent: true,
      },
    });
    const registerToken = sessionTokenFromSetCookie(registered);
    if (registered.status !== 201 || !registerToken || registered.payload.user?.role !== "buyer") {
      throw new Error(`register mismatch: ${registered.status} ${JSON.stringify(registered.payload)}`);
    }
    if (JSON.stringify(registered.payload).includes("passwordHash") || JSON.stringify(registered.payload).includes("passwordSalt")) {
      throw new Error("register leaked password fields");
    }
    const registeredMe = await getJson(`http://127.0.0.1:${rustPort}/rust/auth/me`, registerToken);
    if (registeredMe.user?.email !== "new@example.test") throw new Error("registered session mismatch");
    console.log("OK auth write preview login/register/profile/logout");

    const adminContent = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/content`, { token: "content" });
    if (adminContent.status !== 200 || adminContent.payload.content?.brandName !== "Sobag Preview") {
      throw new Error(`admin content get mismatch: ${adminContent.status} ${JSON.stringify(adminContent.payload)}`);
    }
    const contentForbidden = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/content`, { token: "buyer" });
    if (contentForbidden.status !== 403 || contentForbidden.payload.error !== "forbidden") {
      throw new Error(`admin content forbidden mismatch: ${contentForbidden.status} ${JSON.stringify(contentForbidden.payload)}`);
    }
    const invalidContent = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/content`, {
      token: "content",
      method: "PUT",
      body: { content: [] },
    });
    if (invalidContent.status !== 400 || invalidContent.payload.error !== "invalid_content") {
      throw new Error(`admin content validation mismatch: ${invalidContent.status} ${JSON.stringify(invalidContent.payload)}`);
    }
    const updatedContent = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/content`, {
      token: "content",
      method: "PUT",
      body: { content: { brandName: "Updated Sobag", contactsSchedule: "10-18" } },
    });
    if (updatedContent.status !== 200 || updatedContent.payload.count !== 2 || !updatedContent.payload.updatedAt) {
      throw new Error(`admin content update mismatch: ${updatedContent.status} ${JSON.stringify(updatedContent.payload)}`);
    }
    const contentAfterUpdate = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/content`, { token: "admin" });
    if (contentAfterUpdate.payload.content?.brandName !== "Updated Sobag" || contentAfterUpdate.payload.updatedBy !== "content@example.test") {
      throw new Error(`admin content persistence mismatch: ${JSON.stringify(contentAfterUpdate.payload)}`);
    }
    const contentReviews = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/content?reviews=1`, { token: "content" });
    if (contentReviews.status !== 200 || contentReviews.payload.reviews?.[0]?.id !== "REV-1") {
      throw new Error(`admin content reviews mismatch: ${contentReviews.status} ${JSON.stringify(contentReviews.payload)}`);
    }
    const patchedReview = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/content`, {
      token: "content",
      method: "PATCH",
      body: { reviewId: "REV-1", status: "hidden" },
    });
    if (patchedReview.status !== 200 || patchedReview.payload.review?.status !== "hidden" || patchedReview.payload.review?.moderatedBy !== "content@example.test") {
      throw new Error(`admin review patch mismatch: ${patchedReview.status} ${JSON.stringify(patchedReview.payload)}`);
    }
    const invalidReviewPatch = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/content`, {
      token: "content",
      method: "PATCH",
      body: { reviewId: "REV-1", status: "deleted" },
    });
    if (invalidReviewPatch.status !== 400 || invalidReviewPatch.payload.error !== "invalid_status") {
      throw new Error(`admin review invalid status mismatch: ${invalidReviewPatch.status} ${JSON.stringify(invalidReviewPatch.payload)}`);
    }
    const deletedReview = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/content`, {
      token: "admin",
      method: "PATCH",
      body: { reviewId: "REV-2", delete: true },
    });
    if (deletedReview.status !== 200 || deletedReview.payload.deleted !== true || deletedReview.payload.review !== null) {
      throw new Error(`admin review delete mismatch: ${deletedReview.status} ${JSON.stringify(deletedReview.payload)}`);
    }
    const reviewsAfterPatch = await requestJson(`http://127.0.0.1:${rustPort}/rust/admin/content?reviews=1`, { token: "admin" });
    if (reviewsAfterPatch.payload.reviews?.length !== 1 || reviewsAfterPatch.payload.reviews?.[0]?.status !== "hidden") {
      throw new Error(`admin reviews after patch mismatch: ${JSON.stringify(reviewsAfterPatch.payload)}`);
    }
    console.log("OK admin content preview get/update/reviews/patch");
    console.log("Rust auth/me and admin/orders shadow smoke passed");
  } catch (error) {
    const output = `${node.output()}\n${rust.output()}`.trim();
    if (output) console.error(output.slice(-4000));
    throw error;
  } finally {
    node.child.kill("SIGTERM");
    rust.child.kill("SIGTERM");
    await rm(temp, { recursive: true, force: true });
  }
}

function selfTest() {
  if (keyFileName("sobag:store:v1") !== "736f6261673a73746f72653a7631.json") throw new Error("file key mismatch");
  const store = fixtureStore();
  if (!store.users["buyer@example.test"] || store.orders.length !== 2) throw new Error("fixture mismatch");
  if (!store.users["buyer@example.test"].passwordHash || !store.users["buyer@example.test"].phone) throw new Error("auth write fixture mismatch");
  if (!store.users["content@example.test"]) throw new Error("content fixture mismatch");
  if (!wrap({ ok: true }, -60).expiresAt) throw new Error("expired wrapper mismatch");
  if (!store.orders[0].crmThread.some((entry) => entry.visibility === "internal")) throw new Error("admin orders fixture mismatch");
  console.log("Rust auth/me and admin/orders shadow smoke self-test passed");
}

const args = parseArgs();
try {
  if (args.selfTest) selfTest();
  else await runSmoke(args);
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
