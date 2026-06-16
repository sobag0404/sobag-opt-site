# Project Readiness Report

Generated: 2026-06-16T21:15:00+00:00
Project: sobag-opt-site
Git: `main` / `32076fd`

## 1. Executive Summary

Status: **READY_WITH_WARNINGS**.
Score: **87/100**.

The VPS/Rust transition remains production-ready with warnings. The latest cutover moved exact `/api/admin/prices` to Rust after PostgreSQL price mutation parity and live rollback-ready validation. GitHub gates and production smoke passed for runtime commit `32076fd`, and the live route now rejects anonymous access, supports admin/content price list/preview/apply, rejects zero-price imports, and keeps catalog prices non-zero.

Remaining warning scope is not a P0/P1 blocker for the current route-by-route Rust transition: admin catalog/import/media mutation routes still use Node fallback and should be cut over in bounded slices with exact-route backups and live smokes. Real field CWV remains post-launch monitoring; synthetic/performance evidence must stay separate from field data.

## 2. Current Rust/VPS Evidence

- Latest deployed VPS release: `20260616T205347Z-32076fd`.
- Production exact `/api/admin/prices` routes to Rust. Rollback backup: `/etc/nginx/sites-available/sobag-opt.pre-rust-admin-prices-20260616T205931Z`.
- GitHub gates passed for `32076fd`: `autofix-check` `27647385195`, `rust-check` `27647385766`, `vps-deploy` `27647440957`, and `production-smoke` `27647708702`.
- Live admin prices smoke passed: anonymous 401, temporary content-role list/preview/apply, zero-price rejection, non-zero catalog-detail prices, cleanup of temporary user/session.
- Production exact Rust routes now include auth writes, auth/me, orders, briefs, admin orders/users/content, read-only admin PIM, and admin prices.
- Remaining Node fallback zone: admin catalog/import/media mutation routes.

## 3. Readiness Score

| Category | Score | Status | Comment |
| --- | ---: | --- | --- |
| Architecture | 80 | WARN | Route-by-route Rust cutover is controlled; `rust-server/src/main.rs` still has large-file ownership debt. |
| Code Quality | 84 | WARN | Custom checks are strong; a standard lint layer remains P2. |
| Security | 86 | WARN | Admin price mutation route enforces roles and rejects zero/invalid prices; deploy cleanup guardrails remain monitored. |
| Tests | 94 | WARN | Local, GitHub, deploy, and live smokes passed for the latest Rust route cutover. |
| Documentation | 94 | OK | Runtime map and handoff docs reflect the latest route ownership. |
| CI/CD | 94 | WARN | GitHub and VPS deploy gates passed; SHA-pinning actions remains optional hardening. |
| Product Readiness | 90 | WARN | Prices/orders/price export/admin prices are live; real field CWV remains post-launch monitoring. |
| Prompt Engineering | 86 | WARN | Latest-chat is concise and points to current artifacts. |

## 4. Remaining Findings

### P1

No active P1 blocker remains for the completed `/api/admin/prices` cutover. The next Rust transition slice should target admin catalog/import/media mutations one bounded route group at a time.

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

1. Inventory remaining admin catalog/import/media mutation Node contracts: exact routes, auth roles, payloads, validation/errors, storage paths, and rollback expectations.
2. Implement the smallest Rust parity slice first. Prefer non-destructive import dry-run or reversible catalog/media operations before destructive write paths.
3. Add smokes for anonymous denial, admin/content success, validation failures, price non-regression, public catalog/images, auth/orders/briefs/reviews, and cache headers.
4. Before each production route switch, back up the Nginx site config and switch only exact routes for the current slice. If any live gate fails, restore the backup immediately and rerun health/admin smokes.
5. Run `cargo fmt --check`, `cargo check --locked`, `cargo test --locked`, `npm.cmd run check`, GitHub `autofix-check`, `rust-check`, `vps-deploy`, `production-smoke`, plus live admin-safe validation.

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
