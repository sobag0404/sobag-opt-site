# Sobag Cache Architecture

Status: target model and migration notes for the VPS/Rust production runtime.

## Target model

- Public HTML shells (`/`, `/catalog.html`, `/cart`, content pages): `Cache-Control: no-cache` or equivalent short revalidation. HTML must never be immutable because it carries versioned asset URLs.
- Versioned JS/CSS (`app.js?v=...`, `styles.css?v=...`, component scripts with `?v=`): `public, max-age=31536000, immutable`.
- Non-versioned JS/CSS: bounded public cache with validators (`ETag` / `Last-Modified`) so browser revalidation works.
- Images/assets: public cache. Immutable only when URL/versioning makes the asset content-addressed or release-versioned; otherwise use bounded TTL.
- Public catalog/product/price APIs (`/api/catalog-query`, `/api/catalog-detail`, `/api/price-list`): short public cache (`max-age=300, stale-while-revalidate=3600`) because they contain public data and are safe to revalidate frequently. Public price-list JSON/CSV stays grouped and compact by default; full SKU lists are only exposed via explicit `includeSkus=1` for diagnostics/admin-style checks.
- Private or user-specific APIs (`/api/auth/me`, cart/favorites/profile/order history, `/api/orders`, admin routes): `no-store`; any browser persistence is per-user local state, never shared public cache.

## Current layers

- Node static server `server.mjs`: sets HTML `no-cache`, versioned JS/CSS immutable, assets/data bounded public cache, API fallbacks `no-store`.
- Node compatibility routes: catalog/price public routes use short public cache; admin/auth/order routes use `no-store` through route helpers.
- Rust routes: public catalog/query/detail JSON and HTML fragments use short public cache; Rust full HTML shells for catalog/search/product/content pages use `no-cache`; auth/admin/order style routes use `no-store` helpers.
- Browser localStorage:
  - public API cache keys use an explicit `sobag.publicApiCache.vN.*` prefix with a request-shape scope before the normalized endpoint/query;
  - catalog-home summary cache uses the `sobag.catalogHomeSummary.*` family;
  - private cart/favorites/profile/order prototype keys are per browser/user and must not be treated as shared cache.
- Deploy workflow: release activation updates static files and versioned asset URLs, then `tools/cache-warmup-smoke.mjs` warms public paths from `tools/cache-warmup-manifest.mjs` and verifies cache headers before old-release cleanup. Production smoke reruns the same read-only warmup verification after canonical/performance/storage checks.
- No service worker cache is part of the current production model.

## Conflict risks

- A partial `/api/catalog-query?pageSize=48&category=...` listing response must never seed catalog-home category counts. Catalog-home counts must come from full summary facets (`/api/catalog-query?pageSize=1&sort=popular`) or a cache entry that has been validated as full-count data.
- Stale HTML can pin old asset versions, so HTML must stay revalidated and production smoke must check the current `app.js` / `components/app-data.js` cache-bust values.
- Public API cache keys must include the full path/query and request-shape scope (`catalog-home-summary`, `catalog-listing-initial`, `catalog-listing-page`, `catalog-detail`). Reusing a listing cache key for catalog-home summary is invalid.
- Private browser state (`cart`, `favorites`, auth/profile/order history, admin previews) must stay local/per-user and must not be exposed via public cache headers.

## Safe migration plan

1. Keep current HTTP header split; do not blindly delete browser caches.
2. On every deploy that changes catalog rendering or cache keys, bump HTML asset query versions and verify smoke catches stale references.
3. Add/keep production smoke coverage for:
   - `/catalog.html` current asset versions;
   - `/api/catalog-query?pageSize=1` full category counts where max category count exceeds page size when total exceeds page size;
   - HTML not aggressively cached;
   - public price-list cache;
   - private/admin/auth routes denied or `no-store`.
4. If client cache schema changes, migrate by version prefix (`sobag.publicApiCache.v3.*` or newer, or a new summary key) rather than global deletion.
5. Warm only safe public paths after deploy with `tools/cache-warmup-smoke.mjs`: `/`, `/catalog.html`, public catalog/search SSR pages, all static public content pages listed in the warmup manifest, representative category/search API queries, `/api/catalog-query?pageSize=1&sort=popular`, `/api/catalog-query?pageSize=48&sort=popular`, discovered `/api/catalog-detail?baseSku=...`, discovered `/product?baseSku=...` SSR pages, `/api/price-list?format=json`, and discovered versioned JS/CSS assets from HTML. First-view/discovered product images are warmed with bounded `GET` requests, because `HEAD` does not reliably populate the same cache path used by browser `<img>` loads. The same tool probes private/auth/admin/order paths only to assert `no-store` and never sends credentials or writes.

## Implemented VPS gates

- `.github/workflows/vps-deploy.yml` runs `node tools/cache-warmup-smoke.mjs --base-url https://sobag-shop.online --timeout 15000 --max-ms 5000` after the Rust/media route gates and before release housekeeping.
- `.github/workflows/production-smoke.yml` runs `tools/cache-warmup-smoke.mjs` after storage readiness, so a deploy must prove public cache warmup and private no-store behavior after the live release is active.
- `tools/cache-warmup-manifest.mjs` keeps the public warmup list bounded and reviewable: HTML/content pages, catalog/search/product public surfaces, representative catalog listing/category/search APIs, price-list JSON, fallback static assets, discovered versioned assets, mandatory first-view/discovered product-image `GET` requests, background catalog product-image `GET` batches, and private no-store probes.
- `npm run smoke:cache-warmup` exposes the read-only warmup locally; `npm run check` runs its self-test and the architecture/workflow audits.

## Image warmup tiers

- Synchronous deploy gate: `tools/cache-warmup-smoke.mjs` warms mandatory first-view/discovered product images with `GET` and discards the body after reading it. This covers root/catalog/product surfaces that a first human visitor would otherwise warm.
- Background bounded batch in the same deploy smoke: the warmer pages through representative public catalog results and GET-warms remaining discovered catalog card/image variant URLs with concurrency and count limits (`maxBackgroundCatalogPages`, `maxBackgroundImages`, `backgroundImageConcurrency`). It reports counts instead of logging full catalogs.
- Intentionally not warmed: private/admin/account/cart/order/user-specific URLs and any unbounded full SKU/gallery universe beyond the safe public catalog batch limits. If the product image set grows beyond the configured cap, the smoke reports the discovered/warmed counts so the cap can be reviewed without overloading VPS or object storage.

## Remaining risks

- External browser caches can still hold old HTML until revalidation completes; this is why HTML stays `no-cache` and deploy smoke checks current asset references instead of relying on manual cache deletion.
- Public API cache entries are intentionally short-lived. If catalog data changes outside a deploy, the five-minute cache window is expected unless a future server-side purge hook is added.
- Browser localStorage migration remains a UI-owned concern; backend gates only verify that public API/cache headers cannot serve partial listing counts as catalog-home summary data.
