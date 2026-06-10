const PRODUCT_COLUMNS = [
  "id",
  "base_sku",
  "name",
  "status",
  "hidden",
  "description",
  "detail_description",
  "stock",
  "popular",
  "min_price",
  "max_price",
  "variant_count",
  "payload",
];

const VARIANT_COLUMNS = ["id", "product_id", "base_sku", "sku", "type", "size", "material", "price", "qty_step", "min_qty", "payload"];
const IMAGE_COLUMNS = ["id", "product_id", "url", "storage_key", "provider", "width", "height", "mime", "uploaded_at", "sort_order", "is_primary", "payload"];
const IMAGE_VARIANT_COLUMNS = ["id", "image_id", "url", "storage_key", "provider", "width", "height", "mime", "format", "uploaded_at", "payload"];
const TAXONOMY_COLUMNS = ["id", "type", "name", "slug", "description", "icon", "payload"];
const ASSIGNMENT_COLUMNS = ["id", "product_id", "taxonomy_id", "type"];
const IMPORT_BATCH_COLUMNS = [
  "id",
  "source",
  "status",
  "update_existing",
  "created_at",
  "created_by",
  "applied_at",
  "applied_by",
  "rejected_at",
  "rejected_by",
  "rolled_back_at",
  "rolled_back_by",
  "created",
  "skipped",
  "updated",
  "errors",
  "row_count",
  "product_count",
  "snapshot_product_count",
  "payload",
];
const IMPORT_BATCH_ROW_COLUMNS = ["id", "batch_id", "row_number", "base_sku", "name", "status", "action", "reason", "warnings", "variant_count", "payload"];

function text(value) {
  return String(value || "").trim();
}

function number(value, fallback = 0) {
  const prepared = Number(value);
  return Number.isFinite(prepared) ? Math.trunc(prepared) : fallback;
}

function payload(value) {
  return value && typeof value === "object" ? value : {};
}

function slugFromId(row = {}) {
  const id = text(row.id);
  return id.includes(":") ? id.split(":").slice(1).join(":") : id;
}

function addParam(params, value) {
  params.push(value);
  return `$${params.length}`;
}

