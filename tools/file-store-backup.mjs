import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const DEFAULT_SOURCE = process.env.SOBAG_FILE_STORE_DIR || ".sobag-store";
const DEFAULT_DEST = "sobag-store-backups";

function parseArgs(argv = process.argv.slice(2)) {
  const args = { source: DEFAULT_SOURCE, dest: DEFAULT_DEST, restore: "", target: "", force: false, dryRun: false, selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source") args.source = argv[++index] || "";
    else if (arg === "--dest") args.dest = argv[++index] || "";
    else if (arg === "--restore") args.restore = argv[++index] || "";
    else if (arg === "--target") args.target = argv[++index] || "";
    else if (arg === "--force") args.force = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--self-test") args.selfTest = true;
    else if (arg === "--help") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function usage() {
  return `Sobag file-store backup

Backup:
  node tools/file-store-backup.mjs --source /var/lib/sobag-opt/store --dest /var/backups/sobag-opt
  node tools/file-store-backup.mjs --source /var/lib/sobag-opt/store --dest /var/backups/sobag-opt --dry-run

Restore:
  node tools/file-store-backup.mjs --restore /var/backups/sobag-opt/store-20260609T120000Z --target /var/lib/sobag-opt/store --dry-run
  node tools/file-store-backup.mjs --restore /var/backups/sobag-opt/store-20260609T120000Z --target /var/lib/sobag-opt/store --force

Self-test:
  node tools/file-store-backup.mjs --self-test`;
}

async function jsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function ensureExistingDir(dir, label) {
  const resolved = resolve(dir);
  const info = await stat(resolved).catch(() => null);
  if (!info?.isDirectory()) throw new Error(`${label} is not a directory: ${resolved}`);
  return resolved;
}

async function backupFileStore(sourceDir, destRoot, options = {}) {
  const source = await ensureExistingDir(sourceDir, "source");
  const files = await jsonFiles(source);
  const target = resolve(destRoot, `store-${stamp()}`);
  if (options.dryRun) return { mode: "backup", ok: true, dryRun: true, source, target, fileCount: files.length };
  if (existsSync(target)) throw new Error(`backup target already exists: ${target}`);
  await mkdir(target, { recursive: true });
  for (const file of files) {
    await copyFile(join(source, file), join(target, file));
  }
  const manifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    source: basename(source),
    fileCount: files.length,
    files,
  };
  await writeFile(join(target, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { mode: "backup", ok: true, source, target, fileCount: files.length };
}

async function restoreFileStore(backupDir, targetDir, options = {}) {
  const backup = await ensureExistingDir(backupDir, "backup");
  const target = resolve(targetDir || DEFAULT_SOURCE);
  const files = (await jsonFiles(backup)).filter((file) => file !== "manifest.json");
  if (options.dryRun) {
    const existing = existsSync(target) ? (await jsonFiles(target)).filter((file) => file !== "manifest.json") : [];
    return { mode: "restore", ok: true, dryRun: true, backup, target, fileCount: files.length, existingCount: existing.length };
  }
  await mkdir(target, { recursive: true });
  const existing = (await jsonFiles(target)).filter((file) => file !== "manifest.json");
  if (existing.length && !options.force) {
    throw new Error(`target contains ${existing.length} json files; pass --force to overwrite`);
  }
  if (options.force) {
    for (const file of existing) await rm(join(target, file), { force: true });
  }
  for (const file of files) {
    await copyFile(join(backup, file), join(target, file));
  }
  return { mode: "restore", ok: true, backup, target, fileCount: files.length };
}

async function runSelfTest() {
  const root = await mkdtemp(join(tmpdir(), "sobag-file-store-backup-"));
  const source = join(root, "store");
  const backups = join(root, "backups");
  const restore = join(root, "restore");
  try {
    await mkdir(source, { recursive: true });
    await writeFile(join(source, "736f626167.json"), '{"value":{"ok":true}}\n', "utf8");
    await writeFile(join(source, "636174616c6f67.json"), '{"value":{"products":[]}}\n', "utf8");
    await writeFile(join(source, "ignore.tmp"), "tmp", "utf8");
    const backup = await backupFileStore(source, backups);
    if (backup.fileCount !== 2) throw new Error("self-test backup file count mismatch");
    const manifest = JSON.parse(await readFile(join(backup.target, "manifest.json"), "utf8"));
    if (manifest.fileCount !== 2 || manifest.files.includes("ignore.tmp")) throw new Error("self-test manifest mismatch");
    const restored = await restoreFileStore(backup.target, restore);
    if (restored.fileCount !== 2) throw new Error("self-test restore file count mismatch");
    const restoredFiles = await jsonFiles(restore);
    if (restoredFiles.length !== 2 || !restoredFiles.includes("736f626167.json")) throw new Error("self-test restored files mismatch");
    const restoreDryRun = await restoreFileStore(backup.target, restore, { dryRun: true });
    if (!restoreDryRun.dryRun || restoreDryRun.existingCount !== 2) throw new Error("self-test restore dry-run mismatch");
    const backupDryRun = await backupFileStore(source, backups, { dryRun: true });
    if (!backupDryRun.dryRun || backupDryRun.fileCount !== 2) throw new Error("self-test backup dry-run mismatch");
    return { mode: "self-test", ok: true, backupFiles: backup.fileCount, restoredFiles: restored.fileCount };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    console.log(usage());
    return;
  }
  const result = args.selfTest
    ? await runSelfTest()
    : args.restore
    ? await restoreFileStore(args.restore, args.target || args.source, { force: args.force, dryRun: args.dryRun })
    : await backupFileStore(args.source, args.dest, { dryRun: args.dryRun });
  console.log(
    result.mode === "restore"
      ? result.dryRun
        ? `file-store restore dry-run passed: ${result.fileCount} files -> ${result.target} (${result.existingCount} existing)`
        : `file-store restore passed: ${result.fileCount} files -> ${result.target}`
      : result.mode === "self-test"
      ? `file-store backup self-test passed: ${result.backupFiles} backed up, ${result.restoredFiles} restored`
      : result.dryRun
      ? `file-store backup dry-run passed: ${result.fileCount} files -> ${result.target}`
      : `file-store backup passed: ${result.fileCount} files -> ${result.target}`
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
