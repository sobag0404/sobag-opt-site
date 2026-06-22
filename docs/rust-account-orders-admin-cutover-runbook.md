# Rust Account, Orders, Admin Cutover Runbook

Last updated: 2026-06-22

Purpose: preserve the route-group cutover contract for account, auth, orders, briefs, and admin APIs after the Rust production cutover, without removing the remaining static/root/cart compatibility fallback.

## Current Rule

Rust cutover complete for the targeted exact API routes. Node remains compatibility fallback only for static/root/cart shell paths and explicit legacy fallback; do not add wildcard `/api` or `/api/admin` proxying.

Currently switched to Rust in production:

- `/api/catalog-query`
- `/api/catalog-detail`
- `/api/auth/me`
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/logout`
- `/api/orders`
- `/api/briefs`
- `/api/admin/orders`
- `/api/admin/users`
- `/api/admin/content`
- `/api/admin/catalog`
- `/api/admin/pim`
- `/api/admin/prices`
- `/api/admin/product-images`
- `/api/admin/import-batches`

## Internal Rust Preview Routes

Internal Rust routes that back the exact production `/api/*` cutovers:

- `/rust/auth/me`
- `/rust/auth/login`
- `/rust/auth/register`
- `/rust/auth/logout`
- `/rust/orders`
- `/rust/briefs`
- `/rust/admin/orders`
- `/rust/admin/users`
- `/rust/admin/content`
- `/rust/admin/catalog`
- `/rust/admin/pim`
- `/rust/admin/prices`
- `/rust/admin/product-images`
- `/rust/admin/import-batches`

These routes must be exposed only through exact public `/api/*` locations after the matching cutover gate is green.

## Route Group Order

1. Auth/account state: `GET+PUT /api/auth/me`
2. Auth session writes: login, register, logout
3. Orders/briefs writes
4. Admin orders read/update
5. Admin users/employees
6. Admin content/reviews
7. Admin catalog/import/media/PIM writes

## Current Candidate

All listed candidate route groups are now switched in production through exact Nginx locations after temporary-store tests, Redis/PostgreSQL/MinIO, role/access, route-level rollback, and production-smoke gates. Future work should add parity coverage for new API routes before any route is added to production routing.

Reason: public `/api/auth/me` is one URL for both account reads and account-state writes. A simple exact Nginx route could not safely switch only `GET` while leaving `PUT` on Node. Before it was switched, `tools/rust-auth-me-shadow-smoke.mjs` compared Node `/api/auth/me` and Rust `/rust/auth/me` for anonymous, buyer, manager, content, admin, expired sessions, profile updates, cart/favorite/saved-cart writes, buyer review validation, no password fields, no buyer-hidden internal fields, and unsupported `POST`/`DELETE` staying `405` on both runtimes. Public `/api/auth/me` is now switched only as the full `GET+PUT` exact route with rollback backup.

## Required Gates Per Route Group

Before adding or re-cutting any route group:

- `cargo fmt --check`
- `cargo test --locked`
- `node tools/rust-auth-me-shadow-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust`
- `node tools/rust-auth-me-cutover-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust`
- `node tools/rust-auth-write-cutover-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust`
- `node tools/rust-orders-write-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust`
- `node tools/rust-orders-write-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust --store-provider redis`
- `node tools/rust-orders-briefs-cutover-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust`
- `node tools/rust-orders-briefs-cutover-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust --store-provider redis`
- `node tools/rust-admin-orders-cutover-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust`
- `node tools/rust-admin-users-cutover-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust`
- `node tools/rust-admin-content-cutover-smoke.mjs --rust-bin rust-server/target/release/sobag-opt-rust`
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

The rehearsal prints exact `location = ...` blocks only. For `/api/auth/me`, the rehearsal must label the group as `GET+PUT` because `GET`-only Nginx cutover is unsafe for the current shared URL. It must reject generic `/api` and wildcard `/api/admin` locations.

Before a public `/api/auth/me` switch, run `tools/rust-auth-me-cutover-smoke.mjs`. It starts temporary Node and Rust runtimes with the same temporary file-store, simulates the exact future routing shape, keeps login/register/logout on Node, routes only `GET+PUT /api/auth/me` to Rust, verifies Node can read the Rust-written account state, and verifies unrelated APIs still fall back to Node.

Before public auth session write switches, run `tools/rust-auth-write-cutover-smoke.mjs`. It starts temporary Node and Rust runtimes with the same temporary file-store, simulates exact route-level cutover for `/api/auth/login`, `/api/auth/register`, and `/api/auth/logout`, verifies Rust registration, login by email and phone, logout/session clearing, Node fallback session visibility, access/validation guards, and unrelated APIs still fall back to Node.

Before a public `/api/orders` and `/api/briefs` switch, run `tools/rust-orders-briefs-cutover-smoke.mjs` twice: default file-store mode and `--store-provider redis`. It starts temporary Node and Rust runtimes with the same temporary store, simulates exact route-level cutover for only `/api/orders` and `/api/briefs`, verifies order and brief creation through Rust, verifies Node fallback `/api/admin/orders` sees the created records, verifies Node fallback `/api/auth/me` sees order profile side effects, and verifies unrelated APIs still fall back to Node.

Before a public `/api/admin/orders` switch, run `tools/rust-admin-orders-cutover-smoke.mjs`. It starts temporary Node and Rust runtimes with the same temporary file-store, simulates exact route-level cutover for only `/api/admin/orders`, verifies admin/manager reads and PATCH updates through Rust, verifies Node fallback `/api/auth/me` sees the safe customer-visible order update without internal CRM leakage, verifies access/validation guards, and verifies unrelated APIs still fall back to Node.

Before a public `/api/admin/users` switch, run `tools/rust-admin-users-cutover-smoke.mjs`. It starts temporary Node and Rust runtimes with the same temporary file-store, simulates exact route-level cutover for only `/api/admin/users`, verifies admin/manager list/detail reads, employee invite/role/delete writes through Rust, verifies Node fallback `/api/auth/me` sees Rust-created employee state, verifies access/validation/admin-lock guards, and verifies unrelated APIs still fall back to Node.

Before a public `/api/admin/content` switch, run `tools/rust-admin-content-cutover-smoke.mjs`. It starts temporary Node and Rust runtimes with the same temporary file-store, simulates exact route-level cutover for only `/api/admin/content`, verifies admin/content reads and content writes through Rust, verifies Node fallback `/api/content` sees the updated content, verifies review moderation hide/delete, verifies access/validation guards, and verifies unrelated APIs still fall back to Node.

Allowed exact locations after their gates:

- `location = /api/auth/me`
- `location = /api/auth/login`
- `location = /api/auth/register`
- `location = /api/auth/logout`
- `location = /api/orders`
- `location = /api/briefs`
- `location = /api/admin/orders`
- `location = /api/admin/users`
- `location = /api/admin/content`
- `location = /api/admin/pim`
- `location = /api/admin/prices`
- `location = /api/admin/catalog`
- `location = /api/admin/import-batches`
- `location = /api/admin/product-images`

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
