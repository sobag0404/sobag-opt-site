import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

const REQUIRED_FIELDS = [
  "footerEmail",
  "footerPhone",
  "footerAddress",
  "contactsLegalAddress",
  "contactsProductionAddress",
  "contactsSchedule",
];

const FINAL_REQUIRED = ["footerPhone", "footerAddress", "contactsLegalAddress", "contactsProductionAddress"];
const PENDING_PATTERNS = [/по запросу/iu, /соглас/iu, /подтвержд/iu, /будет указан/iu, /уточн/iu];
const FAKE_OR_UNCONFIRMED = [
  { pattern: /\+7\s*900\s*000[-\s]?00[-\s]?00/iu, label: "fake phone" },
  { pattern: /\+7\s*900\s*123[-\s]?45[-\s]?67/iu, label: "fake phone" },
  { pattern: /Москва,\s*ул\.\s*Текстильщиков/iu, label: "unconfirmed address" },
  { pattern: /Новоданиловская\s+набережная/iu, label: "unconfirmed address" },
  { pattern: /opt@sobag-shop\.ru/iu, label: "old email" },
];

function readProjectFile(file) {
  return readFileSync(join(root, file), "utf8");
}

function defaultSiteContentBlock(appText) {
  const start = appText.indexOf("const defaultSiteContent = {");
  const end = appText.indexOf("const siteTextFields =", start);
  if (start < 0 || end < 0) throw new Error("app data: defaultSiteContent block not found");
  return appText.slice(start, end);
}

function fieldValue(block, key) {
  const match = new RegExp(`${key}:\\s*"([^"]*)"`, "u").exec(block);
  return match ? match[1].trim() : "";
}

function isPending(value) {
  return PENDING_PATTERNS.some((pattern) => pattern.test(value));
}

function phoneHref(value = "") {
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("7")) return `tel:+${digits}`;
  if (digits.length === 11 && digits.startsWith("8")) return `tel:+7${digits.slice(1)}`;
  return "contacts.html";
}

function auditContentReadiness(appText) {
  const block = defaultSiteContentBlock(appText);
  const values = Object.fromEntries(REQUIRED_FIELDS.map((key) => [key, fieldValue(block, key)]));
  const errors = [];
  const pending = [];

  REQUIRED_FIELDS.forEach((key) => {
    if (!values[key]) errors.push(`missing defaultSiteContent.${key}`);
  });

  Object.entries(values).forEach(([key, value]) => {
    FAKE_OR_UNCONFIRMED.forEach(({ pattern, label }) => {
      if (pattern.test(value)) errors.push(`${key} contains ${label}`);
    });
  });

  FINAL_REQUIRED.forEach((key) => {
    if (isPending(values[key])) pending.push(key);
  });

  if (phoneHref(values.footerPhone).startsWith("tel:") && isPending(values.footerPhone)) {
    errors.push("pending footerPhone must not become a tel: link");
  }

  const finalReady = FINAL_REQUIRED.every((key) => values[key] && !isPending(values[key]));
  return { ok: errors.length === 0, finalReady, pending, errors, values };
}

function selfTest() {
  const safe = `const defaultSiteContent = {
  footerEmail: "opt@sobag-shop.online",
  footerPhone: "Телефон по запросу",
  footerAddress: "Адрес отгрузки согласуется с менеджером",
  contactsLegalAddress: "Юридический адрес будет указан после подтверждения реквизитов",
  contactsProductionAddress: "Адрес производства согласуется с менеджером",
  contactsSchedule: "Пн-Пт, 10:00-18:00 по Москве",
};
const siteTextFields = [];`;
  const safeReport = auditContentReadiness(safe);
  assert.equal(safeReport.ok, true);
  assert.equal(safeReport.finalReady, false);
  assert.ok(safeReport.pending.includes("footerPhone"));

  const fake = safe.replace("Телефон по запросу", "+7 900 123-45-67");
  const fakeReport = auditContentReadiness(fake);
  assert.equal(fakeReport.ok, false);
  assert.match(fakeReport.errors.join("\n"), /fake phone/);
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    console.log("content readiness report self-test passed");
    return;
  }
  const report = auditContentReadiness(readProjectFile("components/app-data.js"));
  if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Content readiness ${report.ok ? "passed" : "failed"}: finalReady=${report.finalReady}, pending=${report.pending.join(", ") || "none"}`);
    if (report.errors.length) console.log(`Errors: ${report.errors.join("; ")}`);
  }
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

export { auditContentReadiness };
