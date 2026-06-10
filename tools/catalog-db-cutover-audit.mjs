import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const RUNBOOK = "docs/catalog-db-cutover-runbook.md";

const REQUIRED_PHRASES = [
  "SOBAG_CATALOG_SOURCE=postgres",
  "SOBAG_CATALOG_DATABASE_URL",
  "npm.cmd run smoke:catalog:source",
  "npm.cmd run smoke:catalog:db-rows",
  "npm.cmd run smoke:catalog:db-query",
  "npm.cmd run smoke:catalog:db-source",
  "npm.cmd run smoke:catalog:db-client",
  "npm.cmd run smoke:catalog:db-write",
  "npm.cmd run audit:catalog:db-write-plan",
  "npm.cmd run rehearse:catalog:db-write",
  "npm.cmd run audit:pim-db",
  "npm.cmd run audit:pim-schema",
  "npm.cmd run audit:pim-query",
  "npm.cmd run bundle:pim:postgres",
  "npm.cmd run audit:pim:postgres-bundle",
  "npm.cmd run rehearse:pim:postgres",
  "--require-catalog-db",
  "Public catalog must return only `published` non-hidden products",
  "Imports must not delete existing products",
  "Existing products can be updated only through explicit update mode",
  "Do not write env values into Git",
];

function auditCatalogDbCutoverRunbook(text) {
  const errors = [];
  REQUIRED_PHRASES.forEach((phrase) => {
    if (!text.includes(phrase)) errors.push(`runbook missing: ${phrase}`);
  });
  if (/SOBAG_CATALOG_DATABASE_URL\s*=\s*postgres(?:ql)?:\/\/[^<\s]/i.test(text)) {
    errors.push("runbook must not contain PostgreSQL connection strings");
  }
  if (/DATABASE_URL\s*=\s*postgres(?:ql)?:\/\/[^<\s]/i.test(text)) {
    errors.push("runbook must not contain DATABASE_URL connection strings");
  }
  if (errors.length) throw new Error(`Catalog DB cutover audit failed:\n${errors.join("\n")}`);
  return { phrases: REQUIRED_PHRASES.length };
}

function selfTest() {
  const good = auditCatalogDbCutoverRunbook(REQUIRED_PHRASES.join("\n"));
  if (good.phrases !== REQUIRED_PHRASES.length) throw new Error("self-test phrase count mismatch");
  let rejected = false;
  try {
    auditCatalogDbCutoverRunbook(REQUIRED_PHRASES.filter((phrase) => phrase !== "--require-catalog-db").join("\n"));
  } catch (error) {
    rejected = /runbook missing/.test(error.message);
  }
  if (!rejected) throw new Error("self-test should reject incomplete runbook");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    console.log("Catalog DB cutover audit self-test passed");
    return;
  }
  const path = join(root, RUNBOOK);
  if (!existsSync(path)) throw new Error(`Missing ${RUNBOOK}`);
  const summary = auditCatalogDbCutoverRunbook(readFileSync(path, "utf8"));
  console.log(`Catalog DB cutover audit passed: ${summary.phrases} required runbook checks`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

export { auditCatalogDbCutoverRunbook };
