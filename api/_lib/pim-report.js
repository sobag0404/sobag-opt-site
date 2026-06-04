const { buildCatalogPim } = require("./pim");

const TABLE_VIEWS = new Set(["products", "variants", "images", "taxonomies", "import-batches"]);
const JSON_VIEWS = new Set(["summary", "full", ...TABLE_VIEWS]);

function text(value) {
  return String(value || "").trim();
}

function listCell(value) {
  return Array.isArray(value) ? value.map(text).filter(Boolean).join("; ") : text(value);
}

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function resolvePim(catalog = {}) {
  const products = Array.isArray(catalog.products) ? catalog.products : [];
  const pim = catalog.pim && typeof catalog.pim === "object" && !Array.isArray(catalog.pim) ? catalog.pim : null;
  if (Array.isArray(pim?.products) && Array.isArray(pim?.variants) && Array.isArray(pim?.images) && pim?.taxonomies) return pim;
  return buildCatalogPim(products, { source: "admin-pim-report", importBatches: pim?.importBatches || [] });
}

function rebuiltPim(catalog = {}, pim = resolvePim(catalog)) {
  return buildCatalogPim(Array.isArray(catalog.products) ? catalog.products : [], {
    source: "admin-pim-diagnostics",
    importBatches: pim.importBatches || [],
  });
}

function taxonomyCounts(taxonomies = {}) {
  return {
    categories: Array.isArray(taxonomies.categories) ? taxonomies.categories.length : 0,
    collections: Array.isArray(taxonomies.collections) ? taxonomies.collections.length : 0,
    holidays: Array.isArray(taxonomies.holidays) ? taxonomies.holidays.length : 0,
    tags: Array.isArray(taxonomies.tags) ? taxonomies.tags.length : 0,
  };
}

function diagnosticsForCatalog(catalog = {}) {
  const pim = resolvePim(catalog);
  const fresh = rebuiltPim(catalog, pim);
  const counts = pim.counts || {};
  const freshCounts = fresh.counts || {};
  const warnings = [];

  ["products", "variants", "images"].forEach((key) => {
    if (safeNumber(counts[key]) !== safeNumber(freshCounts[key])) {
      warnings.push({
        code: `${key}_count_mismatch`,
        message: `Stored PIM ${key} count differs from rebuilt catalog count.`,
        stored: safeNumber(counts[key]),
        rebuilt: safeNumber(freshCounts[key]),
      });
    }
  });

  const statusCounts = counts.statuses || {};
  const unpublishedCount = safeNumber(statusCounts.draft) + safeNumber(statusCounts.hidden) + safeNumber(statusCounts.archive);
  const missingImages = (pim.products || []).filter((product) => !safeNumber(product.imageCount)).length;
  const objectStorageImages = (pim.images || []).filter((image) => text(image.storageKey) || text(image.provider)).length;
  const legacyImages = (pim.images || []).filter((image) => image.source === "legacy").length;

  if (!pim.generatedAt) warnings.push({ code: "missing_generated_at", message: "PIM generatedAt is empty." });
  if (!Array.isArray(pim.importBatches)) warnings.push({ code: "missing_import_batch_summaries", message: "PIM importBatches summary is missing." });

  return {
    ok: warnings.length === 0,
    warnings,
    catalogUpdatedAt: catalog.updatedAt || null,
    catalogUpdatedBy: catalog.updatedBy || "",
    pimGeneratedAt: pim.generatedAt || "",
    pimSource: pim.source || "",
    counts: {
      ...counts,
      publishedProducts: safeNumber(statusCounts.published),
      unpublishedProducts: unpublishedCount,
      missingImages,
      objectStorageImages,
      legacyImages,
      taxonomies: taxonomyCounts(pim.taxonomies),
    },
  };
}

function samplesForPim(pim) {
  return {
    products: (pim.products || []).slice(0, 5),
    variants: (pim.variants || []).slice(0, 5),
    images: (pim.images || []).slice(0, 5),
    taxonomies: {
      categories: (pim.taxonomies?.categories || []).slice(0, 10),
      collections: (pim.taxonomies?.collections || []).slice(0, 10),
      holidays: (pim.taxonomies?.holidays || []).slice(0, 10),
      tags: (pim.taxonomies?.tags || []).slice(0, 10),
    },
    importBatches: (pim.importBatches || []).slice(0, 10),
  };
}

