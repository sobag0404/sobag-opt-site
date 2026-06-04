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
  ["app.js", "cart.js", "components/site-shell.js", "tools/static-server.mjs", "tools/bulk-upload-product-photos.mjs", "tools/bulk-upload-product-photos.test.mjs", "tools/pim-smoke.mjs"].forEach((file) => run("node", ["--check", file]));
  compilePythonFiles(["tools/product_importer.py", "tools/publish_imported_products.py", "tools/audit_catalog.py"]);
  run("node", ["tools/validate-products.mjs"]);
  run("node", ["tools/pim-smoke.mjs"]);
  run("node", ["tools/bulk-upload-product-photos.test.mjs"]);
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
