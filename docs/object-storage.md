# Object Storage For Product Photos

Last updated: 2026-06-15

## Goal

Product photos should live outside Git in S3-compatible object storage for the VPS target. Vercel Blob is not an active provider and `vercel-blob` is not accepted as a runtime provider alias.

This is separate from the VPS app data store. The first Rust/runtime cutover can keep app/session/order data on the VPS-local file store (`SOBAG_STORE_PROVIDER=file`, `SOBAG_FILE_STORE_DIR=...`) while product photo migration stays on the existing S3-compatible adapter. A VPS-local filesystem provider for product photos would be a new adapter and must not be assumed by docs alone.

## Active Provider

- `SOBAG_OBJECT_STORAGE_PROVIDER=s3-compatible`
- Supported targets: MinIO, Cloudflare R2, AWS S3-compatible endpoints.
- Runtime requirement: Node.js 20+.
- No AWS SDK dependency is required; the adapter signs S3 requests with AWS Signature Version 4 via Node `fetch`.

Required env names, values only on the target server/CI secret store:

- `SOBAG_S3_ENDPOINT`
- `SOBAG_S3_BUCKET`
- `SOBAG_S3_REGION`
- `SOBAG_S3_ACCESS_KEY_ID`
- `SOBAG_S3_SECRET_ACCESS_KEY`
- `SOBAG_S3_SESSION_TOKEN` optional
- `SOBAG_S3_PUBLIC_BASE_URL`
- `SOBAG_S3_FORCE_PATH_STYLE` optional, default `true`

Do not commit `.env`, tokens, raw photo folders, or generated bulk image output.

## Adapter Interface

`createObjectStorageAdapter()` returns:

- `upload({ productKey, fileName, body, mime, width, height })`
- `getPublicUrl(image)`
- `deleteOrMarkUnused(image, { mode })`
- `listByProduct(productKey)`

Stored keys use:

```text
products/<safe-product-key>/<timestamp>-<random>-<file-name>
```

## Checks

```powershell
npm.cmd run audit:object-storage-packet -- --packet local-import-output/object-storage-env-packet.json --strict
npm.cmd run plan:photos -- --products data/products.import.json --photos "C:\Path\Photos" --provider s3-compatible --responsive
npm.cmd run audit:photo-manifest -- --manifest local-import-output/photo-migration-manifest.json --strict
npm.cmd run audit:photo-migration
npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online --require-object-storage
```

## Product Image Metadata

Products may keep legacy public fields `image` and `gallery`. Durable metadata lives in `images[]`:

```json
[
  {
    "url": "https://cdn.example.test/products/opt-123/1.webp",
    "storageKey": "products/opt-123/1.webp",
    "provider": "s3-compatible",
    "width": 1200,
    "height": 1200,
    "mime": "image/webp",
    "uploadedAt": "2026-06-15T00:00:00.000Z",
    "variants": [
      {
        "url": "https://cdn.example.test/products/opt-123/1-480w.webp",
        "storageKey": "products/opt-123/1-480w.webp",
        "provider": "s3-compatible",
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

Frontend rendering remains compatible with `image`/`gallery` while using AVIF/WebP variants from `images[]` when present.

## Git Hygiene

Ignored local/bulk folders:

- `local-import-output/`
- `local-photo-import/`
- `raw-product-photos/`
- `bulk-product-photos/`
- `assets/imported-products/`
- `assets/raw-product-photos/`
- `assets/bulk-product-photos/`
