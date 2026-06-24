import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const WORKFLOW = ".github/workflows/production-smoke.yml";

const REQUIRED_PHRASES = [
  "https://sobag-shop.online",
  "node tools/production-smoke.mjs",
  "node tools/canonical-url-smoke.mjs",
  "node tools/production-performance-smoke.mjs",
  "node tools/production-storage-readiness.mjs",
  "node tools/cache-warmup-smoke.mjs",
  "SOBAG_PRODUCTION_BASE_URL",
  "workflow_run",
  "vps-deploy",
];

function auditProductionWorkflow(text) {
  const errors = [];
  REQUIRED_PHRASES.forEach((phrase) => {
    if (!text.includes(phrase)) errors.push(`workflow missing: ${phrase}`);
  });
  if (text.includes("http://77.239.107.164")) errors.push("production workflow default must use the HTTPS domain, not the VPS IP");
  if (/--require-(?:object-storage|catalog-db)/.test(text)) errors.push("post-deploy storage readiness must stay non-strict until approved cutover");
  if (errors.length) throw new Error(`Production workflow audit failed:\n${errors.join("\n")}`);
  return { phrases: REQUIRED_PHRASES.length };
}

function selfTest() {
  const good = auditProductionWorkflow(REQUIRED_PHRASES.join("\n"));
  if (good.phrases !== REQUIRED_PHRASES.length) throw new Error("self-test phrase count mismatch");
  let rejected = false;
  try {
    auditProductionWorkflow(`${REQUIRED_PHRASES.filter((phrase) => phrase !== "node tools/production-performance-smoke.mjs").join("\n")}\nhttp://77.239.107.164`);
  } catch (error) {
    rejected = /workflow missing|HTTPS domain/.test(error.message);
  }
  if (!rejected) throw new Error("self-test should reject incomplete/IP workflow");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    console.log("Production workflow audit self-test passed");
    return;
  }
  const path = join(root, WORKFLOW);
  if (!existsSync(path)) throw new Error(`Missing ${WORKFLOW}`);
  const summary = auditProductionWorkflow(readFileSync(path, "utf8"));
  console.log(`Production workflow audit passed: ${summary.phrases} required workflow checks`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

export { auditProductionWorkflow };
