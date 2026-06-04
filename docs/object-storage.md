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
    "uploadedAt": "2026-06-04T00:00:00.000Z"
  }
]
```

The frontend still renders `image` and `gallery`; normalized products also merge URLs from `images` into the gallery so old and new catalogs remain compatible.

## Git Hygiene

These local/bulk folders stay ignored:

- `local-import-output/`
- `local-photo-import/`
- `raw-product-photos/`
- `bulk-product-photos/`
- `assets/imported-products/`
- `assets/raw-product-photos/`
- `assets/bulk-product-photos/`
