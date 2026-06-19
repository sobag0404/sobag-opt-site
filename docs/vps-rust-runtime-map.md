# VPS / Rust Runtime Map

Last updated: 2026-06-19

## Target State

- Deploy target: VPS only.
- Current production runtime: Nginx exact-route map to `sobag-opt-rust` for the targeted Rust routes, with `server.mjs` retained for static/root/cart compatibility and explicit legacy fallback.
- Rust target: targeted route ownership through shadow, parity, cutover, and rollback gates is complete; any future no-Node removal needs a separate static/root/cart plan.
- Storage target: S3-compatible storage such as MinIO/R2 for objects; PostgreSQL for catalog/PIM; file-store bridge remains a VPS transition layer.
- Next.js runtime absent; remove only the Vercel-era layer after replacement, not by adding Next.js.

## Current Ownership

| Area | Current authority | Rust status | Rollback |
| --- | --- | --- | --- |
| Static shell/root/cart/account/non-switched pages | Node `server.mjs` + static files | fallback | keep Node route |
| Catalog/search/product SSR and fragments | Rust via exact Nginx locations | cut over | restore previous Nginx exact-route backup |
| Public content pages | Rust via exact Nginx locations | cut over | restore previous Nginx exact-route backup |
| `/api/catalog-query`, `/api/catalog-detail` | Rust/PostgreSQL path on VPS | cut over | route back to Node/API fallback |
| `/api/auth/me` | Rust for `GET+PUT` | cut over | route exact path back to Node |
| `/api/auth/login`, `/api/auth/register`, `/api/auth/logout` | Rust exact routes | cut over after auth write parity | restore previous Nginx exact-route backup |
| `/api/orders`, `/api/briefs` | Rust exact routes | cut over after Redis-backed parity | route exact paths back to Node backup |
| `/api/admin/orders`, `/api/admin/users`, `/api/admin/content` | Rust exact routes | cut over | route exact paths back to Node |
| `/api/admin/pim` | Rust exact route for read-only PIM diagnostics/export | cut over after PostgreSQL-backed PIM parity | restore `/etc/nginx/sites-available/sobag-opt.pre-rust-admin-pim-20260616T193119Z` |
| `/api/admin/prices` | Rust exact route | cut over after PostgreSQL price mutation parity | restore `/etc/nginx/sites-available/sobag-opt.pre-rust-admin-prices-20260616T205931Z` |
| `/api/admin/catalog` | Rust exact route | cut over after deploy-gate and live anonymous guard | restore pre-cutover Nginx backup |
| `/api/admin/import-batches` | Rust exact route | cut over after deploy-gate and live anonymous guard; future destructive import changes still need authenticated dry-run/apply/rollback evidence | restore pre-cutover Nginx backup |
| `/api/admin/product-images` | Rust exact route | cut over after MinIO repair and live upload/list/delete cleanup smoke | restore pre-cutover Nginx backup |

## Exact Route Audit

- Rust-owned API routes: `/api/catalog-query`, `/api/catalog-detail`, `/api/auth/me`, `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/orders`, `/api/briefs`, `/api/admin/orders`, `/api/admin/users`, `/api/admin/content`, `/api/admin/pim`, `/api/admin/prices`, `/api/admin/catalog`, `/api/admin/import-batches`, `/api/admin/product-images`.
- Rust-owned public pages/fragments: `/catalog`, `/search`, `/product`, `/catalog-fragment`, `/search-fragment`, `/product-fragment`, `/about`, `/business`, `/marketplaces`, `/contacts`, `/how-to-order`, `/delivery`, `/payment`, `/returns`, `/seller-support`, `/wholesale`.
- Node/static-owned compatibility paths: `/`, `/index.html` redirect, `/cart`, static assets, static HTML shell files, and explicit non-switched legacy fallback paths.
- Deprecated runtime/deploy paths: Vercel/Next.js deploy/runtime, Vercel Blob provider aliases, `api/[...path].js`, and duplicate `api/_lib/**` helpers remain out of the active runtime.

