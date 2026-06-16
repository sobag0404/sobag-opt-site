Next implementation packet:
1. Current state: production exact `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/auth/me`, `/api/orders`, and `/api/briefs` are cut over to Rust. Latest deployed release: `20260616T174326Z-743c63e`.
2. Backups/rollback: auth write backup `/etc/nginx/sites-available/sobag-opt.pre-rust-auth-write-20260616T174643Z`; orders/briefs backup `/etc/nginx/sites-available/sobag-opt.pre-rust-orders-briefs-20260616T164606Z`. Roll back by restoring the relevant backup, then `nginx -t && systemctl reload nginx`.
3. Auth cutover evidence: GitHub `autofix-check` `27636611825`, `rust-check` `27636614336`, `vps-deploy` `27636661153`, and `production-smoke` `27636762936` passed for `743c63e`. Live smoke verified register/login/logout, production cookie attributes, invalid credentials, duplicate registration, missing consent, CSRF-origin rejection, no-order review guard, health/catalog prices, order/brief writes, cache/performance, and storage readiness.
4. Remaining Rust cutover work: admin catalog/import/media/PIM writes remain Node fallback. Do not touch UI. Do not do broad regex/proxy routing. Move through exact-route parity, smokes, backup, live gates, and rollback.
5. Next block: inventory Node admin catalog/import/media/PIM contracts and Rust gaps; implement minimal Rust parity and fixture smokes; verify auth roles, validation/errors, Redis/file-store compatibility, import/media safety, no-secret logs; then prepare exact-route cutover only if gates are green.
6. Required checks: `cargo fmt --check`, `cargo check --locked`, `cargo test --locked`, `npm.cmd run check`, targeted `node --check`, GitHub `autofix-check`, `rust-check`, `vps-deploy`, `production-smoke`, and live admin-safe validation after any cutover.
7. Keep Vercel/Next absent. Do not print secrets/cookies/tokens. Real field CWV remains post-launch monitoring; synthetic evidence is not field data.

Project status: READY_WITH_WARNINGS. Score: 87/100.
