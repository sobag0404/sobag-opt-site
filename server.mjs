#!/usr/bin/env node
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const root = resolve(process.cwd());
const { handleApiRequest } = require("./api-router");
const publicRootFiles = new Set(["index.html", "app.js", "cart.js", "styles.css", "sw.js", "favicon.ico"]);
const publicRootExtensions = new Set([".html", ".ico", ".png", ".svg", ".webp", ".jpg", ".jpeg"]);
const publicDirectories = new Set(["assets", "components", "templates"]);

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

function isFingerprintedAsset(pathname) {
  return /\.[a-f0-9]{8,}\.(?:css|js|png|jpe?g|svg|webp|ico|woff2?)$/i.test(pathname);
}

function cacheControlFor(pathname, searchParams = new URLSearchParams()) {
  const hasVersionToken = ["v", "ver", "version", "hash", "rev"].some((key) => searchParams.has(key));
  if (pathname === "/sw.js") return "no-cache";
  if (isFingerprintedAsset(pathname)) return "public, max-age=31536000, immutable";
  if (hasVersionToken && [".css", ".js"].includes(extname(pathname).toLowerCase())) return "public, max-age=31536000, immutable";
  if (pathname.startsWith("/assets/")) return "public, max-age=86400, stale-while-revalidate=604800";
  if (pathname === "/data/products-live.json") return "public, max-age=300, stale-while-revalidate=3600";
  if (pathname.startsWith("/api/")) return "no-store";
  if ([".css", ".js", ".json", ".svg", ".png", ".jpg", ".jpeg", ".webp"].includes(extname(pathname).toLowerCase())) {
    return "public, max-age=3600, stale-while-revalidate=86400";
  }
  return "no-cache";
}

function staticEntityHeaders(filePath) {
  const stats = statSync(filePath);
  const modified = stats.mtime.toUTCString();
  const etag = `W/"${stats.size.toString(16)}-${Math.trunc(stats.mtimeMs).toString(16)}"`;
  return { etag, modified };
}

function isNotModified(request, { etag, modified }) {
  const requestEtag = request.headers["if-none-match"];
  if (requestEtag && requestEtag.split(",").map((value) => value.trim()).includes(etag)) return true;
  const requestModifiedSince = request.headers["if-modified-since"];
  if (!requestModifiedSince) return false;
  const requestedTime = Date.parse(requestModifiedSince);
  const modifiedTime = Date.parse(modified);
  return Number.isFinite(requestedTime) && Number.isFinite(modifiedTime) && modifiedTime <= requestedTime;
}

function isInsideRoot(filePath) {
  const prepared = normalize(filePath);
  return prepared === root || prepared.startsWith(`${root}${sep}`);
}

function isPublicStaticPath(candidate) {
  const normalized = String(candidate || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0")) return false;
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return false;
  if (normalized === "data/products-live.json") return true;
  const [topLevel] = segments;
  if (publicDirectories.has(topLevel)) return true;
  if (normalized.includes("/")) return false;
  if (publicRootFiles.has(normalized)) return true;
  return publicRootExtensions.has(extname(normalized).toLowerCase()) && !normalized.startsWith(".");
}

function safeDecodePathname(pathname) {
  try {
    return decodeURIComponent(pathname || "/");
  } catch {
    return "";
  }
}

function resolveStaticFile(pathname) {
  const decodedPath = safeDecodePathname(pathname);
  if (!decodedPath) return undefined;
  const cleanPath = decodedPath.replace(/^\/+/, "");
  const candidates = [];
  if (!cleanPath) {
    candidates.push("index.html");
  } else {
    candidates.push(cleanPath);
    if (!extname(cleanPath)) candidates.push(`${cleanPath}.html`);
    candidates.push(join(cleanPath, "index.html"));
  }
  return candidates
    .filter(isPublicStaticPath)
    .map((candidate) => resolve(root, candidate))
    .find((filePath) => isInsideRoot(filePath) && existsSync(filePath) && statSync(filePath).isFile());
}

function redirectCanonicalPath(request, response, pathname) {
  if (pathname !== "/index.html") return false;
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  applySecurityHeaders(response);
  response.writeHead(301, {
    Location: `/${url.search}`,
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  });
  response.end("Moved permanently to /");
  return true;
}

async function handleApi(request, response, pathname) {
  applySecurityHeaders(response);
  await handleApiRequest(request, response, pathname);
  return true;
}

function serveStatic(request, response, pathname, searchParams = new URLSearchParams()) {
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
  const entity = staticEntityHeaders(filePath);
  const headers = {
    "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": cacheControlFor(pathname, searchParams),
    ETag: entity.etag,
    "Last-Modified": entity.modified,
  };
  if (isNotModified(request, entity)) {
    response.writeHead(304, headers);
    response.end();
    return;
  }
  response.writeHead(200, headers);
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

export function createSobagServer() {
  return createServer(async (request, response) => {
    const { pathname = "/", searchParams } = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    try {
      if (redirectCanonicalPath(request, response, pathname)) return;
      if (pathname.startsWith("/api/") && (await handleApi(request, response, pathname))) return;
      serveStatic(request, response, pathname, searchParams);
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
