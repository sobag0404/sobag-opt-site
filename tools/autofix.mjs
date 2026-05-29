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

function parseJson(file) {
  JSON.parse(readFileSync(join(root, file), "utf8"));
}

function assertNoPattern(file, pattern, message) {
  const text = readFileSync(join(root, file), "utf8");
  if (pattern.test(text)) throw new Error(`${file}: ${message}`);
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
  ["app.js", "cart.js"].forEach((file) => run("node", ["--check", file]));
  assertNoPattern("app.js", /products-live\.json\?v=\$\{Date\.now\(\)\}/, "нельзя отключать кэш каталога через Date.now()");
  assertNoPattern("cart.js", /password:\s*["'`]/, "пароли не должны появляться в cart.js");
  checkImageHints();
  console.log("AutoFix: checks passed");
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
