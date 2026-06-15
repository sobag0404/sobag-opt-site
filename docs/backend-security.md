# Backend and Security Setup

This project now uses the VPS Node API layer for accounts, roles, sessions, orders, the shared product catalog, and shared editable page content.
`server.mjs` serves the static files and dispatches `/api/*` through `api-router.js` and `server-routes/`.

## What Moved Server-Side

- Registration and login can use `/api/auth/register` and `/api/auth/login`.
- Passwords are hashed server-side with PBKDF2.
- Sessions are stored in Redis and sent to the browser as an HttpOnly cookie.
- Orders can be saved through `/api/orders`.
- Admins/managers can read orders through `/api/admin/orders`.
- Admins can assign the `manager` role through `/api/admin/users`.
- Visitors read the product catalog through `/api/catalog`; if server storage has no catalog yet, it falls back to `data/products-live.json`.
- Admins save product and variant-price changes through `/api/admin/catalog`.
- Visitors read editable page content through `/api/content`; if server storage has no content yet, the frontend uses bundled defaults.
- Admins save site text, images, and "Актуально" settings through `/api/admin/content`.

The old `localStorage` flow still exists as a prototype fallback so the site remains usable until production storage is connected or an admin is not signed into a server session.

## Required Environment Variables

Create an Upstash Redis database or compatible Redis storage, then add these variables to the active VPS/runtime environment:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

or compatible aliases:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Bootstrap admin is created automatically when these are present:

- `SOBAG_ADMIN_EMAIL`
- `SOBAG_ADMIN_PASSWORD`
- `SOBAG_ADMIN_NAME` optional
- `SOBAG_ADMIN_PHONE` optional

Do not commit these values to Git and do not paste them into chat.

## VPS File Store Option

For a VPS deployment that should not depend on Vercel KV/Upstash, the same API storage layer can use local JSON files:

- `SOBAG_STORE_PROVIDER=file`
- `SOBAG_FILE_STORE_DIR=/var/lib/sobag-opt/store`

The directory must be writable by the Node process and backed up regularly. It stores shared users, sessions, orders, saved carts, reviews, editable content, catalog payload, PIM sidecar, and import batches. Keep it outside the Git checkout; local `.sobag-store/` is ignored for development.

Vercel is not an active runtime target. Keep local file-store data outside the Git checkout and back it up before deploys/imports.

## Health Check

After setting environment variables and redeploying:

```bash
curl https://sobag-shop.online/api/health
```

Expected:

```json
{"ok":true,"storage":"ready","store":{"provider":"redis","configured":true}}
```

If storage is not configured, the API returns `503` and the frontend uses the prototype fallback.

The `store` object is intentionally safe: it exposes only the provider family (`redis` or `file`) and readiness flag, never URLs, tokens, paths, or credentials.

## Production Smoke

After deploy, run the read-only smoke check:

```bash
npm run smoke:prod
```

It sends only public `GET` requests to `/`, `/catalog`, `/cart`, and `/api/health`.
Use `npm run smoke:prod:self-test` for the offline fixture check that is also covered by AutoFix.

GitHub Actions also runs `.github/workflows/production-smoke.yml` after a successful `autofix-check` push to `main`.
The workflow uses the same read-only script with retries against the VPS production URL.

## AutoFix

Local checks:

```bash
npm run check
```

The same check runs in GitHub Actions on push, pull request, and every Monday at 06:00 UTC.
It includes the static access matrix audit from `tools/access-audit.mjs`; see `docs/access-audit.md`.
It also includes the API error-log audit from `tools/error-log-audit.mjs`; see `docs/error-log-review.md`.
It also includes the VPS runtime smokes from `tools/vps-server-smoke.mjs` and `tools/vps-write-smoke.mjs`.
It also includes the offline VPS env preflight fixture from `tools/vps-preflight.mjs --self-test`.
It also includes the offline file-store backup/restore fixture from `tools/file-store-backup.mjs --self-test`.
It also includes the offline 10k-product catalog query scale smoke from `tools/catalog-query-scale-smoke.mjs`.
It also includes the image metadata audit and its offline self-test from `tools/image-metadata-audit.mjs`.
It also includes the offline normalized PIM export dry-run and self-test from `tools/pim-export-normalized.mjs`.
It also includes the offline VPS release audit and self-test from `tools/vps-release-audit.mjs`.
