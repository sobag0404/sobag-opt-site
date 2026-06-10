import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const DEFAULT_CURRENT = "data/products-live.json";
const CORE_FIELDS = ["id", "baseSku", "name", "status", "hidden", "basePrice", "category", "categories", "collections", "holidays", "tags"];
const REQUIRED_IMAGE_FIELDS = ["url", "storageKey", "provider", "width", "height", "mime", "uploadedAt"];
const RESPONSIVE_FORMATS = new Set(["webp", "avif"]);

function text(value) {
  return String(value || "").trim();
}

function keyFor(product) {
  return text(product?.baseSku || product?.id || product?.sku).toLocaleLowerCase("ru-RU");
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    current: resolve(root, DEFAULT_CURRENT),
    candidate: "",
    requireProvider: "",
    requireResponsive: false,
    json: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--current") args.current = resolve(root, argv[++index] || "");
    else if (token === "--candidate") args.candidate = resolve(root, argv[++index] || "");
    else if (token === "--require-provider") args.requireProvider = argv[++index] || "";
    else if (token === "--require-responsive") args.requireResponsive = true;
    else if (token === "--json") args.json = true;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/photo-migration-candidate-audit.mjs --candidate local-import-output/products-with-photos.json

Options:
  --current <path>             Current products JSON. Default: ${DEFAULT_CURRENT}
  --candidate <path>           Candidate products JSON from a photo migration run.
  --require-provider <name>    Require every migrated image to use this provider.
  --require-responsive         Require WebP and AVIF variants on migrated images.
  --json                       Print machine-readable report.
  --self-test                  Run fixture checks.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

async function loadProducts(path) {
  const parsed = JSON.parse(await readFile(path, "utf8"));
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.products)) return parsed.products;
  throw new Error(`${path} must be an array or an object with products[].`);
}

function stable(value) {
  return JSON.stringify(value ?? null);
}

