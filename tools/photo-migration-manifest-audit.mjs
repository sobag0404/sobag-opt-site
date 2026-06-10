import { readFileSync } from "node:fs";
import { join, resolve, win32, posix, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const DEFAULT_MANIFEST = "local-import-output/photo-migration-manifest.json";
const PROVIDERS = new Set(["vercel-blob", "s3-compatible"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const RESPONSIVE_FORMATS = new Set(["webp", "avif"]);

function text(value) {
  return String(value || "").trim();
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    manifest: join(root, DEFAULT_MANIFEST),
    strict: false,
    json: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--manifest") args.manifest = resolve(root, argv[++index] || "");
    else if (token === "--strict") args.strict = true;
    else if (token === "--json") args.json = true;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/photo-migration-manifest-audit.mjs --manifest local-import-output/photo-migration-manifest.json

Options:
  --strict     Fail if any product is missing photos or responsive WebP/AVIF planning.
  --json       Print machine-readable report.
  --self-test  Run fixture checks.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function loadManifest(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isPortableRelative(path) {
  const value = text(path);
  if (!value) return false;
  if (isAbsolute(value) || win32.isAbsolute(value) || posix.isAbsolute(value)) return false;
  if (/^[a-z]:/i.test(value)) return false;
  return !value.split(/[\\/]+/).some((part) => part === "..");
}

function fileExtension(path) {
  return text(path).toLocaleLowerCase("en-US").match(/(\.[a-z0-9]+)$/)?.[1] || "";
}

function countActual(manifest) {
  const products = Array.isArray(manifest?.products) ? manifest.products : [];
  const matchedProducts = products.filter((product) => Array.isArray(product.originals) && product.originals.length > 0).length;
  const originalFiles = products.reduce((sum, product) => sum + (Array.isArray(product.originals) ? product.originals.length : 0), 0);
  const variantFiles = products.reduce(
    (sum, product) =>
      sum +
      (Array.isArray(product.originals)
        ? product.originals.reduce((inner, original) => inner + (Array.isArray(original.variants) ? original.variants.length : 0), 0)
        : 0),
    0
  );
  return {
    products: products.length,
    matchedProducts,
    missingProducts: products.length - matchedProducts,
    originalFiles,
    variantFiles,
  };
}

function auditPhotoMigrationManifest(manifest, args = {}) {
  const errors = [];
  const warnings = [];
  const products = Array.isArray(manifest?.products) ? manifest.products : [];
  const actual = countActual(manifest);
  const counts = manifest?.counts || {};
  const responsive = manifest?.responsive || {};

  if (manifest?.version !== 1) errors.push("manifest version must be 1");
  if (!PROVIDERS.has(text(manifest?.provider))) errors.push(`unsupported provider: ${text(manifest?.provider) || "(empty)"}`);
  if (!isPortableRelative(manifest?.productsFile)) errors.push("productsFile must be a portable relative path");
  if (!isPortableRelative(manifest?.photosRoot)) errors.push("photosRoot must be a portable relative path");
  ["products", "matchedProducts", "missingProducts", "originalFiles", "variantFiles"].forEach((key) => {
    if (Number(counts[key] || 0) !== actual[key]) errors.push(`counts.${key} mismatch: expected ${actual[key]}, got ${Number(counts[key] || 0)}`);
  });

  products.forEach((product, productIndex) => {
    const label = text(product?.baseSku || product?.productId) || `products[${productIndex}]`;
    if (!text(product?.productId) && !text(product?.baseSku)) errors.push(`${label}: missing productId/baseSku`);
    if (!text(product?.plannedStoragePrefix).startsWith("products/")) errors.push(`${label}: plannedStoragePrefix must start with products/`);
    if (!isPortableRelative(product?.plannedStoragePrefix)) errors.push(`${label}: plannedStoragePrefix must be portable and relative`);
    if (text(product?.matchedFolder) && !isPortableRelative(product.matchedFolder)) errors.push(`${label}: matchedFolder must be portable and relative`);

    const originals = Array.isArray(product?.originals) ? product.originals : [];
    if (!originals.length && args.strict) errors.push(`${label}: strict mode requires at least one original image`);
    originals.forEach((original, originalIndex) => {
      const originalLabel = `${label}: originals[${originalIndex}]`;
      if (!isPortableRelative(original?.source)) errors.push(`${originalLabel}: source must be portable and relative`);
      if (!IMAGE_EXTENSIONS.has(fileExtension(original?.fileName || original?.source))) errors.push(`${originalLabel}: unsupported image extension`);
      if (!text(original?.mime).startsWith("image/")) errors.push(`${originalLabel}: mime must be image/*`);

      const variants = Array.isArray(original?.variants) ? original.variants : [];
      if (args.strict && (!variants.length || !RESPONSIVE_FORMATS.has(text(variants[0]?.format)))) {
        errors.push(`${originalLabel}: strict mode requires responsive variants`);
      }
      const plannedFormats = new Set(variants.map((variant) => text(variant?.format)));
      if (args.strict && (!plannedFormats.has("webp") || !plannedFormats.has("avif"))) {
        errors.push(`${originalLabel}: strict mode requires WebP and AVIF variants`);
      }
      variants.forEach((variant, variantIndex) => {
        const variantLabel = `${originalLabel}.variants[${variantIndex}]`;
        if (!RESPONSIVE_FORMATS.has(text(variant?.format))) errors.push(`${variantLabel}: unsupported responsive format`);
        if (!(Number(variant?.width || 0) > 0)) errors.push(`${variantLabel}: width must be positive`);
        if (!text(variant?.mime).startsWith("image/")) errors.push(`${variantLabel}: mime must be image/*`);
        if (!isPortableRelative(variant?.fileName)) errors.push(`${variantLabel}: fileName must be portable and relative`);
      });
    });
  });

  if (!responsive.enabled) warnings.push("responsive variant planning is disabled");
  if (actual.missingProducts) warnings.push(`${actual.missingProducts} products have no matched photos`);
  if (args.strict) errors.push(...warnings);

  return {
    ok: errors.length === 0,
    strict: Boolean(args.strict),
    provider: text(manifest?.provider),
    counts: actual,
    responsive: {
      enabled: Boolean(responsive.enabled),
      widths: Array.isArray(responsive.widths) ? responsive.widths : [],
      formats: Array.isArray(responsive.formats) ? responsive.formats : [],
    },
    errors,
    warnings,
  };
}

function selfTest() {
  const good = {
    version: 1,
    provider: "s3-compatible",
    productsFile: "data/products.import.json",
    photosRoot: "local-photo-import",
    responsive: { enabled: true, widths: [480], formats: ["webp", "avif"] },
    counts: { products: 1, matchedProducts: 1, missingProducts: 0, originalFiles: 1, variantFiles: 2 },
    products: [
      {
        productId: "p1",
        baseSku: "OPT_1",
        plannedStoragePrefix: "products/opt_1",
        matchedFolder: "opt_1",
        originals: [
          {
            source: "opt_1/1.jpg",
            fileName: "1.jpg",
            mime: "image/jpeg",
            variants: [
              { width: 480, format: "webp", fileName: "1-480w.webp", mime: "image/webp" },
              { width: 480, format: "avif", fileName: "1-480w.avif", mime: "image/avif" },
            ],
          },
        ],
      },
    ],
  };
  const report = auditPhotoMigrationManifest(good, { strict: true });
  if (!report.ok || report.counts.variantFiles !== 2) throw new Error("photo manifest audit self-test failed");

  const bad = { ...good, productsFile: "C:/raw/photos/products.json" };
  const badReport = auditPhotoMigrationManifest(bad, { strict: false });
  if (badReport.ok) throw new Error("photo manifest audit self-test should reject absolute paths");
}

function printReport(report) {
  console.log(`Photo migration manifest audit ${report.ok ? "passed" : "failed"}: ${report.counts.products} products, ${report.counts.originalFiles} originals, ${report.counts.variantFiles} variants`);
  if (report.warnings.length) console.log(`Warnings: ${report.warnings.join("; ")}`);
  if (report.errors.length) console.log(`Errors: ${report.errors.join("; ")}`);
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("Photo migration manifest audit self-test passed");
    return;
  }
  const report = auditPhotoMigrationManifest(loadManifest(args.manifest), args);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
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

export { auditPhotoMigrationManifest };
