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

`/api/health` reports the active store family as safe metadata:

```json
{"store":{"provider":"file","configured":true}}
```

It does not expose filesystem paths or secrets.

Before deploys, imports, or manual maintenance, create a file-store backup:

```bash
npm run backup:store -- --source /var/lib/sobag-opt/store --dest /var/backups/sobag-opt
```

Restore only during a maintenance window and only to the intended store directory:

```bash
npm run backup:store -- --restore /var/backups/sobag-opt/store-YYYYMMDDTHHMMSSZ --target /var/lib/sobag-opt/store --force
```

The backup tool copies only file-store JSON records and writes a `manifest.json`; it does not print record contents or secret values. Use `npm run backup:store:self-test` for the offline backup/restore fixture covered by AutoFix. Local `sobag-store-backups/` output is ignored by Git.

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

## Runtime

After configuring the environment above, the VPS entrypoint is:

```bash
npm ci
npm run preflight:vps

SOBAG_STORE_PROVIDER=file \
SOBAG_FILE_STORE_DIR=/var/lib/sobag-opt/store \
PORT=3000 \
HOST=127.0.0.1 \
npm run start:vps
```

`server.mjs` serves the static site with clean URLs and dispatches the existing `/api/*` handlers. It is covered by:

```bash
npm run smoke:vps
npm run smoke:vps:write
```

`preflight:vps` checks Node 20+, `server.mjs`, file-store provider/env/writability, bootstrap admin env, and S3-compatible object-storage readiness. It writes and deletes only its own `.sobag-preflight-*.tmp` probe file in the configured file-store directory. It prints only safe status/check names and never prints secret values. Use `npm run preflight:vps:self-test` for the offline fixture check covered by AutoFix.

`smoke:vps` checks read-only public/runtime routes. `smoke:vps:write` uses a temporary file-store directory and fake smoke credentials to verify admin login/content save, buyer registration/session, order creation, buyer comments, admin order updates, and internal-note filtering.

Put Nginx/Caddy in front of the Node process for TLS, compression, request size limits, and access logs. Keep the app process behind localhost unless a separate firewall policy is configured.
