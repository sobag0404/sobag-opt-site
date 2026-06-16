Next implementation packet:
1. Current branch implements Rust Redis-backed write-store parity for future `/api/orders` and `/api/briefs` re-cutover: `rust-server/src/store.rs` owns file/Redis helpers, Rust uses Redis/Upstash REST for live-compatible keys, and `rust-server/src/main.rs` is back below the huge-file readiness threshold.
2. Production `/api/orders` and `/api/briefs` must remain on Node fallback until this code is deployed and exact-route Nginx re-cutover is intentionally applied. Do not make a blind cutover.
3. Required gates before re-cutover: `cargo fmt --check`, `cargo check --locked`, `cargo test --locked`, `npm.cmd run check`, `npm.cmd run audit:vps-release`, `npm.cmd run audit:rust-account-cutover`, `npm.cmd run audit:rust-migration-plan`, `git diff --check`. Redis E2E smokes require a built Rust binary and DB env: run both order smokes in default mode and `--store-provider redis`; local runs without DB env stop at `SOBAG_CATALOG_DATABASE_URL is required`.
4. After commit/push, verify GitHub `rust-check`, `autofix-check`, `vps-deploy` (now runs file+Redis order/brief smokes), and `production-smoke`.
5. Only after deploy smokes pass: backup current Nginx config, re-cut exact `/api/orders` and `/api/briefs` to Rust, run live price/order/brief smokes, verify Node fallback admin/account visibility for Rust-created records, and keep rollback to Node ready.
6. Cache/catalog invariant: `/api/catalog` is `no-store`; `/api/catalog-query` returns real imported facets and uses short public cache. First-load stale categories should be diagnosed in client bootstrap/localStorage unless backend headers regress.
7. Pricing promo/XLSX styling still needs business rules. Do not invent promo precedence or change order totals until confirmed.
8. Keep Vercel/Next absent; do not print secrets. Real field CWV remains post-launch monitoring and must not be labeled synthetic evidence.
Статус проекта: READY_WITH_WARNINGS. Оценка: 87/100.
