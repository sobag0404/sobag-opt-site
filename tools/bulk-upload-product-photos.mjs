import { mkdir, mkdtemp, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createObjectStorageAdapter, normalizeImageMetadata, normalizeProvider } = require("../server-routes/_lib/object-storage.js");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
const DEFAULT_REPORT = "local-import-output/bulk-photo-upload-report.csv";
const DEFAULT_OUT = "local-import-output/products-with-object-images.json";

function usage() {
  return `
Sobag bulk product photo upload

Usage:
  node tools/bulk-upload-product-photos.mjs --products data/products.import.json --photos "C:\\Photos" --dry-run
  node tools/bulk-upload-product-photos.mjs --products data/products.import.json --photos "C:\\Photos" --out local-import-output/products-with-object-images.json

Options:
  --products <path>              Products JSON array or catalog object with products[].
  --photos <path>                Root folder with product photo folders.
  --out <path>                   Output products JSON. Default: ${DEFAULT_OUT}
  --report <path>                CSV report. Default: ${DEFAULT_REPORT}
  --provider <name>              s3-compatible. Default: env/default adapter provider.
  --dry-run                      Scan and report only, no uploads and no products output.
  --replace-existing-images      Replace existing image metadata/gallery for products that upload successfully.
  --responsive                   Generate responsive WebP/AVIF variants before upload. Requires optional sharp package for real uploads.
  --variant-widths <list>        Responsive widths. Default: 480,960,1200.
  --variant-formats <list>       Responsive formats. Default: webp,avif.
  --variant-quality <number>     Responsive variant quality. Default: 82.
  --limit <number>               Max image files to process.
  --retries <number>             Upload retries per file. Default: 2.
`;
}

function parseNumberList(value, fallback) {
  const items = String(value || "")
    .split(",")
    .map((item) => Math.max(0, Number(item.trim()) || 0))
    .filter(Boolean);
  return items.length ? [...new Set(items)].sort((a, b) => a - b) : fallback;
}

