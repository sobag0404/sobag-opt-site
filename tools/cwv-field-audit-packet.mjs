import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_PACKET = "local-import-output/cwv-field-audit-packet.json";
const REQUIRED_PAGE_KEYS = ["home", "catalog", "category", "search", "cart", "product"];

function text(value) {
  return String(value || "").trim();
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = { packet: DEFAULT_PACKET, strict: false, json: false, selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--packet") args.packet = argv[++index] || args.packet;
    else if (token === "--strict") args.strict = true;
    else if (token === "--json") args.json = true;
    else if (token === "--self-test") args.selfTest = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function classifyPage(path) {
  const value = text(path).toLowerCase();
  if (value === "/" || value === "") return "home";
  if (value === "/catalog") return "catalog";
  if (value.startsWith("/catalog?")) return "category";
  if (value.startsWith("/search?")) return "search";
  if (value === "/cart") return "cart";
  if (value.includes("product") || value.includes("modal") || value.includes("detail")) return "product";
  return "";
}

function validatePage(page, index) {
  const errors = [];
  const prefix = `pages[${index}]`;
  const lcp = Number(page.lcpMs || 0);
  const cls = Number(page.cls ?? 999);
  const inp = Number(page.inpMs || 0);
  const tbt = Number(page.tbtMs || 0);
  const firstPageApiKb = Number(page.firstPageApiKb || 0);
  if (!text(page.path)) errors.push(`${prefix}.path missing`);
  if (!lcp || lcp > 2500) errors.push(`${prefix}.lcpMs must be <= 2500`);
  if (Number.isNaN(cls) || cls > 0.1) errors.push(`${prefix}.cls must be <= 0.1`);
  if (inp ? inp > 200 : !tbt || tbt > 300) errors.push(`${prefix}.inpMs must be <= 200 or tbtMs <= 300`);
  if (!firstPageApiKb || firstPageApiKb > 220) errors.push(`${prefix}.firstPageApiKb must be <= 220`);
  if (["catalog", "category", "search", "product"].includes(classifyPage(page.path)) && page.usesWebpOrAvif !== true) {
    errors.push(`${prefix}.usesWebpOrAvif must be true for product pages`);
  }
  return errors;
}

function validatePacket(packet) {
  const errors = [];
  const warnings = [];
  if (text(packet.baseUrl) !== "https://sobag-shop.online") errors.push("baseUrl must be https://sobag-shop.online");
  if (Number(packet.catalogProducts || 0) < 10000) errors.push("catalogProducts must reflect real 10k+ scale");
  if (packet.imageMigrationReady !== true) errors.push("imageMigrationReady must be true");
  if (!text(packet.measuredAt)) errors.push("measuredAt missing");
  if (!text(packet.tool)) errors.push("tool missing");
  if (!Array.isArray(packet.pages) || !packet.pages.length) errors.push("pages[] missing");
  const seen = new Set();
  (packet.pages || []).forEach((page, index) => {
    const kind = classifyPage(page.path);
    if (kind) seen.add(kind);
    errors.push(...validatePage(page, index));
  });
  REQUIRED_PAGE_KEYS.forEach((key) => {
    if (!seen.has(key)) errors.push(`missing required page kind: ${key}`);
  });
  if ((packet.pages || []).length > 12) warnings.push("packet has more than 12 pages; keep it concise");
  return { ok: errors.length === 0, ready: errors.length === 0, errors, warnings, pages: packet.pages?.length || 0 };
}

function auditPacketFile(path, { strict = false } = {}) {
  const resolved = resolve(process.cwd(), path);
  if (!existsSync(resolved)) {
    return { ok: !strict, ready: false, missing: true, errors: strict ? [`missing ${path}`] : [], warnings: [`${path} is not created yet`] };
  }
  return { ...validatePacket(JSON.parse(readFileSync(resolved, "utf8"))), missing: false };
}

function selfTest() {
  const pages = [
    "/",
    "/catalog",
    "/catalog?category=Подушки",
    "/search?q=подушка",
    "/cart",
    "/product-modal?sku=opt_1",
  ].map((path) => ({ path, lcpMs: 2200, cls: 0.05, inpMs: 180, tbtMs: 180, firstPageApiKb: 180, usesWebpOrAvif: true }));
  const good = validatePacket({
    baseUrl: "https://sobag-shop.online",
    catalogProducts: 10000,
    imageMigrationReady: true,
    measuredAt: "2026-06-10T12:00:00.000Z",
    tool: "Lighthouse",
    pages,
  });
  if (!good.ok) throw new Error(`valid fixture rejected: ${good.errors.join("; ")}`);
  const bad = validatePacket({ baseUrl: "https://sobag-shop.online", catalogProducts: 808, imageMigrationReady: false, pages: [] });
  if (bad.ok || !bad.errors.some((item) => item.includes("10k"))) throw new Error("bad fixture should be rejected");
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("CWV field audit packet self-test passed");
    return;
  }
  const report = auditPacketFile(args.packet, args);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`CWV field audit packet: ${report.ready ? "ready" : "pending"}`);
    if (report.warnings?.length) console.log(`Warnings: ${report.warnings.join("; ")}`);
    if (report.errors?.length) console.log(`Errors: ${report.errors.join("; ")}`);
  }
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export { auditPacketFile, validatePacket };
