#!/usr/bin/env node
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { once } from "node:events";
import { chromium } from "@playwright/test";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function json(response, status = 200) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=300, stale-while-revalidate=3600",
  });
}

function createFixtureServer() {
  const swSource = readFileSync("sw.js", "utf8");
  const counters = new Map();
  const hit = (pathname) => counters.set(pathname, (counters.get(pathname) || 0) + 1);
  const server = createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (url.pathname === "/" || url.pathname === "/catalog.html") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
      response.end(`<!doctype html><html><head><title>SW cache smoke</title></head><body><main>Catalog</main></body></html>`);
      return;
    }
    if (url.pathname === "/sw.js") {
      response.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache" });
      response.end(swSource);
      return;
    }
    if (url.pathname === "/api/catalog-query") {
      hit(url.pathname);
      json(response);
      response.end(JSON.stringify({ ok: true, hit: counters.get(url.pathname), items: [{ baseSku: "opt_1", image: "/media/products/first.webp" }], facets: { categories: { pillows: 517 } } }));
      return;
    }
    if (url.pathname === "/api/catalog-detail") {
      hit(url.pathname);
      json(response);
      response.end(JSON.stringify({ product: { baseSku: "opt_1", variants: [{ sku: "opt_1_a" }] } }));
      return;
    }
    if (url.pathname === "/api/auth/me") {
      hit(url.pathname);
      response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      response.end(JSON.stringify({ user: null, hit: counters.get(url.pathname) }));
      return;
    }
    if (url.pathname === "/media/products/first.webp") {
      hit(url.pathname);
      response.writeHead(200, { "content-type": "image/webp", "cache-control": "public, max-age=86400, stale-while-revalidate=604800" });
      response.end(Buffer.from("524946460000000057454250", "hex"));
      return;
    }
    if (url.pathname === "/__counts") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      response.end(JSON.stringify(Object.fromEntries(counters.entries())));
      return;
    }
    response.writeHead(404, { "cache-control": "no-store" });
    response.end("not found");
  });
  return server;
}

async function counts(baseUrl) {
  const response = await fetch(new URL("/__counts", baseUrl));
  return response.json();
}

async function run() {
  const server = createFixtureServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/catalog.html`, { waitUntil: "load" });
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.register("/sw.js?v=sw-cache-smoke", { scope: "/" });
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => {
          navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
          registration.active?.postMessage({ type: "SKIP_WAITING" });
          setTimeout(resolve, 500);
        });
      }
    });
    if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
      await page.reload({ waitUntil: "load" });
    }
    assert(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), "service worker should control the page");

    const catalogPath = "/api/catalog-query?pageSize=1&sort=popular";
    const firstCatalog = await page.evaluate((path) => fetch(path).then((response) => response.json()), catalogPath);
    const secondCatalog = await page.evaluate((path) => fetch(path).then((response) => response.json()), catalogPath);
    assert(firstCatalog.hit === 1, "first catalog API fetch should reach the fixture server");
    assert(secondCatalog.hit === 1, "fresh catalog API response should be served from SW cache without refetch");

    await page.evaluate(() => fetch("/api/catalog-detail?baseSku=opt_1").then((response) => response.json()));
    await page.evaluate(() => fetch("/api/catalog-detail?baseSku=opt_1").then((response) => response.json()));
    await page.evaluate(() => fetch("/media/products/first.webp").then((response) => response.arrayBuffer()));
    await page.evaluate(() => fetch("/media/products/first.webp").then((response) => response.arrayBuffer()));
    await page.evaluate(() => fetch("/api/auth/me").then((response) => response.json()));
    await page.evaluate(() => fetch("/api/auth/me").then((response) => response.json()));

    const currentCounts = await counts(baseUrl);
    assert(currentCounts["/api/catalog-query"] === 1, `catalog-query should be fetched once, got ${currentCounts["/api/catalog-query"]}`);
    assert(currentCounts["/api/catalog-detail"] === 1, `catalog-detail should be fetched once, got ${currentCounts["/api/catalog-detail"]}`);
    assert(currentCounts["/media/products/first.webp"] === 1, `image should be fetched once, got ${currentCounts["/media/products/first.webp"]}`);
    assert(currentCounts["/api/auth/me"] === 2, "private auth route must bypass SW cache");

    const cacheAudit = await page.evaluate(async () => {
      const keys = await caches.keys();
      const entries = [];
      for (const key of keys) {
        if (!key.startsWith("sobag-public-")) continue;
        const cache = await caches.open(key);
        for (const request of await cache.keys()) entries.push(new URL(request.url).pathname);
      }
      return entries.sort();
    });
    assert(cacheAudit.includes("/api/catalog-query"), "catalog-query should be present in public SW cache");
    assert(cacheAudit.includes("/api/catalog-detail"), "catalog-detail should be present in public SW cache");
    assert(cacheAudit.includes("/media/products/first.webp"), "public image should be present in public SW cache");
    assert(!cacheAudit.includes("/api/auth/me"), "private auth route must not be present in public SW cache");
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    server.close();
  }
  console.log("Service worker cache behavior smoke passed");
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
