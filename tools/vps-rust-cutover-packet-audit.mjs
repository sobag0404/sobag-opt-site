import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_PACKET = "local-import-output/vps-rust-cutover-packet.json";
const SECRET_VALUE_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /^[A-Za-z0-9+/=]{32,}$/,
  /^postgres(?:ql)?:\/\/.+:.+@/i,
  /^https?:\/\/[^/\s:@]+:[^@\s/]+@/i,
];
const ENV_NAME = /^[A-Z][A-Z0-9_]{2,}$/;

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

function scanSecretValues(value, path = "") {
  const hits = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => hits.push(...scanSecretValues(item, `${path}[${index}]`)));
    return hits;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => hits.push(...scanSecretValues(item, path ? `${path}.${key}` : key)));
    return hits;
  }
  const raw = text(value);
  if (!raw || raw.startsWith("TODO") || ENV_NAME.test(raw)) return hits;
  if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(raw))) hits.push(path || "value");
  return hits;
}

function scanPendingValues(value, path = "") {
  const hits = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => hits.push(...scanPendingValues(item, `${path}[${index}]`)));
    return hits;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => hits.push(...scanPendingValues(item, path ? `${path}.${key}` : key)));
    return hits;
  }
  if (/^TODO\b/i.test(text(value))) hits.push(path || "value");
  return hits;
}

function requireText(packet, field, errors) {
  if (!text(packet[field])) errors.push(`missing ${field}`);
}

function validateEnvName(packet, field, errors) {
  const value = text(packet[field]);
  if (!ENV_NAME.test(value)) errors.push(`${field} must be an environment variable name, not a secret value`);
}

