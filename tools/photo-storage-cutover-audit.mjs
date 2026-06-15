import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const RUNBOOK = "docs/photo-storage-cutover-runbook.md";

const REQUIRED_PHRASES = [
  "npm.cmd run plan:photos",
  "npm.cmd run audit:photo-manifest",
  "npm.cmd run smoke:photo-pilot",
  "npm.cmd run upload:photos",
  "npm.cmd run audit:photo-candidate",
  "tools/image-metadata-audit.mjs",
  "npm.cmd run smoke:prod:storage",
  "--require-object-storage",
  "SOBAG_OBJECT_STORAGE_PROVIDER=s3-compatible",
  "SOBAG_S3_ENDPOINT",
  "local-import-output/",
  "raw/bulk photos",
  "Existing products must not be deleted",
  "Product/category/collection/holiday previews must stay square 1:1",
  "Do not commit `.env`",
];

function auditCutoverRunbook(text) {
  const errors = [];
  REQUIRED_PHRASES.forEach((phrase) => {
    if (!text.includes(phrase)) errors.push(`runbook missing: ${phrase}`);
  });
  if (/BLOB_READ_WRITE_TOKEN\s*=\s*[^<\s]/.test(text)) errors.push("runbook must not contain Blob token values");
  if (/SOBAG_S3_SECRET_ACCESS_KEY\s*=\s*[^<\s]/.test(text)) errors.push("runbook must not contain S3 secret values");
  if (errors.length) throw new Error(`Photo storage cutover audit failed:\n${errors.join("\n")}`);
  return { phrases: REQUIRED_PHRASES.length };
}

function selfTest() {
  const good = auditCutoverRunbook(REQUIRED_PHRASES.join("\n"));
  if (good.phrases !== REQUIRED_PHRASES.length) throw new Error("self-test phrase count mismatch");
  let rejected = false;
  try {
    auditCutoverRunbook(REQUIRED_PHRASES.filter((phrase) => phrase !== "npm.cmd run smoke:prod:storage").join("\n"));
  } catch (error) {
    rejected = /runbook missing/.test(error.message);
  }
  if (!rejected) throw new Error("self-test should reject incomplete runbook");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    console.log("Photo storage cutover audit self-test passed");
    return;
  }
  const path = join(root, RUNBOOK);
  if (!existsSync(path)) throw new Error(`Missing ${RUNBOOK}`);
  const summary = auditCutoverRunbook(readFileSync(path, "utf8"));
  console.log(`Photo storage cutover audit passed: ${summary.phrases} required runbook checks`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

export { auditCutoverRunbook };
