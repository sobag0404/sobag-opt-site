# Rust SSR Cutover Runbook

Last updated: 2026-06-11

Purpose: prepare the future Nginx switch of public SSR pages from Node/static to Rust Axum without removing Node or touching production data.

## Scope

Candidate public paths:

- `/catalog`
- `/search`
- `/product`
- `/catalog-fragment`
- `/search-fragment`
- `/product-fragment`
- `/about`
- `/business`
- `/marketplaces`
- `/contacts`
- `/how-to-order`
- `/delivery`
- `/payment`
- `/returns`
- `/seller-support`
- `/wholesale`

Existing Rust API routes stay unchanged:

- `/api/catalog-query`
- `/api/catalog-detail`

Node remains fallback for cart, auth, orders, account, admin, import/PIM, content writes, and any route not explicitly switched.

## Required Pre-Cutover Gates

Run before changing Nginx:

```bash
cargo test --locked
cargo build --release --locked
node tools/rust-ssr-smoke.mjs --base http://127.0.0.1:3001
node tools/rust-catalog-shadow-smoke.mjs --node-base http://127.0.0.1:3000 --rust-base http://127.0.0.1:3001
curl -fsS http://127.0.0.1:3001/api/health-rust
curl -fsS http://127.0.0.1:3000/api/health
```

From the local machine:

```powershell
npm.cmd run check
npm.cmd run ui:smoke
npm.cmd run smoke:prod -- --base-url https://sobag-shop.online
```

## Nginx Cutover Shape

Only add exact public page locations or a tightly scoped regex for the candidate paths. Keep the generic `location /` proxy to Node.

Expected upstreams:

- Node: `127.0.0.1:3000`
- Rust: `127.0.0.1:3001`

Do not route these to Rust yet:

- `/cart`
- `/account`
- `/quotes`
- `/favorites`
- `/custom`
- `/api/auth/*`
- `/api/orders`
- `/api/briefs`
- `/api/admin/*`
- `/api/content`

## Post-Cutover Checks

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -fsS https://sobag-shop.online/catalog
curl -fsS "https://sobag-shop.online/search?q=opt_70190"
curl -fsS "https://sobag-shop.online/product?baseSku=opt_70190"
curl -fsS https://sobag-shop.online/about
curl -fsS https://sobag-shop.online/api/health
```

Then run:

```powershell
npm.cmd run smoke:prod -- --base-url https://sobag-shop.online
npm.cmd run ui:smoke
```

## Rollback

Rollback must be only routing-level:

1. Remove the new SSR page locations from `/etc/nginx/sites-available/sobag-opt`.
2. Keep the existing Rust API locations for `/api/catalog-query` and `/api/catalog-detail` unless those are unhealthy too.
3. Validate and reload Nginx.
4. Verify Node public pages and Rust catalog API still respond.

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -fsS https://sobag-shop.online/catalog
curl -fsS https://sobag-shop.online/api/catalog-query?pageSize=2
```

Do not edit production env, secrets, database data, file-store data, or user data during rollback.