## Vercel-Era Removal State

Removed active artifacts: `vercel.json`, `.vercelignore`, `dev:vercel`, `tools/vercel-daily-deploy-gate.mjs`, and `@vercel/blob`.

Object storage active target is S3-compatible/MinIO/R2. The active adapter has no Vercel Blob SDK dependency, no `vercel-blob` provider alias, and fails unsupported providers instead of silently using a legacy provider.

Next.js runtime is not present. Cleanup targets the old Vercel serverless/deploy layer, not a Next.js application.

## Retired Compatibility Surface

- Canonical VPS helper owner: `server-routes/_lib/**`.
- Legacy Vercel-style compatibility files `api/[...path].js` and `api/_lib/**` are retired from the active tree.
- Current rule: do not reintroduce `api/[...path].js` or duplicate `api/_lib/**` helpers; route/runtime code must import canonical `server-routes/_lib/**`.
- Removed Vercel-era artifacts must stay absent from active package scripts, dependencies, deploy config, and release audits.
- Active target: VPS only. Vercel references in old handoff docs are historical unless a current runbook explicitly says otherwise.
- Safe next step: keep `server.mjs`, `api-router.js`, tools, smokes, and release audits green while using Node only as compatibility fallback; do not remove Node until a separate no-Node static/root/cart plan is written and gated.
- Static serving guard: `server.mjs` allowlists only public root pages/assets/components/templates and `data/products-live.json`; backend source, docs, workflows, reports, package metadata, Rust/server route source, and encoded traversal through public directories must return 404 from the VPS static server.
- Browser auth/admin guard: when backend auth is unavailable, client-side login/register fallback now runs only on local development hosts; production hosts fail closed instead of storing new user passwords in localStorage. Production admin pages also require a verified backend session before rendering management UI.

## Current Production Notes

- Deployed commit `cefeb12` hardens VPS static cache policy: HTML is `no-cache`, versioned JS/CSS query URLs are `public, max-age=31536000, immutable`, product data and public catalog/price-list APIs use short public cache, and auth/health/order APIs stay `no-store`.
- Live catalog cold requests return current imported facets: `Подушки 517`, `Наволочки 517`, `Мешки для обуви 170`, `Чехлы на чемодан 37`, `Ремувки 19`, `Флаги 65`. `/api/catalog` returns `no-store`; `/api/catalog-query` returns short public cache only.
- Production `/api/auth/login`, `/api/auth/register`, and `/api/auth/logout` are cut over to Rust exact routes after auth write parity. Current route backup: `/etc/nginx/sites-available/sobag-opt.pre-rust-auth-write-20260616T174643Z`.
- Production `/api/orders` and `/api/briefs` are cut over to Rust exact routes after Redis-backed store parity. Current route backup: `/etc/nginx/sites-available/sobag-opt.pre-rust-orders-briefs-20260616T164606Z`; previous Node-restore backup remains `/etc/nginx/sites-available/sobag-opt.pre-node-orders-20260616T122736Z`.
- Redis-backed Rust write-store parity is deployed at `129740b`: Rust reads/writes/deletes the same Redis/Upstash REST keys used by Node, and VPS deploy runs passed both file-store and Redis fixture order/brief smokes before accepting the release.
- Auth-write live smoke passed after the exact-route switch: registration/login/logout on production Rust routes set/clear production cookies with `HttpOnly`, `SameSite=Lax`, and `Secure`; invalid credentials, duplicate registration, missing consent, CSRF origin rejection, and the no-order review guard all returned the expected errors without exposing cookies or secrets.
- Orders/briefs live smoke remains green after auth-write cutover: health/catalog prices stayed valid, a safe Rust-created order and brief persisted through Redis, minimum-total validation stayed active, and production smoke/storage/cache checks stayed green.
- Production exact `/api/admin/pim` is cut over to Rust for read-only PIM diagnostics/export after adding PostgreSQL-backed fallback when the file-store catalog is absent. Current route backup: `/etc/nginx/sites-available/sobag-opt.pre-rust-admin-pim-20260616T193119Z`.
- Admin PIM live smoke passed after the exact-route switch: anonymous access returned 401, a temporary content-role session read summary/variants/CSV through Rust, 12,943 variants included non-zero prices, invalid views returned 400, and the temporary user/session were removed.
- Production exact `/api/admin/prices` is cut over to Rust for price-group/SKU price preview and PostgreSQL apply. Current route backup: `/etc/nginx/sites-available/sobag-opt.pre-rust-admin-prices-20260616T205931Z`.
- Admin prices live smoke passed after the exact-route switch: anonymous access returned 401, a temporary content-role session listed 31 price groups, previewed a safe SKU price row, rejected a zero-price row, applied the same non-zero SKU price without changing business value, verified catalog-detail prices stayed non-zero, and removed the temporary user/session.
- Post-cutover pricing/reviews contract lives in `docs/backend-pricing-reviews-contract.md`: public price lists are grouped by price category, promo rows are separate and date-windowed, admin imports accept Excel-compatible CSV/parsed rows by group or SKU with positive price/date validation and transactional rollback, and buyer reviews require a confirmed matching order. Promo order-pricing precedence and backend XLSX styling remain explicit future business decisions.
- Rust admin catalog is cut over: `/api/admin/catalog` routes to `/rust/admin/catalog` through an exact Nginx location and live anonymous guard.
- Rust admin import-batches is cut over: `/api/admin/import-batches` routes to `/rust/admin/import-batches` through an exact Nginx location and live anonymous guard. Use authenticated dry-run/apply/rollback evidence before future destructive import business changes.
- Rust admin media is cut over: `/api/admin/product-images` routes to `/rust/admin/product-images`; manual `vps-deploy` `27816085213` and `production-smoke` `27816499824` passed after direct VPS MinIO repair. MinIO media write/stat/delete was verified after data ownership was restored to the MinIO service user, the app env was updated on the VPS, and Rust was restarted.
- Future deploy guard: `tools/vps-minio-media-policy.sh` includes safe MinIO data-ownership repair for allowlisted MinIO data paths before credential/policy repair, prints only safe branch/classes, and must not expose object-storage secrets.

