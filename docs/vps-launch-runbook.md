# VPS Launch Runbook

Last updated: 2026-06-15

Goal: run Sobag Opt on the VPS without changing production data, secrets, cache, or user data outside an approved deploy/cutover step.

## Boundaries

- Do not commit `.env`, tokens, passwords, cookies, SSH keys, DB dumps, raw photos, or local import output.
- Do not change production env/cache/user data without explicit approval.
- Deploy target is VPS only. Vercel is not an active deploy/runtime/fallback target.
- Rollback path is the previous VPS release plus documented Nginx exact-route backups.

## Before VPS Deploy

Run locally:

```bash
git status --short --branch
npm.cmd run check
npm.cmd run ui:smoke
npm.cmd run audit:vps-release
npm.cmd run audit:vps-rust-cutover-packet
```

Fill the no-secret VPS/Rust input packet locally before any cutover planning: `docs/vps-rust-cutover-input-packet.md`.

If a local file-store needs transfer, back it up first:

```bash
npm.cmd run backup:store -- --source .sobag-store --dest sobag-store-backups
```

`sobag-store-backups/` is ignored by Git.

## VPS Environment

Store env values only on the target server or CI secret store:

```bash
SOBAG_STORE_PROVIDER=file
SOBAG_FILE_STORE_DIR=/var/lib/sobag-opt/store
SOBAG_ADMIN_EMAIL=<set-on-server>
SOBAG_ADMIN_PASSWORD=<set-on-server>
SOBAG_OBJECT_STORAGE_PROVIDER=s3-compatible
SOBAG_S3_ENDPOINT=<set-on-server>
SOBAG_S3_BUCKET=<set-on-server>
SOBAG_S3_REGION=<set-on-server>
SOBAG_S3_ACCESS_KEY_ID=<set-on-server>
SOBAG_S3_SECRET_ACCESS_KEY=<set-on-server>
SOBAG_S3_PUBLIC_BASE_URL=<set-on-server>
PORT=3000
HOST=127.0.0.1
```

`SOBAG_STORE_PROVIDER=file` is the pragmatic VPS-local app data path for the first runtime cutover. Product photo/media migration still uses the S3-compatible object-storage adapter unless a separate filesystem media provider is implemented and audited.

## Local VPS Runtime Checks

```bash
npm run preflight:vps
npm run smoke:vps
npm run smoke:vps:write
```

`preflight:vps` prints safe status only and never prints secret values.

## Start Runtime

```bash
npm run start:vps
```

In production, run behind Nginx/Caddy/systemd/PM2:

- Node listens on `127.0.0.1:3000`.
- Rust service listens on `127.0.0.1:3001`.
- Reverse proxy owns TLS, compression, request limits, access logs, and exact Rust cutover routes.
- `/api/health` must report `ok=true` and safe store/object-storage status.

## Production Smoke

Before and after cutover:

```bash
npm.cmd run smoke:prod -- --base-url https://sobag-shop.online
npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online
```

For photo storage or catalog DB strict gates, add the strict flags only after separate approval:

```bash
npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online --require-object-storage
npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online --require-catalog-db
```

## Rollback

If a critical issue appears:

1. Restore the previous VPS release or the relevant Nginx exact-route backup.
2. Do not change production data in panic mode.
3. Collect reverse proxy/app logs without secrets.
4. Restore file-store backup only during a maintenance window and only to the intended directory:

```bash
npm run backup:store -- --restore /var/backups/sobag-opt/store-YYYYMMDDTHHMMSSZ --target /var/lib/sobag-opt/store --force
```

5. Rerun `npm run smoke:vps` and `npm run smoke:vps:write`.

## Photo And Catalog

Before migrated image publication:

```bash
node tools/image-metadata-audit.mjs --products local-import-output/products-with-object-images.json --published-only --require-metadata --require-responsive --require-square
```

Raw/bulk photos and `local-import-output/` must stay out of Git.

## Rust Verification

VPS/Linux Rust gate:

```bash
cd rust-server
cargo fmt --check
cargo check --locked
cargo test --locked
```

Then run the relevant Rust smoke/cutover scripts from `package.json` before switching any exact public route. Local Windows Rust build can be blocked by missing MSVC `link.exe`; treat that as an environment blocker until the toolchain is installed.
