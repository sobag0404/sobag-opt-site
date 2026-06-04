# Normalized PIM Payload

Last updated: 2026-06-04

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
    "importBatches": [],
    "counts": {}
  }
}
```

The public `/api/catalog` response strips `pim` and returns only the current public catalog fields with published products.

Admin `/api/admin/catalog` can read the sidecar for diagnostics and future PIM tools.

## Included Records

- `products`: one normalized record per catalog product, including `id`, `baseSku`, `name`, publication status, taxonomy arrays, base price, stock, image count, and variant count.
- `variants`: generated variant records from `types * sizes * materials`, using the same SKU pattern as the frontend.
- `images`: metadata records from `images`, `image`, and `gallery`, including object storage fields and responsive `variants` when present.
- `taxonomies`: category, collection, holiday, and tag indexes with product counts.
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
