import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { auditContentReadiness } from "./content-readiness-report.mjs";
import { readinessReport as photoReadinessReport } from "./photo-migration-readiness.mjs";
import { auditCatalogPerformance } from "./catalog-performance-audit.mjs";
import { auditCoreWebVitalsReadiness } from "./core-web-vitals-readiness.mjs";

const root = process.cwd();

function loadProducts() {
  const parsed = JSON.parse(readFileSync(join(root, "data", "products-live.json"), "utf8"));
  return Array.isArray(parsed) ? parsed : parsed.products || [];
}

function status(label, done, pending = []) {
  return { label, done: Boolean(done), pending };
}

function buildGoalReadinessReport() {
  const products = loadProducts();
  const content = auditContentReadiness(readFileSync(join(root, "components", "app-data.js"), "utf8"));
  const photo = photoReadinessReport(products, { provider: process.env.SOBAG_OBJECT_STORAGE_PROVIDER || "", strict: false });
  const performance = auditCatalogPerformance();
  const cwv = auditCoreWebVitalsReadiness();
  const performanceReady = performance.defaultPageSize === 48 && performance.publicProducts > 0;

  const sections = [
    status("SEO/content final facts", content.ok && content.finalReady, content.pending),
    status("Photo storage/images migration", photo.ready, [
      photo.storage.configured ? "" : "object storage provider/env is not configured for real migration",
      photo.products.pendingPublishedProducts.length ? `${photo.products.pendingPublishedProducts.length} published products still need migrated square responsive metadata` : "",
    ].filter(Boolean)),
    status("Import/PIM DB split readiness", true, ["real PostgreSQL cutover still requires approved test DB/env and explicit switch"]),
    status("Performance/Core Web Vitals readiness", performanceReady && cwv.ok && cwv.photoReadiness.ready, [
      ...(performanceReady ? [] : ["catalog performance audit did not confirm compact 48-card public pages"]),
      ...(cwv.ok ? [] : cwv.errors),
      cwv.photoReadiness.ready ? "" : "final field CWV waits for real migrated image set/catalog growth",
    ].filter(Boolean)),
  ];

  const complete = sections.every((item) => item.done);
  const externalInputs = [
    ...(content.finalReady ? [] : ["confirmed final phone, legal address, production/dispatch address and map data"]),
    ...(photo.ready ? [] : ["real object-storage provider/env and migrated square WebP/AVIF product image set"]),
    "approved PostgreSQL test DB/env before any DB cutover rehearsal",
    ...(cwv.photoReadiness.ready ? [] : ["final CWV audit after real catalog/photo growth"]),
  ];

  return { complete, sections, externalInputs };
}

function selfTest() {
  const report = buildGoalReadinessReport();
  if (!Array.isArray(report.sections) || report.sections.length !== 4) throw new Error("goal readiness must report 4 sections");
  if (!report.externalInputs.length) throw new Error("current goal should still list external inputs");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    console.log("Goal readiness report self-test passed");
    return;
  }
  const json = process.argv.includes("--json");
  const report = buildGoalReadinessReport();
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(`Goal readiness: ${report.complete ? "complete" : "pending"}`);
  report.sections.forEach((section) => {
    console.log(`${section.done ? "OK" : "PENDING"} ${section.label}${section.pending.length ? `: ${section.pending.join("; ")}` : ""}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export { buildGoalReadinessReport };
