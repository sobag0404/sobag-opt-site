# Sobag Opt Launch Handoff

Last updated: 2026-06-25.

## Current release

- Current accepted production HEAD: `07d64f8` (`Fix catalog loading count state`).
- VPS release evidence: `/opt/sobag-opt/releases/20260625T104445Z-07d64f8`.
- GitHub Actions for `07d64f8`:
  - `autofix-check` `28164554160` PASS
  - `rust-check` `28164554147` PASS
  - `vps-deploy` `28164606066` PASS
  - `production-smoke` `28165099447` PASS
  - `live-ui-smoke` `28165201418` PASS

## Live acceptance evidence

- `/api/health`: 200, `Cache-Control: no-store`, Redis/object storage/catalog DB configured.
- `/`: 200, HTML `no-cache`; `/index.html`: canonical redirect behavior is covered by production smoke.
- `/catalog.html`: 200, HTML `no-cache`; live UI smoke verifies no stale page-sized `48` catalog count regression.
- `/api/catalog-query?pageSize=1&sort=popular`: public short cache, full category facets. Latest live categories included counts above page size: `Наволочки 517`, `Подушки 517`, `Мешки для обуви 170`, `Флаги 65`, `Чехлы на чемодан 37`, `Ремувки 19`.
- `/api/price-list?format=json`: 200, public short cache, non-zero grouped price rows.
- `/api/rum`: 202 for a safe public metric payload, `Cache-Control: no-store`.
- `/sw.js`: served with revalidation cache behavior; live UI smoke checks service-worker runtime errors.

## Performance and cache

Latest live backend/cache measurement from the VPS after deploy:

- `/catalog.html`: 8ms.
- `/catalog.html` + `/api/catalog-query?pageSize=1&sort=popular`: 475ms combined budget path.
- First catalog-card image GETs: 2-4ms each for the sampled first-card images.
- `/api/catalog-query?pageSize=48&sort=popular`: 593ms.
- `/api/price-list?format=json`: 805ms.

Deploy warmup:

- Synchronous public warmup covers `/`, `/catalog.html`, catalog/search/product SSR surfaces, all manifest-listed static public content pages, representative catalog/search APIs, catalog detail APIs, price-list JSON, discovered versioned JS/CSS assets, and mandatory first-view product images by GET.
- Latest warmup evidence: `mandatoryImageGets=16`, `backgroundCatalogPages=17`, `backgroundProductPagesDiscovered=80`, `backgroundProductPagesWarmed=78`, `backgroundImagesDiscovered=749`, `backgroundImagesWarmed=738`.
- Background image warmup uses bounded catalog page/image batches with low concurrency; private/admin/account/cart/order/user-specific routes are never warmed and are only probed for no-store/anonymous denial.

## Verification commands

Safe local checks:

```powershell
npm.cmd run check
git diff --check
```

Safe live checks from a network-enabled runner or VPS:

```bash
node tools/production-smoke.mjs --timeout 15000 --retries 6 --retry-delay 20000
node tools/production-performance-smoke.mjs --timeout 15000 --max-ms 5000 --catalog-api-max-ms 2000 --catalog-first-load-max-ms 2500 --image-max-ms 2000
node tools/cache-warmup-smoke.mjs --base-url https://sobag-shop.online --timeout 15000 --max-ms 5000
node tools/live-ui-smoke.mjs --base-url https://sobag-shop.online --timeout 15000
```

## Deploy and rollback notes

- Production target is VPS only. Do not re-enable Vercel/Next.js deployment.
- Deploy runs through GitHub Actions `vps-deploy`; production readiness is gated by `production-smoke` and then `live-ui-smoke`.
- Rollback should use the existing VPS release/route backup workflow; do not delete production catalog, order, review, audit, Redis, PostgreSQL, or MinIO data.
- If a future deploy changes public catalog rendering/cache keys, bump versioned asset URLs and keep HTML revalidated rather than deleting browser-private data.

## Non-blocking follow-ups

- Browser-side perceived loading can still be tuned by UI work, but backend/cache/live timings are within the current production budgets.
- RUM storage is first-party and compact; a richer admin dashboard for p75 field data is optional future work.
- Business decision still needed before using promo prices in order totals; current server-side order pricing intentionally preserves base trusted price precedence.
