import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validatePacket } from "./cwv-field-audit-packet.mjs";

const DEFAULT_PACKET = "local-import-output/cwv-field-audit-packet.json";
const DEFAULT_OUT = "local-import-output/cwv-field-apply-plan.json";

function parseArgs(argv = process.argv.slice(2)) {
  const args = { packet: DEFAULT_PACKET, out: DEFAULT_OUT, json: false, selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--packet") args.packet = argv[++index] || args.packet;
    else if (token === "--out") args.out = argv[++index] || args.out;
    else if (token === "--json") args.json = true;
    else if (token === "--self-test") args.selfTest = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildCwvFieldApplyPlan(packet) {
  const validation = validatePacket(packet);
  if (!validation.ok) throw new Error(`CWV field audit packet is not ready: ${validation.errors.join("; ")}`);

  const pages = (packet.pages || []).map((page) => ({
    path: String(page.path || ""),
    lcpMs: number(page.lcpMs),
    cls: number(page.cls),
    inpMs: number(page.inpMs),
    tbtMs: number(page.tbtMs),
    firstPageApiKb: number(page.firstPageApiKb),
    usesWebpOrAvif: page.usesWebpOrAvif === true,
  }));

  return {
    ready: true,
    source: "cwv-field-audit-packet",
    baseUrl: packet.baseUrl,
    measuredAt: packet.measuredAt,
    tool: packet.tool,
    catalogProducts: number(packet.catalogProducts),
    imageMigrationReady: packet.imageMigrationReady === true,
    summary: {
      pages: pages.length,
      worstLcpMs: Math.max(...pages.map((page) => page.lcpMs)),
      worstCls: Math.max(...pages.map((page) => page.cls)),
      worstInpMs: Math.max(...pages.map((page) => page.inpMs)),
      worstTbtMs: Math.max(...pages.map((page) => page.tbtMs)),
      maxFirstPageApiKb: Math.max(...pages.map((page) => page.firstPageApiKb)),
      webpOrAvifPages: pages.filter((page) => page.usesWebpOrAvif).length,
    },
    pages,
    guardrails: [
      "use only real measurements from https://sobag-shop.online after real 10k+ catalog/photo growth",
      "do not mark final Core Web Vitals done from synthetic fixture data",
      "keep first-page catalog/search API payloads under the packet threshold",
      "product/category/search pages must use migrated WebP or AVIF image variants",
      "do not weaken catalog, cart, order, admin, or mobile UX to improve metrics artificially",
    ],
    verificationCommands: [
      "npm.cmd run audit:cwv-field -- --strict",
      "npm.cmd run audit:cwv",
      "npm.cmd run smoke:prod:performance -- --base-url https://sobag-shop.online",
      "npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online",
      "npm.cmd run smoke:prod -- --base-url https://sobag-shop.online",
    ],
    completionGate: [
      "strict CWV field packet passes",
      "real migrated image metadata is WebP/AVIF-ready",
      "production performance smoke passes on the VPS domain",
      "goal readiness report no longer lists performance/CWV as pending",
    ],
  };
}

function planPacketFile(path, outPath = DEFAULT_OUT) {
  if (!existsSync(resolve(process.cwd(), path))) {
    return { ready: false, missing: true, errors: [`missing ${path}`], warnings: [] };
  }
  const plan = buildCwvFieldApplyPlan(readJson(path));
  const resolvedOut = resolve(process.cwd(), outPath);
  mkdirSync(dirname(resolvedOut), { recursive: true });
  writeFileSync(resolvedOut, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return { ...plan, out: outPath };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function selfTest() {
  const pages = ["/", "/catalog", "/catalog?category=test", "/search?q=test", "/cart", "/product-modal?sku=opt_1"].map((path) => ({
    path,
    lcpMs: 2200,
    cls: 0.05,
    inpMs: 180,
    tbtMs: 180,
    firstPageApiKb: 180,
    usesWebpOrAvif: true,
  }));
  const plan = buildCwvFieldApplyPlan({
    baseUrl: "https://sobag-shop.online",
    catalogProducts: 10000,
    imageMigrationReady: true,
    measuredAt: "2026-06-10T12:00:00.000Z",
    tool: "Lighthouse",
    pages,
  });
  assert(plan.ready, "valid CWV plan rejected");
  assert(plan.summary.pages === 6, "page summary should be preserved");
  assert(plan.summary.worstLcpMs === 2200, "worst LCP should be summarized");
  try {
    buildCwvFieldApplyPlan({ baseUrl: "https://sobag-shop.online", catalogProducts: 808, imageMigrationReady: false, pages: [] });
    throw new Error("invalid packet was accepted");
  } catch (error) {
    if (!String(error.message).includes("not ready")) throw error;
  }
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("CWV field apply plan self-test passed");
    return;
  }
  const report = planPacketFile(args.packet, args.out);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`CWV field apply plan: ${report.ready ? "ready" : "pending"}`);
    if (report.out) console.log(`Wrote: ${report.out}`);
    if (report.summary) console.log(`Pages: ${report.summary.pages}`);
    if (report.errors?.length) console.log(`Errors: ${report.errors.join("; ")}`);
  }
  if (!report.ready) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export { buildCwvFieldApplyPlan };
