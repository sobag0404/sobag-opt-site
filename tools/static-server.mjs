import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { parse } from "node:url";

const root = resolve(process.cwd());
const args = new Map(process.argv.slice(2).map((arg, index, items) => [arg, items[index + 1]]));
const port = Number(args.get("--port") || process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

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

function isInsideRoot(filePath) {
  const normalized = normalize(filePath);
  return normalized === root || normalized.startsWith(`${root}${sep}`);
}

function resolveRequest(pathname) {
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

createServer((request, response) => {
  const { pathname, search } = parse(request.url || "/");
  if (pathname === "/index.html") {
    response.writeHead(301, {
      Location: `/${search || ""}`,
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end("Moved permanently to /");
    return;
  }
  const filePath = resolveRequest(pathname);

  if (!filePath) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}).listen(port, host, () => {
  console.log(`Sobag static dev server: http://${host}:${port}`);
  console.log("VPS-only mode: use npm run dev:static for local UI work.");
});
