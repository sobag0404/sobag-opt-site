import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { buildGoalReadinessReport } from "./goal-readiness-report.mjs";
import { buildGoalInputsReport } from "./goal-inputs-packet-audit.mjs";

const REQUIRED_PLAN_SCRIPTS = ["plan:final-content", "plan:object-storage", "plan:catalog-db", "plan:cwv-field"];
const REQUIRED_PLAN_DOCS = [
  "docs/final-content-apply-plan.md",
  "docs/object-storage-apply-plan.md",
  "docs/catalog-db-apply-plan.md",
  "docs/cwv-field-apply-plan.md",
];

function parseArgs(argv = process.argv.slice(2)) {
  const args = { strict: false, json: false, selfTest: false };
  for (const token of argv) {
    if (token === "--strict") args.strict = true;
    else if (token === "--json") args.json = true;
    else if (token === "--self-test") args.selfTest = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function loadPackageScripts() {
  const parsed = JSON.parse(readFileSync("package.json", "utf8"));
  return parsed.scripts || {};
}

function buildPlanCoverage() {
  const scripts = loadPackageScripts();
  const missingScripts = REQUIRED_PLAN_SCRIPTS.filter((name) => !scripts[name]);
  const missingDocs = REQUIRED_PLAN_DOCS.filter((path) => !existsSync(path));
  return {
    ready: missingScripts.length === 0 && missingDocs.length === 0,
    requiredScripts: REQUIRED_PLAN_SCRIPTS,
    requiredDocs: REQUIRED_PLAN_DOCS,
    missingScripts,
    missingDocs,
  };
}

function buildGoalCompletionAudit() {
  const readiness = buildGoalReadinessReport();
  const inputs = buildGoalInputsReport({ strict: false });
  const planCoverage = buildPlanCoverage();
  const blockers = [
    ...(readiness.complete ? [] : readiness.sections.flatMap((section) => (section.done ? [] : section.pending.map((item) => `${section.label}: ${item}`)))),
    ...(inputs.ready ? [] : inputs.packets.flatMap((packet) => (packet.ready ? [] : [`${packet.label}: ${packet.path}`]))),
    ...(planCoverage.ready ? [] : planCoverage.missingScripts.map((name) => `missing script ${name}`)),
    ...(planCoverage.ready ? [] : planCoverage.missingDocs.map((path) => `missing doc ${path}`)),
  ];
  const complete = readiness.complete && inputs.ready && planCoverage.ready;
  return {
    complete,
    readiness,
    inputs,
    planCoverage,
    blockers,
    finalReminder: complete
      ? "Remind the user about point 5: future no-Node migration to Rust Axum + HTMX/templates + PostgreSQL + Redis + Meilisearch + MinIO/S3 + Docker/systemd + Nginx."
      : "",
  };
}

function selfTest() {
  const report = buildGoalCompletionAudit();
  if (!report.planCoverage.ready) throw new Error("all apply plan docs/scripts should exist");
  if (report.complete) throw new Error("current goal must not be complete without real external packets");
  if (!report.blockers.length) throw new Error("pending goal completion should list blockers");
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("Goal completion audit self-test passed");
    return;
  }
  const report = buildGoalCompletionAudit();
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Goal completion: ${report.complete ? "complete" : "pending"}`);
    report.blockers.forEach((blocker) => console.log(`PENDING ${blocker}`));
    if (report.finalReminder) console.log(report.finalReminder);
  }
  if (args.strict && !report.complete) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export { buildGoalCompletionAudit };
