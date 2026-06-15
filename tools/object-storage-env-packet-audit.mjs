import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_PACKET = "local-import-output/object-storage-env-packet.json";
const SECRET_KEYS = [/secret/i, /token/i, /access.*key/i, /password/i, /connection/i, /^env$/i];

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

function hasSecretLikeKey(value, path = "") {
  if (!value || typeof value !== "object") return [];
  const found = [];
  Object.entries(value).forEach(([key, item]) => {
    const next = path ? `${path}.${key}` : key;
    if (SECRET_KEYS.some((pattern) => pattern.test(key))) found.push(next);
    if (item && typeof item === "object") found.push(...hasSecretLikeKey(item, next));
  });
  return found;
}

function validatePacket(packet) {
  const errors = [];
  const warnings = [];
  const provider = text(packet.provider).toLowerCase();
  if (provider !== "s3-compatible") errors.push("provider must be s3-compatible");

  const secretKeys = hasSecretLikeKey(packet);
  secretKeys.forEach((key) => errors.push(`packet must not contain secret-like key: ${key}`));

  if (provider === "s3-compatible") {
    ["endpoint", "bucket", "publicBaseUrl"].forEach((field) => {
      if (!text(packet[field])) errors.push(`missing ${field}`);
    });
    if (text(packet.endpoint) && !/^https:\/\//i.test(text(packet.endpoint))) errors.push("endpoint must be https");
    if (text(packet.publicBaseUrl) && !/^https:\/\//i.test(text(packet.publicBaseUrl))) errors.push("publicBaseUrl must be https");
    ["credentialsConfirmed", "publicReadConfirmed", "corsConfirmed"].forEach((field) => {
      if (packet[field] !== true) errors.push(`${field} must be true`);
    });
    if (!text(packet.region)) warnings.push("region is empty; adapter will default to auto");
  }

  return { ok: errors.length === 0, ready: errors.length === 0, provider, errors, warnings };
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
  return { ...validatePacket(parsed), missing: false };
}

function selfTest() {
  const good = validatePacket({
    provider: "s3-compatible",
    endpoint: "https://storage.example.test",
    bucket: "sobag-products",
    region: "auto",
    publicBaseUrl: "https://cdn.example.test/sobag-products",
    credentialsConfirmed: true,
    publicReadConfirmed: true,
    corsConfirmed: true,
  });
  if (!good.ok) throw new Error(`valid fixture rejected: ${good.errors.join("; ")}`);
  const bad = validatePacket({ ...good, secretAccessKey: "hidden" });
  if (bad.ok || !bad.errors.some((item) => item.includes("secret-like"))) throw new Error("secret fixture should be rejected");
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("Object storage env packet audit self-test passed");
    return;
  }
  const report = auditPacketFile(args.packet, args);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Object storage env packet: ${report.ready ? "ready" : "pending"}`);
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
