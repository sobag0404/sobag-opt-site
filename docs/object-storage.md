# Object Storage For Product Photos

Last updated: 2026-06-04

## Goal

Product photos should move out of Git into object storage. The catalog must not depend directly on one provider, so product code talks to `api/_lib/object-storage.js` through a small adapter interface.

Current provider:

- `SOBAG_OBJECT_STORAGE_PROVIDER=vercel-blob` by default.
- Vercel Blob SDK package: `@vercel/blob`.
- Runtime requirement: Node.js 20+.
- Required secret in deployment env: `BLOB_READ_WRITE_TOKEN`.
- Do not commit `.env`, tokens, raw photo folders, or generated bulk image output.

Future provider:

- `SOBAG_OBJECT_STORAGE_PROVIDER=s3-compatible` is reserved for VPS/S3/MinIO/R2 style storage.
- The placeholder exists now so the catalog payload shape can stay stable during a future migration.

## Adapter Interface

`createObjectStorageAdapter()` returns an object with:

- `upload({ productKey, fileName, body, mime, width, height })`
- `getPublicUrl(image)`
- `deleteOrMarkUnused(image, { mode })`
- `listByProduct(productKey)`

The first implementation stores public product images in Vercel Blob under:

```text
products/<safe-product-key>/<timestamp>-<random>-<file-name>
```

## Admin API

`/api/admin/product-images` is restricted to `admin` and `content`.

- `GET ?product=<baseSku>` lists stored images for a product prefix.
- `POST { action: "upload", productKey, fileName, mime, dataUrl | base64, width, height }` uploads one image and returns metadata.
- `POST { action: "mark-unused", image }` returns a metadata object marked unused.
- `DELETE { image }` or `DELETE ?url=...` deletes through the adapter.

The JSON upload endpoint is meant for small/admin uploads and previews. Large bulk photo migration should use a dedicated importer or direct Blob/S3 tooling, then write returned metadata into products.

## Admin Import Photo Flow

`admin-import.html` has a photo workspace for the current product import preview:

- choose image files or a folder;
- preview matches files to products by `baseSku`, `photoFolder`, or product id;
- report statuses: `ready`, `missing`, `repeated`, `uploaded`, `failed`;
- CSV report export is available before/after upload;
- successful uploads call `/api/admin/product-images`;
- uploaded image metadata is merged into product `images`;
- the page creates a refreshed preview batch with the new metadata so `Применить` writes Blob/S3 metadata into the catalog.

This flow is for controlled admin uploads. Very large catalogs should use the bulk CLI path below.

## Bulk CLI Upload

`tools/bulk-upload-product-photos.mjs` uploads local product photo folders directly through the object-storage adapter. It does not send image bytes through `/api/admin/product-images`, so it avoids JSON body limits.

Dry-run first:

```powershell
node tools/bulk-upload-product-photos.mjs --products data/products.import.json --photos "C:\Path\Photos" --dry-run
```

Real upload to Vercel Blob requires `BLOB_READ_WRITE_TOKEN` in the local environment, not in Git or docs:

```powershell
node tools/bulk-upload-product-photos.mjs --products data/products.import.json --photos "C:\Path\Photos" --out local-import-output\products-with-object-images.json --report local-import-output\bulk-photo-upload-report.csv
```

Useful options:

- `--replace-existing-images` replaces existing image metadata/gallery for products uploaded in this run.
- `--responsive` generates responsive WebP/AVIF variants before upload. Real generation requires optional `sharp` installed locally; dry-run can still plan variants without it.
- `--variant-widths 480,960,1200` controls responsive widths.
- `--variant-formats webp,avif` controls responsive formats.
- `--variant-quality 82` controls generated variant quality.
- `--limit <number>` caps processed image files for a small pilot run.
- `--retries <number>` controls per-file upload retries.
- `--provider vercel-blob` is the current provider; `s3-compatible` remains reserved for the future VPS/MinIO/R2 implementation.

The CLI writes:

- CSV report with `ready/ready_variant/uploaded/uploaded_variant/skipped/missing/failed/failed_variant`;
- products JSON with `images` metadata and updated legacy `image`/`gallery` fields for successful uploads.

`npm run check` runs a dry-run fixture test for this CLI, including responsive variant planning, so the matching/report path stays covered without needing a real Blob token.

## Product Image Metadata

Products may keep the legacy public fields:

- `image`: main public URL/path.
- `gallery`: public URL/path list.

New durable metadata lives in `images`:

```json
[
  {
    "url": "https://example.public.blob.vercel-storage.com/products/opt-123/1.webp",
    "storageKey": "products/opt-123/1.webp",
    "provider": "vercel-blob",
    "width": 1200,
    "height": 1200,
    "mime": "image/webp",
    "uploadedAt": "2026-06-04T00:00:00.000Z",
    "variants": [
      {
        "url": "https://example.public.blob.vercel-storage.com/products/opt-123/1-480w.webp",
        "storageKey": "products/opt-123/1-480w.webp",
        "provider": "vercel-blob",
        "width": 480,
        "height": 480,
        "mime": "image/webp",
        "format": "webp",
        "label": "480w-webp"
      }
    ]
  }
]
```

The frontend still renders `image` and `gallery`; normalized products also merge URLs from `images` into the gallery so old and new catalogs remain compatible. Product cards, product modal main images, gallery thumbnails, and admin product cards use WebP variants as `srcset` when metadata is present. AVIF metadata is preserved for a later `<picture>`/format-selection pass.

## Git Hygiene

These local/bulk folders stay ignored:

- `local-import-output/`
- `local-photo-import/`
- `raw-product-photos/`
- `bulk-product-photos/`
- `assets/imported-products/`
- `assets/raw-product-photos/`
- `assets/bulk-product-photos/`
