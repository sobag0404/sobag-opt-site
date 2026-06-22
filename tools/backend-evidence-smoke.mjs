import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

function parseArgs(argv = process.argv.slice(2)) {
  const args = { store: "", selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--store") args.store = argv[++index] || "";
    else if (arg === "--self-test") args.selfTest = true;
    else if (arg === "--help") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Backend evidence smoke

Dry-run evidence summary:
  node tools/backend-evidence-smoke.mjs --store /path/to/store.json

Self-test:
  node tools/backend-evidence-smoke.mjs --self-test`;
}

function unwrapStore(value) {
  if (value && typeof value === "object" && !Array.isArray(value) && value.value && typeof value.value === "object") return value.value;
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function count(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return 0;
}

function latestTypes(items = [], key = "type") {
  return [...new Set((Array.isArray(items) ? items : []).map((item) => String(item?.[key] || "").slice(0, 80)).filter(Boolean))].slice(0, 12);
}

function productList(store) {
  if (Array.isArray(store.products)) return store.products;
  if (Array.isArray(store.catalog?.products)) return store.catalog.products;
  if (store.products && typeof store.products === "object") return Object.values(store.products);
  if (store.catalog?.products && typeof store.catalog.products === "object") return Object.values(store.catalog.products);
  return [];
}

function countMediaImages(store) {
  return productList(store).reduce((total, product) => {
    const imageBuckets = [product?.images, product?.media, product?.gallery].filter(Array.isArray);
    return total + imageBuckets.reduce((countTotal, images) => countTotal + images.length, 0);
  }, 0);
}

function evidenceSummary(store) {
  const priceGroups = store.priceGroups || store.price_groups || store.pricing?.groups || [];
  const priceImportHistory = store.priceImportHistory || store.price_import_history || [];
  const audit = store.audit || [];
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    counts: {
      orders: count(store.orders),
      reviews: count(store.reviews),
      priceGroups: count(priceGroups),
      priceImportHistory: count(priceImportHistory),
      audit: count(audit),
      mediaImages: countMediaImages(store),
    },
    latestAuditTypes: latestTypes(audit, "type"),
    latestImportStatuses: latestTypes(priceImportHistory, "status"),
  };
}

function assertSafeSummary(summary) {
  const serialized = JSON.stringify(summary);
  for (const forbidden of ["password", "token", "cookie", "secret", "rawCsv", "rawFile"]) {
    if (serialized.toLowerCase().includes(forbidden.toLowerCase())) {
      throw new Error(`evidence summary includes forbidden field marker: ${forbidden}`);
    }
  }
}

async function summarizeStoreFile(file) {
  if (!file) throw new Error("--store is required unless --self-test is used");
  const parsed = JSON.parse(await readFile(file, "utf8"));
  const summary = evidenceSummary(unwrapStore(parsed));
  assertSafeSummary(summary);
  return summary;
}

async function runSelfTest() {
  const root = await mkdtemp(join(tmpdir(), "sobag-backend-evidence-"));
  const storeFile = join(root, "store.json");
  try {
    await writeFile(
      storeFile,
      `${JSON.stringify({
        value: {
          orders: [{ id: "SO-1", customer: { email: "hidden@example.test" } }],
          reviews: [{ id: "REV-1" }],
          priceGroups: [{ label: "Group A", price: 100 }],
          priceImportHistory: [{ status: "applied", rawCsv: "must-not-appear" }],
          audit: [{ type: "price_import_apply" }, { type: "review_update" }],
          catalog: { products: [{ id: "p1", images: [{ key: "products/opt_1.jpg" }], media: [{ key: "products/opt_1.webp" }] }] },
        },
      })}\n`,
      "utf8",
    );
    const summary = await summarizeStoreFile(storeFile);
    if (summary.counts.orders !== 1 || summary.counts.audit !== 2) throw new Error("evidence self-test count mismatch");
    if (summary.counts.mediaImages !== 2) throw new Error("evidence self-test media count mismatch");
    if (!summary.latestAuditTypes.includes("review_update")) throw new Error("evidence self-test audit type mismatch");
    return summary;
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
  const summary = args.selfTest ? await runSelfTest() : await summarizeStoreFile(args.store);
  console.log(
    `backend evidence smoke passed: orders=${summary.counts.orders} reviews=${summary.counts.reviews} priceGroups=${summary.counts.priceGroups} imports=${summary.counts.priceImportHistory} audit=${summary.counts.audit} mediaImages=${summary.counts.mediaImages}`,
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