function imageFormat(image) {
  const explicit = text(image?.format || image?.mime || image?.contentType).replace(/^image\//i, "").toLocaleLowerCase("en-US");
  if (explicit) return explicit;
  const url = text(image?.url || image?.src).toLocaleLowerCase("en-US");
  return url.match(/\.([a-z0-9]+)(?:[?#]|$)/)?.[1] || "";
}

function isSquare(image) {
  const width = Number(image?.width || 0) || 0;
  const height = Number(image?.height || 0) || 0;
  return width > 0 && height > 0 && Math.abs(width - height) <= 1;
}

function completeImage(image) {
  return REQUIRED_IMAGE_FIELDS.every((field) => {
    if (field === "width" || field === "height") return Number(image?.[field] || 0) > 0;
    return Boolean(text(image?.[field]));
  });
}

function responsiveFormats(image) {
  return new Set((Array.isArray(image?.variants) ? image.variants : []).map(imageFormat).filter(Boolean));
}

function auditCandidateProducts(currentProducts, candidateProducts, args = {}) {
  const errors = [];
  const warnings = [];
  const currentByKey = new Map(currentProducts.map((product) => [keyFor(product), product]).filter(([key]) => key));
  const candidateByKey = new Map(candidateProducts.map((product) => [keyFor(product), product]).filter(([key]) => key));
  const changedProducts = [];
  let migratedImages = 0;

  if (candidateProducts.length < currentProducts.length) errors.push(`candidate has fewer products (${candidateProducts.length}) than current (${currentProducts.length})`);

  currentByKey.forEach((current, key) => {
    const candidate = candidateByKey.get(key);
    if (!candidate) {
      errors.push(`missing product in candidate: ${text(current.baseSku || current.id)}`);
      return;
    }
    CORE_FIELDS.forEach((field) => {
      if (stable(current[field]) !== stable(candidate[field])) errors.push(`${text(current.baseSku || current.id)} changed protected field ${field}`);
    });
    const currentImages = Array.isArray(current.images) ? current.images : [];
    const candidateImages = Array.isArray(candidate.images) ? candidate.images : [];
    if (candidateImages.length) {
      changedProducts.push(text(candidate.baseSku || candidate.id));
      candidateImages.forEach((image, index) => {
        const label = `${text(candidate.baseSku || candidate.id)} images[${index}]`;
        migratedImages += 1;
        if (!completeImage(image)) errors.push(`${label} has incomplete metadata`);
        if (!isSquare(image)) errors.push(`${label} is not square`);
        if (args.requireProvider && text(image.provider) !== args.requireProvider) errors.push(`${label} provider must be ${args.requireProvider}`);
        if (text(image.url).match(/^[a-z]:[\\/]|^\\\\/i)) errors.push(`${label} url looks like a local path`);
        if (text(image.storageKey).match(/^[a-z]:[\\/]|^\\\\/i)) errors.push(`${label} storageKey looks like a local path`);
        if (args.requireResponsive) {
          const formats = responsiveFormats(image);
          RESPONSIVE_FORMATS.forEach((format) => {
            if (!formats.has(format)) errors.push(`${label} missing ${format} variant`);
          });
        }
      });
    } else if (currentImages.length) {
      warnings.push(`${text(candidate.baseSku || candidate.id)} candidate has no images but current has image metadata`);
    }
  });

  return {
    ok: errors.length === 0,
    counts: {
      currentProducts: currentProducts.length,
      candidateProducts: candidateProducts.length,
      changedProducts: changedProducts.length,
      migratedImages,
    },
    changedProducts: changedProducts.slice(0, 50),
    warnings,
    errors,
  };
}

async function runAudit(args) {
  if (!args.candidate) throw new Error("--candidate is required");
  const [current, candidate] = await Promise.all([loadProducts(args.current), loadProducts(args.candidate)]);
  return auditCandidateProducts(current, candidate, args);
}

async function selfTest() {
  const dir = await mkdtemp(join(tmpdir(), "sobag-photo-candidate-"));
  try {
    const current = [
      { id: "p1", baseSku: "OPT_1", name: "One", status: "published", category: "Pillows", basePrice: 100 },
      { id: "p2", baseSku: "OPT_2", name: "Two", status: "published", category: "Pillows", basePrice: 120 },
    ];
    const candidate = [
      {
        ...current[0],
        images: [
          {
            url: "https://cdn.example/products/OPT_1/main.webp",
            storageKey: "products/OPT_1/main.webp",
            provider: "s3-compatible",
            width: 900,
            height: 900,
            mime: "image/webp",
            uploadedAt: "2026-06-10T00:00:00.000Z",
            variants: [
              { url: "https://cdn.example/products/OPT_1/main-480w.webp", width: 480, height: 480, mime: "image/webp" },
              { url: "https://cdn.example/products/OPT_1/main-480w.avif", width: 480, height: 480, mime: "image/avif" },
            ],
          },
        ],
      },
      current[1],
    ];
    const currentPath = join(dir, "current.json");
    const candidatePath = join(dir, "candidate.json");
    await writeFile(currentPath, JSON.stringify(current), "utf8");
    await writeFile(candidatePath, JSON.stringify(candidate), "utf8");
    const report = await runAudit({ current: currentPath, candidate: candidatePath, requireProvider: "s3-compatible", requireResponsive: true });
    assert.equal(report.ok, true);
    assert.equal(report.counts.changedProducts, 1);
    const bad = auditCandidateProducts(current, [{ ...candidate[0], name: "Changed" }], {});
    assert.equal(bad.ok, false);
    assert.ok(bad.errors.some((error) => error.includes("changed protected field name")));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArgs();
  if (args.selfTest) {
    await selfTest();
    console.log("Photo migration candidate audit self-test passed");
    return;
  }
  const report = await runAudit(args);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Photo migration candidate audit ${report.ok ? "passed" : "failed"}: ${report.counts.changedProducts} changed products, ${report.counts.migratedImages} migrated images`);
    if (report.warnings.length) console.warn(`Warnings: ${report.warnings.slice(0, 10).join("; ")}`);
    if (report.errors.length) console.error(`Errors: ${report.errors.slice(0, 20).join("; ")}`);
  }
  if (!report.ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

export { auditCandidateProducts };
