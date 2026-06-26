import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { auditCatalogPerformance } from "./catalog-performance-audit.mjs";
import { readinessReport as photoReadinessReport } from "./photo-migration-readiness.mjs";

const root = process.cwd();
const BUDGETS = {
  "app.js": { rawKb: 520, gzipKb: 120 },
  "styles.css": { rawKb: 180, gzipKb: 40 },
  "cart.js": { rawKb: 80, gzipKb: 22 },
  "components/site-shell.js": { rawKb: 20, gzipKb: 8 },
  "components/app-account.js": { rawKb: 80, gzipKb: 24 },
  "components/app-admin.js": { rawKb: 180, gzipKb: 44 },
  "components/app-admin-loader.js": { rawKb: 12, gzipKb: 4 },
  "components/app-content-utils.js": { rawKb: 80, gzipKb: 22 },
  "components/app-data.js": { rawKb: 220, gzipKb: 44 },
  "components/app-product-utils.js": { rawKb: 60, gzipKb: 18 },
  "components/app-xlsx.js": { rawKb: 20, gzipKb: 8 },
};
const REQUIRED_PAGES = ["index.html", "catalog.html", "search.html", "cart.html"];

function kb(bytes) {
  return Math.round((bytes / 1024) * 10) / 10;
}

function text(value) {
  return String(value || "");
}

function read(file) {
  return readFileSync(join(root, file), "utf8");
}

function sizeReport(file) {
  const path = join(root, file);
  const body = readFileSync(path);
  return {
    file,
    rawKb: kb(statSync(path).size),
    gzipKb: kb(gzipSync(body).length),
    budget: BUDGETS[file],
  };
}

