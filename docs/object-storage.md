# Object Storage For Product Photos

Last updated: 2026-06-09

## Goal

Product photos should move out of Git into object storage. The catalog must not depend directly on one provider, so product code talks to `api/_lib/object-storage.js` through a small adapter interface.

Current providers:

- `SOBAG_OBJECT_STORAGE_PROVIDER=vercel-blob` by default.
- Vercel Blob SDK package: `@vercel/blob`.
- Runtime requirement: Node.js 20+.
- Required secret in deployment env: `BLOB_READ_WRITE_TOKEN`.
- `SOBAG_OBJECT_STORAGE_PROVIDER=s3-compatible` for VPS/S3/MinIO/R2 style storage.
- Do not commit `.env`, tokens, raw photo folders, or generated bulk image output.

S3-compatible env names:

- `SOBAG_S3_ENDPOINT`: S3 API endpoint, for example a MinIO endpoint or Cloudflare R2 account endpoint.
- `SOBAG_S3_BUCKET`: bucket name.
- `SOBAG_S3_REGION`: signing region. Default is `auto`; use `us-east-1` or the provider region when required.
- `SOBAG_S3_ACCESS_KEY_ID`: access key id.
- `SOBAG_S3_SECRET_ACCESS_KEY`: secret access key.
- `SOBAG_S3_SESSION_TOKEN`: optional temporary credentials token.
- `SOBAG_S3_PUBLIC_BASE_URL`: optional public/CDN base URL used to render product images.
- `SOBAG_S3_FORCE_PATH_STYLE`: optional boolean. Default `true`, which matches MinIO and R2-style endpoints.

The S3-compatible adapter uses AWS Signature Version 4 directly through Node's `fetch`, so no AWS SDK dependency is required. It supports upload, list by product prefix, hard delete, and mark-unused. Public images still require a bucket policy, public custom domain, or CDN mapping configured outside the repository.

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
- `--provider vercel-blob` uploads to Vercel Blob.
- `--provider s3-compatible` uploads to the configured S3-compatible endpoint.

The CLI writes:

- CSV report with `ready/ready_variant/uploaded/uploaded_variant/skipped/missing/failed/failed_variant`;
- products JSON with `images` metadata and updated legacy `image`/`gallery` fields for successful uploads.

`npm run check` runs a dry-run fixture test for this CLI, including responsive variant planning, so the matching/report path stays covered without needing a real Blob token.

## Photo Migration Manifest

Before any real upload, build a local manifest that matches product rows to local photo folders and plans object-storage keys plus optional responsive variants. This command does not upload, delete, read secrets, or change product data.

```powershell
npm.cmd run plan:photos -- --products data/products.import.json --photos "C:\Path\Photos" --provider s3-compatible --responsive
```

Default output:

```text
local-import-output/photo-migration-manifest.json
```

Use `--limit-products 20` for a small pilot manifest. Use `--json` when another script should consume the manifest from stdout instead of writing a file. The manifest records matched/missing products, source file names, planned provider, planned storage prefixes, and planned WebP/AVIF variant file names; raw photo folders and generated outputs stay ignored by Git.

Audit the manifest before any real upload:

```powershell
npm.cmd run audit:photo-manifest -- --manifest local-import-output/photo-migration-manifest.json --strict
```

The manifest audit checks counts, provider label, portable relative paths, `products/` storage prefixes, image extensions, and WebP/AVIF variant planning. It does not upload, delete, read env secrets, or mutate product data.

Use `npm run audit:images` after preparing or migrating product images. The audit checks image metadata shape, providers, dimensions, responsive WebP/AVIF variant records, and duplicate image keys. For the real migrated catalog, run the stricter mode:

```bash
node tools/image-metadata-audit.mjs --products local-import-output/products-with-object-images.json --published-only --require-metadata --require-responsive --require-square
```

Use `npm run audit:photo-migration` before any real photo migration or VPS publication. It is an offline readiness report: it does not upload, delete, read secrets, or print env values. It checks provider status as safe booleans, raw/bulk photo ignore rules, current image metadata coverage, square dimensions, and WebP/AVIF variant readiness.

For a migrated catalog candidate, run:

```bash
node tools/photo-migration-readiness.mjs --products local-import-output/products-with-object-images.json --strict
```

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

The frontend still renders `image` and `gallery`; normalized products also merge URLs from `images` into the gallery so old and new catalogs remain compatible. Product cards, product modal main images, gallery thumbnails, and admin product cards use AVIF/WebP variants through `<picture>` when metadata is present.

## Git Hygiene

These local/bulk folders stay ignored:

- `local-import-output/`
- `local-photo-import/`
- `raw-product-photos/`
- `bulk-product-photos/`
- `assets/imported-products/`
- `assets/raw-product-photos/`
- `assets/bulk-product-photos/`
