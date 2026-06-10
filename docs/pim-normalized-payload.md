# Normalized PIM Payload

Last updated: 2026-06-09

## Goal

Import/PIM 2.0 keeps the current catalog shape compatible with the public site while preparing a normalized product model for a later database move.

The first implementation is a sidecar payload stored next to the existing `products` array. It does not replace the current catalog yet.

## Storage Shape

`saveCatalog(products, updatedBy, options)` writes:

```json
{
  "products": [],
  "updatedAt": "2026-06-04T00:00:00.000Z",
  "updatedBy": "content@example.test",
  "version": 1,
  "pim": {
    "version": 1,
    "generatedAt": "2026-06-04T00:00:00.000Z",
    "source": "catalog-save",
    "products": [],
    "variants": [],
    "images": [],
    "taxonomies": {
      "categories": [],
      "collections": [],
      "holidays": [],
      "tags": []
    },
    "taxonomyAssignments": [],
    "importBatches": [],
    "counts": {}
  }
}
```

The public `/api/catalog` response strips `pim` and returns only the current public catalog fields with published products.

Admin `/api/admin/catalog` can read the sidecar for diagnostics and future PIM tools.

## Admin Diagnostics And Export

`GET /api/admin/pim` is a read-only diagnostics endpoint for `admin` and `content` roles.

JSON views:

- `view=summary` default: counts, diagnostics, and small samples.
- `view=full`: full sidecar for admin inspection.
- `view=products`
- `view=variants`
- `view=images`
- `view=taxonomies`
- `view=import-batches`

CSV exports:

- `GET /api/admin/pim?format=csv` exports products by default.
- `GET /api/admin/pim?view=variants&format=csv`
- `GET /api/admin/pim?view=images&format=csv`
- `GET /api/admin/pim?view=taxonomies&format=csv`
- `GET /api/admin/pim?view=import-batches&format=csv`

CSV exports flatten counts and use `; ` inside multi-value cells such as categories, collections, holidays, and tags.

Diagnostics compare stored sidecar counts with a freshly rebuilt PIM view and report mismatches without writing to storage.

## Included Records

- `products`: one normalized record per catalog product, including `id`, `baseSku`, `name`, publication status, taxonomy arrays, base price, stock, image count, and variant count.
- `variants`: generated variant records from `types * sizes * materials`, using the same SKU pattern as the frontend.
- `images`: metadata records from `images`, `image`, and `gallery`, including object storage fields and responsive `variants` when present.
- `taxonomies`: category, collection, holiday, and tag indexes with product counts.
- `taxonomyAssignments`: one row per product-taxonomy link. This is the bridge table for the future DB split, equivalent to `product_taxonomies` in PostgreSQL.
- `importBatches`: safe import batch summaries only. Large `products`, row reports, and rollback `snapshot` payloads are not copied into the PIM sidecar.

## Import Batch Sync

Import preview/reject still writes only the import-batches storage key.

Import apply and rollback rebuild the catalog sidecar with the updated batch metadata:

- `source: import-batch-apply`
- `source: import-batch-rollback`

The import-batches storage key also stores a small `pim.importBatches` summary for future admin tooling.

## Future Move To Separate DB

The sidecar makes the target model explicit before a bigger migration:

- products table/collection;
- variants table/collection keyed by SKU;
- images table/collection keyed by storage key;
- taxonomy tables/collections;
- import batch metadata and report rows.

Until that migration, the site should keep reading the existing public `/api/catalog` shape.

The PostgreSQL contract draft lives in `docs/pim-postgres-schema.sql`. It is not applied by the current runtime; it is a reviewed target schema for the later DB split. It covers:

- `products`
- `variants`
- `images`
- `image_variants`
- `taxonomies`
- `product_taxonomies`
- `import_batches`

Check the schema contract without touching production data:

```bash
npm run audit:pim-schema
```

## Offline Normalized Export

For DB/storage split preparation, use the offline exporter:

```bash
npm run export:pim -- --products data/products-live.json --out local-import-output/pim-normalized
```

The export writes ignored local JSONL files:

- `products.jsonl`
- `variants.jsonl`
- `images.jsonl`
- `taxonomies.jsonl`
- `taxonomy-assignments.jsonl`
- `import-batches.jsonl`
- `manifest.json`

The exporter reads only the supplied products JSON and does not touch production storage. Use `--dry-run` to validate table shape without writing files. AutoFix runs both the current catalog dry-run and a temporary self-test fixture.

## PostgreSQL Seed Export

For a future staging PostgreSQL rehearsal, generate an ignored SQL seed file from the same normalized PIM bridge:

```bash
npm run export:pim:postgres -- --products data/products-live.json --out local-import-output/pim-postgres-seed.sql
```

The seed file targets `docs/pim-postgres-schema.sql` and writes upsert statements for:

- `products`
- `variants`
- `images`
- `image_variants`
- `taxonomies`
- `product_taxonomies`
- `import_batches`

This command is offline: it reads the supplied products JSON, writes only under `local-import-output` by default, does not connect to PostgreSQL, does not apply schema changes, and does not touch production data. Use `--dry-run` to validate the current catalog seed shape without writing SQL. Review generated SQL before applying it to any database. AutoFix runs the current catalog dry-run plus a temporary self-test fixture.

## DB Contract Audit

Use the DB contract audit before any real database split:

```bash
npm run audit:pim-db
```

It validates the current normalized bridge against the future tables:

- `products`
- `variants`
- `images`
- `taxonomies`
- `product_taxonomies`
- `import_batches`

The audit checks stable IDs, unique `baseSku` and variant SKU, allowed product statuses, product references from variants/images, taxonomy references from product-taxonomy links, positive prices, and hidden/status consistency. It is read-only and does not touch production storage.
