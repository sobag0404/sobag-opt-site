# VPS Migration Notes

Last updated: 2026-06-09

These notes prepare the VPS path without changing production data or Vercel fallback behavior.

## Storage

Default Vercel/fallback storage remains Redis/KV via:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- or `KV_REST_API_URL` / `KV_REST_API_TOKEN`

For VPS, API data can use the filesystem provider:

```bash
SOBAG_STORE_PROVIDER=file
SOBAG_FILE_STORE_DIR=/var/lib/sobag-opt/store
```

The Node process must own this directory. Back up the directory before deploys and before catalog/import operations.

Stored data includes:

- shared users and sessions;
- orders, saved carts, favorites, reviews;
- editable content;
- catalog payload with PIM sidecar;
- import batch previews/snapshots.

## Object Storage

For product photos on VPS/MinIO/R2, keep using the object-storage adapter:

```bash
SOBAG_OBJECT_STORAGE_PROVIDER=s3-compatible
SOBAG_S3_ENDPOINT=...
SOBAG_S3_BUCKET=...
SOBAG_S3_REGION=...
SOBAG_S3_ACCESS_KEY_ID=...
SOBAG_S3_SECRET_ACCESS_KEY=...
SOBAG_S3_PUBLIC_BASE_URL=...
```

Do not commit these values.

## Fallback

Keep Vercel configured with Redis/KV and Vercel Blob/S3 env as a fallback path. Do not switch Vercel to the file provider.
