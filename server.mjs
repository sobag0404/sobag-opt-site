#!/usr/bin/env node
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const root = resolve(process.cwd());
const { handleApiRequest } = require("./api-router");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "SAMEORIGIN",
};

function applySecurityHeaders(response) {
  Object.entries(securityHeaders).forEach(([key, value]) => response.setHeader(key, value));
}

function cacheControlFor(pathname) {
  if (pathname.startsWith("/assets/")) return "public, max-age=86400, stale-while-revalidate=604800";
  if (pathname === "/data/products-live.json") return "public, max-age=0, must-revalidate";
  if (pathname.startsWith("/api/")) return "no-store";
  return "public, max-age=0, must-revalidate";
}

function isInsideRoot(filePath) {
  const prepared = normalize(filePath);
  return prepared === root || prepared.startsWith(`${root}${sep}`);
}

function resolveStaticFile(pathname) {
  const cleanPath = decodeURIComponent(pathname || "/").replace(/^\/+/, "");
  const candidates = [];
  if (!cleanPath) {
    candidates.push("index.html");
  } else {
    candidates.push(cleanPath);
    if (!extname(cleanPath)) candidates.push(`${cleanPath}.html`);
    candidates.push(join(cleanPath, "index.html"));
  }
  return candidates
    .map((candidate) => resolve(root, candidate))
    .find((filePath) => isInsideRoot(filePath) && existsSync(filePath) && statSync(filePath).isFile());
}

async function handleApi(request, response, pathname) {
  applySecurityHeaders(response);
  await handleApiRequest(request, response, pathname);
  return true;
}

function serveStatic(request, response, pathname) {
  const filePath = resolveStaticFile(pathname);
  applySecurityHeaders(response);
  if (!filePath) {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": cacheControlFor(pathname),
  });
  createReadStream(filePath).pipe(response);
}

export function createSobagServer() {
  return createServer(async (request, response) => {
    const { pathname = "/" } = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    try {
      if (pathname.startsWith("/api/") && (await handleApi(request, response, pathname))) return;
      serveStatic(request, response, pathname);
    } catch (error) {
      if (!response.headersSent) {
        applySecurityHeaders(response);
        response.writeHead(500, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        });
      }
      response.end(JSON.stringify({ error: "server_error", message: "Ошибка сервера." }));
      console.error(error);
    }
  });
}

export function startSobagServer({ port = Number(process.env.PORT || 3000), host = process.env.HOST || "0.0.0.0" } = {}) {
  const server = createSobagServer();
  server.listen(port, host, () => {
    const address = server.address();
    const label = typeof address === "object" && address ? `${address.address}:${address.port}` : `${host}:${port}`;
    console.log(`Sobag VPS server: http://${label}`);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startSobagServer();
}
