import { existsSync, readFileSync } from "node:fs";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const strict = process.argv.includes("--strict");

function run(command, args = [], options = {}) {
  const result = spawnSync(command, args, { cwd: options.cwd || root, encoding: "utf8" });
  return {
    ok: !result.error && result.status === 0,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    error: result.error?.message || "",
  };
}

function commandExists(name) {
  const extensions = process.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""];
  for (const dir of String(process.env.PATH || "").split(delimiter)) {
    for (const ext of extensions) {
      if (existsSync(join(dir, `${name}${ext}`))) return true;
    }
  }
  return false;
}

function rustHost() {
  const result = run("rustc", ["-vV"]);
  const host = result.stdout.match(/^host:\s*(.+)$/m)?.[1] || "";
  return { ...result, host };
}

function auditWorkflow() {
  const workflowPath = join(root, ".github", "workflows", "rust-check.yml");
  const errors = [];
  if (!existsSync(workflowPath)) {
    errors.push("missing .github/workflows/rust-check.yml");
    return errors;
  }
  const text = readFileSync(workflowPath, "utf8");
  if (!/permissions:\s*\r?\n\s*contents:\s*read\b/.test(text)) errors.push("rust-check workflow must use contents: read");
  if (!/cargo metadata --locked --format-version 1 --no-deps/.test(text)) errors.push("rust-check workflow must validate locked cargo metadata");
  if (!/cargo fmt --check/.test(text)) errors.push("rust-check workflow must run cargo fmt --check");
  if (!/cargo check --locked/.test(text)) errors.push("rust-check workflow must run cargo check --locked");
  if (!/cargo test --locked/.test(text)) errors.push("rust-check workflow must run cargo test --locked");
  if (/vercel/i.test(text)) errors.push("rust-check workflow must not reference Vercel");
  if (/\$\{\{\s*secrets\./i.test(text)) errors.push("rust-check workflow must not read secrets");
  return errors;
}

function installedTargets() {
  const result = run("rustup", ["target", "list", "--installed"]);
  return {
    ok: result.ok,
    targets: result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
  };
}

function commandStatus(command, args = []) {
  const result = run(command, args);
  if (result.error) return "missing";
  return result.ok ? "ok" : "unavailable";
}

function main() {
  const cargoToml = existsSync(join(root, "rust-server", "Cargo.toml"));
  const cargoLock = existsSync(join(root, "rust-server", "Cargo.lock"));
  const cargo = run("cargo", ["--version"]);
  const metadata = run("cargo", ["metadata", "--locked", "--format-version", "1", "--no-deps"], { cwd: join(root, "rust-server") });
  const rustc = rustHost();
  const targets = installedTargets();
  const workflowErrors = auditWorkflow();
  const linkerNames = ["link", "lld-link", "clang", "gcc"];
  const linkers = Object.fromEntries(linkerNames.map((name) => [name, commandExists(name)]));
  const wsl = commandStatus("wsl", ["-l", "-v"]);
  const docker = commandStatus("docker", ["--version"]);
  const windowsMsvc = rustc.host.endsWith("-pc-windows-msvc");
  const linkerMissing = windowsMsvc && !linkers.link && !linkers["lld-link"];
  const errors = [];

  if (!cargoToml) errors.push("missing rust-server/Cargo.toml");
  if (!cargoLock) errors.push("missing rust-server/Cargo.lock");
  if (!cargo.ok) errors.push("cargo is not available");
  if (!metadata.ok) errors.push("cargo metadata --locked failed");
  if (!rustc.ok) errors.push("rustc is not available");
  if (!targets.ok) errors.push("rustup target list --installed failed");
  errors.push(...workflowErrors);

  const blocker = linkerMissing
    ? "local Windows MSVC Rust checks are blocked by missing link.exe/lld-link.exe; use Visual Studio Build Tools or Linux/VPS/CI cargo check"
    : "";

  console.log(
    `Rust local env audit: cargo=${cargo.ok ? "ok" : "missing"} rustc=${rustc.ok ? rustc.host : "missing"} target=${targets.targets.join(",") || "missing"} metadata=${metadata.ok ? "ok" : "fail"} cargo-lock=${cargoLock ? "ok" : "missing"} ci=${workflowErrors.length ? "fail" : "ok"} wsl=${wsl} docker=${docker}`
  );
  if (blocker) console.log(`Environment blocker: ${blocker}`);
  if (errors.length) console.log(`Errors: ${errors.join("; ")}`);

  if (errors.length || (strict && blocker)) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