## VPS Access And Cutover Input

- Confirmed public domain: `sobag-shop.online`.
- Confirmed VPS public IP: `77.239.107.164`.
- Confirmed SSH user: `root`.
- Credentials must stay outside Git, Markdown, reports, prompts, and command history. Use SSH key access, local secret store, or interactive input; rotate/replace password-based access after cutover.
- Safe public-key SSH access is available without using the shared password. Initial inventory confirmed Ubuntu 24.04, host `sobag-shop.online`, `/opt/sobag-opt`, `/var/www/sobag-opt-site`, Nginx, PostgreSQL 16, PM2 Node, and running Rust services.
- Server-side nginx/systemd preparation is allowed, but production route replacement still must pass inventory, backup/quarantine, Rust/Linux checks, health smokes, and rollback gates.

## Storage And DB Decision

- First Rust/runtime cutover keeps current VPS-local application data/storage paths and existing static assets; it does not require a new object-upload migration.
- PostgreSQL on the VPS is the preferred DB target when the catalog/PIM DB cutover proceeds, but current runtime keeps existing compatibility until the PostgreSQL packet/gates are complete.
- PostgreSQL test rehearsal on the VPS is complete for `sobag_catalog_test`: schema and PIM seed bundle were applied, rollback rehearsal was confirmed, and the no-secret catalog DB packet now passes strict audit. Keep `runtimeToggleApproved=false` until a separate production DB cutover gate.
- Product photo object-storage migration remains on the existing S3-compatible adapter because the current upload abstraction and audits are already built around `s3-compatible`; Vercel Blob remains unsupported.
- VPS-local MinIO is configured as the S3-compatible object store behind Nginx on `https://sobag-shop.online/sobag-products`. Secrets live only in VPS env/service files; the no-secret packet stores only public coordinates and confirmations. Public access is limited to object reads under `products/*`; bucket listing returns 403. Strict production storage readiness now passes for object storage and catalog DB.
- Current MinIO media gate: local MinIO data ownership must remain with the MinIO service user. The 2026-06-19 direct VPS repair fixed a write-denied media gate by restoring ownership and verifying write/stat/delete; the repo deploy guard can now repeat that safe ownership check on future media gates.
- Product photo cutover is applied: `assets/product-preview-live` was uploaded to VPS MinIO/S3-compatible storage, `data/products-live.json` now carries square responsive `images[]` metadata, and production PostgreSQL catalog image rows were updated with rollback backup `/tmp/sobag-catalog-db-photo-backup.json`.

