# Rust Account, Orders, Admin Cutover Runbook

Last updated: 2026-06-11

Purpose: prepare future route-group cutovers for account, auth, orders, briefs, and admin APIs from Node to Rust without changing production data or removing Node fallback.

## Current Rule

Node remains authoritative for all public write/account/admin routes until each route group has Rust parity, temporary-store tests, shadow comparison where possible, production smoke, and route-level rollback.

Currently switched to Rust in production:

- `/api/catalog-query`
- `/api/catalog-detail`
- `/api/orders`
- `/api/briefs`

Do not switch these route groups yet:

- auth/account: `/api/auth/me`, `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`
- admin orders/users/content: `/api/admin/orders`, `/api/admin/users`, `/api/admin/content`
- admin catalog/PIM/media/import: `/api/admin/catalog`, `/api/admin/pim`, `/api/admin/product-images`, `/api/admin/import-batches`

## Internal Rust Preview Routes

Preview-only Rust routes that may be used for parity work:

- `/rust/auth/me`
- `/rust/auth/login`
- `/rust/auth/register`
- `/rust/auth/logout`
- `/rust/orders`
- `/rust/briefs`
- `/rust/admin/orders`
- `/rust/admin/users`
- `/rust/admin/content`

These routes must not be exposed as public `/api/*` routes until the matching cutover gate is green.

## Route Group Order

1. Auth/account state: `GET+PUT /api/auth/me`
2. Auth session writes: login, register, logout
3. Orders/briefs writes
4. Admin orders read/update
5. Admin users/employees
6. Admin content/reviews
7. Admin catalog/import/media/PIM writes

## Current Candidate

Candidate 1 is the full account-state route: `GET` and `PUT /api/auth/me`. Candidate 3, orders/briefs writes, has already been switched in production as exact `/api/orders` and `/api/briefs` Nginx routes after temporary-store cutover smoke and no-write public validation. The next write/admin candidate is admin order read/update, but only after its own exact-route cutover smoke and rollback gate.

Reason: public `/api/auth/me` is one URL for both account reads and account-state writes. A simple exact Nginx route cannot safely switch only `GET` while leaving `PUT` on Node. Before switching it, `tools/rust-auth-me-shadow-smoke.mjs` must compare Node `/api/auth/me` and Rust `/rust/auth/me` for anonymous, buyer, manager, content, admin, expired sessions, profile updates, cart/favorite/saved-cart writes, buyer review validation, no password fields, no buyer-hidden internal fields, and unsupported `POST`/`DELETE` staying `405` on both runtimes. Public `/api/auth/me` still stays on Node until the full `GET+PUT` exact route is intentionally applied and rollback is ready.

## Required Gates Per Route Group

Before any route group switch:

- `cargo fmt --check`
- `cargo test --locked`
- `node tools/rust-auth-me-shadow-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust`
- `node tools/rust-auth-me-cutover-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust`
- `node tools/rust-orders-write-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust`
- `node tools/rust-orders-briefs-cutover-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust`
- `npm.cmd run check`
- `npm.cmd run ui:smoke` when UI/API behavior is touched
- `npm.cmd run smoke:prod -- --base-url https://sobag-shop.online`

Additional write-route requirements:

- run against temporary file-store or test database first;
- no production env edits during rehearsal;
- no secrets, tokens, cookies, passwords, DB dumps, or private keys in logs;
- verify no password fields in responses;
- verify buyer cannot read admin/internal fields;
- verify manager/content role restrictions;
- verify unsupported methods return 405;
- verify all writes can roll back by removing the route location.

## Nginx Cutover Shape

Switch only one exact route group at a time. Keep generic `location /` on Node.

Before editing Nginx, rehearse the exact locations locally:

```powershell
npm.cmd run rehearse:rust-account-routes -- --group auth-me
npm.cmd run rehearse:rust-account-routes -- --group orders-briefs
```

The rehearsal prints exact `location = ...` blocks only. For `/api/auth/me`, the rehearsal must label the group as `GET+PUT` because `GET`-only Nginx cutover is unsafe for the current shared URL. It must reject generic `/api`, wildcard `/api/admin`, and admin catalog/import/media/PIM locations until those later route groups are explicitly covered.

Before a public `/api/auth/me` switch, run `tools/rust-auth-me-cutover-smoke.mjs`. It starts temporary Node and Rust runtimes with the same temporary file-store, simulates the exact future routing shape, keeps login/register/logout on Node, routes only `GET+PUT /api/auth/me` to Rust, verifies Node can read the Rust-written account state, and verifies unrelated APIs still fall back to Node.

Before a public `/api/orders` and `/api/briefs` switch, run `tools/rust-orders-briefs-cutover-smoke.mjs`. It starts temporary Node and Rust runtimes with the same temporary file-store, simulates exact route-level cutover for only `/api/orders` and `/api/briefs`, verifies order and brief creation through Rust, verifies Node fallback `/api/admin/orders` sees the created records, verifies Node fallback `/api/auth/me` sees order profile side effects, and verifies unrelated APIs still fall back to Node.

Allowed future exact locations only after gates:

- `location = /api/auth/me`
- `location = /api/auth/login`
- `location = /api/auth/register`
- `location = /api/auth/logout`
- `location = /api/orders`
- `location = /api/briefs`
- `location = /api/admin/orders`
- `location = /api/admin/content`

Do not add wildcard `/api/admin/` or generic `/api/` proxy to Rust during these stages.

## Post-Cutover Checks

After each route group switch:

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -fsS http://127.0.0.1:3001/api/health-rust
curl -fsS https://sobag-shop.online/api/health
```

Then run the route-specific smoke plus:

```powershell
npm.cmd run check
npm.cmd run ui:smoke
npm.cmd run smoke:prod -- --base-url https://sobag-shop.online
```

## Rollback

Rollback is route-level:

1. Remove only the new Nginx location for the failed route group.
2. Keep Node handlers intact.
3. Reload Nginx.
4. Verify the same public API route is served by Node.
5. Keep Rust running for diagnosis unless Rust health itself is broken.

Do not edit production data, env, sessions, user records, orders, content, or admin records during rollback.
