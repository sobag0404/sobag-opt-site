import { mkdtemp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const DEFAULT_OUT = "local-import-output/photo-migration-manifest.json";
const DEFAULT_VARIANT_WIDTHS = [480, 960, 1200];
const DEFAULT_VARIANT_FORMATS = ["webp", "avif"];

function text(value) {
  return String(value || "").trim();
}

function normalizeKey(value) {
  return text(value)
    .toLocaleLowerCase("ru-RU")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[\\/:*?"<>|]+/g, "/")
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/[^a-zа-яё0-9]+/giu, "_")
    .replace(/^_+|_+$/g, "");
}

function uniqueStrings(values) {
  return [...new Set(values.map(text).filter(Boolean))];
}

function parseList(value, fallback) {
  const list = text(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length ? list : fallback;
}

function parseNumberList(value, fallback) {
  const list = parseList(value, [])
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);
  return list.length ? list : fallback;
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    products: join(root, "data", "products-live.json"),
    photos: "",
    out: join(root, DEFAULT_OUT),
    provider: process.env.SOBAG_OBJECT_STORAGE_PROVIDER || "vercel-blob",
    responsive: false,
    variantWidths: DEFAULT_VARIANT_WIDTHS,
    variantFormats: DEFAULT_VARIANT_FORMATS,
    limitProducts: 0,
    json: false,
    selfTest: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--products") args.products = resolve(root, argv[++index] || "");
    else if (token === "--photos") args.photos = resolve(root, argv[++index] || "");
    else if (token === "--out") args.out = resolve(root, argv[++index] || "");
    else if (token === "--provider") args.provider = argv[++index] || args.provider;
    else if (token === "--responsive") args.responsive = true;
    else if (token === "--variant-widths") args.variantWidths = parseNumberList(argv[++index], DEFAULT_VARIANT_WIDTHS);
    else if (token === "--variant-formats") args.variantFormats = parseList(argv[++index], DEFAULT_VARIANT_FORMATS);
    else if (token === "--limit-products") args.limitProducts = Number(argv[++index] || 0) || 0;
    else if (token === "--json") args.json = true;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/photo-migration-manifest.mjs --products data/products.import.json --photos "C:\\Path\\Photos"

Options:
  --out <path>                 Manifest path. Default: ${DEFAULT_OUT}
  --provider <name>            Target provider label: vercel-blob or s3-compatible.
  --responsive                 Plan WebP/AVIF variants.
  --variant-widths 480,960     Responsive widths.
  --variant-formats webp,avif  Responsive formats.
  --limit-products <number>    Plan a small pilot subset.
  --json                       Print manifest JSON instead of writing a file.
  --self-test                  Run fixture checks.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function loadProducts(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.products)) return parsed.products;
  throw new Error("Products JSON must be an array or an object with products[].");
}

async function existsDir(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function listDirs(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => join(path, entry.name));
}

function compareImagePath(a, b) {
  return basename(a).localeCompare(basename(b), "ru-RU", { numeric: true, sensitivity: "base" });
}

async function imageFiles(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLocaleLowerCase("en-US")))
    .map((entry) => join(path, entry.name))
    .sort(compareImagePath);
}

async function buildPhotoFolderIndex(photosRoot) {
  const index = new Map();
  for (const folder of await listDirs(photosRoot)) {
    const key = normalizeKey(basename(folder));
    if (key && !index.has(key)) index.set(key, folder);
  }
  return index;
}

async function directFolder(photosRoot, key) {
  const normalized = normalizeKey(key);
  if (!normalized) return "";
  const candidate = resolve(photosRoot, key);
  if (candidate.startsWith(resolve(photosRoot)) && (await existsDir(candidate))) return candidate;
  return "";
}

async function findPhotoFolder(photosRoot, index, product) {
  const keys = uniqueStrings([product.photoFolder, product.baseSku, product.id, product.sku, product.relative, product.folderName]);
  for (const key of keys) {
    const direct = await directFolder(photosRoot, key);
    if (direct) return direct;
    const normalized = normalizeKey(key);
    if (normalized && index.has(normalized)) return index.get(normalized);
  }
  return "";
}

function productKey(product, index) {
  return text(product.baseSku || product.sku || product.id) || `product-${index + 1}`;
}

function productStatus(product) {
  const status = text(product.status).toLocaleLowerCase("ru-RU");
  return status || (product.hidden ? "hidden" : "published");
}