## Rust Local Build Blocker

- Local Windows Rust build/smoke is blocked by missing MSVC linker `link.exe`.
- Do not install Visual Studio/MSVC Build Tools or switch Rust toolchains without explicit user approval.
- Local options: install MSVC Build Tools for the default `*-pc-windows-msvc` toolchain, or use a Rust GNU toolchain if the project accepts it.
- VPS/Linux Rust verification remains the release path for this target state until local Windows toolchain is fixed.
- Linux/VPS command: `cd rust-server && cargo fmt --check && cargo check --locked && cargo test --locked`, then the existing VPS deploy smokes before route cutover. This passed on deployed VPS release `20260615Tmanual-427f171` as part of the manual deploy, followed by `cargo build --release --locked`.
- CI verification path: `.github/workflows/rust-check.yml` runs `cargo fmt --check`, `cargo check --locked`, and `cargo test --locked` on Ubuntu without secrets or deploy steps.
- Production cookie guard: the VPS deploy-generated Node start script and Rust systemd unit both set `NODE_ENV=production`, so session cookies include the production `Secure` attribute when the deploy path is used.
- Formatting gate: local repo and deployed VPS release `20260615Tmanual-427f171` pass `cargo fmt --check`; `.github/workflows/rust-check.yml` includes the same no-secret Ubuntu formatting gate before `cargo check --locked`.
- Local audit command: `npm run audit:rust-local-env` verifies Rust files, CI workflow guardrails, and records the Windows linker blocker without failing normal `npm run check`.

## Modularity / Cutover Inputs

- Rust modularity first slice is limited to test-only extraction: `rust-server/src/ssr_tests.rs` and `rust-server/src/tests.rs` are split out of `rust-server/src/main.rs` without route/runtime behavior changes.
- Browser modularity slices: pure formatting/import helpers live in `components/app-utils.js`; static app data lives in `components/app-data.js`; XLSX/CSV lazy-load/export and tabular-file read helpers live in `components/app-xlsx.js`; content/product helper modules live in `components/app-content-utils.js` and `components/app-product-utils.js`; account and admin workflows live in `components/app-account.js` and `components/app-admin.js`. These load before `app.js` on every HTML page that uses the app runtime; `cart.html` also loads `components/app-xlsx.js` for quote export.
- Cart modularity first slice: cart defaults and pure helpers live in `components/cart-data.js` and `components/cart-utils.js`, loaded before `cart.js`; cart runtime stays below the current 1000-line readiness threshold.
- `app.js` is now below the current 5000-line architecture threshold. Remaining frontend modularity debt should be handled as smaller state/render/route slices with focused UI smoke for catalog, search, admin import/prices/orders, and account flows.
- No-secret VPS/Rust cutover input packet: `local-import-output/vps-rust-cutover-packet.json` generated from `node tools/goal-inputs-packet-template.mjs`.
- Packet audit: `npm run audit:vps-rust-cutover-packet`. The packet stores env var names, host/service names, health URLs, rollback command, and check commands; it must not store secrets or production env values.
- Packet schema: `docs/vps-rust-cutover-input-packet.md`. It covers domain, VPS host alias, SSH env names, deploy/backup paths, Linux distro, Rust binary/service paths, DB/session/JWT env names, allowed origins, admin bootstrap guard, S3-compatible object-storage env names, health URLs, rollback, and required gates.