function parseFormatList(value, fallback) {
  const allowed = new Set(["webp", "avif"]);
  const items = String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase().replace(/^image\//, ""))
    .filter((item) => allowed.has(item));
  return items.length ? [...new Set(items)] : fallback;
}

function parseArgs(argv) {
  const args = {
    products: "",
    photos: "",
    out: DEFAULT_OUT,
    report: DEFAULT_REPORT,
    provider: "",
    dryRun: false,
    replaceExistingImages: false,
    responsive: false,
    variantWidths: [480, 960, 1200],
    variantFormats: ["webp", "avif"],
    variantQuality: 82,
    limit: 0,
    retries: 2,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const [key, inlineValue] = token.startsWith("--") ? token.split("=", 2) : ["", ""];
    const nextValue = inlineValue ?? argv[index + 1];
    const consumeValue = inlineValue === undefined;
    if (token === "--help" || token === "-h") args.help = true;
    else if (key === "--products") {
      args.products = nextValue || "";
      if (consumeValue) index += 1;
    } else if (key === "--photos") {
      args.photos = nextValue || "";
      if (consumeValue) index += 1;
    } else if (key === "--out") {
      args.out = nextValue || args.out;
      if (consumeValue) index += 1;
    } else if (key === "--report") {
      args.report = nextValue || args.report;
      if (consumeValue) index += 1;
    } else if (key === "--provider") {
      args.provider = nextValue || "";
      if (consumeValue) index += 1;
    } else if (key === "--variant-widths") {
      args.variantWidths = parseNumberList(nextValue, args.variantWidths);
      if (consumeValue) index += 1;
    } else if (key === "--variant-formats") {
      args.variantFormats = parseFormatList(nextValue, args.variantFormats);
      if (consumeValue) index += 1;
    } else if (key === "--variant-quality") {
      args.variantQuality = Math.min(100, Math.max(1, Number(nextValue || args.variantQuality) || args.variantQuality));
      if (consumeValue) index += 1;
    } else if (key === "--limit") {
      args.limit = Math.max(0, Number(nextValue || 0) || 0);
      if (consumeValue) index += 1;
    } else if (key === "--retries") {
      args.retries = Math.max(0, Number(nextValue || 0) || 0);
      if (consumeValue) index += 1;
    } else if (token === "--dry-run") args.dryRun = true;
    else if (token === "--replace-existing-images") args.replaceExistingImages = true;
    else if (token === "--responsive") args.responsive = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

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

function skuKey(value) {
  return text(value).toLocaleUpperCase("ru-RU");
}

function imageSortKey(filePath) {
  const name = basename(filePath, extname(filePath)).toLocaleLowerCase("ru-RU");
  const numeric = name.match(/\d+/)?.[0];
  return [numeric ? Number(numeric) : Number.MAX_SAFE_INTEGER, name, basename(filePath).toLocaleLowerCase("ru-RU")];
}

function compareImagePath(a, b) {
  const left = imageSortKey(a);
  const right = imageSortKey(b);
  return left[0] - right[0] || left[1].localeCompare(right[1], "ru") || left[2].localeCompare(right[2], "ru");
}

function mimeFromPath(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".avif") return "image/avif";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

function pngSize(buffer) {
  if (buffer.length < 24) return {};
  if (buffer.readUInt32BE(0) !== 0x89504e47 || buffer.toString("ascii", 12, 16) !== "IHDR") return {};
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegSize(buffer) {
  let offset = 2;
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return {};
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return {};
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return {};
}

function imageSize(buffer, mime) {
  try {
    if (mime === "image/png") return pngSize(buffer);
    if (mime === "image/jpeg") return jpegSize(buffer);
  } catch {
    return {};
  }
  return {};
}

async function loadSharp() {
  try {
    const sharp = await import("sharp");
    return sharp.default || sharp;
  } catch {
    throw new Error("Responsive variant generation requires optional dependency sharp. Install it locally with npm install sharp or rerun without --responsive.");
  }
}

function responsiveVariantSpecs(filePath, args, dimensions = {}) {
  const originalWidth = Number(dimensions.width || 0);
  const sourceName = basename(filePath, extname(filePath)).replace(/[\\/:*?"<>|]+/g, "-");
  const widths = originalWidth ? args.variantWidths.filter((width) => width <= originalWidth) : args.variantWidths;
  const preparedWidths = widths.length ? widths : originalWidth ? [originalWidth] : args.variantWidths;
  return preparedWidths.flatMap((width) =>
    args.variantFormats.map((format) => ({
      width,
      format,
      mime: `image/${format}`,
      fileName: `${sourceName}-${width}w.${format}`,
      label: `${width}w-${format}`,
    }))
  );
}

async function renderResponsiveVariant(sharp, sourceBuffer, spec, quality) {
  let pipeline = sharp(sourceBuffer).rotate().resize({ width: spec.width, withoutEnlargement: true });
  if (spec.format === "avif") pipeline = pipeline.avif({ quality });
  else pipeline = pipeline.webp({ quality });
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return {
    body: data,
    width: info.width,
    height: info.height,
    mime: spec.mime,
    fileName: spec.fileName,
    format: spec.format,
    label: spec.label,
    size: data.length,
  };
}

async function imageDimensions(imageTool, body, mime) {
  const detected = imageSize(body, mime);
  if (detected.width && detected.height) return detected;
  if (!imageTool) return detected;
  const metadata = await imageTool(body).metadata();
  return {
    width: Number(metadata.width || 0) || undefined,
    height: Number(metadata.height || 0) || undefined,
  };
}

function uniqueImages(images) {
  const seen = new Set();
  return images
    .map((image) => normalizeImageMetadata(image))
    .filter(Boolean)
    .filter((normalized) => {
      const key = normalized?.storageKey || normalized?.url;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function uniqueStrings(values) {
  const seen = new Set();
  return values
    .map(text)
    .filter(Boolean)
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

async function readJson(path) {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return { products: parsed, wrap: (products) => products };
  if (Array.isArray(parsed.products)) return { products: parsed.products, wrap: (products) => ({ ...parsed, products }) };
  throw new Error("Products JSON must be an array or an object with products[].");
}

async function listDirs(root) {
  const found = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()));
    if (files.length) found.push(dir);
    for (const entry of entries) {
      if (entry.isDirectory()) await walk(join(dir, entry.name));
    }
  }
  await walk(root);
  return found;
}

async function buildPhotoFolderIndex(photosRoot) {
  const dirs = await listDirs(photosRoot);
  const byRelative = new Map();
  const byName = new Map();
  dirs.forEach((dir) => {
    const relativePath = normalizeKey(relative(photosRoot, dir).replace(/\\/g, "/"));
    const folderName = normalizeKey(basename(dir));
    if (relativePath && !byRelative.has(relativePath)) byRelative.set(relativePath, dir);
    if (folderName && !byName.has(folderName)) byName.set(folderName, dir);
  });
  return { byRelative, byName };
}

async function directFolder(photosRoot, value) {
  const rootPath = resolve(photosRoot);
  const candidate = resolve(rootPath, value || "");
  const relativeCandidate = relative(rootPath, candidate);
  if (!relativeCandidate || relativeCandidate.startsWith("..") || isAbsolute(relativeCandidate)) return "";
  try {
    const info = await stat(candidate);
    return info.isDirectory() ? candidate : "";
  } catch {
    return "";
  }
}

async function findPhotoFolder(photosRoot, index, product) {
  const keys = uniqueStrings([product.photoFolder, product.baseSku, product.id]);
  for (const key of keys) {
    const direct = await directFolder(photosRoot, key);
    if (direct) return direct;
    const normalized = normalizeKey(key);
    if (index.byRelative.has(normalized)) return index.byRelative.get(normalized);
    if (index.byName.has(normalized)) return index.byName.get(normalized);
  }
  return "";
}

async function imageFiles(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .map((entry) => join(folder, entry.name))
    .sort(compareImagePath);
}

function csvCell(value) {
  const prepared = text(value).replace(/\r?\n/g, " ");
  return /[;"\n\r]/.test(prepared) ? `"${prepared.replace(/"/g, '""')}"` : prepared;
}

async function writeCsv(path, rows) {
  const headers = ["baseSku", "name", "photoFolder", "file", "kind", "format", "width", "height", "status", "reason", "url", "storageKey", "provider", "size"];
  const lines = [headers.join(";"), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(";"))];
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `\uFEFF${lines.join("\n")}\n`, "utf8");
}

async function uploadWithRetries(adapter, options, retries) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await adapter.upload(options);
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
    }
  }
  throw lastError;
}

function updateProductImages(product, uploaded, replaceExistingImages) {
  if (!uploaded.length) return product;
  const uploadedUrls = uploaded.map((image) => text(image.url)).filter(Boolean);
  const existingImages = replaceExistingImages ? [] : product.images || [];
  const existingGallery = replaceExistingImages ? [] : product.gallery || [];
  const nextImage = uploadedUrls[0] || product.image;
  return {
    ...product,
    image: nextImage,
    gallery: uniqueStrings([...uploadedUrls.slice(1), ...existingGallery.filter((url) => url !== nextImage)]),
    images: uniqueImages([...existingImages, ...uploaded]),
  };
}

async function processProduct({ adapter, args, imageTool, index, photosRoot, product, processedFiles }) {
  const rows = [];
  const uploaded = [];
  const baseSku = text(product.baseSku || product.id);
  const name = text(product.name);
  const photoFolderValue = text(product.photoFolder || product.baseSku || product.id);
  if (!args.replaceExistingImages && Array.isArray(product.images) && product.images.length) {
    rows.push({ baseSku, name, photoFolder: photoFolderValue, file: "", status: "skipped", reason: "existing_images", provider: normalizeProvider(args.provider) });
    return { product, rows, processedFiles };
  }

  const folder = await findPhotoFolder(photosRoot, index, product);
  if (!folder) {
    rows.push({ baseSku, name, photoFolder: photoFolderValue, file: "", status: "missing", reason: "photo_folder_not_found", provider: normalizeProvider(args.provider) });
    return { product, rows, processedFiles };
  }

  const files = await imageFiles(folder);
  if (!files.length) {
    rows.push({ baseSku, name, photoFolder: photoFolderValue, file: folder, status: "missing", reason: "no_images_in_folder", provider: normalizeProvider(args.provider) });
    return { product, rows, processedFiles };
  }

  for (const file of files) {
    if (args.limit && processedFiles >= args.limit) {
      rows.push({ baseSku, name, photoFolder: photoFolderValue, file, status: "skipped", reason: "limit_reached", provider: normalizeProvider(args.provider) });
      continue;
    }
    processedFiles += 1;
    const mime = mimeFromPath(file);
    if (args.dryRun) {
      const size = (await stat(file)).size;
      rows.push({ baseSku, name, photoFolder: photoFolderValue, file, kind: "original", format: mime.replace(/^image\//, ""), status: "ready", reason: "", provider: normalizeProvider(args.provider), size });
      if (args.responsive) {
        responsiveVariantSpecs(file, args).forEach((spec) => {
          rows.push({
            baseSku,
            name,
            photoFolder: photoFolderValue,
            file: spec.fileName,
            kind: "variant",
            format: spec.format,
            width: spec.width,
            status: "ready_variant",
            reason: "",
            provider: normalizeProvider(args.provider),
          });
        });
      }
      continue;
    }
    try {
      const body = await readFile(file);
      const dimensions = await imageDimensions(imageTool, body, mime);
      const image = await uploadWithRetries(
        adapter,
        {
          productKey: baseSku,
          fileName: basename(file),
          body,
          mime,
          width: dimensions.width,
          height: dimensions.height,
          size: body.length,
        },
        args.retries
      );
      const variantImages = [];
      if (args.responsive) {
        const specs = responsiveVariantSpecs(file, args, dimensions);
        for (const spec of specs) {
          try {
            const variant = await renderResponsiveVariant(imageTool, body, spec, args.variantQuality);
            const uploadedVariant = await uploadWithRetries(
              adapter,
              {
                productKey: baseSku,
                fileName: variant.fileName,
                body: variant.body,
                mime: variant.mime,
                width: variant.width,
                height: variant.height,
                size: variant.size,
              },
              args.retries
            );
            const nextVariant = { ...uploadedVariant, label: variant.label, format: variant.format };
            variantImages.push(nextVariant);
            rows.push({
              baseSku,
              name,
              photoFolder: photoFolderValue,
              file: variant.fileName,
              kind: "variant",
              format: variant.format,
              width: variant.width,
              height: variant.height,
              status: "uploaded_variant",
              reason: "",
              url: nextVariant.url,
              storageKey: nextVariant.storageKey,
              provider: nextVariant.provider,
              size: nextVariant.size,
            });
          } catch (error) {
            rows.push({
              baseSku,
              name,
              photoFolder: photoFolderValue,
              file: spec.fileName,
              kind: "variant",
              format: spec.format,
              width: spec.width,
              status: "failed_variant",
              reason: error?.code || error?.message || "variant_upload_failed",
              provider: normalizeProvider(args.provider),
            });
          }
        }
      }
      image.variants = variantImages;
      uploaded.push(image);
      rows.push({
        baseSku,
        name,
        photoFolder: photoFolderValue,
        file,
        kind: "original",
        format: mime.replace(/^image\//, ""),
        width: dimensions.width || image.width || "",
        height: dimensions.height || image.height || "",
        status: "uploaded",
        reason: "",
        url: image.url,
        storageKey: image.storageKey,
        provider: image.provider,
        size: image.size,
      });
    } catch (error) {
      rows.push({
        baseSku,
        name,
        photoFolder: photoFolderValue,
        file,
        status: "failed",
        reason: error?.code || error?.message || "upload_failed",
        provider: normalizeProvider(args.provider),
      });
    }
  }

  return { product: updateProductImages(product, uploaded, args.replaceExistingImages), rows, processedFiles };
}

function summarize(rows, productsTotal, output, dryRun) {
  const counts = rows.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    { ready: 0, ready_variant: 0, uploaded: 0, uploaded_variant: 0, skipped: 0, missing: 0, failed: 0, failed_variant: 0 }
  );
  return { products: productsTotal, ...counts, output: dryRun ? "" : output };
}

export async function runBulkUpload(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(usage());
    return { help: true };
  }
  if (!args.products) throw new Error("--products is required.");
  if (!args.photos) throw new Error("--photos is required.");

  const projectRoot = process.cwd();
  const productsPath = resolve(projectRoot, args.products);
  const photosRoot = resolve(projectRoot, args.photos);
  const outputPath = resolve(projectRoot, args.out);
  const reportPath = resolve(projectRoot, args.report);
  const { products, wrap } = await readJson(productsPath);
  const folderIndex = await buildPhotoFolderIndex(photosRoot);
  const adapter = args.dryRun ? null : createObjectStorageAdapter(args.provider || undefined);
  const imageTool = args.responsive && !args.dryRun ? await loadSharp() : null;
  const nextProducts = [];
  const allRows = [];
  let processedFiles = 0;

  for (const product of products) {
    const result = await processProduct({ adapter, args, imageTool, index: folderIndex, photosRoot, product, processedFiles });
    processedFiles = result.processedFiles;
    nextProducts.push(result.product);
    allRows.push(...result.rows);
  }

  await writeCsv(reportPath, allRows);
  if (!args.dryRun) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(wrap(nextProducts), null, 2)}\n`, "utf8");
  }
  const summary = summarize(allRows, products.length, outputPath, args.dryRun);
  process.stdout.write(`${JSON.stringify({ ...summary, report: reportPath }, null, 2)}\n`);
  return { summary, rows: allRows, products: nextProducts };
}

async function main() {
  try {
    await runBulkUpload();
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main();
}

export async function makeTempBulkUploadFixture() {
  const root = await mkdtemp(join(tmpdir(), "sobag-bulk-upload-"));
  const photos = join(root, "photos");
  const productFolder = join(photos, "opt_100");
  await mkdir(productFolder, { recursive: true });
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
  await writeFile(join(productFolder, "1.png"), png);
  const productsPath = join(root, "products.json");
  await writeFile(
    productsPath,
    JSON.stringify(
      [
        { id: "opt-100", baseSku: "opt_100", name: "Test product", photoFolder: "opt_100", image: "assets/production-workshop-1.png", gallery: [] },
        { id: "opt-200", baseSku: "opt_200", name: "Missing product", photoFolder: "opt_200", image: "assets/production-workshop-1.png", gallery: [] },
      ],
      null,
      2
    ),
    "utf8"
  );
  return { root, photos, productsPath, reportPath: join(root, "report.csv") };
}
