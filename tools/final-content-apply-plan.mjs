import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validatePacket } from "./final-content-packet-audit.mjs";

const DEFAULT_PACKET = "local-import-output/final-content-packet.json";
const DEFAULT_OUT = "local-import-output/final-content-apply-plan.json";

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

function text(value) {
  return String(value || "").trim();
}

function buildFinalContentApplyPlan(packet, currentContent = {}) {
  const validation = validatePacket(packet);
  if (!validation.ok) throw new Error(`final content packet is not ready: ${validation.errors.join("; ")}`);

  const patch = {
    footerEmail: text(packet.footerEmail),
    footerPhone: text(packet.footerPhone),
    footerAddress: text(packet.footerAddress),
    contactsAddress: text(packet.contactsProductionAddress),
    contactsLegalAddress: text(packet.contactsLegalAddress),
    contactsProductionAddress: text(packet.contactsProductionAddress),
    contactsSchedule: text(packet.contactsSchedule),
  };

  const optional = {
    contactsLegalMapUrl: text(packet.contactsLegalMapUrl),
    contactsProductionMapUrl: text(packet.contactsProductionMapUrl),
  };
  Object.entries(optional).forEach(([key, value]) => {
    if (value) patch[key] = value;
  });

  const changedKeys = Object.keys(patch).filter((key) => currentContent[key] !== patch[key]);
  return {
    ready: true,
    source: "final-content-packet",
    changedKeys,
    contentPatch: patch,
    nextSteps: [
      "review contentPatch",
      "login as admin/content manager",
      "merge patch with current /api/admin/content response",
      "PUT merged content to /api/admin/content",
      "run npm.cmd run audit:content-readiness and production smoke",
    ],
  };
}

function auditPacketFile(path, outPath = DEFAULT_OUT) {
  if (!existsSync(resolve(process.cwd(), path))) {
    return { ready: false, missing: true, errors: [`missing ${path}`], warnings: [] };
  }
  const plan = buildFinalContentApplyPlan(readJson(path));
  const resolvedOut = resolve(process.cwd(), outPath);
  mkdirSync(dirname(resolvedOut), { recursive: true });
  writeFileSync(resolvedOut, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return { ...plan, out: outPath };
}

function selfTest() {
  const plan = buildFinalContentApplyPlan({
    companyName: "ИП Иванов Иван Иванович",
    footerEmail: "opt@example.ru",
    footerPhone: "+7 999 999-99-99",
    footerAddress: "г. Москва, ул. Примерная, 1",
    contactsLegalAddress: "г. Москва, ул. Примерная, 1, офис 1",
    contactsProductionAddress: "г. Москва, ул. Производственная, 2",
    contactsSchedule: "Пн-Пт, 10:00-18:00",
    contactsLegalMapUrl: "https://yandex.ru/maps/?text=test",
    contactsProductionMapUrl: "https://yandex.ru/maps/?text=test2",
  });
  if (!plan.ready || !plan.contentPatch.footerPhone || !plan.changedKeys.includes("contactsLegalAddress")) {
    throw new Error("valid final content plan rejected");
  }
  try {
    buildFinalContentApplyPlan({ footerPhone: "+7 900 123-45-67" });
    throw new Error("invalid packet was accepted");
  } catch (error) {
    if (!String(error.message).includes("not ready")) throw error;
  }
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("Final content apply plan self-test passed");
    return;
  }
  const report = auditPacketFile(args.packet, args.out);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Final content apply plan: ${report.ready ? "ready" : "pending"}`);
    if (report.out) console.log(`Wrote: ${report.out}`);
    if (report.changedKeys?.length) console.log(`Changed keys: ${report.changedKeys.join(", ")}`);
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

export { buildFinalContentApplyPlan };
