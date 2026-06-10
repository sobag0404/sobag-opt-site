import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validatePacket } from "./catalog-db-env-packet-audit.mjs";

const DEFAULT_PACKET = "local-import-output/catalog-db-env-packet.json";
const DEFAULT_OUT = "local-import-output/catalog-db-apply-plan.json";

const SECRET_ENV_NAMES = ["SOBAG_CATALOG_DATABASE_URL"];
const OPTIONAL_ENV_NAMES = ["SOBAG_CATALOG_DB_POOL_SIZE", "SOBAG_CATALOG_DB_IDLE_MS", "SOBAG_CATALOG_DB_CONNECT_MS"];

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

function text(value) {
  return String(value || "").trim();
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

function buildCatalogDbApplyPlan(packet) {
  const validation = validatePacket(packet);
  if (!validation.ok) throw new Error(`catalog DB packet is not ready: ${validation.errors.join("; ")}`);

  const rollbackRehearsed = packet.rollbackRehearsalConfirmed === true;
  const schemaApplied = packet.schemaApplied === true;
  const runtimeToggleApproved = packet.runtimeToggleApproved === true;

  return {
    ready: true,
    source: "catalog-db-env-packet",
    provider: "postgres",
    publicConfigPreview: {
      provider: "postgres",
      databaseKind: text(packet.databaseKind),
      hostClass: text(packet.hostClass),
      databaseName: text(packet.databaseName),
      sslRequired: packet.sslRequired === true,
      schemaApplied,
      seedSource: text(packet.seedSource),
      rollbackRehearsalConfirmed: rollbackRehearsed,
      runtimeToggleApproved,
    },
    rehearsalReady: true,
    cutoverReady: Boolean(schemaApplied && rollbackRehearsed && runtimeToggleApproved),
    requiredEnvNames: ["SOBAG_CATALOG_SOURCE", ...SECRET_ENV_NAMES],
    optionalEnvNames: OPTIONAL_ENV_NAMES,
    secretEnvNames: SECRET_ENV_NAMES,
    guardrails: [
      "do not commit database URLs, users, passwords, .env files, dumps, or production credentials",
      "do not change production env/cache/user data without explicit approval",
      "run only rollback rehearsal before a separate approved production toggle",
      "keep public catalog APIs compatible and published-only",
      "imports must not delete products and existing-product updates require explicit update mode",
      "Vercel stays on Redis/KV fallback and must not be switched to file-store",
    ],
    offlineCommands: [
      "npm.cmd run audit:catalog:db-packet -- --strict",
      "npm.cmd run smoke:catalog:source",
      "npm.cmd run smoke:catalog:db-rows",
      "npm.cmd run smoke:catalog:db-query",
      "npm.cmd run smoke:catalog:db-source",
      "npm.cmd run smoke:catalog:db-client",
      "npm.cmd run smoke:catalog:db-write",
      "npm.cmd run audit:catalog:db-write-plan",
      "npm.cmd run rehearse:catalog:db-write",
      "npm.cmd run bundle:pim:postgres -- --dry-run",
      "npm.cmd run audit:pim:postgres-bundle -- --dry-run",
      "npm.cmd run rehearse:pim:postgres",
    ],
    testDbCommands: [
      "node tools/pim-postgres-rehearsal.mjs --execute --database-url-env SOBAG_CATALOG_DATABASE_URL --allow-remote-test",
    ],
    approvedCutoverCommands: [
      "npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online --require-catalog-db",
      "npm.cmd run smoke:prod -- --base-url https://sobag-shop.online",
      "npm.cmd run smoke:prod:performance -- --base-url https://sobag-shop.online",
    ],
    rollback: [
      "revert SOBAG_CATALOG_SOURCE to the previous non-PostgreSQL value",
      "restart the VPS app process",
      "run production smoke and storage readiness smoke",
      "leave PostgreSQL data untouched for analysis",
    ],
  };
}

function planPacketFile(path, outPath = DEFAULT_OUT) {
  if (!existsSync(resolve(process.cwd(), path))) {
    return { ready: false, missing: true, errors: [`missing ${path}`], warnings: [] };
  }
  const plan = buildCatalogDbApplyPlan(readJson(path));
  const resolvedOut = resolve(process.cwd(), outPath);
  mkdirSync(dirname(resolvedOut), { recursive: true });
  writeFileSync(resolvedOut, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return { ...plan, out: outPath };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function selfTest() {
  const plan = buildCatalogDbApplyPlan({
    provider: "postgres",
    databaseKind: "test",
    hostClass: "managed",
    databaseName: "sobag_catalog_test",
    sslRequired: true,
    schemaApplied: false,
    seedSource: "bundle:pim:postgres",
    rollbackRehearsalConfirmed: false,
    productionCredentials: false,
    runtimeToggleApproved: false,
  });
  assert(plan.ready, "valid catalog DB plan rejected");
  assert(plan.requiredEnvNames.includes("SOBAG_CATALOG_DATABASE_URL"), "DB URL env name must be listed");
  assert(!JSON.stringify(plan.publicConfigPreview).includes("DATABASE_URL"), "public preview must not expose secret env names");
  assert(plan.cutoverReady === false, "cutover must stay false before explicit runtime approval");

  try {
    buildCatalogDbApplyPlan({ provider: "postgres", databaseUrl: "postgres://example" });
    throw new Error("invalid packet was accepted");
  } catch (error) {
    if (!String(error.message).includes("not ready")) throw error;
  }
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("Catalog DB apply plan self-test passed");
    return;
  }
  const report = planPacketFile(args.packet, args.out);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Catalog DB apply plan: ${report.ready ? "ready" : "pending"}`);
    if (report.out) console.log(`Wrote: ${report.out}`);
    if (report.ready) console.log(`Cutover ready: ${report.cutoverReady ? "yes" : "no"}`);
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

export { buildCatalogDbApplyPlan };
