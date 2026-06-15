#!/usr/bin/env node
import { createServer } from "node:http";
import { once } from "node:events";
import { performance } from "node:perf_hooks";

const DEFAULT_BASE_URL = "https://sobag-shop.online";
const DEFAULT_PATHS = ["/", "/catalog", "/cart", "/api/health"];
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_RETRIES = 0;
const DEFAULT_RETRY_DELAY_MS = 5000;

function parseArgs(argv) {
  const options = {
    baseUrl: process.env.SOBAG_PRODUCTION_BASE_URL || DEFAULT_BASE_URL,
    paths: [],
    timeoutMs: DEFAULT_TIMEOUT_MS,
    retries: DEFAULT_RETRIES,
    retryDelayMs: DEFAULT_RETRY_DELAY_MS,
    json: false,
    selfTest: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--self-test") {
      options.selfTest = true;
    } else if (arg === "--base-url") {
      index += 1;
      options.baseUrl = argv[index];
    } else if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.slice("--base-url=".length);
    } else if (arg === "--timeout") {
      index += 1;
      options.timeoutMs = Number(argv[index]);
    } else if (arg.startsWith("--timeout=")) {
      options.timeoutMs = Number(arg.slice("--timeout=".length));
    } else if (arg === "--retries") {
      index += 1;
      options.retries = Number(argv[index]);
    } else if (arg.startsWith("--retries=")) {
      options.retries = Number(arg.slice("--retries=".length));
    } else if (arg === "--retry-delay") {
      index += 1;
      options.retryDelayMs = Number(argv[index]);
    } else if (arg.startsWith("--retry-delay=")) {
      options.retryDelayMs = Number(arg.slice("--retry-delay=".length));
    } else if (arg === "--path") {
      index += 1;
      options.paths.push(argv[index]);
    } else if (arg.startsWith("--path=")) {
      options.paths.push(arg.slice("--path=".length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1000) {
    throw new Error("--timeout must be a number >= 1000");
  }
  if (!Number.isInteger(options.retries) || options.retries < 0) {
    throw new Error("--retries must be an integer >= 0");
  }
  if (!Number.isFinite(options.retryDelayMs) || options.retryDelayMs < 0) {
    throw new Error("--retry-delay must be a number >= 0");
  }
  options.paths = options.paths.length ? options.paths : DEFAULT_PATHS;
  options.paths = options.paths.map((path) => (path.startsWith("/") ? path : `/${path}`));
  return options;
}

function printHelp() {
  console.log(`Usage: node tools/production-smoke.mjs [options]

Read-only production smoke for Sobag Opt.

Options:
  --base-url <url>   Base URL. Default: SOBAG_PRODUCTION_BASE_URL or ${DEFAULT_BASE_URL}
  --path <path>      Path to check. Can be repeated. Default: ${DEFAULT_PATHS.join(", ")}
  --timeout <ms>     Per-request timeout. Default: ${DEFAULT_TIMEOUT_MS}
  --retries <count>  Retry failed smoke runs. Default: ${DEFAULT_RETRIES}
  --retry-delay <ms> Delay between retries. Default: ${DEFAULT_RETRY_DELAY_MS}
  --json             Print machine-readable JSON.
  --self-test        Run against a local in-process fixture server, not production.
  --help             Show this help.
`);
}

function normalizeBaseUrl(rawUrl) {
  if (!rawUrl) throw new Error("Base URL is required");
  const url = new URL(rawUrl);
  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/$/, "");
}

function buildUrl(baseUrl, path) {
  return new URL(path, `${baseUrl}/`).toString();
}

function expectedKind(path) {
  if (path === "/api/health") return "health";
  if (path.startsWith("/api/")) return "json";
  return "html";
}

function assertHtml(path, contentType, body) {
  if (!contentType.toLowerCase().includes("text/html")) {
    throw new Error(`${path}: expected text/html, got ${contentType || "empty content-type"}`);
  }
  if (!/<html[\s>]/i.test(body)) {
    throw new Error(`${path}: expected HTML document marker`);
  }
  if (!/Sobag/i.test(body)) {
    throw new Error(`${path}: expected Sobag brand marker`);
  }
}

function parseJsonBody(path, body) {
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`${path}: expected JSON response (${error.message})`);
  }
}

function assertJson(path, contentType, body) {
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`${path}: expected application/json, got ${contentType || "empty content-type"}`);
  }
  const payload = parseJsonBody(path, body);
  if (payload && payload.ok === false) {
    throw new Error(`${path}: API returned ok=false`);
  }
  return payload;
}

