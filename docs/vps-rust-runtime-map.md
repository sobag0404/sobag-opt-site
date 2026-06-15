# VPS / Rust Runtime Map

Last updated: 2026-06-15

## Target State

- Deploy target: VPS only.
- Current production runtime: `server.mjs` Node process behind Nginx, plus staged Rust service.
- Rust target: route-by-route ownership through shadow, parity, cutover, and rollback gates.
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
| `/api/auth/login`, `/api/auth/register`, `/api/auth/logout` | Node fallback | pending Rust auth-write cutover | keep Node |
| `/api/orders`, `/api/briefs` | Rust exact routes | cut over | route exact paths back to Node |
| `/api/admin/orders`, `/api/admin/users`, `/api/admin/content` | Rust exact routes | cut over | route exact paths back to Node |
| Admin catalog/import/media/PIM writes | Node fallback | pending | keep Node |

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
- Safe next step: keep `server.mjs`, `api-router.js`, tools, smokes, and release audits green while moving remaining Node fallback routes to Rust through parity/cutover gates.
- Static serving guard: `server.mjs` allowlists only public root pages/assets/components/templates and `data/products-live.json`; backend source, docs, workflows, reports, package metadata, Rust/server route source, and encoded traversal through public directories must return 404 from the VPS static server.
- Browser auth/admin guard: when backend auth is unavailable, client-side login/register fallback now runs only on local development hosts; production hosts fail closed instead of storing new user passwords in localStorage. Production admin pages also require a verified backend session before rendering management UI.

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
