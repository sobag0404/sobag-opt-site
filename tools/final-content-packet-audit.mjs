import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_PACKET = "local-import-output/final-content-packet.json";
const REQUIRED_FIELDS = [
  "companyName",
  "footerEmail",
  "footerPhone",
  "footerAddress",
  "contactsLegalAddress",
  "contactsProductionAddress",
  "contactsSchedule",
];
const OPTIONAL_MAP_FIELDS = ["contactsLegalMapUrl", "contactsProductionMapUrl"];
const PENDING_PATTERNS = [/по запросу/iu, /соглас/iu, /подтвержд/iu, /будет указан/iu, /уточн/iu];
const FORBIDDEN_PATTERNS = [
  { pattern: /\+7\s*900\s*000[-\s]?00[-\s]?00/iu, label: "fake phone" },
  { pattern: /\+7\s*900\s*123[-\s]?45[-\s]?67/iu, label: "fake phone" },
  { pattern: /opt@sobag-shop\.ru/iu, label: "old email" },
  { pattern: /Москва,\s*ул\.\s*Текстильщиков/iu, label: "unconfirmed address" },
  { pattern: /Новоданиловская\s+набережная/iu, label: "unconfirmed address" },
];

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

function isInternationalPhone(value) {
  return /^\+\d[\d\s().-]{8,}$/.test(value) && value.replace(/\D/g, "").length >= 11;
}

function validatePacket(packet) {
  const errors = [];
  const warnings = [];
  REQUIRED_FIELDS.forEach((field) => {
    if (!text(packet[field])) errors.push(`missing ${field}`);
  });
  if (text(packet.footerEmail) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(packet.footerEmail))) errors.push("footerEmail is not a valid email");
  if (text(packet.footerPhone) && !isInternationalPhone(text(packet.footerPhone))) errors.push("footerPhone must use international format");

  [...REQUIRED_FIELDS, ...OPTIONAL_MAP_FIELDS].forEach((field) => {
    const value = text(packet[field]);
    if (!value) return;
    PENDING_PATTERNS.forEach((pattern) => {
      if (pattern.test(value)) errors.push(`${field} still looks pending`);
    });
    FORBIDDEN_PATTERNS.forEach(({ pattern, label }) => {
      if (pattern.test(value)) errors.push(`${field} contains ${label}`);
    });
  });

  OPTIONAL_MAP_FIELDS.forEach((field) => {
    const value = text(packet[field]);
    if (value && !/^https:\/\/(?:yandex\.ru|yandex\.[a-z]+)\/maps\//iu.test(value)) warnings.push(`${field} is not a Yandex Maps URL`);
  });

  return { ok: errors.length === 0, errors, warnings, presentFields: REQUIRED_FIELDS.filter((field) => text(packet[field])).length };
}

function auditPacketFile(path, { strict = false } = {}) {
  const resolved = resolve(process.cwd(), path);
  if (!existsSync(resolved)) {
    return { ok: !strict, ready: false, missing: true, errors: strict ? [`missing ${path}`] : [], warnings: [`${path} is not created yet`] };
  }
  const parsed = JSON.parse(readFileSync(resolved, "utf8"));
  if (parsed.template === true) {
    return {
      ok: !strict,
      ready: false,
      missing: false,
      errors: strict ? [`${path} is still a template`] : [],
      warnings: [`${path} is a starter template; fill real no-secret values before strict gates`],
    };
  }
  const result = validatePacket(parsed);
  return { ...result, ready: result.ok, missing: false };
}

function selfTest() {
  const valid = validatePacket({
    companyName: "ИП Иванов Иван Иванович",
    footerEmail: "opt@example.ru",
    footerPhone: "+7 999 999-99-99",
    footerAddress: "г. Москва, ул. Примерная, 1",
    contactsLegalAddress: "г. Москва, ул. Примерная, 1, офис 1",
    contactsProductionAddress: "г. Москва, ул. Производственная, 2",
    contactsSchedule: "Пн-Пт, 10:00-18:00",
    contactsLegalMapUrl: "https://yandex.ru/maps/?text=test",
  });
  if (!valid.ok) throw new Error(`valid fixture rejected: ${valid.errors.join("; ")}`);
  const fake = validatePacket({ ...valid, footerPhone: "+7 900 123-45-67" });
  if (fake.ok || !fake.errors.some((item) => item.includes("fake phone"))) throw new Error("fake fixture should be rejected");
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("Final content packet audit self-test passed");
    return;
  }
  const report = auditPacketFile(args.packet, args);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Final content packet: ${report.ready ? "ready" : "pending"}`);
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
