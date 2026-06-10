import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const writeMode = process.argv.includes("--write");

function walk(dir, matcher, found = []) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if ([".git", ".vercel", "node_modules", "local-import-output"].includes(item.name)) continue;
    const full = join(dir, item.name);
    if (item.isDirectory()) walk(full, matcher, found);
    else if (matcher(full)) found.push(full);
  }
  return found;
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
}

function tryRun(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.error) return { ok: false, error: result.error };
  return result;
}

function compilePythonFiles(files) {
  const candidates = [
    ["python", ["-m", "py_compile"]],
    ["py", ["-3", "-m", "py_compile"]],
  ];
  const probe = candidates.find(([command, args]) => {
    const result = tryRun(command, args[0] === "-3" ? ["-3", "--version"] : ["--version"]);
    return result.status === 0;
  });

  if (!probe) {
    console.warn("AutoFix: Python is not installed, skipping Python tool syntax checks.");
    return;
  }

  const [command, baseArgs] = probe;
  files.forEach((file) => run(command, [...baseArgs, file]));
}

function parseJson(file) {
  JSON.parse(readFileSync(join(root, file), "utf8"));
}

function assertNoPattern(file, pattern, message) {
  const text = readFileSync(join(root, file), "utf8");
  if (pattern.test(text)) throw new Error(`${file}: ${message}`);
}

