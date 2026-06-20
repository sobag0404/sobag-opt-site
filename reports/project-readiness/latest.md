# Project Readiness Report

Generated: 2026-06-19T00:00:00+00:00
Project: sobag-opt-site
Git: `main` / Rust cutover complete with warnings

## 1. Executive Summary

Status: **READY_WITH_WARNINGS**.
Score: **90/100**.

The VPS/Rust route cutover is production-ready with warnings. Direct VPS MinIO repair restored media writes, manual `vps-deploy` `27816085213` passed, and `production-smoke` `27816499824` passed. The targeted exact routes are now Rust-owned, including auth, orders/briefs, admin orders/users/content/PIM/prices/catalog/import-batches/product-images, public catalog/search/product/pages, content pages, and catalog query/detail APIs.

Remaining warning scope is not a P0/P1 blocker for the completed targeted Rust cutover: Node remains as static/root/cart compatibility fallback and explicit legacy fallback, promo order-pricing precedence and backend XLSX styling need explicit business rules before changing order totals/output styling, destructive import business changes still need authenticated dry-run/apply/rollback evidence, and real field CWV remains post-launch monitoring. Synthetic/performance evidence must stay separate from field data.

## 2. Current Rust/VPS Evidence

- Latest admin-prices runtime-change release: `20260616T205347Z-32076fd`; later documentation-only deploys may advance the VPS release marker without changing runtime behavior.
- Production exact `/api/admin/prices` routes to Rust. Rollback backup: `/etc/nginx/sites-available/sobag-opt.pre-rust-admin-prices-20260616T205931Z`.
- GitHub gates passed for `32076fd`: `autofix-check` `27647385195`, `rust-check` `27647385766`, `vps-deploy` `27647440957`, and `production-smoke` `27647708702`.
- Live admin prices smoke passed: anonymous 401, temporary content-role list/preview/apply, zero-price rejection, non-zero catalog-detail prices, cleanup of temporary user/session.
- Production exact Rust routes now include auth writes, auth/me, orders, briefs, admin orders/users/content, read-only admin PIM, and admin prices.
- Admin catalog/import-batches/media exact routes are now Rust-owned after deploy gates. `/api/admin/product-images` passed live upload/list/delete cleanup after the direct MinIO repair.
- Verified latest gates: manual `vps-deploy` `27816085213` PASS and `production-smoke` `27816499824` PASS.
- MinIO repair evidence: VPS data ownership restored to the MinIO service user, media write/stat/delete verified, app env updated on VPS, and Rust restarted without exposing secrets. `tools/vps-minio-media-policy.sh` now contains a safe allowlisted ownership repair guard for future media deploy gates.
- Post-cutover backend contract: `docs/backend-pricing-reviews-contract.md` records grouped public price-list export, admin CSV/Excel-compatible price import by group/SKU, promo price rows, and buyer-only review eligibility.
- Latest pricing/review hardening: Node/Rust price import accepts spaced Excel-style numeric prices, rejects invalid promo date windows, exports promo rows only when date-active, tests transactional DB rollback on apply failure, and records safe price-import history/audit summaries on apply without raw CSV/files/secrets. Buyer review coverage now asserts anonymous/no-order/other-user-order/duplicate/pending rejection and completed-order success.
- Latest order/account/review persistence hardening: Node/Rust order creation uses non-sequential `SO-*` ids, accepts scoped idempotency keys for safe retry without duplicate orders, rejects malformed buyer order ids with `invalid_order_id`, merges duplicate cart SKU quantities, exposes `cartUpdatedAt`, rejects stale cart writes with `cart_conflict`, and rate-limits buyer review write bursts with `429`; coverage lives in `tools/api-security-smoke.mjs` plus Rust unit tests.
- Latest admin/rate-limit hardening: Node/Rust admin user mutations append compact `user_admin_update` audit records; admins can read sanitized summaries with `GET /api/admin/users?audit=1`; Node unsafe-route and route-specific write limits use store-backed buckets by default with documented memory fallback, and Rust auth/review writes use the same store-key family with in-process fallback. Coverage lives in `tools/api-security-smoke.mjs` plus Rust audit/rate-limit unit tests.

## 3. Readiness Score

| Category | Score | Status | Comment |
| --- | ---: | --- | --- |
| Architecture | 84 | WARN | Targeted Rust cutover is complete; Node remains as static/root/cart compatibility fallback. |
| Code Quality | 84 | WARN | Custom checks are strong; a standard lint layer remains P2. |
| Security | 88 | WARN | Admin mutation routes enforce roles; media storage keys are confined to `products/*`; MinIO ownership repair is path-guarded and secret-safe. |
| Tests | 95 | WARN | Latest VPS deploy and production smoke passed; keep CI/VPS smokes as the release gate. |
| Documentation | 94 | OK | Runtime map and handoff docs reflect the latest route ownership. |
| CI/CD | 94 | WARN | GitHub and VPS deploy gates passed; SHA-pinning actions remains optional hardening. |
| Product Readiness | 90 | WARN | Prices/orders/price export/admin prices are live; promo order-pricing precedence and real field CWV remain post-launch decisions. |
| Prompt Engineering | 86 | WARN | Latest-chat is concise and points to current artifacts. |

## 4. Remaining Findings

### P1

No active P1 blocker remains for the targeted Rust/VPS route cutover. Import-batches still needs authenticated dry-run/apply/rollback evidence before future destructive import business changes, but the exact route is deployed behind Rust with live anonymous guard.

### P2

- ARCH-001: `rust-server/src/main.rs` remains large and should continue to be split only when touching related code.
- CODE-003: Add a small ESLint configuration later to complement custom checks.
- SEC-005: Keep destructive deploy cleanup confined to reviewed path-validated scripts.
- PROMPT-003: New GoAL chats should start from `reports/project-readiness/latest-chat.md`, `docs/backend-pricing-reviews-contract.md`, and current handoff docs.

### P3

- PROD-002: Collect real field CWV after production traffic is available; do not label synthetic evidence as field data.
- CICD-006: Consider SHA-pinning third-party workflow actions for stronger supply-chain control.
- TEST-004: Continue running UI/browser smoke explicitly before visual or route-sensitive releases.

## 5. GoAL Readiness Decision

Decision: **READY_WITH_WARNINGS**.

Reason: no critical/high blockers are open for the targeted Rust/VPS transition state. Node remains only as a compatibility fallback for static/root/cart and explicit legacy paths. P2/P3 warnings are tracked and should not block post-cutover feature/security work.

## 6. Next Implementation Packet

1. Keep post-cutover release gates green: `npm.cmd run check`, `git diff --check`, GitHub `autofix-check`, `rust-check`, `vps-deploy`, and `production-smoke`.
2. Continue monitoring live health, canonical root, catalog first-load facets, non-zero prices, product images, cache headers, admin media anonymous 401, and authenticated media upload/list/delete cleanup.
3. Start the next post-cutover functional/security packet only after preserving current Rust route ownership and rollback docs.
4. Do not remove Node compatibility fallback until a separate no-Node static/root/cart plan and gates exist.

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
