Next implementation packet:
1. Current state: Rust Redis-backed write-store parity for `/api/orders` and `/api/briefs` is implemented and deployed. Commit `129740b` passed local `npm.cmd run check`, cargo fmt/check/test, GitHub `autofix-check`, `rust-check`, and `vps-deploy` run `27631682347`. The release gate ran order/brief write and cutover smokes in both file-store and Redis fixture modes.
2. Production `/api/orders` and `/api/briefs` remain intentionally on Node fallback. Do not make a blind cutover; next work is exact-route Nginx re-cutover only after inventory/backup and live smoke readiness.
3. Required next gates: backup current Nginx config, re-cut exact `/api/orders` and `/api/briefs` to Rust, run live health, catalog prices non-zero, order create/PATCH smoke, brief create smoke, admin/account fallback visibility for Rust-created records, and rollback verification to Node using `/etc/nginx/sites-available/sobag-opt.pre-node-orders-20260616T122736Z` or a fresh backup.
4. Keep release checks green: `cargo fmt --check`, `cargo check --locked`, `cargo test --locked`, `npm.cmd run check`, `npm.cmd run audit:vps-release`, `npm.cmd run audit:rust-account-cutover`, `npm.cmd run audit:rust-migration-plan`, `git diff --check`, GitHub `autofix-check`, `rust-check`, `vps-deploy`, and production smoke/performance/storage checks.
5. Cache/catalog invariant: `/api/catalog` is `no-store`; `/api/catalog-query` returns real imported facets and short public cache. First-load stale categories should be diagnosed in client bootstrap/localStorage unless backend headers regress.
6. Pricing promo/XLSX styling still needs business rules. Do not invent promo precedence or change order totals until confirmed.
7. Keep Vercel/Next absent; do not print secrets. Real field CWV remains post-launch monitoring and must not be labeled synthetic evidence.

Project status: READY_WITH_WARNINGS. Score: 87/100.
