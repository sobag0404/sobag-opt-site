import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_PACKET = "local-import-output/catalog-db-env-packet.json";
const SECRET_KEYS = [/password/i, /token/i, /secret/i, /url$/i, /connection/i, /user/i, /^env$/i, /^credentials?$/i];

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

function secretLikeKeys(value, path = "") {
  if (!value || typeof value !== "object") return [];
  const found = [];
  Object.entries(value).forEach(([key, item]) => {
    const next = path ? `${path}.${key}` : key;
    if (SECRET_KEYS.some((pattern) => pattern.test(key))) found.push(next);
    if (item && typeof item === "object") found.push(...secretLikeKeys(item, next));
  });
  return found;
}

function validatePacket(packet) {
  const errors = [];
  const warnings = [];
  if (text(packet.provider).toLowerCase() !== "postgres") errors.push("provider must be postgres");
  if (!["test", "staging"].includes(text(packet.databaseKind).toLowerCase())) errors.push("databaseKind must be test or staging before production cutover");
  ["hostClass", "databaseName", "seedSource"].forEach((field) => {
    if (!text(packet[field])) errors.push(`missing ${field}`);
  });
  secretLikeKeys(packet).forEach((key) => errors.push(`packet must not contain secret-like key: ${key}`));
  if (packet.productionCredentials !== false) errors.push("productionCredentials must be false for rehearsal");
  if (packet.runtimeToggleApproved !== false) errors.push("runtimeToggleApproved must stay false until separate production approval");
  if (packet.schemaApplied === true && packet.rollbackRehearsalConfirmed !== true) {
    warnings.push("schemaApplied is true but rollbackRehearsalConfirmed is not true yet");
  }
  if (text(packet.seedSource) && !["bundle:pim:postgres", "export:pim:postgres"].includes(text(packet.seedSource))) {
    warnings.push("seedSource should normally be bundle:pim:postgres or export:pim:postgres");
  }
  return { ok: errors.length === 0, ready: errors.length === 0, errors, warnings };
}

function auditPacketFile(path, { strict = false } = {}) {
  const resolved = resolve(process.cwd(), path);
  if (!existsSync(resolved)) {
    return { ok: !strict, ready: false, missing: true, errors: strict ? [`missing ${path}`] : [], warnings: [`${path} is not created yet`] };
  }
  const parsed = JSON.parse(readFileSync(resolved, "utf8"));
  return { ...validatePacket(parsed), missing: false };
}

function selfTest() {
  const good = validatePacket({
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
  if (!good.ok) throw new Error(`valid fixture rejected: ${good.errors.join("; ")}`);
  const bad = validatePacket({ ...good, databaseUrl: "postgres://example", productionCredentials: true });
  if (bad.ok || !bad.errors.some((item) => item.includes("secret-like"))) throw new Error("secret fixture should be rejected");
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("Catalog DB env packet audit self-test passed");
    return;
  }
  const report = auditPacketFile(args.packet, args);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Catalog DB env packet: ${report.ready ? "ready" : "pending"}`);
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
