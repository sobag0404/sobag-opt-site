# Sobag Cache Architecture

Status: target model and migration notes for the VPS/Rust production runtime.

## Target model

- Public HTML shells (`/`, `/catalog.html`, `/cart`, content pages): `Cache-Control: no-cache` or equivalent short revalidation. HTML must never be immutable because it carries versioned asset URLs.
- Versioned JS/CSS (`app.js?v=...`, `styles.css?v=...`, component scripts with `?v=`): `public, max-age=31536000, immutable`.
- Non-versioned JS/CSS: bounded public cache with validators (`ETag` / `Last-Modified`) so browser revalidation works.
- Images/assets: public cache. Immutable only when URL/versioning makes the asset content-addressed or release-versioned; otherwise use bounded TTL.
- Public catalog/product/price APIs (`/api/catalog-query`, `/api/catalog-detail`, `/api/price-list`): short public cache (`max-age=300, stale-while-revalidate=3600`) because they contain public data and are safe to revalidate frequently.
- Private or user-specific APIs (`/api/auth/me`, cart/favorites/profile/order history, `/api/orders`, admin routes): `no-store`; any browser persistence is per-user local state, never shared public cache.

## Current layers

- Node static server `server.mjs`: sets HTML `no-cache`, versioned JS/CSS immutable, assets/data bounded public cache, API fallbacks `no-store`.
- Node compatibility routes: catalog/price public routes use short public cache; admin/auth/order routes use `no-store` through route helpers.
- Rust routes: public catalog/query/detail use short public cache; auth/admin/order style routes use `no-store` helpers.
- Browser localStorage:
  - public API cache keys use `sobag.publicApiCache.v2.*`;
  - catalog-home summary cache uses the `sobag_catalog_home_summary_*` family;
  - private cart/favorites/profile/order prototype keys are per browser/user and must not be treated as shared cache.
- Deploy workflow: release activation updates static files and versioned asset URLs, then production smoke/performance smoke verify canonical routing, cache headers, price-list, catalog counts, and protected route denial.
- No service worker cache is part of the current production model.

## Conflict risks

- A partial `/api/catalog-query?pageSize=48&category=...` listing response must never seed catalog-home category counts. Catalog-home counts must come from full summary facets (`/api/catalog-query?pageSize=1&sort=popular`) or a cache entry that has been validated as full-count data.
- Stale HTML can pin old asset versions, so HTML must stay revalidated and production smoke must check the current `app.js` / `components/app-data.js` cache-bust values.
- Public API cache keys must include the full path/query. Reusing a listing cache key for catalog-home summary is invalid.
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
4. If client cache schema changes, migrate by version prefix (`sobag.publicApiCache.v3.*` or new summary key) rather than global deletion.
5. Warm only safe public paths after deploy: `/`, `/catalog.html`, `/api/catalog-query?pageSize=1&sort=popular`, `/api/catalog-query?pageSize=48&sort=popular`, `/api/price-list?format=json`, and representative static assets. Do not warm private/admin/auth writes.

