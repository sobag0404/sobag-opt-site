#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, sep } from "node:path";

const require = createRequire(import.meta.url);
const root = process.cwd();
const { handleError } = require("../api/_lib/http.js");

const directErrorRoutes = new Set(["server-routes/health.js"]);

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

function read(file) {
  return readFileSync(join(root, file), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function auditHttpHelper() {
  const source = read("api/_lib/http.js");
  assert(source.includes('event: "api_error"'), "http helper must log api_error events");
  assert(source.includes("X-Sobag-Request-Id"), "http helper must send X-Sobag-Request-Id");
  assert(/console\.error\(JSON\.stringify\(payload\)\)/.test(source), "http helper must write structured JSON logs");
  assert(/NODE_ENV\s*!==\s*["']production["']/.test(source), "http helper must omit stack traces in production");
  assert(!/UPSTASH|KV_REST|BLOB_READ_WRITE_TOKEN|SOBAG_ADMIN_PASSWORD/.test(source), "http helper must not reference secret env names");
}

function auditRouteErrorHandlers() {
  const errors = [];
  for (const file of apiRouteFiles()) {
    const source = read(file);
    if (directErrorRoutes.has(file)) {
      if (!/catch\s*\(error\)/.test(source) || !/sendJson\(res,\s*error\.statusCode\s*\|\|\s*500/.test(source)) {
        errors.push(`${file}: direct error route must keep explicit safe JSON error response`);
      }
      continue;
    }
    if (!/handleError\s*\(\s*res\s*,\s*error\s*,\s*req\s*\)/.test(source)) {
      errors.push(`${file}: catch block must call handleError(res, error, req)`);
    }
    if (/handleError\s*\(\s*res\s*,\s*error\s*\)/.test(source)) {
      errors.push(`${file}: handleError call is missing req context`);
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
}

function fakeResponse() {
  const headers = {};
  return {
    statusCode: 0,
    body: "",
    headers,
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    end(value) {
      this.body = String(value || "");
    },
  };
}

function captureConsoleError(fn) {
  const previous = console.error;
  const lines = [];
  console.error = (...args) => {
    lines.push(args.join(" "));
  };
  try {
    fn();
  } finally {
    console.error = previous;
  }
  return lines;
}

function auditRuntimeLogShape() {
  const previousEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const res = fakeResponse();
    const req = {
      method: "POST",
      url: "/api/admin/catalog?token=should-not-appear",
      headers: {
        host: "sobag.local",
        "x-request-id": "audit-request-1",
      },
    };
    const error = new Error("Synthetic server failure");
    const lines = captureConsoleError(() => {
      handleError(res, error, req);
    });

    assert(res.statusCode === 500, "handleError should keep server error status");
    assert(res.headers["x-sobag-request-id"] === "audit-request-1", "handleError should expose request id header");
    const body = JSON.parse(res.body);
    assert(body.requestId === "audit-request-1", "error JSON should include requestId");
    assert(lines.length === 1, "server errors should write one structured log line");
    const log = JSON.parse(lines[0]);
    assert(log.event === "api_error", "log event should be api_error");
    assert(log.level === "error", "log level should be error");
    assert(log.requestId === "audit-request-1", "log should preserve request id");
    assert(log.method === "POST", "log should include request method");
    assert(log.path === "/api/admin/catalog", "log should include path without query string");
    assert(log.status === 500, "log should include status");
    assert(!Object.prototype.hasOwnProperty.call(log, "stack"), "production log must not include stack");
    assert(!JSON.stringify(log).includes("should-not-appear"), "log must not include query string values");

    const clientRes = fakeResponse();
    const clientError = new Error("Bad request");
    clientError.statusCode = 400;
    clientError.code = "bad_request";
    const clientLines = captureConsoleError(() => {
      handleError(clientRes, clientError, req);
    });
    assert(clientLines.length === 0, "client errors should not be logged by default");
  } finally {
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
  }
}

function main() {
  auditHttpHelper();
  auditRouteErrorHandlers();
  auditRuntimeLogShape();
  console.log(`Error log audit passed: ${apiRouteFiles().length} API routes checked.`);
}

main();