function buildUpsert(table, columns, values) {
  const params = [];
  const placeholders = columns.map((column) => addParam(params, values[column]));
  const updates = columns.filter((column) => column !== "id").map((column) => `${column} = excluded.${column}`);
  return {
    table,
    sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) ON CONFLICT (id) DO UPDATE SET ${updates.join(", ")}`,
    params,
  };
}

function productValues(row = {}) {
  return {
    id: text(row.id),
    base_sku: text(row.baseSku),
    name: text(row.name),
    status: text(row.status || "draft"),
    hidden: Boolean(row.hidden),
    description: text(row.description),
    detail_description: text(row.detailDescription),
    stock: text(row.stock),
    popular: number(row.popular),
    min_price: number(row.minPrice || row.basePrice),
    max_price: number(row.maxPrice || row.basePrice),
    variant_count: number(row.variantCount),
    payload: payload(row),
  };
}

function variantValues(row = {}) {
  return {
    id: text(row.id),
    product_id: text(row.productId),
    base_sku: text(row.baseSku),
    sku: text(row.sku),
    type: text(row.type),
    size: text(row.size),
    material: text(row.material),
    price: number(row.price),
    qty_step: number(row.qtyStep, 1),
    min_qty: number(row.minQty),
    payload: payload(row),
  };
}

function imageValues(row = {}, sortOrder = 0) {
  return {
    id: text(row.id),
    product_id: text(row.productId),
    url: text(row.url),
    storage_key: text(row.storageKey),
    provider: text(row.provider),
    width: number(row.width),
    height: number(row.height),
    mime: text(row.mime),
    uploaded_at: text(row.uploadedAt) || null,
    sort_order: number(row.sortOrder, sortOrder),
    is_primary: Boolean(row.isPrimary || ["main", "legacy-main"].includes(text(row.role))),
    payload: payload(row),
  };
}

function imageVariantValues(row = {}) {
  return {
    id: text(row.id),
    image_id: text(row.imageId || row.parentImageId),
    url: text(row.url),
    storage_key: text(row.storageKey),
    provider: text(row.provider),
    width: number(row.width),
    height: number(row.height),
    mime: text(row.mime),
    format: text(row.format || text(row.mime).replace(/^image\//, "")),
    uploaded_at: text(row.uploadedAt) || null,
    payload: payload(row),
  };
}

function taxonomyValues(row = {}) {
  return {
    id: text(row.id),
    type: text(row.type),
    name: text(row.name),
    slug: text(row.slug || slugFromId(row)),
    description: text(row.description),
    icon: text(row.icon),
    payload: payload(row),
  };
}

function assignmentValues(row = {}) {
  return {
    id: text(row.id),
    product_id: text(row.productId),
    taxonomy_id: text(row.taxonomyId),
    type: text(row.type),
  };
}

function importBatchValues(row = {}) {
  const counts = row.counts || {};
  return {
    id: text(row.id),
    source: text(row.source),
    status: text(row.status),
    update_existing: Boolean(row.updateExisting),
    created_at: text(row.createdAt) || null,
    created_by: text(row.createdBy),
    applied_at: text(row.appliedAt) || null,
    applied_by: text(row.appliedBy),
    rejected_at: text(row.rejectedAt) || null,
    rejected_by: text(row.rejectedBy),
    rolled_back_at: text(row.rolledBackAt) || null,
    rolled_back_by: text(row.rolledBackBy),
    created: number(counts.created),
    skipped: number(counts.skipped),
    updated: number(counts.updated),
    errors: number(counts.errors),
    row_count: number(row.rowCount),
    product_count: number(row.productCount),
    snapshot_product_count: number(row.snapshotProductCount),
    payload: payload(row),
  };
}

function importBatchRowValues(row = {}) {
  return {
    id: text(row.id),
    batch_id: text(row.batchId),
    row_number: number(row.rowNumber),
    base_sku: text(row.baseSku),
    name: text(row.name),
    status: text(row.status),
    action: text(row.action),
    reason: text(row.reason),
    warnings: text(row.warnings),
    variant_count: number(row.variantCount),
    payload: payload(row),
  };
}

function imageVariantsFromImages(images = []) {
  return images.flatMap((image) =>
    (Array.isArray(image.variants) ? image.variants : []).map((variant, index) => ({
      ...variant,
      id: text(variant.id) || `${image.id}::variant-${index + 1}`,
      imageId: text(variant.parentImageId) || image.id,
    }))
  );
}

function flattenTaxonomies(taxonomies = {}) {
  return ["categories", "collections", "holidays", "tags"].flatMap((bucket) => (Array.isArray(taxonomies[bucket]) ? taxonomies[bucket] : []));
}

function buildCatalogWriteStatements(pim = {}) {
  const imageOrder = new Map();
  return [
    ...(pim.products || []).map((row) => buildUpsert("products", PRODUCT_COLUMNS, productValues(row))),
    ...(pim.variants || []).map((row) => buildUpsert("variants", VARIANT_COLUMNS, variantValues(row))),
    ...(pim.images || []).map((row) => {
      const index = imageOrder.get(row.productId) || 0;
      imageOrder.set(row.productId, index + 1);
      return buildUpsert("images", IMAGE_COLUMNS, imageValues(row, index));
    }),
    ...imageVariantsFromImages(pim.images || []).map((row) => buildUpsert("image_variants", IMAGE_VARIANT_COLUMNS, imageVariantValues(row))),
    ...flattenTaxonomies(pim.taxonomies || {}).map((row) => buildUpsert("taxonomies", TAXONOMY_COLUMNS, taxonomyValues(row))),
    ...(pim.taxonomyAssignments || []).map((row) => buildUpsert("product_taxonomies", ASSIGNMENT_COLUMNS, assignmentValues(row))),
    ...(pim.importBatches || []).map((row) => buildUpsert("import_batches", IMPORT_BATCH_COLUMNS, importBatchValues(row))),
    ...(pim.importBatchRows || []).map((row) => buildUpsert("import_batch_rows", IMPORT_BATCH_ROW_COLUMNS, importBatchRowValues(row))),
  ];
}

module.exports = {
  buildCatalogWriteStatements,
  buildUpsert,
  productValues,
  variantValues,
  imageValues,
  imageVariantValues,
  taxonomyValues,
  assignmentValues,
  importBatchValues,
  importBatchRowValues,
};