function assertHealth(path, contentType, body) {
  const payload = assertJson(path, contentType, body);
  if (payload.ok !== true) {
    throw new Error(`${path}: health response must include ok=true`);
  }
  if (payload.storage && payload.storage !== "ready") {
    throw new Error(`${path}: storage must be ready, got ${payload.storage}`);
  }
  return payload;
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
  try {
    return await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/json;q=0.9,*/*;q=0.1",
        "user-agent": "sobag-production-smoke/1.0",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkPath(baseUrl, path, timeoutMs) {
  const url = buildUrl(baseUrl, path);
  const startedAt = performance.now();
  const response = await fetchWithTimeout(url, timeoutMs);
  const elapsedMs = Math.round(performance.now() - startedAt);
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status} ${response.statusText || ""}`.trim());
  }

  const kind = expectedKind(path);
  let payload = null;
  if (kind === "html") {
    assertHtml(path, contentType, body);
  } else if (kind === "health") {
    payload = assertHealth(path, contentType, body);
  } else {
    payload = assertJson(path, contentType, body);
  }

  return {
    path,
    url,
    ok: true,
    status: response.status,
    elapsedMs,
    contentType,
    kind,
    payload,
  };
}

async function runSmoke(options) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const results = [];
  for (const path of options.paths) {
    try {
      results.push(await checkPath(baseUrl, path, options.timeoutMs));
    } catch (error) {
      results.push({
        path,
        url: buildUrl(baseUrl, path),
        ok: false,
        error: error.message,
      });
    }
  }

  return {
    ok: results.every((result) => result.ok),
    baseUrl,
    paths: options.paths,
    results,
  };
}

async function sleep(ms) {
  if (!ms) return;
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runSmokeWithRetries(options, onRetry = null) {
  const maxAttempts = options.retries + 1;
  let report = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    report = await runSmoke(options);
    report.attempt = attempt;
    report.maxAttempts = maxAttempts;
    if (report.ok || attempt === maxAttempts) return report;
    if (onRetry) onRetry(report, options.retryDelayMs);
    await sleep(options.retryDelayMs);
  }
  return report;
}

function printHuman(report, { selfTest = false } = {}) {
  const label = selfTest ? "Production smoke self-test" : "Production smoke";
  const attemptLabel = report.maxAttempts > 1 ? ` (attempt ${report.attempt}/${report.maxAttempts})` : "";
  console.log(`${label}: ${report.baseUrl}${attemptLabel}`);
  for (const result of report.results) {
    if (result.ok) {
      console.log(`OK ${result.status} ${String(result.elapsedMs).padStart(4, " ")}ms ${result.path}`);
    } else {
      console.log(`FAIL ${result.path} - ${result.error}`);
    }
  }
  console.log(`${label} ${report.ok ? "passed" : "failed"}: ${report.results.filter((result) => result.ok).length}/${report.results.length}`);
}

function printRetry(report, retryDelayMs) {
  const failed = report.results.filter((result) => !result.ok);
  console.log(`Production smoke attempt ${report.attempt}/${report.maxAttempts} failed; retrying in ${retryDelayMs}ms.`);
  failed.forEach((result) => {
    console.log(`FAIL ${result.path} - ${result.error}`);
  });
}

async function closeServer(server) {
  server.close();
  await once(server, "close");
}

async function createSelfTestServer() {
  const html = (title) => `<!doctype html><html lang="ru"><head><title>Sobag Opt | ${title}</title></head><body>Sobag Opt ${title}</body></html>`;
  const server = createServer((req, res) => {
    if (req.url === "/api/health") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, storage: "ready", objectStorage: { provider: "s3-compatible", configured: false } }));
      return;
    }
    const pages = new Map([
      ["/", html("Home")],
      ["/catalog", html("Catalog")],
      ["/cart", html("Cart")],
    ]);
    if (pages.has(req.url)) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(pages.get(req.url));
      return;
    }
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (options.selfTest) {
    const fixture = await createSelfTestServer();
    try {
      const report = await runSmokeWithRetries(
        { ...options, baseUrl: fixture.baseUrl },
        options.json ? null : printRetry
      );
      if (options.json) console.log(JSON.stringify(report, null, 2));
      else printHuman(report, { selfTest: true });
      if (!report.ok) process.exitCode = 1;
    } finally {
      await closeServer(fixture.server);
    }
    return;
  }

  const report = await runSmokeWithRetries(options, options.json ? null : printRetry);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else printHuman(report);
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
