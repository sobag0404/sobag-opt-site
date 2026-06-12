# Rust SSR Cutover Runbook

Last updated: 2026-06-12

Purpose: guide and document the Nginx switch of public SSR pages from Node/static to Rust Axum without removing Node or touching production data.

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

## Current Production State

Applied on 2026-06-12:

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

These exact routes are routed by Nginx to `sobag_opt_rust` on the VPS. The generic `location /` still proxies to Node.

Rollback backup created on the VPS:

```bash
/etc/nginx/sites-available/sobag-opt.pre-rust-ssr-20260612065616
/etc/nginx/sites-available/sobag-opt.pre-rust-content-ssr-20260612075815
```

## Required Pre-Cutover Gates

Run before changing Nginx:

```bash
cargo test --locked
cargo build --release --locked
node tools/rust-ssr-smoke.mjs --base http://127.0.0.1:3001
node tools/rust-ssr-browser-smoke.mjs --base http://127.0.0.1:3001
node tools/rust-catalog-shadow-smoke.mjs --node-base http://127.0.0.1:3000 --rust-base http://127.0.0.1:3001
curl -fsS http://127.0.0.1:3001/api/health-rust
curl -fsS http://127.0.0.1:3000/api/health
```

Public Rust pages must not expose preview/debug branding such as `Rust Preview` or service labels such as `Node fallback` in page titles, links, or body text before any public route is switched.

Product pages must keep cart compatibility before cutover: Rust SSR product pages include the cart bridge script that writes the same `sobag.cart.guest` / `sobag.cart.<user>` localStorage entries as the current storefront and syncs authenticated carts through `/api/auth/me`.

From the local machine:

```powershell
npm.cmd run check
npm.cmd run ui:smoke
npm.cmd run smoke:prod -- --base-url https://sobag-shop.online
```

## Route Rehearsal

Before editing Nginx, generate the exact allowed `location = ...` blocks:

```powershell
npm run rehearse:rust-ssr-routes
npm run rehearse:rust-ssr-routes -- --group catalog-pages
npm run rehearse:rust-ssr-routes -- --group catalog-fragments
npm run rehearse:rust-ssr-routes -- --group content-pages
```

The rehearsal must output only exact locations for the candidate paths and must reject generic `location /`, `/api`, `/api/admin`, cart, account, favorites, custom print, auth, orders, briefs, admin, and content-write routes.

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
npm.cmd run smoke:rust:public-routes -- --base https://sobag-shop.online
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
