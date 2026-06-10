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

  [
    "references products (id) on delete restrict",
    "references images (id) on delete cascade",
    "references taxonomies (id) on delete restrict",
    "check (status in ('draft', 'published', 'hidden', 'archive'))",
    "check (type in ('category', 'collection', 'holiday', 'tag'))",
    "check (format in ('webp', 'avif', 'jpg', 'png'))",
  ].forEach((fragment) => {
    if (!sql.includes(fragment)) errors.push(`missing constraint: ${fragment}`);
  });

  ["products_status_idx", "variants_product_id_idx", "images_product_id_idx", "taxonomies_type_idx", "product_taxonomies_product_id_idx", "import_batches_status_idx"].forEach((indexName) => {
    if (!sql.includes(`create index if not exists ${indexName}`)) warnings.push(`missing optional index: ${indexName}`);
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    tables: Object.keys(REQUIRED_TABLES),
    contractVersion: 1,
  };
}

function selfTest() {
  const report = auditPimPostgresSchema();
  if (!report.ok || report.tables.length !== Object.keys(REQUIRED_TABLES).length) throw new Error("PIM PostgreSQL schema audit self-test failed");
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
    console.log(`PIM PostgreSQL schema audit ${report.ok ? "passed" : "failed"}: ${report.tables.length} tables`);
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