function variantPlan(file, args) {
  if (!args.responsive) return [];
  const name = basename(file, extname(file));
  return args.variantWidths.flatMap((width) =>
    args.variantFormats.map((format) => ({
      width,
      format,
      fileName: `${name}-${width}w.${format}`,
      mime: `image/${format}`,
    }))
  );
}

function toPortable(path, base = root) {
  return relative(base, path).replace(/\\/g, "/");
}

async function buildManifest(args) {
  if (!(await existsDir(args.photos))) throw new Error("Photo root does not exist. Pass --photos with a local photo folder.");
  const products = loadProducts(args.products);
  const selected = args.limitProducts > 0 ? products.slice(0, args.limitProducts) : products;
  const folderIndex = await buildPhotoFolderIndex(args.photos);
  const entries = [];
  let originalFiles = 0;
  let variantFiles = 0;

  for (let index = 0; index < selected.length; index += 1) {
    const product = selected[index];
    const folder = await findPhotoFolder(args.photos, folderIndex, product);
    const files = folder ? await imageFiles(folder) : [];
    const originals = files.map((file) => ({
      source: toPortable(file, args.photos),
      fileName: basename(file),
      mime: `image/${extname(file).slice(1).replace("jpg", "jpeg")}`,
      variants: variantPlan(file, args),
    }));
    originalFiles += originals.length;
    variantFiles += originals.reduce((sum, file) => sum + file.variants.length, 0);

    entries.push({
      productId: text(product.id),
      baseSku: text(product.baseSku || product.sku),
      name: text(product.name || product.title),
      status: productStatus(product),
      photoFolder: text(product.photoFolder),
      matchedFolder: folder ? toPortable(folder, args.photos) : "",
      plannedStoragePrefix: `products/${normalizeKey(productKey(product, index)) || `product_${index + 1}`}`,
      originals,
      warnings: folder ? (files.length ? [] : ["matched folder has no supported image files"]) : ["photo folder not found"],
    });
  }

  const matchedProducts = entries.filter((entry) => entry.originals.length > 0).length;
  const missingProducts = entries.length - matchedProducts;
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    provider: args.provider,
    productsFile: toPortable(args.products),
    photosRoot: toPortable(args.photos),
    responsive: {
      enabled: args.responsive,
      widths: args.variantWidths,
      formats: args.variantFormats,
    },
    counts: {
      products: entries.length,
      matchedProducts,
      missingProducts,
      originalFiles,
      variantFiles,
    },
    products: entries,
  };
}

function printSummary(manifest, out) {
  console.log("Photo migration manifest planned");
  console.log(`Products: ${manifest.counts.products}, matched: ${manifest.counts.matchedProducts}, missing: ${manifest.counts.missingProducts}`);
  console.log(`Files: ${manifest.counts.originalFiles} originals, ${manifest.counts.variantFiles} responsive variants`);
  console.log(`Provider: ${manifest.provider}`);
  console.log(`Output: ${toPortable(out)}`);
}

async function selfTest() {
  const temp = await mkdtemp(join(tmpdir(), "sobag-photo-manifest-"));
  try {
    const photos = join(temp, "photos");
    const folder = join(photos, "opt_100");
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, "1.png"), Buffer.from("fixture"));
    const productsPath = join(temp, "products.json");
    const out = join(temp, "manifest.json");
    await writeFile(
      productsPath,
      JSON.stringify([
        { id: "p1", baseSku: "OPT_100", name: "Подушка", status: "published" },
        { id: "p2", baseSku: "OPT_200", name: "Наволочка", status: "published" },
      ])
    );
    const manifest = await buildManifest({
      products: productsPath,
      photos,
      out,
      provider: "s3-compatible",
      responsive: true,
      variantWidths: [480, 960],
      variantFormats: ["webp", "avif"],
      limitProducts: 0,
    });
    if (manifest.counts.products !== 2 || manifest.counts.matchedProducts !== 1 || manifest.counts.missingProducts !== 1) {
      throw new Error("unexpected product counts");
    }
    if (manifest.counts.originalFiles !== 1 || manifest.counts.variantFiles !== 4) {
      throw new Error("unexpected file counts");
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArgs();
  if (args.selfTest) {
    await selfTest();
    console.log("Photo migration manifest self-test passed");
    return;
  }
  const manifest = await buildManifest(args);
  if (args.json) {
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }
  await mkdir(dirname(args.out), { recursive: true });
  await writeFile(args.out, `${JSON.stringify(manifest, null, 2)}\n`);
  printSummary(manifest, args.out);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

export { buildManifest };
