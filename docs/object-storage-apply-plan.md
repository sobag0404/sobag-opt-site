# Object Storage Apply Plan

Last updated: 2026-06-10

Use this only after `local-import-output/object-storage-env-packet.json` contains confirmed provider facts and passes strict audit.

Build a local dry-run provider/cutover plan:

```powershell
npm.cmd run plan:object-storage -- --packet local-import-output/object-storage-env-packet.json
```

Output:

```text
local-import-output/object-storage-apply-plan.json
```

The command does not call production APIs, does not read env secrets, and does not change VPS/Vercel env. It writes only env names, public provider config preview, guardrails, and the next commands for a safe photo-storage cutover.

For S3-compatible VPS/MinIO/R2 it plans:

- `SOBAG_OBJECT_STORAGE_PROVIDER`
- `SOBAG_S3_ENDPOINT`
- `SOBAG_S3_BUCKET`
- `SOBAG_S3_REGION`
- `SOBAG_S3_PUBLIC_BASE_URL`
- `SOBAG_S3_FORCE_PATH_STYLE`
- secret env names only: `SOBAG_S3_ACCESS_KEY_ID`, `SOBAG_S3_SECRET_ACCESS_KEY`, optional `SOBAG_S3_SESSION_TOKEN`

For Vercel Blob it plans `SOBAG_OBJECT_STORAGE_PROVIDER` and the secret env name `BLOB_READ_WRITE_TOKEN` only.

After provider env is explicitly approved and configured:

```powershell
npm.cmd run audit:object-storage-packet -- --strict
npm.cmd run plan:photos -- --products data/products.import.json --photos <confirmed-photo-folder> --provider s3-compatible --responsive --limit-products 20
npm.cmd run audit:photo-manifest -- --manifest local-import-output/photo-migration-manifest.json --strict-responsive
npm.cmd run smoke:photo-pilot
npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online --require-object-storage
```