function checkUiShellOwnership() {
  const offenders = [];
  for (const file of walk(root, (item) => item.endsWith(".html"))) {
    const text = readFileSync(file, "utf8");
    const relative = file.replace(root, ".");
    if (/<header\s+class=["']topline["']/.test(text)) offenders.push(`${relative}: duplicate topline markup`);
    if (/<nav\s+class=["']header["']/.test(text)) offenders.push(`${relative}: duplicate header markup`);
    if (/<footer\s+class=["']footer["']/.test(text)) offenders.push(`${relative}: duplicate footer markup`);
    if (/\sstyle=/.test(text)) offenders.push(`${relative}: inline style attribute`);
  }
  for (const file of walk(root, (item) => item.endsWith(".js"))) {
    if (file.endsWith(join("components", "site-shell.js"))) continue;
    const text = readFileSync(file, "utf8");
    if (/\sstyle=/.test(text)) offenders.push(`${file.replace(root, ".")}: inline style attribute`);
  }
  if (offenders.length) {
    throw new Error(`UI shell ownership checks failed:\n${offenders.slice(0, 20).join("\n")}`);
  }
}

function checkPageSectionOwnership() {
  const expected = {
    "index.html": ["hero", "benefits", "wholesale"],
    "catalog.html": ["catalog-section"],
    "search.html": ["catalog-section"],
    "favorites.html": ["catalog-section"],
    "custom.html": ["custom"],
    "marketplaces.html": ["marketplaces"],
    "business.html": [],
    "about.html": [],
    "contacts.html": [],
    "terms.html": [],
    "cart.html": [],
  };
  const scenarioClasses = new Set(["hero", "benefits", "catalog-section", "wholesale", "marketplaces", "custom"]);
  const offenders = [];
  Object.entries(expected).forEach(([file, allowed]) => {
    const text = readFileSync(join(root, file), "utf8");
    const found = [...text.matchAll(/<section\s+class=["']([^"']+)["']/g)]
      .flatMap((match) => match[1].split(/\s+/))
      .filter((className) => scenarioClasses.has(className));
    found.filter((className) => !allowed.includes(className)).forEach((className) => offenders.push(`${file}: unexpected scenario section ${className}`));
    allowed.filter((className) => !found.includes(className)).forEach((className) => offenders.push(`${file}: missing scenario section ${className}`));
  });
  if (offenders.length) {
    throw new Error(`Page section ownership checks failed:\n${offenders.slice(0, 20).join("\n")}`);
  }
}

function checkNoMojibake() {
  const suspects = [
    "\u0420\u045f",
    "\u0420\u040e",
    "\u0420\u045c",
    "\u0420\u0402",
    "\u0420\u040b",
    "\u0421\u0453",
    "\u0421\u201a",
    "\u0421\u040a",
    "\u0421\u20ac",
    "\u0421\u040b",
    "\u0421\u040f",
    "\u0432\u201a\u0405",
    "\u0432\u0402",
    "\u0420\ufffd",
  ];
  const mojibakeRegex =
    /[\u0420\u0421][\u0400-\u040f\u0450-\u045f\u00a0-\u00bf\u201a\u201e\u2020\u2021\u20ac]|\u0432[\u0400-\u040f\u0450-\u045f\u00a0-\u00bf\u201a\u201e\u2020\u2021\u20ac]|\ufffd|Ã[\u0080-\u00bf]/;
  const files = [
    ...walk(root, (file) => /\.(html|js|mjs|css|md|json)$/i.test(file)),
  ];
  const offenders = [];

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const hit = suspects.find((suspect) => text.includes(suspect)) || text.match(mojibakeRegex)?.[0];
    if (hit) {
      const index = text.indexOf(hit);
      const snippet = text.slice(Math.max(0, index - 30), index + 60).replace(/\s+/g, " ");
      offenders.push(`${file.replace(root, ".")}: ${snippet}`);
    }
  }

  if (offenders.length) {
    throw new Error(`Detected mojibake / broken UTF-8 text:\n${offenders.slice(0, 20).join("\n")}`);
  }
}

function checkImageHints() {
  const files = walk(root, (file) => file.endsWith(".html") || file.endsWith(".js"));
  const offenders = [];
  const imgPattern = /<img\b[^>]*>/g;
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const matches = text.match(imgPattern) || [];
    matches.forEach((tag) => {
      const dynamic = tag.includes("${") || tag.includes("imageAttrs(");
      const hinted = tag.includes("width=") && tag.includes("height=") && tag.includes("decoding=");
      if (!dynamic && !hinted) offenders.push(`${file.replace(root, ".")}: ${tag.slice(0, 120)}`);
    });
  }
  if (offenders.length) {
    throw new Error(`Найдены изображения без размеров/decoding:\n${offenders.slice(0, 20).join("\n")}`);
  }
}

function main() {
  console.log(writeMode ? "AutoFix: write mode" : "AutoFix: check mode");
  parseJson("package.json");
  parseJson("vercel.json");
  parseJson("data/products-live.json");
  walk(join(root, "api"), (file) => file.endsWith(".js")).forEach((file) => run("node", ["--check", file]));
  ["app.js", "cart.js", "components/site-shell.js", "server.mjs", "tools/static-server.mjs", "tools/production-smoke.mjs", "tools/production-performance-smoke.mjs", "tools/access-audit.mjs", "tools/error-log-audit.mjs", "tools/content-seo-audit.mjs", "tools/image-metadata-audit.mjs", "tools/photo-migration-readiness.mjs", "tools/photo-migration-manifest.mjs", "tools/photo-migration-manifest-audit.mjs", "tools/photo-migration-candidate-audit.mjs", "tools/photo-migration-pilot-smoke.mjs", "tools/catalog-performance-audit.mjs", "tools/core-web-vitals-readiness.mjs", "tools/vps-release-audit.mjs", "tools/bulk-upload-product-photos.mjs", "tools/bulk-upload-product-photos.test.mjs", "tools/object-storage-s3-smoke.mjs", "tools/file-store-smoke.mjs", "tools/file-store-backup.mjs", "tools/health-store-status-smoke.mjs", "tools/vps-server-smoke.mjs", "tools/vps-write-smoke.mjs", "tools/vps-preflight.mjs", "tools/pim-smoke.mjs", "tools/pim-report-smoke.mjs", "tools/pim-export-normalized.mjs", "tools/pim-postgres-seed.mjs", "tools/pim-postgres-migration-bundle.mjs", "tools/pim-postgres-rehearsal.mjs", "tools/pim-db-contract-audit.mjs", "tools/pim-postgres-schema-audit.mjs", "tools/pim-postgres-query-contract.mjs", "tools/catalog-source-smoke.mjs", "tools/catalog-db-rows-smoke.mjs", "tools/catalog-db-query-smoke.mjs", "tools/catalog-db-source-smoke.mjs", "tools/catalog-db-client-smoke.mjs", "tools/catalog-query-smoke.mjs", "tools/catalog-query-scale-smoke.mjs"].forEach((file) => run("node", ["--check", file]));
  compilePythonFiles(["tools/product_importer.py", "tools/publish_imported_products.py", "tools/audit_catalog.py"]);
  run("node", ["tools/validate-products.mjs"]);
  run("node", ["tools/pim-smoke.mjs"]);
  run("node", ["tools/pim-report-smoke.mjs"]);
  run("node", ["tools/pim-export-normalized.mjs", "--dry-run"]);
  run("node", ["tools/pim-export-normalized.mjs", "--self-test"]);
  run("node", ["tools/pim-postgres-seed.mjs", "--dry-run"]);
  run("node", ["tools/pim-postgres-seed.mjs", "--self-test"]);
  run("node", ["tools/pim-postgres-migration-bundle.mjs", "--dry-run"]);
  run("node", ["tools/pim-postgres-migration-bundle.mjs", "--self-test"]);
  run("node", ["tools/pim-postgres-rehearsal.mjs"]);
  run("node", ["tools/pim-postgres-rehearsal.mjs", "--self-test"]);
  run("node", ["tools/pim-db-contract-audit.mjs"]);
  run("node", ["tools/pim-db-contract-audit.mjs", "--self-test"]);
  run("node", ["tools/pim-postgres-schema-audit.mjs"]);
  run("node", ["tools/pim-postgres-schema-audit.mjs", "--self-test"]);
  run("node", ["tools/pim-postgres-query-contract.mjs"]);
  run("node", ["tools/pim-postgres-query-contract.mjs", "--self-test"]);
  run("node", ["tools/catalog-query-smoke.mjs"]);
  run("node", ["tools/catalog-source-smoke.mjs"]);
  run("node", ["tools/catalog-db-rows-smoke.mjs"]);
  run("node", ["tools/catalog-db-query-smoke.mjs"]);
  run("node", ["tools/catalog-db-source-smoke.mjs"]);
  run("node", ["tools/catalog-db-client-smoke.mjs"]);
  run("node", ["tools/catalog-query-scale-smoke.mjs"]);
  run("node", ["tools/catalog-performance-audit.mjs"]);
  run("node", ["tools/core-web-vitals-readiness.mjs"]);
  run("node", ["tools/content-seo-audit.mjs"]);
  run("node", ["tools/content-seo-audit.mjs", "--self-test"]);
  run("node", ["tools/image-metadata-audit.mjs"]);
  run("node", ["tools/image-metadata-audit.mjs", "--self-test"]);
  run("node", ["tools/photo-migration-readiness.mjs"]);
  run("node", ["tools/photo-migration-readiness.mjs", "--self-test"]);
  run("node", ["tools/photo-migration-manifest.mjs", "--self-test"]);
  run("node", ["tools/photo-migration-manifest-audit.mjs", "--self-test"]);
  run("node", ["tools/photo-migration-candidate-audit.mjs", "--self-test"]);
  run("node", ["tools/photo-migration-pilot-smoke.mjs"]);
  run("node", ["tools/bulk-upload-product-photos.test.mjs"]);
  run("node", ["tools/object-storage-s3-smoke.mjs"]);
  run("node", ["tools/file-store-smoke.mjs"]);
  run("node", ["tools/file-store-backup.mjs", "--self-test"]);
  run("node", ["tools/health-store-status-smoke.mjs"]);
  run("node", ["tools/vps-server-smoke.mjs"]);
  run("node", ["tools/vps-write-smoke.mjs"]);
  run("node", ["tools/vps-preflight.mjs", "--self-test"]);
  run("node", ["tools/production-smoke.mjs", "--self-test"]);
  run("node", ["tools/production-performance-smoke.mjs", "--self-test"]);
  run("node", ["tools/vps-release-audit.mjs"]);
  run("node", ["tools/vps-release-audit.mjs", "--self-test"]);
  run("node", ["tools/access-audit.mjs"]);
  run("node", ["tools/error-log-audit.mjs"]);
  assertNoPattern("app.js", /products-live\.json\?v=\$\{Date\.now\(\)\}/, "нельзя отключать кэш каталога через Date.now()");
  assertNoPattern("cart.js", /password:\s*["'`]/, "пароли не должны появляться в cart.js");
  checkUiShellOwnership();
  checkPageSectionOwnership();
  checkNoMojibake();
  checkImageHints();
  console.log("AutoFix: checks passed");
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
