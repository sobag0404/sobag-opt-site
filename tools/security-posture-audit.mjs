#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function walk(dir, found = []) {
  for (const item of readdirSync(join(root, dir), { withFileTypes: true })) {
    const child = join(dir, item.name);
    if (item.isDirectory()) walk(child, found);
    else found.push(child.split(sep).join("/"));
  }
  return found;
}

function gitFiles() {
  try {
    return execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function workflowRunBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const runMatch = line.match(/^(\s*)run:\s*(.*)$/);
    if (!runMatch) continue;
    const indent = runMatch[1].length;
    const inline = runMatch[2].trim();
    if (inline && inline !== "|") {
      blocks.push(inline);
      continue;
    }
    const body = [];
    for (let next = index + 1; next < lines.length; next += 1) {
      const nextLine = lines[next];
      if (nextLine.trim() && nextLine.match(/^\s*/)[0].length <= indent) break;
      body.push(nextLine);
    }
    blocks.push(body.join("\n"));
  }
  return blocks;
}

function auditWorkflows() {
  const files = existsSync(join(root, ".github/workflows"))
    ? walk(".github/workflows").filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
    : [];
  const errors = [];
  const warnings = [];
  const forbidden = [
    { pattern: /\bpull_request_target\b/, reason: "pull_request_target is not allowed without a dedicated review" },
    { pattern: /\bset\s+-x\b/, reason: "shell xtrace can leak secrets" },
    { pattern: /\bprintenv\b/, reason: "printenv can leak secrets" },
    { pattern: /(^|\s)env\s*\|/, reason: "dumping the environment can leak secrets" },
    { pattern: /\bcat\s+.*\.env\b/, reason: "printing env files can leak secrets" },
  ];

  for (const file of files) {
    const text = read(file);
    if (!/\bpermissions\s*:/.test(text)) errors.push(`${file}: workflow must declare explicit permissions`);
    forbidden.forEach(({ pattern, reason }) => {
      if (pattern.test(text)) errors.push(`${file}: ${reason}`);
    });
    workflowRunBlocks(text).forEach((block) => {
      if (/\$\{\{\s*github\.event(?!_name\b)/.test(block)) errors.push(`${file}: run block interpolates github.event directly into shell`);
      if (/(echo|printf)[^\n]*\$\{\{\s*secrets\./.test(block)) errors.push(`${file}: run block prints a secret expression`);
    });
    [...text.matchAll(/uses:\s*([^@\s]+)@([^\s]+)/g)].forEach((match) => {
      if (!/^[0-9a-f]{40}$/i.test(match[2])) warnings.push(`${file}: ${match[1]}@${match[2]} is tag-pinned, not SHA-pinned`);
    });
  }

  if (errors.length) throw new Error(`CI/CD security audit failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  return { files: files.length, warnings };
}

function auditDependencyLock() {
  assert(existsSync(join(root, "package-lock.json")), "package-lock.json is required for reproducible npm installs");
  const packageJson = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  assert(String(packageJson.engines?.node || "").includes(">=20"), "package.json must require Node >=20");
  assert(lock.lockfileVersion >= 3, "package-lock.json must use lockfileVersion >= 3");

  const errors = [];
  Object.entries(lock.packages || {}).forEach(([name, meta]) => {
    if (!name) return;
    const resolved = String(meta.resolved || "");
    if (resolved.startsWith("http://")) errors.push(`${name}: insecure http resolved URL`);
    if (/^(git|git\+ssh|github):/i.test(resolved)) errors.push(`${name}: git-based dependency source requires review`);
    if (resolved && !resolved.startsWith("https://registry.npmjs.org/") && !meta.link) errors.push(`${name}: non-registry resolved URL requires review`);
    if (!meta.integrity && !meta.link) errors.push(`${name}: missing integrity hash`);
  });
  if (errors.length) throw new Error(`Dependency lock audit failed:\n${errors.slice(0, 25).map((error) => `- ${error}`).join("\n")}`);
  return { packages: Object.keys(lock.packages || {}).length };
}

function auditTrackedSecretArtifacts() {
  const errors = [];
  const pattern = /(^|\/)(\.env(\.|$)|id_rsa|id_dsa|id_ecdsa|id_ed25519|.*\.pem|.*\.p12|.*\.pfx)$/i;
  gitFiles().forEach((file) => {
    if (pattern.test(file)) errors.push(`${file}: secret-like file must not be tracked`);
  });
  if (errors.length) throw new Error(`Tracked secret artifact audit failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
}

function classifyLogLine(line) {
  const normalized = String(line || "").toLowerCase();
  if (/(union(\+|%20|\s)+select|sleep\(|benchmark\(|or(\+|%20|\s)+1=1)/.test(normalized)) return "sqli";
  if (/(\.\.%2f|\.\.\/|%2e%2e%2f|\/etc\/passwd|win\.ini)/.test(normalized)) return "path_traversal";
  if (/(wp-admin|wp-login|phpmyadmin|xmlrpc\.php|\.env)/.test(normalized)) return "scanner";
  if (/(\/api\/auth\/login|\/api\/auth\/register)/.test(normalized) && /\s(401|403|429)\s/.test(normalized)) return "auth_abuse";
  return "other";
}

function auditLogClassifierSelfTest() {
  const sample = [
    '127.0.0.1 - - [24/Jun/2026] "GET /api/catalog-query?pageSize=1 HTTP/1.1" 200 20',
    '127.0.0.1 - - [24/Jun/2026] "GET /search?q=1%20union%20select HTTP/1.1" 400 20',
    '127.0.0.1 - - [24/Jun/2026] "GET /../../etc/passwd HTTP/1.1" 404 20',
    '127.0.0.1 - - [24/Jun/2026] "GET /.env HTTP/1.1" 404 20',
    '127.0.0.1 - - [24/Jun/2026] "POST /api/auth/login HTTP/1.1" 429 20',
  ];
  const counts = sample.reduce((acc, line) => {
    const type = classifyLogLine(line);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  assert(counts.sqli === 1, "log classifier should detect SQLi probes");
  assert(counts.path_traversal === 1, "log classifier should detect path traversal probes");
  assert(counts.scanner === 1, "log classifier should detect scanner probes");
  assert(counts.auth_abuse === 1, "log classifier should detect auth abuse responses");
  return counts;
}

function auditSensitiveLogPatterns() {
  const codeFiles = gitFiles().filter((file) => /\.(mjs|js|sh|yml|yaml)$/i.test(file));
  const allowed = new Set([
    ".github/workflows/vps-deploy.yml",
    "tools/security-posture-audit.mjs",
    "tools/vps-minio-media-policy.sh",
    "tools/object-storage-env-packet-audit.mjs",
    "tools/catalog-db-env-packet-audit.mjs",
    "tools/goal-inputs-packet-audit.mjs",
  ]);
  const errors = [];
  const rawDumpPattern = /(console\.(log|error)|echo|printf)[^\n]*(cookie|authorization|password|secret|token|private[_-]?key)/i;
  codeFiles.forEach((file) => {
    if (!allowed.has(file) && rawDumpPattern.test(read(file))) errors.push(`${file}: review raw sensitive-name logging`);
  });
  if (errors.length) throw new Error(`Sensitive log pattern audit failed:\n${errors.slice(0, 25).map((error) => `- ${error}`).join("\n")}`);
  return { files: codeFiles.length };
}

function main() {
  const workflows = auditWorkflows();
  const dependencies = auditDependencyLock();
  auditTrackedSecretArtifacts();
  const logClasses = auditLogClassifierSelfTest();
  const logPatterns = auditSensitiveLogPatterns();
  console.log(
    `Security posture audit passed: workflows=${workflows.files}, dependencyPackages=${dependencies.packages}, codeLogFiles=${logPatterns.files}, logClasses=${Object.keys(logClasses).join(",")}`
  );
  if (workflows.warnings.length) {
    console.log(`Security posture warnings: ${workflows.warnings.length} workflow action refs are tag-pinned; SHA pinning remains a documented hardening option.`);
  }
}

main();

export { classifyLogLine };
