import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { buildCatalogPim } = require("../api/_lib/pim.js");

const root = process.cwd();
const DEFAULT_OUT = "local-import-output/pim-normalized";

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    products: join(root, "data", "products-live.json"),
    out: join(root, DEFAULT_OUT),
    source: "pim-export-normalized",
    dryRun: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--products") args.products = resolve(root, argv[++index] || "");
    else if (token === "--out") args.out = resolve(root, argv[++index] || "");
    else if (token === "--source") args.source = String(argv[++index] || args.source);
    else if (token === "--dry-run") args.dryRun = true;
    else if (token === "--self-test") args.selfTest = true;
    else if (token === "--help") {
      console.log(`Usage:
  node tools/pim-export-normalized.mjs --products data/products-live.json --out local-import-output/pim-normalized

Options:
  --dry-run     Build and validate export tables without writing files.
  --self-test   Run a temporary fixture export.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function flattenTaxonomies(taxonomies = {}) {
  return ["categories", "collections", "holidays", "tags"].flatMap((bucket) =>
    (Array.isArray(taxonomies[bucket]) ? taxonomies[bucket] : []).map((item) => ({ ...item, bucket }))
  );
}

function pimTables(pim) {
  return {
    products: pim.products || [],
    variants: pim.variants || [],
    images: pim.images || [],
    taxonomies: flattenTaxonomies(pim.taxonomies),
    taxonomyAssignments: pim.taxonomyAssignments || [],
    importBatches: pim.importBatches || [],
  };
}

function assertUnique(rows, key, label) {
  const seen = new Set();
  rows.forEach((row, index) => {
    const value = String(row?.[key] || "").trim();
    if (!value) throw new Error(`${label}[${index}] missing ${key}`);
    if (seen.has(value)) throw new Error(`${label} duplicate ${key}: ${value}`);
    seen.add(value);
  });
}

function validateTables(tables) {
  assertUnique(tables.products, "id", "products");
  assertUnique(tables.variants, "id", "variants");
  assertUnique(tables.images, "id", "images");
  assertUnique(tables.taxonomies, "id", "taxonomies");
  assertUnique(tables.taxonomyAssignments, "id", "taxonomyAssignments");
  tables.variants.forEach((variant) => {
    if (!tables.products.some((product) => product.id === variant.productId)) throw new Error(`variant ${variant.id} references missing product ${variant.productId}`);
  });
  tables.images.forEach((image) => {
    if (!tables.products.some((product) => product.id === image.productId)) throw new Error(`image ${image.id} references missing product ${image.productId}`);
  });
  tables.taxonomyAssignments.forEach((assignment) => {
    if (!tables.products.some((product) => product.id === assignment.productId)) throw new Error(`taxonomy assignment ${assignment.id} references missing product ${assignment.productId}`);
    if (!tables.taxonomies.some((taxonomy) => taxonomy.id === assignment.taxonomyId)) throw new Error(`taxonomy assignment ${assignment.id} references missing taxonomy ${assignment.taxonomyId}`);
  });
}

function manifestFor(pim, tables, args) {
  return {
    version: 1,
    generatedAt: pim.generatedAt,
    source: args.source,
    productsFile: basename(args.products),
    files: {
      products: "products.jsonl",
      variants: "variants.jsonl",
      images: "images.jsonl",
      taxonomies: "taxonomies.jsonl",
      taxonomyAssignments: "taxonomy-assignments.jsonl",
      importBatches: "import-batches.jsonl",
    },
    counts: {
      products: tables.products.length,
      variants: tables.variants.length,
      images: tables.images.length,
      taxonomies: tables.taxonomies.length,
      taxonomyAssignments: tables.taxonomyAssignments.length,
      importBatches: tables.importBatches.length,
      imageVariants: pim.counts?.imageVariants || 0,
      statuses: pim.counts?.statuses || {},
    },
  };
}

async function writeJsonl(file, rows) {
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  await writeFile(file, body ? `${body}\n` : "", "utf8");
}

async function exportPim(args) {
  const products = JSON.parse(readFileSync(args.products, "utf8"));
  if (!Array.isArray(products) || !products.length) throw new Error("Products JSON must contain a non-empty array.");
  const pim = buildCatalogPim(products, { source: args.source });
  const tables = pimTables(pim);
  validateTables(tables);
  const manifest = manifestFor(pim, tables, args);

  if (!args.dryRun) {
    await mkdir(args.out, { recursive: true });
    await writeJsonl(join(args.out, "products.jsonl"), tables.products);
    await writeJsonl(join(args.out, "variants.jsonl"), tables.variants);
    await writeJsonl(join(args.out, "images.jsonl"), tables.images);
    await writeJsonl(join(args.out, "taxonomies.jsonl"), tables.taxonomies);
    await writeJsonl(join(args.out, "taxonomy-assignments.jsonl"), tables.taxonomyAssignments);
    await writeJsonl(join(args.out, "import-batches.jsonl"), tables.importBatches);
    await writeFile(join(args.out, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  return { manifest, out: args.out, dryRun: args.dryRun };
}

async function selfTest() {
  const dir = await mkdtemp(join(tmpdir(), "sobag-pim-export-"));
  try {
    const productsPath = join(dir, "products.json");
    const out = join(dir, "out");
    const products = [
      {
        id: "pim-export-1",
        baseSku: "pim_export_1",
        name: "PIM export one",
        status: "published",
        category: "Подушки",
        categories: ["Подушки"],
        collections: ["Self-test"],
        types: ["Подушка"],
        sizes: ["40x40"],
        materials: ["Велюр"],
        basePrice: 100,
        image: "assets/production-workshop-1.png",
      },
      {
        id: "pim-export-2",
        baseSku: "pim_export_2",
        name: "PIM export two",
        status: "draft",
        category: "Наволочки",
        categories: ["Наволочки"],
        types: ["Наволочка"],
        sizes: ["40x40"],
        materials: ["Габардин"],
        basePrice: 80,
        image: "assets/production-hero-1.png",
      },
    ];
    await writeFile(productsPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
    const result = await exportPim({ products: productsPath, out, source: "pim-export-self-test", dryRun: false });
    const manifest = JSON.parse(await readFile(join(out, "manifest.json"), "utf8"));
    if (!existsSync(join(out, "products.jsonl")) || !existsSync(join(out, "variants.jsonl")) || !existsSync(join(out, "taxonomy-assignments.jsonl"))) throw new Error("PIM export self-test missing JSONL files");
    if (manifest.counts.products !== 2 || manifest.counts.variants !== 2 || result.manifest.counts.images !== 2) {
      throw new Error("PIM export self-test counts mismatch");
    }
    if (manifest.counts.taxonomyAssignments < 2) throw new Error("PIM export self-test taxonomy assignments mismatch");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function runPimExport(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.selfTest) {
    await selfTest();
    console.log("PIM normalized export self-test passed");
    return null;
  }
  const result = await exportPim(args);
  const mode = result.dryRun ? "dry-run" : result.out;
  console.log(
    `PIM normalized export passed (${mode}): ${result.manifest.counts.products} products, ${result.manifest.counts.variants} variants, ${result.manifest.counts.images} images, ${result.manifest.counts.taxonomies} taxonomies, ${result.manifest.counts.taxonomyAssignments} taxonomy assignments`
  );
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runPimExport().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
