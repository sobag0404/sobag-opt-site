#!/usr/bin/env node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const tempDir = mkdtempSync(join(tmpdir(), "sobag-rum-smoke-"));
process.env.SOBAG_STORE_PROVIDER = "file";
process.env.SOBAG_FILE_STORE_DIR = tempDir;
process.env.SOBAG_RATE_LIMIT_TEST = "1";
process.env.SOBAG_RATE_LIMIT_TEST_MAX = "20";
process.env.SOBAG_RUM_RATE_LIMIT_MAX = "3";

const { createSobagServer } = await import("../server.mjs");
const { resetRateLimits } = await import("../server-routes/_lib/api-security.js");
const { getStoreClient } = await import("../server-routes/_lib/store.js");
const { RUM_KEY, safePublicSummary } = await import("../server-routes/rum.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address())));
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(new URL(path, baseUrl), {
    method: options.method || "GET",
    headers: {
      accept: "application/json",
      ...(options.rawBody || options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    body: options.rawBody || (options.body ? JSON.stringify(options.body) : undefined),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${path}: expected JSON, got ${text.slice(0, 160)}`);
  }
  return { response, payload };
}

async function storedRumSummary() {
  return safePublicSummary(await getStoreClient().get(RUM_KEY));
}

async function runBrowserBeacon(baseUrl) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ serviceWorkers: "block" });
    const rumResponse = page.waitForResponse((response) => response.url().endsWith("/api/rum") && response.status() === 202, { timeout: 12_000 });
    await page.goto(`${baseUrl}/?rum-smoke=1`, { waitUntil: "load" });
    await rumResponse;
  } finally {
    await browser.close();
  }
}

async function run() {
  const server = createSobagServer();
  try {
    const address = await listen(server);
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const valid = await request(baseUrl, "/api/rum", {
      method: "POST",
      body: {
        events: [
          {
            name: "LCP",
            value: 1234.56,
            rating: "good",
            route: "/catalog.html?search=user@example.test&token=secret",
            device: "desktop",
            connection: "4g",
            appVersion: "qa-rum",
            email: "must-not-persist@example.test",
            cookie: "must-not-persist",
          },
        ],
      },
    });
    assert(valid.response.status === 202 && valid.payload.accepted === 1, "valid RUM payload should be accepted");
    assert((valid.response.headers.get("cache-control") || "").includes("no-store"), "RUM endpoint response must be no-store");
    let summary = await storedRumSummary();
    assert(summary.totalEvents === 1, "RUM summary should count valid event");
    assert(summary.groups[0]?.route === "/catalog", "RUM summary should sanitize route and strip query");
    assert(!JSON.stringify(summary).includes("must-not-persist") && !JSON.stringify(summary).includes("user@example.test"), "RUM summary must not persist sensitive fields");

    const invalid = await request(baseUrl, "/api/rum", {
      method: "POST",
      body: { events: [{ name: "EMAIL", value: 1, route: "/" }] },
    });
    assert(invalid.response.status === 400 && invalid.payload.error === "invalid_rum_metric", "invalid metric should be rejected");

    const oversized = await request(baseUrl, "/api/rum", {
      method: "POST",
      rawBody: JSON.stringify({ events: [{ name: "LCP", value: 1, route: "/", note: "x".repeat(5000) }] }),
    });
    assert(oversized.response.status === 413 && oversized.payload.error === "payload_too_large", "oversized RUM payload should be rejected");

    resetRateLimits();
    for (let index = 0; index < 3; index += 1) {
      const burst = await request(baseUrl, "/api/rum", { method: "POST", body: { events: [{ name: "FCP", value: 100 + index, route: "/" }] } });
      assert(burst.response.status === 202, "RUM burst pre-limit should be accepted");
    }
    const limited = await request(baseUrl, "/api/rum", { method: "POST", body: { events: [{ name: "FCP", value: 999, route: "/" }] } });
    assert(limited.response.status === 429 && limited.payload.error === "rate_limited", "RUM burst should be rate-limited");
    resetRateLimits();

    await runBrowserBeacon(baseUrl);
    summary = await storedRumSummary();
    assert(summary.totalEvents >= 5, "browser RUM beacon should add safe metric events");
    assert(summary.groups.some((group) => group.name === "NAV_LOAD" || group.name === "FCP"), "browser RUM should include navigation or paint timing");

    console.log(`RUM smoke passed: ${baseUrl}, events=${summary.totalEvents}, groups=${summary.groups.length}`);
  } finally {
    await close(server).catch(() => {});
    rmSync(tempDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
