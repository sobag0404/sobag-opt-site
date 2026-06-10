import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { auditCandidateProducts } from "./photo-migration-candidate-audit.mjs";
import { auditPhotoMigrationManifest } from "./photo-migration-manifest-audit.mjs";
import { buildManifest } from "./photo-migration-manifest.mjs";
import { runBulkUpload } from "./bulk-upload-product-photos.mjs";

async function createPilotFixture() {
  const base = join(process.cwd(), "local-import-output");
  await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, "photo-pilot-"));
  const photos = join(root, "photos");
  const folder = join(photos, "opt_900");
  await mkdir(folder, { recursive: true });
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
  await writeFile(join(folder, "main.png"), png);
  const currentProducts = [
    { id: "p-900", baseSku: "OPT_900", name: "Pilot pillow", status: "published", category: "Pillows", basePrice: 220 },
  ];
  const productsPath = join(root, "products.json");
  await writeFile(productsPath, `${JSON.stringify(currentProducts, null, 2)}\n`, "utf8");
  return { root, photos, productsPath, currentProducts };
}

function candidateFromCurrent(currentProducts) {
  return currentProducts.map((product) => ({
    ...product,
    images: [
      {
        url: `https://cdn.example/products/${product.baseSku}/main.webp`,
        storageKey: `products/${product.baseSku}/main.webp`,
        provider: "s3-compatible",
        width: 900,
        height: 900,
        mime: "image/webp",
        uploadedAt: "2026-06-10T00:00:00.000Z",
        variants: [
          { url: `https://cdn.example/products/${product.baseSku}/main-480w.webp`, width: 480, height: 480, mime: "image/webp" },
          { url: `https://cdn.example/products/${product.baseSku}/main-480w.avif`, width: 480, height: 480, mime: "image/avif" },
        ],
      },
    ],
  }));
}

async function runPilotSmoke() {
  const fixture = await createPilotFixture();
  try {
    const manifest = await buildManifest({
      products: fixture.productsPath,
      photos: fixture.photos,
      out: join(fixture.root, "manifest.json"),
      provider: "s3-compatible",
      responsive: true,
      variantWidths: [480, 960, 1200],
      variantFormats: ["webp", "avif"],
      limitProducts: 1,
    });
    const manifestReport = auditPhotoMigrationManifest(manifest, { strict: true });
    assert.equal(manifestReport.ok, true, manifestReport.errors.join("; "));
    assert.equal(manifest.counts.matchedProducts, 1);
    assert.equal(manifest.counts.originalFiles, 1);
    assert.equal(manifest.counts.variantFiles, 6);

    const bulk = await runBulkUpload([
      "--products",
      relative(process.cwd(), fixture.productsPath),
      "--photos",
      relative(process.cwd(), fixture.photos),
      "--report",
      relative(process.cwd(), join(fixture.root, "bulk-report.csv")),
      "--provider",
      "s3-compatible",
      "--dry-run",
      "--responsive",
      "--limit",
      "1",
    ]);
    assert.equal(bulk.summary.products, 1);
    assert.equal(bulk.summary.ready, 1);
    assert.equal(bulk.summary.ready_variant, 6);
    assert.equal(bulk.summary.uploaded, 0);

    const candidateReport = auditCandidateProducts(fixture.currentProducts, candidateFromCurrent(fixture.currentProducts), {
      requireProvider: "s3-compatible",
      requireResponsive: true,
    });
    assert.equal(candidateReport.ok, true, candidateReport.errors.join("; "));
    assert.equal(candidateReport.counts.changedProducts, 1);
    assert.equal(candidateReport.counts.migratedImages, 1);

    return { ok: true, manifest: manifest.counts, bulk: bulk.summary, candidate: candidateReport.counts };
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

const result = await runPilotSmoke();
console.log(`photo migration pilot smoke passed: ${JSON.stringify(result)}`);