function scriptTags(html) {
  return [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map((match) => match[0]);
}

function imageTags(html) {
  return [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function auditCoreWebVitalsReadiness() {
  const errors = [];
  const warnings = [];
  const app = read("app.js");
  const appAccount = read("components/app-account.js");
  const appAdmin = read("components/app-admin.js");
  const appContentUtils = read("components/app-content-utils.js");
  const css = read("styles.css");
  const server = read("server.mjs");
  const catalogQueryRoute = read("server-routes/catalog-query.js");
  const catalogDetailRoute = read("server-routes/catalog-detail.js");
  const productionPerformanceSmoke = read("tools/production-performance-smoke.mjs");
  const products = JSON.parse(read("data/products-live.json"));
  const bundleReports = Object.keys(BUDGETS).map(sizeReport);

  bundleReports.forEach((report) => {
    assert(report.rawKb <= report.budget.rawKb, `${report.file} raw size ${report.rawKb}KB exceeds ${report.budget.rawKb}KB`, errors);
    assert(report.gzipKb <= report.budget.gzipKb, `${report.file} gzip size ${report.gzipKb}KB exceeds ${report.budget.gzipKb}KB`, errors);
  });

  REQUIRED_PAGES.forEach((pageFile) => {
    const html = read(pageFile);
    assert(!html.includes("xlsx.full.min.js"), `${pageFile} should not load XLSX CDN during initial page render`, errors);
    assert(!html.includes("components/app-admin.js"), `${pageFile} should lazy-load admin module instead of loading full admin bundle`, errors);
    assert(html.includes("components/app-admin-loader.js") || pageFile === "cart.html", `${pageFile} should keep lightweight admin storage/loader before app.js`, errors);
    scriptTags(html).forEach((tag) => {
      assert(/\bdefer\b/i.test(tag) || /\btype=["']module["']/i.test(tag), `${pageFile} has render-blocking script tag: ${tag}`, errors);
    });
    imageTags(html).forEach((tag) => {
      const dynamic = tag.includes("${") || tag.includes("imageAttrs(");
      const hinted = /\bwidth=/i.test(tag) && /\bheight=/i.test(tag) && /\bdecoding=/i.test(tag);
      assert(dynamic || hinted, `${pageFile} has image without width/height/decoding hints: ${tag.slice(0, 120)}`, errors);
    });
  });

  assert(!/Date\.now\(\)/.test(app.match(/fetchCatalogData[\s\S]{0,1200}/)?.[0] || ""), "catalog fetch path must not disable browser cache with Date.now()", errors);
  const appXlsx = read("components/app-xlsx.js");
  const appAdminLoader = read("components/app-admin-loader.js");
  const xlsxLazySource = `${app}\n${appAccount}\n${appAdmin}\n${appXlsx}`;
  const adminLazySource = `${app}\n${appAdmin}\n${appAdminLoader}`;
  const publicCacheSource = `${app}\n${appContentUtils}`;
  assert(xlsxLazySource.includes("ensureXlsxLibrary") && xlsxLazySource.includes("XLSX_CDN_URL"), "app XLSX support should lazy-load only on demand", errors);
  assert(adminLazySource.includes("ensureAdminModule") && adminLazySource.includes("ADMIN_MODULE_SRC"), "public app pages should lazy-load full admin module only on demand", errors);
  assert(publicCacheSource.includes("PUBLIC_API_CACHE_PREFIX") && publicCacheSource.includes("PUBLIC_API_CACHE_MAX_ENTRIES"), "public catalog API responses should keep a bounded browser cache", errors);
  assert(app.includes("const CATALOG_PAGE_SIZE = 48;"), "frontend public catalog page size must stay 48", errors);
  assert(app.includes("const SERVER_CATALOG_PAGE_SIZE = CATALOG_PAGE_SIZE;"), "server query page size must follow shared page size", errors);
  assert(app.includes("productCardSkeletonHtml") && app.includes("renderProductsLoading"), "catalog/search initial loading should keep skeleton state", errors);
  assert(app.includes('insertAdjacentHTML("beforeend"'), "cursor pagination should append cards instead of replacing first page", errors);
  assert(css.includes("content-visibility: auto;"), "product cards should keep rendering containment", errors);
  assert(css.includes("contain-intrinsic-size:"), "product cards should reserve intrinsic size", errors);
  assert(server.includes('"/data/products-live.json") return "public, max-age=300, stale-while-revalidate=3600"'), "static product JSON should keep browser cache", errors);
  assert(server.includes("staticEntityHeaders") && server.includes("isNotModified"), "VPS static server should support ETag/Last-Modified conditional cache validation", errors);
  assert(catalogQueryRoute.includes('"Cache-Control": "public, max-age=300, stale-while-revalidate=3600"'), "catalog-query should keep public cache", errors);
  assert(catalogDetailRoute.includes('"Cache-Control": "public, max-age=300, stale-while-revalidate=3600"'), "catalog-detail should keep public cache", errors);
  assert(productionPerformanceSmoke.includes("assertStaticRevalidation") && productionPerformanceSmoke.includes("If-None-Match") && productionPerformanceSmoke.includes('method: "HEAD"'), "production performance smoke should verify static 304/HEAD revalidation", errors);

  const catalogPerformance = auditCatalogPerformance();
  const photoReadiness = photoReadinessReport(products, { provider: "", strict: false });
  if (!catalogPerformance.migratedImageReady) {
    warnings.push("real WebP/AVIF image validation is pending until the actual migrated photo set exists");
  }
  if (!photoReadiness.ready) {
    warnings.push("current live catalog is not ready for final image CWV validation yet");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    bundles: bundleReports,
    catalog: catalogPerformance,
    photoReadiness: {
      ready: photoReadiness.ready,
      metadataImages: photoReadiness.products.metadataImages,
      legacyOnlyProducts: photoReadiness.products.legacyOnlyProducts,
      webpReadyImages: photoReadiness.products.webpReadyImages,
      avifReadyImages: photoReadiness.products.avifReadyImages,
    },
  };
}

function main() {
  const json = process.argv.includes("--json");
  const report = auditCoreWebVitalsReadiness();
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const bundleText = report.bundles.map((item) => `${item.file} ${item.rawKb}KB/${item.gzipKb}KB gzip`).join(", ");
    console.log(`Core Web Vitals readiness ${report.ok ? "passed" : "failed"}: ${bundleText}`);
    if (report.warnings.length) console.log(`Warnings: ${report.warnings.join("; ")}`);
    if (report.errors.length) console.log(`Errors: ${report.errors.join("; ")}`);
  }
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

export { auditCoreWebVitalsReadiness };
