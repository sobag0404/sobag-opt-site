import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validatePacket } from "./object-storage-env-packet-audit.mjs";

const DEFAULT_PACKET = "local-import-output/object-storage-env-packet.json";
const DEFAULT_OUT = "local-import-output/object-storage-apply-plan.json";

const SECRET_ENV_NAMES = {
  "s3-compatible": ["SOBAG_S3_ACCESS_KEY_ID", "SOBAG_S3_SECRET_ACCESS_KEY", "SOBAG_S3_SESSION_TOKEN"],
};

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

function providerPublicConfig(packet, provider) {
  if (provider === "s3-compatible") {
    return {
      provider,
      endpoint: text(packet.endpoint),
      bucket: text(packet.bucket),
      region: text(packet.region) || "auto",
      publicBaseUrl: text(packet.publicBaseUrl),
      forcePathStyle: packet.forcePathStyle !== false,
    };
  }
  return { provider };
}

function buildObjectStorageApplyPlan(packet) {
  const validation = validatePacket(packet);
  if (!validation.ok) throw new Error(`object storage packet is not ready: ${validation.errors.join("; ")}`);

  const provider = validation.provider;
  const requiredEnvNames = [
    "SOBAG_OBJECT_STORAGE_PROVIDER",
    "SOBAG_S3_ENDPOINT",
    "SOBAG_S3_BUCKET",
    "SOBAG_S3_REGION",
    "SOBAG_S3_PUBLIC_BASE_URL",
    "SOBAG_S3_FORCE_PATH_STYLE",
    ...SECRET_ENV_NAMES[provider],
  ];

  return {
    ready: true,
    source: "object-storage-env-packet",
    provider,
    publicConfigPreview: providerPublicConfig(packet, provider),
    requiredEnvNames,
    secretEnvNames: SECRET_ENV_NAMES[provider],
    guardrails: [
      "do not commit env values, tokens, access keys, raw photos, or generated bulk photo folders",
      "do not change production env/cache/user data without explicit approval",
      "configure provider env only in the target VPS server shell or CI secret store",
      "run a small photo pilot before full catalog publication",
      "audit candidate products JSON before switching public catalog image data",
    ],
    commands: [
      "npm.cmd run audit:object-storage-packet -- --strict",
      "npm.cmd run plan:photos -- --products data/products.import.json --photos <confirmed-photo-folder> --provider " +
        provider +
        " --responsive --limit-products 20",
      "npm.cmd run audit:photo-manifest -- --manifest local-import-output/photo-migration-manifest.json --strict-responsive",
      "npm.cmd run smoke:photo-pilot",
      "npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online --require-object-storage",
    ],
    cutoverGate: [
      "provider env configured and approved",
      "photo pilot uploaded successfully",
      "candidate product image metadata audited as square and provider-safe",
      "production storage smoke passes with --require-object-storage",
      "rollback path to previous products JSON is ready",
    ],
  };
}

function planPacketFile(path, outPath = DEFAULT_OUT) {
  if (!existsSync(resolve(process.cwd(), path))) {
    return { ready: false, missing: true, errors: [`missing ${path}`], warnings: [] };
  }
  const plan = buildObjectStorageApplyPlan(readJson(path));
  const resolvedOut = resolve(process.cwd(), outPath);
  mkdirSync(dirname(resolvedOut), { recursive: true });
  writeFileSync(resolvedOut, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return { ...plan, out: outPath };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function selfTest() {
  const plan = buildObjectStorageApplyPlan({
    provider: "s3-compatible",
    endpoint: "https://storage.example.test",
    bucket: "sobag-products",
    region: "auto",
    publicBaseUrl: "https://cdn.example.test/sobag-products",
    credentialsConfirmed: true,
    publicReadConfirmed: true,
    corsConfirmed: true,
  });
  assert(plan.ready, "valid S3-compatible plan rejected");
  assert(plan.requiredEnvNames.includes("SOBAG_S3_SECRET_ACCESS_KEY"), "secret env name must be listed");
  assert(!JSON.stringify(plan.publicConfigPreview).includes("SECRET_ACCESS_KEY"), "public preview must not expose secret names");
  try {
    buildObjectStorageApplyPlan({ provider: "s3-compatible", endpoint: "https://storage.example.test" });
    throw new Error("invalid packet was accepted");
  } catch (error) {
    if (!String(error.message).includes("not ready")) throw error;
  }
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("Object storage apply plan self-test passed");
    return;
  }
  const report = planPacketFile(args.packet, args.out);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Object storage apply plan: ${report.ready ? "ready" : "pending"}`);
    if (report.out) console.log(`Wrote: ${report.out}`);
    if (report.provider) console.log(`Provider: ${report.provider}`);
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

export { buildObjectStorageApplyPlan };
