import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, join } from "node:path";

const root = process.cwd();

const REQUIRED_FILES = [
  "server.mjs",
  "api-router.js",
  "api/[...path].js",
  "package.json",
  "vercel.json",
  "api/_lib/store.js",
  "api/_lib/object-storage.js",
  "server-routes/health.js",
  "tools/vps-preflight.mjs",
  "tools/vps-server-smoke.mjs",
  "tools/vps-write-smoke.mjs",
  "tools/file-store-backup.mjs",
  "tools/production-smoke.mjs",
  "tools/rust-catalog-shadow-smoke.mjs",
  "tools/rust-ssr-smoke.mjs",
  "tools/rust-auth-orders-admin-plan-audit.mjs",
  "docs/vps-migration-notes.md",
  "docs/vps-launch-runbook.md",
  "docs/deploy-checklist.md",
  "docs/rust-deploy-runbook.md",
  "docs/rust-auth-orders-admin-migration-plan.md",
  "rust-server/Cargo.toml",
  "rust-server/Cargo.lock",
  "rust-server/src/main.rs",
];

const REQUIRED_SCRIPTS = {
  "dev:static": "tools/static-server.mjs",
  "dev:vercel": "vercel dev",
  "start:vps": "server.mjs",
  "smoke:vps": "tools/vps-server-smoke.mjs",
  "smoke:vps:write": "tools/vps-write-smoke.mjs",
  "preflight:vps": "tools/vps-preflight.mjs",
  "preflight:vps:self-test": "tools/vps-preflight.mjs --self-test",
  "backup:store": "tools/file-store-backup.mjs",
  "backup:store:self-test": "tools/file-store-backup.mjs --self-test",
  "audit:images": "tools/image-metadata-audit.mjs",
  "audit:content": "tools/content-seo-audit.mjs",
  "export:pim": "tools/pim-export-normalized.mjs",
  "smoke:prod": "tools/production-smoke.mjs",
  "smoke:prod:self-test": "tools/production-smoke.mjs --self-test",
  "smoke:rust:shadow": "tools/rust-catalog-shadow-smoke.mjs",
  "smoke:rust:ssr": "tools/rust-ssr-smoke.mjs",
  "audit:rust-migration-plan": "tools/rust-auth-orders-admin-plan-audit.mjs",
  check: "tools/autofix.mjs --check",
  "ui:smoke": "tools/ui-smoke.spec.js",
};

const REQUIRED_VPS_DEPLOY_MARKERS = [
  "cargo test --locked",
  "cargo build --release --locked",
  "install -m 755 rust-server/target/release/sobag-opt-rust",
  "sudo systemctl restart sobag-opt-rust",
  "http://127.0.0.1:3001/api/health-rust",
  "node tools/rust-catalog-shadow-smoke.mjs --node-base http://127.0.0.1:3000 --rust-base http://127.0.0.1:3001",
  "node tools/rust-ssr-smoke.mjs --base http://127.0.0.1:3001",
  "Rust health failed; restoring previous binary",
];

const REQUIRED_IGNORES = [
  ".env*",
  ".vercel",
  ".sobag-store/",
  "sobag-store-backups/",
  "local-import-output/",
  "local-photo-import/",
  "raw-product-photos/",
  "bulk-product-photos/",
  "assets/imported-products/",
  "assets/raw-product-photos/",
  "assets/bulk-product-photos/",
  "data/products.import.json",
  "data/import-report.csv",
];

const TRACKED_FORBIDDEN = [
  /^\.env(?:\.|$|local|production|development|test)/i,
  /^\.vercel(?:\/|$)/i,
  /^\.sobag-store(?:\/|$)/i,
  /^sobag-store-backups(?:\/|$)/i,
  /^local-import-output(?:\/|$)/i,
  /^local-photo-import(?:\/|$)/i,
  /^raw-product-photos(?:\/|$)/i,
  /^bulk-product-photos(?:\/|$)/i,
  /^assets\/(?:imported-products|raw-product-photos|bulk-product-photos)(?:\/|$)/i,
  /^data\/products\.import\.json$/i,
  /^data\/import-report\.csv$/i,
  /(^|\/)(?:id_rsa|id_dsa|id_ed25519|known_hosts|cookies?)(?:$|\.)/i,
  /\.(?:pem|p12|pfx|key|sqlite|db|dump|bak)$/i,
];

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.?\//, "");
}

function gitTrackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" });
  if (result.error || result.status !== 0) return [];
  return result.stdout.split("\0").map(normalizePath).filter(Boolean);
}

function assertIncludes(haystack, needle, label) {
  if (!String(haystack || "").includes(needle)) throw new Error(`${label} must include ${needle}`);
}

function auditRelease({ packageJson, gitignore, trackedFiles, vpsDeployWorkflow = "" }) {
  const errors = [];
  const scripts = packageJson.scripts || {};

  REQUIRED_FILES.forEach((file) => {
    if (!existsSync(join(root, file))) errors.push(`missing required file: ${file}`);
  });

  Object.entries(REQUIRED_SCRIPTS).forEach(([name, expected]) => {
    try {
      assertIncludes(scripts[name], expected, `package script ${name}`);
    } catch (error) {
      errors.push(error.message);
    }
  });

  REQUIRED_IGNORES.forEach((pattern) => {
    if (!gitignore.split(/\r?\n/).some((line) => line.trim() === pattern)) errors.push(`.gitignore missing ${pattern}`);
  });

  const forbiddenTracked = trackedFiles.filter((file) => TRACKED_FORBIDDEN.some((pattern) => pattern.test(file)));
  forbiddenTracked.forEach((file) => errors.push(`forbidden tracked local/secret artifact: ${file}`));

  if (!trackedFiles.includes("server.mjs")) errors.push("server.mjs must be tracked for VPS runtime");
  if (!trackedFiles.includes(".github/workflows/production-smoke.yml")) errors.push("production smoke workflow must stay tracked");
  if (!trackedFiles.includes("docs/vps-migration-notes.md")) errors.push("VPS migration notes must stay tracked");
  if (trackedFiles.some((file) => basename(file).toLocaleLowerCase("en-US") === ".env")) errors.push("tracked .env file is forbidden");
  REQUIRED_VPS_DEPLOY_MARKERS.forEach((marker) => {
    if (!vpsDeployWorkflow.includes(marker)) errors.push(`vps-deploy workflow missing Rust deploy marker: ${marker}`);
  });

  if (errors.length) throw new Error(`VPS release audit failed:\n${errors.join("\n")}`);
  return {
    scripts: Object.keys(REQUIRED_SCRIPTS).length,
    files: REQUIRED_FILES.length,
    ignores: REQUIRED_IGNORES.length,
    tracked: trackedFiles.length,
  };
}

function selfTest() {
  const good = auditRelease({
    packageJson: { scripts: Object.fromEntries(Object.entries(REQUIRED_SCRIPTS).map(([name, expected]) => [name, `node ${expected}`])) },
    gitignore: REQUIRED_IGNORES.join("\n"),
    trackedFiles: ["server.mjs", ".github/workflows/production-smoke.yml", "docs/vps-migration-notes.md"],
    vpsDeployWorkflow: REQUIRED_VPS_DEPLOY_MARKERS.join("\n"),
  });
  if (good.scripts !== Object.keys(REQUIRED_SCRIPTS).length) throw new Error("self-test script count mismatch");
  let rejected = false;
  try {
    auditRelease({
      packageJson: { scripts: Object.fromEntries(Object.entries(REQUIRED_SCRIPTS).map(([name, expected]) => [name, `node ${expected}`])) },
      gitignore: REQUIRED_IGNORES.join("\n"),
      trackedFiles: ["server.mjs", ".github/workflows/production-smoke.yml", "docs/vps-migration-notes.md", ".env"],
      vpsDeployWorkflow: REQUIRED_VPS_DEPLOY_MARKERS.join("\n"),
    });
  } catch (error) {
    rejected = /forbidden tracked/.test(error.message);
  }
  if (!rejected) throw new Error("self-test should reject tracked .env");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    console.log("VPS release audit self-test passed");
    return;
  }
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
  const vpsDeployWorkflow = readFileSync(join(root, ".github/workflows/vps-deploy.yml"), "utf8");
  const summary = auditRelease({ packageJson, gitignore, trackedFiles: gitTrackedFiles(), vpsDeployWorkflow });
  console.log(
    `VPS release audit passed: ${summary.files} files, ${summary.scripts} scripts, ${summary.ignores} ignore rules, ${summary.tracked} tracked files`
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

export { auditRelease };
