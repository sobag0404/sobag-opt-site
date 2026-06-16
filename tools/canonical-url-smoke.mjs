#!/usr/bin/env node
import { createServer } from "node:http";
import { once } from "node:events";
import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "https://sobag-shop.online";
const ASSET_PATTERN = /<(?:link|script)\b[^>]+(?:href|src)=["']([^"']+)["']/gi;

function parseArgs(argv = process.argv.slice(2)) {
  const args = { baseUrl: process.env.SOBAG_PRODUCTION_BASE_URL || DEFAULT_BASE_URL, selfTest: false, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--base-url") args.baseUrl = argv[++index] || args.baseUrl;
    else if (token.startsWith("--base-url=")) args.baseUrl = token.slice("--base-url=".length);
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--json") args.json = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/$/, "");
}

async function fetchText(url, init = {}) {
  const response = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": "sobag-canonical-url-smoke/1.0", accept: "text/html,*/*;q=0.1" },
    ...init,
  });
  return { response, body: await response.text() };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractRootAssets(baseUrl, html) {
  const assets = [];
  let match;
  while ((match = ASSET_PATTERN.exec(html))) {
    const href = match[1];
    if (!href || href.startsWith("data:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    const url = new URL(href, `${baseUrl}/`);
    if (url.origin === new URL(baseUrl).origin) assets.push(url.toString());
  }
  return [...new Set(assets)].slice(0, 12);
}

async function runCanonicalSmoke(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  const rootUrl = `${normalized}/`;
  const indexUrl = `${normalized}/index.html`;
  const indexWithQueryUrl = `${normalized}/index.html?utm_source=smoke`;
  const root = await fetchText(rootUrl, { redirect: "follow" });
  assert(root.response.ok, `/ must return 2xx, got ${root.response.status}`);
  assert(root.response.headers.get("content-type")?.includes("text/html"), "/ must return HTML");
  assert(/<link\s+rel=["']canonical["']\s+href=["']https:\/\/sobag-shop\.online\/["']/i.test(root.body), "/ must keep canonical href https://sobag-shop.online/");
  assert(!/href=["'](?:\/)?index\.html["']/i.test(root.body), "root HTML must not link to index.html");

  const index = await fetchText(indexUrl);
  assert(index.response.status === 301, `/index.html must redirect with 301, got ${index.response.status}`);
  assert(new URL(index.response.headers.get("location") || "", rootUrl).toString() === rootUrl, "/index.html must redirect to /");

  const indexWithQuery = await fetchText(indexWithQueryUrl);
  assert(indexWithQuery.response.status === 301, `/index.html?query must redirect with 301, got ${indexWithQuery.response.status}`);
  assert(
    new URL(indexWithQuery.response.headers.get("location") || "", rootUrl).toString() === `${rootUrl}?utm_source=smoke`,
    "/index.html query redirect must preserve search params",
  );

  const pages = ["/catalog", "/cart"];
  for (const path of pages) {
    const check = await fetch(`${normalized}${path}`, { redirect: "follow", headers: { "user-agent": "sobag-canonical-url-smoke/1.0" } });
    assert(check.ok, `${path} must return 2xx, got ${check.status}`);
  }

  const assets = extractRootAssets(normalized, root.body);
  for (const asset of assets) {
    const check = await fetch(asset, { method: "HEAD", redirect: "follow", headers: { "user-agent": "sobag-canonical-url-smoke/1.0" } });
    assert(check.ok, `root asset must load: ${asset} (${check.status})`);
  }

  return { ok: true, baseUrl: normalized, redirected: "/index.html -> /", checkedPages: pages.length, checkedAssets: assets.length };
}

async function withFixtureServer(callback) {
  const server = createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (url.pathname === "/index.html") {
      response.writeHead(301, { Location: `/${url.search}` });
      response.end();
      return;
    }
    if (url.pathname === "/styles.css" || url.pathname === "/app.js") {
      response.writeHead(200, { "Content-Type": url.pathname.endsWith(".css") ? "text/css" : "text/javascript" });
      response.end("");
      return;
    }
    if (["/", "/catalog", "/cart"].includes(url.pathname)) {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end('<html><head><link rel="canonical" href="https://sobag-shop.online/" /><link rel="stylesheet" href="/styles.css" /><script src="/app.js"></script></head><body>Sobag</body></html>');
      return;
    }
    response.writeHead(404);
    response.end("Not found");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
  }
}

async function main() {
  const args = parseArgs();
  const report = args.selfTest ? await withFixtureServer(runCanonicalSmoke) : await runCanonicalSmoke(args.baseUrl);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else console.log(`Canonical URL smoke passed: ${report.baseUrl} (${report.redirected}, pages=${report.checkedPages}, assets=${report.checkedAssets})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

export { runCanonicalSmoke };
