Next implementation packet:
1. Current state: production exact `/api/orders` and `/api/briefs` are cut over to Rust after Redis-backed write-store parity. Backup: `/etc/nginx/sites-available/sobag-opt.pre-rust-orders-briefs-20260616T164606Z`. Live smoke created order `SO-468985` and brief `BR-470565`, verified non-zero trusted pricing, buyer PATCH, account visibility, Node/Rust admin visibility, `GET /api/briefs` 405, health, cache/performance smoke, and storage readiness.
2. Keep rollback ready: restore the backup above or the previous Node restore backup `/etc/nginx/sites-available/sobag-opt.pre-node-orders-20260616T122736Z`, then `nginx -t && systemctl reload nginx`, if live order/brief regressions appear.
3. Remaining Rust cutover work: auth session writes (`/api/auth/login`, `/api/auth/register`, `/api/auth/logout`) and admin catalog/import/media/PIM writes remain Node fallback. Move only through exact-route parity smokes, release gates, live smoke, and rollback backups.
4. Release checks to keep green: `cargo fmt --check`, `cargo check --locked`, `cargo test --locked`, `npm.cmd run check`, `npm.cmd run audit:vps-release`, `npm.cmd run audit:rust-account-cutover`, `npm.cmd run audit:rust-migration-plan`, `git diff --check`, GitHub `autofix-check`, `rust-check`, `vps-deploy`, and production smoke/performance/storage checks.
5. Cache/catalog invariant: `/api/catalog` is `no-store`; `/api/catalog-query` returns real imported facets and short public cache. First-load stale categories should be diagnosed in client bootstrap/localStorage unless backend headers regress.
6. Pricing promo/XLSX styling still needs business rules. Do not invent promo precedence or change order totals until confirmed.
7. Keep Vercel/Next absent; do not print secrets. Real field CWV remains post-launch monitoring and must not be labeled synthetic evidence.

Project status: READY_WITH_WARNINGS. Score: 87/100.
