import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { auditProducts } from "./image-metadata-audit.mjs";

const require = createRequire(import.meta.url);
const { normalizeProvider, objectStorageStatus } = require("../server-routes/_lib/object-storage.js");

const root = process.cwd();
const REQUIRED_IGNORES = [
  "local-import-output/",
  "local-photo-import/",
  "raw-product-photos/",
  "bulk-product-photos/",
  "assets/imported-products/",
  "assets/raw-product-photos/",
  "assets/bulk-product-photos/",
];
const REQUIRED_IMAGE_FIELDS = ["url", "storageKey", "provider", "width", "height", "mime", "uploadedAt"];

function text(value) {
  return String(value || "").trim();
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    products: join(root, "data", "products-live.json"),
    provider: process.env.SOBAG_OBJECT_STORAGE_PROVIDER || "",
    strict: false,
    json: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--products") args.products = resolve(root, argv[++index] || "");
    else if (token === "--provider") args.provider = argv[++index] || "";
    else if (token === "--strict") args.strict = true;
    else if (token === "--json") args.json = true;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/photo-migration-readiness.mjs [--products data/products-live.json]

Options:
  --provider <name>  Check provider status as s3-compatible.
  --strict           Fail until published products have complete square WebP/AVIF metadata.
  --json             Print machine-readable report.
  --self-test        Run fixture checks.`);
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

function statusOf(product) {
  const status = text(product?.status).toLocaleLowerCase("ru-RU");
  return status || (product?.hidden ? "hidden" : "published");
}

function imageFormat(image) {
  const explicit = text(image?.format || image?.mime || image?.contentType).replace(/^image\//i, "").toLocaleLowerCase("en-US");
  if (explicit) return explicit;
  const url = text(image?.url || image?.publicUrl || image?.downloadUrl || image?.src).toLocaleLowerCase("en-US");
  return url.match(/\.([a-z0-9]+)(?:[?#]|$)/)?.[1] || "";
}

function hasRequiredMetadata(image) {
  return REQUIRED_IMAGE_FIELDS.every((field) => {
    if (field === "width" || field === "height") return Number(image?.[field] || 0) > 0;
    return Boolean(text(image?.[field]));
  });
}

function isSquare(image) {
  const width = Number(image?.width || 0) || 0;
  const height = Number(image?.height || 0) || 0;
  return width > 0 && height > 0 && Math.abs(width - height) <= 1;
}

function hasResponsive(image, format) {
  return Array.isArray(image?.variants) && image.variants.some((variant) => imageFormat(variant) === format);
}

function ignoredFolderReport(gitignoreText) {
  return REQUIRED_IGNORES.map((pattern) => ({
    pattern,
    ignored: gitignoreText.split(/\r?\n/).some((line) => line.trim() === pattern),
  }));
}

function summarizeProducts(products) {
  const summary = {
    products: products.length,
    published: 0,
    legacyOnlyProducts: 0,
    productsWithMetadata: 0,
    metadataImages: 0,
    completeImages: 0,
    squareImages: 0,
    webpReadyImages: 0,
    avifReadyImages: 0,
    providerCounts: {},
    pendingPublishedProducts: [],
  };

  products.forEach((product, index) => {
    const published = statusOf(product) === "published";
    if (published) summary.published += 1;
    const images = Array.isArray(product.images) ? product.images : [];
    if (!images.length) {
      summary.legacyOnlyProducts += 1;
      if (published) summary.pendingPublishedProducts.push(text(product.baseSku || product.id) || `product-${index + 1}`);
      return;
    }
    summary.productsWithMetadata += 1;
    const productReady = images.every((image) => hasRequiredMetadata(image) && isSquare(image) && hasResponsive(image, "webp") && hasResponsive(image, "avif"));
    if (published && !productReady) summary.pendingPublishedProducts.push(text(product.baseSku || product.id) || `product-${index + 1}`);
    images.forEach((image) => {
      summary.metadataImages += 1;
      const provider = text(image.provider) || "missing";
      summary.providerCounts[provider] = (summary.providerCounts[provider] || 0) + 1;
      if (hasRequiredMetadata(image)) summary.completeImages += 1;
      if (isSquare(image)) summary.squareImages += 1;
      if (hasResponsive(image, "webp")) summary.webpReadyImages += 1;
      if (hasResponsive(image, "avif")) summary.avifReadyImages += 1;
    });
  });

  return summary;
}

function readinessReport(products, args, env = process.env, gitignoreText = readFileSync(join(root, ".gitignore"), "utf8")) {
  const provider = normalizeProvider(args.provider || env.SOBAG_OBJECT_STORAGE_PROVIDER);
  const storage = objectStorageStatus(provider);
  const ignores = ignoredFolderReport(gitignoreText);
  const productSummary = summarizeProducts(products);
  let shapeAudit = { ok: true, message: "" };
  try {
    auditProducts(products, {});
  } catch (error) {
    shapeAudit = { ok: false, message: error.message };
  }

  const warnings = [];
  const blockers = [];
  if (!shapeAudit.ok) blockers.push("image metadata shape has errors");
  if (ignores.some((item) => !item.ignored)) blockers.push("raw/bulk photo folders are not fully ignored");
  if (storage.supported === false) blockers.push(`${provider} is not an active object storage provider`);
  if (productSummary.pendingPublishedProducts.length) warnings.push("published products are not fully migrated to square responsive image metadata");
  if (args.strict) {
    if (!storage.configured) blockers.push(`${provider} is not configured in env`);
    blockers.push(...warnings);
  }

  return {
    provider,
    storage: {
      provider: storage.provider,
      configured: Boolean(storage.configured),
      publicUrlConfigured: storage.publicUrlConfigured === undefined ? undefined : Boolean(storage.publicUrlConfigured),
    },
    gitignore: ignores,
    imageShapeAudit: shapeAudit,
    products: productSummary,
    strict: args.strict,
    ready: blockers.length === 0 && warnings.length === 0,
    warnings,
    blockers,
  };
}

function printReport(report) {
  const missingIgnores = report.gitignore.filter((item) => !item.ignored).map((item) => item.pattern);
  const pending = report.products.pendingPublishedProducts.length;
  console.log(`Photo migration readiness: ${report.ready ? "ready" : "pending"}`);
  console.log(`Provider: ${report.provider} (${report.storage.configured ? "configured" : "not configured"})`);
  if (report.storage.publicUrlConfigured !== undefined) {
    console.log(`Public URL: ${report.storage.publicUrlConfigured ? "configured" : "not configured"}`);
  }
  console.log(
    `Products: ${report.products.products} total, ${report.products.published} published, ${report.products.legacyOnlyProducts} legacy-only, ${report.products.metadataImages} metadata images`
  );
  console.log(
    `Images: ${report.products.completeImages} complete, ${report.products.squareImages} square, ${report.products.webpReadyImages} WebP-ready, ${report.products.avifReadyImages} AVIF-ready`
  );
  console.log(`Providers in metadata: ${JSON.stringify(report.products.providerCounts)}`);
  console.log(`Git ignored raw/bulk folders: ${missingIgnores.length ? `missing ${missingIgnores.join(", ")}` : "ok"}`);
  if (pending) console.log(`Pending published products: ${pending}${pending > 10 ? `, first 10: ${report.products.pendingPublishedProducts.slice(0, 10).join(", ")}` : ""}`);
  if (report.warnings.length) console.log(`Warnings: ${report.warnings.join("; ")}`);
  if (report.blockers.length) console.log(`Blockers: ${report.blockers.join("; ")}`);
}

function selfTest() {
  const products = [
    {
      id: "opt-1",
      baseSku: "OPT_1",
      status: "published",
      images: [
        {
          url: "https://cdn.example/products/opt-1/1.jpg",
          storageKey: "products/opt-1/1.jpg",
          provider: "s3-compatible",
          width: 1200,
          height: 1200,
          mime: "image/jpeg",
          uploadedAt: "2026-06-10T00:00:00.000Z",
          variants: [
            {
              url: "https://cdn.example/products/opt-1/1.webp",
              storageKey: "products/opt-1/1.webp",
              provider: "s3-compatible",
              width: 960,
              height: 960,
              mime: "image/webp",
              format: "webp",
            },
            {
              url: "https://cdn.example/products/opt-1/1.avif",
              storageKey: "products/opt-1/1.avif",
              provider: "s3-compatible",
              width: 960,
              height: 960,
              mime: "image/avif",
              format: "avif",
            },
          ],
        },
      ],
    },
  ];
  const report = readinessReport(products, { provider: "s3-compatible", strict: false }, {}, REQUIRED_IGNORES.join("\n"));
  if (!report.ready || report.products.pendingPublishedProducts.length) throw new Error("Photo migration readiness self-test failed");
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    selfTest();
    console.log("Photo migration readiness self-test passed");
    return;
  }
  const report = readinessReport(loadProducts(args.products), args);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
  if (args.strict && !report.ready) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export { readinessReport };
