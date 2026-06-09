import { existsSync, mkdtempSync, rmSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const args = new Set(process.argv.slice(2));
const selfTest = args.has("--self-test");
const jsonOutput = args.has("--json");
let tempDir = "";

if (selfTest) {
  tempDir = mkdtempSync(join(tmpdir(), "sobag-vps-preflight-"));
  Object.assign(process.env, {
    NODE_ENV: "production",
    SOBAG_STORE_PROVIDER: "file",
    SOBAG_FILE_STORE_DIR: tempDir,
    SOBAG_ADMIN_EMAIL: "admin@sobag",
    SOBAG_ADMIN_PASSWORD: "admin-pass",
    SOBAG_OBJECT_STORAGE_PROVIDER: "s3-compatible",
    SOBAG_S3_ENDPOINT: "https://storage.example.test",
    SOBAG_S3_BUCKET: "sobag",
    SOBAG_S3_REGION: "auto",
    SOBAG_S3_ACCESS_KEY_ID: "smoke-key",
    SOBAG_S3_SECRET_ACCESS_KEY: "smoke-secret",
    SOBAG_S3_PUBLIC_BASE_URL: "https://cdn.example.test/sobag",
  });
}

const { objectStorageStatus } = require("../api/_lib/object-storage.js");
const { storeStatus } = require("../api/_lib/store.js");

function envText(name) {
  return String(process.env[name] || "").trim();
}

function hasEnv(name) {
  return Boolean(envText(name));
}

function check(name, ok, message, severity = "error") {
  return { name, ok: Boolean(ok), severity, message };
}

function nodeMajor() {
  return Number(process.versions.node.split(".")[0] || 0) || 0;
}

function safeWriteProbe() {
  const dir = envText("SOBAG_FILE_STORE_DIR");
  if (!dir) return false;
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `.sobag-preflight-${process.pid}.tmp`);
  writeFileSync(file, "ok");
  unlinkSync(file);
  return true;
}

function s3ProviderRequested() {
  return ["s3-compatible", "s3", "minio", "r2"].includes(envText("SOBAG_OBJECT_STORAGE_PROVIDER").toLowerCase());
}

function runChecks() {
  const store = storeStatus();
  const objectStorage = objectStorageStatus();
  const checks = [
    check("node.version", nodeMajor() >= 20, `Node.js ${process.versions.node}; required 20+`),
    check("server.file", existsSync("server.mjs"), "`server.mjs` exists"),
    check("package.file", existsSync("package.json"), "`package.json` exists"),
    check("store.provider", store.provider === "file", "VPS store provider should be `file`"),
    check("store.dir.env", hasEnv("SOBAG_FILE_STORE_DIR"), "`SOBAG_FILE_STORE_DIR` is configured"),
    check("admin.email", hasEnv("SOBAG_ADMIN_EMAIL"), "`SOBAG_ADMIN_EMAIL` is configured"),
    check("admin.password", hasEnv("SOBAG_ADMIN_PASSWORD"), "`SOBAG_ADMIN_PASSWORD` is configured"),
    check("object.provider", s3ProviderRequested(), "VPS object storage provider should be S3-compatible"),
    check("object.configured", objectStorage.configured, "S3-compatible object storage credentials are configured"),
    check("object.publicUrl", Boolean(objectStorage.publicUrlConfigured), "`SOBAG_S3_PUBLIC_BASE_URL` is configured"),
  ];
  try {
    checks.push(check("store.dir.write", safeWriteProbe(), "file store directory is writable"));
  } catch (error) {
    checks.push(check("store.dir.write", false, `file store write probe failed: ${error.code || error.message}`));
  }
  return {
    ok: checks.every((item) => item.ok),
    selfTest,
    status: {
      store,
      objectStorage,
      node: process.versions.node,
    },
    checks,
  };
}

try {
  const result = runChecks();
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`VPS preflight ${result.ok ? "passed" : "failed"} (${result.checks.filter((item) => item.ok).length}/${result.checks.length})`);
    result.checks.forEach((item) => {
      console.log(`${item.ok ? "OK  " : "FAIL"} ${item.name}: ${item.message}`);
    });
  }
  if (!result.ok) process.exitCode = 1;
} finally {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
}
