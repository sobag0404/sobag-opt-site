# Project Readiness Report

Generated: 2026-06-17T11:30:00+00:00
Project: sobag-opt-site
Git: `main` / media-cutover working tree

## 1. Executive Summary

Status: **READY_WITH_WARNINGS**.
Score: **87/100**.

The VPS/Rust transition remains production-ready with warnings. The latest verified production baseline includes the deploy workflow YAML fixes `0ace8a6`, `c2c1b56`, and `637f20d`; `vps-deploy` `27675967030` and `production-smoke` `27676234502` passed. New admin media Rust parity and exact-route deploy gate are prepared for `/api/admin/product-images`.

Remaining warning scope is not a P0/P1 blocker for the current route-by-route Rust transition: media cutover still needs GitHub/VPS live upload/list/delete confirmation after push, and import-batches needs authenticated dry-run/apply/rollback evidence before marking full write cutover. Real field CWV remains post-launch monitoring; synthetic/performance evidence must stay separate from field data.

## 2. Current Rust/VPS Evidence

- Latest admin-prices runtime-change release: `20260616T205347Z-32076fd`; later documentation-only deploys may advance the VPS release marker without changing runtime behavior.
- Production exact `/api/admin/prices` routes to Rust. Rollback backup: `/etc/nginx/sites-available/sobag-opt.pre-rust-admin-prices-20260616T205931Z`.
- GitHub gates passed for `32076fd`: `autofix-check` `27647385195`, `rust-check` `27647385766`, `vps-deploy` `27647440957`, and `production-smoke` `27647708702`.
- Live admin prices smoke passed: anonymous 401, temporary content-role list/preview/apply, zero-price rejection, non-zero catalog-detail prices, cleanup of temporary user/session.
- Production exact Rust routes now include auth writes, auth/me, orders, briefs, admin orders/users/content, read-only admin PIM, and admin prices.
- Remaining Node fallback zone: admin catalog/import/media mutation routes.
- Coordinator-verified deploy baseline: workflow YAML fixes `0ace8a6`, `c2c1b56`, `637f20d`; `vps-deploy` `27675967030` PASS; `production-smoke` `27676234502` PASS.
- Admin catalog parity/deploy switch: `240e423` + `7e8d225` pushed; live anonymous `/api/admin/catalog` returned 401 in coordinator smoke.
- Admin import-batches parity: `1c2a72e` pushed; local checks passed, public route remains Node until live import gates exist.
- Admin media parity/deploy switch: Rust route and deploy gate prepared for exact `/api/admin/product-images`, with S3-compatible upload/list/delete and path traversal guards.

## 3. Readiness Score

| Category | Score | Status | Comment |
| --- | ---: | --- | --- |
| Architecture | 80 | WARN | Route-by-route Rust cutover is controlled; `rust-server/src/main.rs` still has large-file ownership debt. |
| Code Quality | 84 | WARN | Custom checks are strong; a standard lint layer remains P2. |
| Security | 86 | WARN | Admin price/media mutation routes enforce roles; media storage keys are confined to `products/*`; deploy cleanup guardrails remain monitored. |
| Tests | 94 | WARN | Local checks passed for new catalog/import-batches parity; GitHub/deploy/live smokes remain the gate before marking new routes cut over. |
| Documentation | 94 | OK | Runtime map and handoff docs reflect the latest route ownership. |
| CI/CD | 94 | WARN | GitHub and VPS deploy gates passed; SHA-pinning actions remains optional hardening. |
| Product Readiness | 90 | WARN | Prices/orders/price export/admin prices are live; real field CWV remains post-launch monitoring. |
| Prompt Engineering | 86 | WARN | Latest-chat is concise and points to current artifacts. |

## 4. Remaining Findings

### P1

No active P1 blocker remains for the completed `/api/admin/prices` cutover. The media slice is ready for GitHub/VPS deployment and live upload/list/delete verification. Import-batches still needs authenticated dry-run/apply/rollback evidence before marking the write path complete.

### P2

- ARCH-001: `rust-server/src/main.rs` remains large and should continue to be split only when touching related code.
- CODE-003: Add a small ESLint configuration later to complement custom checks.
- SEC-005: Keep destructive deploy cleanup confined to reviewed path-validated scripts.
- PROMPT-003: New GoAL chats should start from `reports/project-readiness/latest-chat.md` plus current handoff docs.

### P3

- PROD-002: Collect real field CWV after production traffic is available; do not label synthetic evidence as field data.
- CICD-006: Consider SHA-pinning third-party workflow actions for stronger supply-chain control.
- TEST-004: Continue running UI/browser smoke explicitly before visual or route-sensitive releases.

## 5. GoAL Readiness Decision

Decision: **READY_WITH_WARNINGS**.

Reason: no critical/high blockers are open for the current Rust/VPS transition state. The remaining Node fallback zone is clearly isolated to admin catalog/import/media mutation routes and has a route-by-route rollback process. P2/P3 warnings are tracked and should not block continued incremental cutover work.

## 6. Next Implementation Packet

1. Push the media cutover packet and verify GitHub/VPS `autofix-check`, `rust-check`, `vps-deploy`, and `production-smoke`.
2. Confirm live `/api/admin/product-images` exact route with anonymous 401 plus authenticated temporary upload/list/delete cleanup; rollback from `/etc/nginx/sites-available/sobag-opt.pre-rust-admin-media-*` if any gate fails.
3. For `/api/admin/import-batches`, add or run a production-safe authenticated smoke that previews, applies, verifies readback, and rolls back/cleans up a temporary import before marking the write path complete.
4. Continue running `cargo fmt --check`, `cargo check --locked`, `cargo test --locked`, `npm.cmd run check`, GitHub `autofix-check`, `rust-check`, `vps-deploy`, `production-smoke`, plus live admin-safe validation.

## 7. Changed Files / Relevant Links

- `rust-server/src/admin_prices.rs`
- `rust-server/src/main.rs`
- `rust-server/src/ssr_tests.rs`
- `tools/rust-admin-prices-cutover-smoke.mjs`
- `tools/rust-account-route-rehearsal.mjs`
- `tools/autofix.mjs`
- `package.json`
- `docs/vps-rust-runtime-map.md`
- `docs/ai-handoff/CURRENT_STATUS.md`
- `docs/ai-handoff/ACTIVE_CONTEXT.md`
- `reports/project-readiness/latest-chat.md`
- `rust-server/src/admin_catalog.rs`
- `rust-server/src/admin_import_batches.rs`
- `tools/rust-admin-catalog-cutover-smoke.mjs`
- `tools/rust-admin-import-batches-cutover-smoke.mjs`
- `rust-server/src/admin_media.rs`
- `tools/rust-admin-media-cutover-smoke.mjs`
- `.github/workflows/vps-deploy.yml`
