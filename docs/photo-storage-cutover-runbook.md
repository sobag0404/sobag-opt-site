# Photo Storage Cutover Runbook

Last updated: 2026-06-15

Goal: safely move real product photos to S3-compatible object storage without touching production data/env/cache unless separately approved.

## Boundaries

- Do not commit `.env`, tokens, cookies, SSH keys, raw/bulk photos, `local-import-output/`, or generated image output.
- Do not change production object-storage env or catalog source without explicit approval.
- Current public APIs must stay compatible: `/api/catalog`, `/api/catalog-query`, `/api/catalog-detail`.
- Public catalog must keep published-only products.
- Existing products must not be deleted by photo migration.

## Provider

Active provider:

```text
SOBAG_OBJECT_STORAGE_PROVIDER=s3-compatible
SOBAG_S3_ENDPOINT=<set-on-server>
SOBAG_S3_BUCKET=<set-on-server>
SOBAG_S3_REGION=<set-on-server>
SOBAG_S3_ACCESS_KEY_ID=<set-on-server>
SOBAG_S3_SECRET_ACCESS_KEY=<set-on-server>
SOBAG_S3_PUBLIC_BASE_URL=<set-on-server>
```

Env values are configured only on the target VPS/server secret store, never in Git.

## Local Plan

```powershell
npm.cmd run plan:photos -- --products data/products.import.json --photos "C:\Path\Photos" --provider s3-compatible --responsive
npm.cmd run audit:photo-manifest -- --manifest local-import-output/photo-migration-manifest.json --strict
npm.cmd run smoke:photo-pilot
```

## Pilot Upload

```powershell
npm.cmd run upload:photos -- --products data/products.import.json --photos "C:\Path\Photos" --out local-import-output/products-with-object-images.json --report local-import-output/bulk-photo-upload-report.csv --provider s3-compatible --responsive --limit 20
npm.cmd run audit:photo-candidate -- --current data/products-live.json --candidate local-import-output/products-with-object-images.json --require-responsive
node tools/image-metadata-audit.mjs --products local-import-output/products-with-object-images.json --published-only --require-metadata --require-responsive --require-square
```

## Production Readiness

```powershell
npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online
npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online --require-object-storage
```

## Apply Rules

- Apply only a reviewed candidate products JSON/import batch.
- Keep a backup/export of the current catalog before apply.
- Keep `image`, `gallery`, and `images[]` compatible until the frontend no longer needs legacy fields.
- Image metadata must include `url`, `storageKey`, `provider`, `width`, `height`, `mime`, `uploadedAt`, and WebP/AVIF `variants`.
- Product/category/collection/holiday previews must stay square 1:1.

## Production Apply

The 2026-06-15 VPS cutover used `assets/product-preview-live` as the source, uploaded through the S3-compatible adapter, copied the generated candidate JSON back to `data/products-live.json`, and applied image metadata to PostgreSQL with:

```bash
node tools/catalog-db-photo-apply.mjs --candidate /tmp/sobag-products-with-object-images.json --backup-out /tmp/sobag-catalog-db-photo-backup.json --execute
```

The apply script backs up product/image rows, deletes stale image rows for candidate products, upserts product/image metadata, and commits only after candidate and image metadata audits pass. It prints counts only; database credentials must come from VPS env/secret files and must not be logged.

## Rollback

1. Stop applying further batches.
2. Restore the previous catalog backup/import batch.
3. Do not delete object-storage files immediately.
4. Run:

```powershell
npm.cmd run check
npm.cmd run ui:smoke
npm.cmd run smoke:prod -- --base-url https://sobag-shop.online
```
