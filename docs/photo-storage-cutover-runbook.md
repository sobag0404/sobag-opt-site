# Photo Storage Cutover Runbook

Last updated: 2026-06-10

Цель: безопасно перевести реальные фото товаров в object storage, не трогая production data/env/cache без отдельного подтверждения и не добавляя raw/bulk фото в Git.

## Границы

- Не коммитить `.env`, токены, cookies, SSH-ключи, raw/bulk фото, `local-import-output/` и generated image output.
- Не включать production object-storage env и не менять catalog source без отдельного подтверждения.
- Current public catalog API must stay compatible: `/api/catalog`, `/api/catalog-query`, `/api/catalog-detail`.
- Public catalog must keep published-only products.
- Existing products must not be deleted by photo migration.
- Existing products may be updated only through an explicit import/apply mode.

## Provider

Текущий default provider:

```text
SOBAG_OBJECT_STORAGE_PROVIDER=vercel-blob
```

Будущий VPS/MinIO/R2 provider:

```text
SOBAG_OBJECT_STORAGE_PROVIDER=s3-compatible
SOBAG_S3_ENDPOINT=<set-on-server>
SOBAG_S3_BUCKET=<set-on-server>
SOBAG_S3_REGION=<set-on-server>
SOBAG_S3_ACCESS_KEY_ID=<set-on-server>
SOBAG_S3_SECRET_ACCESS_KEY=<set-on-server>
SOBAG_S3_PUBLIC_BASE_URL=<set-on-server>
```

Env values are configured only on the target server/provider panel, never in Git.

## Local Plan

Build a manifest from the real photo folder:

```powershell
npm.cmd run plan:photos -- --products data/products.import.json --photos "C:\Path\Photos" --provider s3-compatible --responsive
```

Audit the manifest before any upload:

```powershell
npm.cmd run audit:photo-manifest -- --manifest local-import-output/photo-migration-manifest.json --strict
```

Run the offline pilot:

```powershell
npm.cmd run smoke:photo-pilot
```

## Pilot Upload

For a small confirmed set only:

```powershell
npm.cmd run upload:photos -- --products data/products.import.json --photos "C:\Path\Photos" --out local-import-output/products-with-object-images.json --report local-import-output/bulk-photo-upload-report.csv --provider s3-compatible --responsive --limit 20
```

Then audit the candidate:

```powershell
npm.cmd run audit:photo-candidate -- --current data/products-live.json --candidate local-import-output/products-with-object-images.json --require-responsive
```

For final publication, require complete square responsive metadata:

```powershell
node tools/image-metadata-audit.mjs --products local-import-output/products-with-object-images.json --published-only --require-metadata --require-responsive --require-square
```

## Production Readiness

Read-only production check:

```powershell
npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online
```

Cutover gate after provider env is approved/configured:

```powershell
npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online --require-object-storage
```

## Apply Rules

- Apply only a reviewed candidate products JSON/import batch.
- Keep a backup/export of the current catalog before apply.
- Do not delete products during photo migration.
- Keep `image`, `gallery`, and `images[]` compatible until the frontend no longer needs legacy fields.
- Image metadata must include `url`, `storageKey`, `provider`, `width`, `height`, `mime`, `uploadedAt`, and WebP/AVIF `variants`.
- Product/category/collection/holiday previews must stay square 1:1.

## Rollback

If the migrated candidate is bad:

1. Stop applying further batches.
2. Restore the previous catalog backup/import batch.
3. Do not delete object-storage files immediately.
4. Re-run:

```powershell
npm.cmd run check
npm.cmd run ui:smoke
npm.cmd run smoke:prod -- --base-url https://sobag-shop.online
```

5. Keep the failed manifest/report under ignored `local-import-output/` for analysis.
