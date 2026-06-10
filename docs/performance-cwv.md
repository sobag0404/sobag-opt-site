# Performance And Core Web Vitals

Last updated: 2026-06-10

## Current Guardrails

The current production architecture keeps the public catalog fast by default:

- public listings use `/api/catalog-query` compact cards;
- product modal detail hydrates through `/api/catalog-detail`;
- successful public listing pages avoid a full `/api/catalog` bootstrap;
- server and local fallback pages use 48-card chunks;
- cursor pagination appends new cards and keeps already-rendered nodes stable;
- product cards use rendering containment;
- public catalog query/detail JSON can be browser-cached briefly;
- account, order, admin, and auth APIs stay `no-store`.

## Offline Checks

Run before push:

```powershell
npm.cmd run audit:performance
npm.cmd run audit:cwv
```

`audit:cwv` checks readiness only. It does not claim real field Core Web Vitals. It verifies:

- JS/CSS bundle budgets;
- deferred script loading on key pages;
- image width/height/decoding hints in static HTML;
- 48-card server pages;
- no Date.now cache-busting on catalog fetch;
- skeleton loading state;
- append-only cursor rendering;
- product-card `content-visibility` containment;
- public cache headers for `/api/catalog-query`, `/api/catalog-detail`, and `data/products-live.json`;
- current image migration readiness status.

## When To Run Real CWV

Run a real Core Web Vitals audit only after:

- the real object-storage photo set is migrated;
- WebP/AVIF variants are available for the migrated set;
- product count and filters are close to the expected production scale;
- production or a staging copy uses the same VPS/static/API/cache behavior.

Recommended pages:

- `/`
- `/catalog`
- `/catalog?category=Подушки`
- `/search?q=подушка`
- `/cart`
- one product modal from a large category

Record LCP, CLS, INP/TBT, total transfer size, image format usage, and first-page API payload. Do not mark final CWV done from synthetic 808-product data.