function validatePacket(packet) {
  const errors = [];
  const warnings = [];

  [
    "domain",
    "vpsIp",
    "vpsHostAlias",
    "healthUrl",
    "sshHostEnvName",
    "sshUserEnvName",
    "sshKeyEnvName",
    "credentialAccessMode",
    "sshUser",
    "serverSidePreparationScope",
    "externalApprovalRef",
    "linuxDistro",
    "appDir",
    "deployPath",
    "nodeServiceName",
    "rustServiceName",
    "rustBinaryPath",
    "rustServicePath",
    "rustHealthUrl",
    "rollbackCommand",
    "backupPath",
  ].forEach((field) => requireText(packet, field, errors));
  if (packet.credentialRotationRequired !== true) errors.push("credentialRotationRequired must be true after password-based access was used or shared out-of-band");
  if (packet.passwordStoredInRepo !== false) errors.push("passwordStoredInRepo must be false");
  if (packet.passwordPrintedInLogs !== false) errors.push("passwordPrintedInLogs must be false");
  if (packet.serverSidePreparationApproved !== true) errors.push("serverSidePreparationApproved must be true before VPS inventory/deploy preparation");

  [
    "sshHostEnvName",
    "sshUserEnvName",
    "sshKeyEnvName",
    "databaseUrlEnvName",
    "sessionSecretEnvName",
    "jwtSecretEnvName",
    "allowedOriginsEnvName",
    "adminBootstrapEmailEnvName",
    "adminBootstrapPasswordEnvName",
  ].forEach((field) => {
    if (packet[field] !== undefined) validateEnvName(packet, field, errors);
  });
  if (packet.adminBootstrapReservedEmailGuard !== true) errors.push("adminBootstrapReservedEmailGuard must be true");

  const storage = packet.objectStorage || {};
  if (text(storage.provider) !== "s3-compatible") errors.push("objectStorage.provider must be s3-compatible");
  ["endpointEnvName", "bucketEnvName", "regionEnvName", "accessKeyIdEnvName", "secretAccessKeyEnvName", "publicBaseUrlEnvName"].forEach((field) => {
    if (storage[field] !== undefined) validateEnvName(storage, field, errors);
    else errors.push(`missing objectStorage.${field}`);
  });

  const requiredChecks = Array.isArray(packet.requiredChecks) ? packet.requiredChecks : [];
  ["npm.cmd run check", "python tools/project_readiness_agent/run.py", "cd rust-server && cargo check --locked", "cd rust-server && cargo test --locked"].forEach((command) => {
    if (!requiredChecks.includes(command)) errors.push(`requiredChecks must include ${command}`);
  });
  if (packet.productionCutoverApproved !== false) errors.push("productionCutoverApproved must stay false until separate approval");
  if (packet.printsSecrets !== false) errors.push("printsSecrets must be false");

  scanSecretValues(packet).forEach((field) => errors.push(`packet must not contain secret-like value at ${field}`));
  scanPendingValues(packet).forEach((field) => errors.push(`packet still contains TODO value at ${field}`));
  if (!text(packet.rollbackCommand).includes("nginx") && !text(packet.rollbackCommand).includes("systemctl")) {
    warnings.push("rollbackCommand should reference nginx or systemctl rollback steps");
  }

  return { ok: errors.length === 0, ready: errors.length === 0, errors, warnings };
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
    domain: "sobag-shop.online",
    vpsIp: "77.239.107.164",
    vpsHostAlias: "sobag-vps",
    healthUrl: "https://sobag-shop.online/api/health",
    sshHostEnvName: "VPS_HOST",
    sshUserEnvName: "VPS_USER",
    sshKeyEnvName: "VPS_SSH_KEY",
    credentialAccessMode: "ssh-key-or-secret-store",
    credentialRotationRequired: true,
    passwordStoredInRepo: false,
    passwordPrintedInLogs: false,
    sshUser: "root",
    serverSidePreparationApproved: true,
    serverSidePreparationScope: "inventory-backup-quarantine-systemd-nginx-deploy-prep",
    externalApprovalRef: "confirmed-in-current-work-chat-2026-06-15-no-secret",
    linuxDistro: "Ubuntu 24.04 LTS",
    appDir: "/opt/sobag-opt",
    deployPath: "/opt/sobag-opt",
    nodeServiceName: "sobag-opt",
    rustServiceName: "sobag-opt-rust",
    rustBinaryPath: "/opt/sobag-opt/shared/sobag-opt-rust",
    rustServicePath: "/etc/systemd/system/sobag-opt-rust.service",
    rustHealthUrl: "http://127.0.0.1:3001/api/health-rust",
    databaseUrlEnvName: "DATABASE_URL",
    sessionSecretEnvName: "SOBAG_SESSION_SECRET",
    jwtSecretEnvName: "SOBAG_JWT_SECRET",
    allowedOriginsEnvName: "SOBAG_ALLOWED_ORIGINS",
    adminBootstrapEmailEnvName: "SOBAG_ADMIN_EMAIL",
    adminBootstrapPasswordEnvName: "SOBAG_ADMIN_PASSWORD",
    adminBootstrapReservedEmailGuard: true,
    backupPath: "/opt/sobag-opt/shared/backups",
    objectStorage: {
      provider: "s3-compatible",
      endpointEnvName: "SOBAG_S3_ENDPOINT",
      bucketEnvName: "SOBAG_S3_BUCKET",
      regionEnvName: "SOBAG_S3_REGION",
      accessKeyIdEnvName: "SOBAG_S3_ACCESS_KEY_ID",
      secretAccessKeyEnvName: "SOBAG_S3_SECRET_ACCESS_KEY",
      publicBaseUrlEnvName: "SOBAG_S3_PUBLIC_BASE_URL",
    },
    rollbackCommand: "sudo nginx -t && sudo systemctl reload nginx",
    requiredChecks: ["npm.cmd run check", "python tools/project_readiness_agent/run.py", "cd rust-server && cargo check --locked", "cd rust-server && cargo test --locked"],
    productionCutoverApproved: false,
    printsSecrets: false,
  });
  if (!good.ok) throw new Error(`valid fixture rejected: ${good.errors.join("; ")}`);
  const bad = validatePacket({ ...good, sshKeyEnvName: "actual-secret-value-1234567890", productionCutoverApproved: true });
  if (bad.ok || !bad.errors.some((item) => item.includes("environment variable name"))) throw new Error("secret fixture should be rejected");
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("VPS/Rust cutover packet audit self-test passed");
    return;
  }
  const report = auditPacketFile(args.packet, args);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`VPS/Rust cutover packet: ${report.ready ? "ready" : "pending"}`);
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