function assertJsonView(view) {
  const normalized = text(view || "summary") || "summary";
  if (JSON_VIEWS.has(normalized)) return normalized;
  const error = new Error(`Unsupported PIM view: ${normalized}`);
  error.code = "unsupported_pim_view";
  error.statusCode = 400;
  throw error;
}

function assertTableView(view) {
  const normalized = text(view || "products") || "products";
  if (TABLE_VIEWS.has(normalized)) return normalized;
  const error = new Error(`CSV export is available only for ${[...TABLE_VIEWS].join(", ")}.`);
  error.code = "unsupported_pim_csv_view";
  error.statusCode = 400;
  throw error;
}

function taxonomyRows(taxonomies = {}) {
  return ["categories", "collections", "holidays", "tags"].flatMap((bucket) =>
    (taxonomies[bucket] || []).map((item) => ({
      bucket,
      type: item.type,
      id: item.id,
      name: item.name,
      productCount: item.productCount,
    }))
  );
}

function rowsForView(pim, view) {
  if (view === "products") return pim.products || [];
  if (view === "variants") return pim.variants || [];
  if (view === "images") return (pim.images || []).map((image) => ({ ...image, variantCount: Array.isArray(image.variants) ? image.variants.length : 0, variants: undefined }));
  if (view === "taxonomies") return taxonomyRows(pim.taxonomies);
  if (view === "import-batches") {
    return (pim.importBatches || []).map((batch) => ({
      ...batch,
      created: batch.counts?.created || 0,
      skipped: batch.counts?.skipped || 0,
      updated: batch.counts?.updated || 0,
      errors: batch.counts?.errors || 0,
      counts: undefined,
    }));
  }
  return [];
}

function columnsForView(view) {
  if (view === "products") return ["id", "baseSku", "name", "status", "hidden", "category", "categories", "collections", "holidays", "tags", "basePrice", "stock", "photoFolder", "imageCount", "variantCount"];
  if (view === "variants") return ["id", "productId", "baseSku", "sku", "type", "size", "material", "name", "price", "priceSource"];
  if (view === "images") return ["id", "productId", "baseSku", "role", "source", "url", "storageKey", "provider", "width", "height", "mime", "fileName", "size", "status", "uploadedAt", "variantCount"];
  if (view === "taxonomies") return ["bucket", "type", "id", "name", "productCount"];
  if (view === "import-batches") return ["id", "source", "status", "updateExisting", "createdAt", "createdBy", "appliedAt", "appliedBy", "rejectedAt", "rejectedBy", "rolledBackAt", "rolledBackBy", "created", "skipped", "updated", "errors", "rowCount", "productCount", "snapshotProductCount"];
  return [];
}

function csvEscape(value) {
  const prepared = listCell(value);
  if (/[",\r\n;]/.test(prepared)) return `"${prepared.replace(/"/g, '""')}"`;
  return prepared;
}

function csvForRows(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row?.[column])).join(",")),
  ].join("\r\n");
}

function csvForPimView(catalog = {}, view = "products") {
  const normalizedView = assertTableView(view);
  const pim = resolvePim(catalog);
  const rows = rowsForView(pim, normalizedView);
  const columns = columnsForView(normalizedView);
  return {
    view: normalizedView,
    rows: rows.length,
    fileName: `sobag-pim-${normalizedView}-${new Date().toISOString().slice(0, 10)}.csv`,
    csv: csvForRows(rows, columns),
  };
}

function reportForPimView(catalog = {}, view = "summary") {
  const normalizedView = assertJsonView(view);
  const pim = resolvePim(catalog);
  const diagnostics = diagnosticsForCatalog(catalog);
  if (normalizedView === "full") {
    return {
      view: normalizedView,
      catalogUpdatedAt: catalog.updatedAt || null,
      catalogUpdatedBy: catalog.updatedBy || "",
      diagnostics,
      pim,
    };
  }
  if (normalizedView === "summary") {
    return {
      view: normalizedView,
      catalogUpdatedAt: catalog.updatedAt || null,
      catalogUpdatedBy: catalog.updatedBy || "",
      diagnostics,
      counts: pim.counts || {},
      samples: samplesForPim(pim),
    };
  }
  const rows = rowsForView(pim, normalizedView);
  return {
    view: normalizedView,
    catalogUpdatedAt: catalog.updatedAt || null,
    catalogUpdatedBy: catalog.updatedBy || "",
    diagnostics,
    count: rows.length,
    rows,
  };
}

module.exports = {
  TABLE_VIEWS,
  csvForPimView,
  diagnosticsForCatalog,
  reportForPimView,
  resolvePim,
  rowsForView,
};
