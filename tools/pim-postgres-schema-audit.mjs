import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const schemaPath = join(root, "docs", "pim-postgres-schema.sql");

const REQUIRED_TABLES = {
  products: ["id", "base_sku", "name", "status", "hidden", "min_price", "max_price", "variant_count", "payload"],
  variants: ["id", "product_id", "base_sku", "sku", "type", "size", "material", "price", "payload"],
  images: ["id", "product_id", "url", "storage_key", "provider", "width", "height", "mime", "uploaded_at", "is_primary", "payload"],
  image_variants: ["id", "image_id", "url", "storage_key", "provider", "width", "height", "mime", "format", "uploaded_at", "payload"],
  taxonomies: ["id", "type", "name", "slug", "description", "icon", "payload"],
  product_taxonomies: ["id", "product_id", "taxonomy_id", "type"],
  import_batches: ["id", "source", "status", "update_existing", "created_at", "created_by", "applied_at", "created", "skipped", "updated", "errors", "row_count", "product_count", "snapshot_product_count", "payload"],
  import_batch_rows: ["id", "batch_id", "row_number", "base_sku", "status", "action", "reason", "warnings", "variant_count", "payload"],
};

const REQUIRED_VIEWS = {
  public_catalog_products: ["id", "base_sku", "name", "status", "min_price", "max_price", "variant_count", "categories", "collections", "holidays", "tags", "types", "sizes", "materials", "variant_skus"],
  public_catalog_cards: ["id", "base_sku", "name", "description", "stock", "popular", "min_price", "max_price", "variant_count", "category", "categories", "collections", "holidays", "tags", "types", "sizes", "materials", "variant_skus", "image", "image_meta"],
};

function normalizeSql(sql) {
  return String(sql || "")
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tableBody(sql, table) {
  const pattern = new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+${table}\\s*\\((.*?)\\);`, "is");
  return sql.match(pattern)?.[1] || "";
}

function viewBody(sql, view) {
  const pattern = new RegExp(`create\\s+or\\s+replace\\s+view\\s+${view}\\s+as\\s+(.*?)(?=create\\s+or\\s+replace\\s+view|$)`, "is");
  return sql.match(pattern)?.[1] || "";
}

function auditPimPostgresSchema(sqlText = readFileSync(schemaPath, "utf8")) {
  const sql = normalizeSql(sqlText);
  const errors = [];
  const warnings = [];

  Object.entries(REQUIRED_TABLES).forEach(([table, columns]) => {
    const body = tableBody(sql, table);
    if (!body) {
      errors.push(`missing table: ${table}`);
      return;
    }
    columns.forEach((column) => {
      if (!new RegExp(`\\b${column}\\b`).test(body)) errors.push(`${table} missing column ${column}`);
    });
  });

  Object.entries(REQUIRED_VIEWS).forEach(([view, columns]) => {
    const body = viewBody(sql, view);
    if (!body) {
      errors.push(`missing view: ${view}`);
      return;
    }
    columns.forEach((column) => {
      if (!new RegExp(`\\b${column}\\b`).test(body)) errors.push(`${view} missing field ${column}`);
    });
  });

  const publicProductView = viewBody(sql, "public_catalog_products");
  if (publicProductView.includes("jsonb_agg(t.name")) {
    errors.push("public_catalog_products taxonomy fields must be text[] arrays, not jsonb_agg values");
  }

  [
    "references products (id) on delete restrict",
    "references images (id) on delete cascade",
    "references import_batches (id) on delete cascade",
    "references taxonomies (id) on delete restrict",
    "check (status in ('draft', 'published', 'hidden', 'archive'))",
    "check (type in ('category', 'collection', 'holiday', 'tag'))",
    "check (format in ('webp', 'avif', 'jpg', 'png'))",
    "where p.status = 'published' and p.hidden = false",
    "from public_catalog_products p",
    ")::text[] as categories",
    ")::text[] as collections",
    ")::text[] as holidays",
    ")::text[] as tags",
    ")::text[] as types",
    ")::text[] as sizes",
    ")::text[] as materials",
    ")::text[] as variant_skus",
    "coalesce(p.categories[1], '') as category",
  ].forEach((fragment) => {
    if (!sql.includes(fragment)) errors.push(`missing constraint: ${fragment}`);
  });

  ["products_status_idx", "products_base_sku_trgm_idx", "products_name_trgm_idx", "products_description_trgm_idx", "variants_product_id_idx", "images_product_id_idx", "taxonomies_type_idx", "product_taxonomies_product_id_idx", "import_batches_status_idx", "import_batch_rows_batch_id_idx"].forEach((indexName) => {
    if (!sql.includes(`create index if not exists ${indexName}`)) warnings.push(`missing optional index: ${indexName}`);
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    tables: Object.keys(REQUIRED_TABLES),
    views: Object.keys(REQUIRED_VIEWS),
    contractVersion: 1,
  };
}

function selfTest() {
  const report = auditPimPostgresSchema();
  if (!report.ok || report.tables.length !== Object.keys(REQUIRED_TABLES).length || report.views.length !== Object.keys(REQUIRED_VIEWS).length) throw new Error("PIM PostgreSQL schema audit self-test failed");
}

function main() {
  const json = process.argv.includes("--json");
  if (process.argv.includes("--self-test")) {
    selfTest();
    console.log("PIM PostgreSQL schema audit self-test passed");
    return;
  }
  const report = auditPimPostgresSchema();
  if (json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`PIM PostgreSQL schema audit ${report.ok ? "passed" : "failed"}: ${report.tables.length} tables, ${report.views.length} views`);
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

export { auditPimPostgresSchema };
