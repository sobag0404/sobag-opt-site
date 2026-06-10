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
- public catalog query/detail responses are also cached in bounded localStorage for faster repeat navigation;
- VPS static assets return ETag/Last-Modified validators and support conditional 304 responses plus HEAD requests;
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
- static ETag/Last-Modified conditional cache validation and HEAD support on the VPS server;
- bounded browser cache for public catalog query/detail responses;
- current image migration readiness status;
- no static XLSX CDN load during first render; SheetJS is lazy-loaded only when a user imports/exports XLSX.

## Production Performance Smoke

After deploy, use the read-only production performance smoke to verify current payload and cache invariants on the live VPS:

```powershell
npm.cmd run smoke:prod:performance -- --base-url https://sobag-shop.online
```

It checks that `/api/catalog-query?pageSize=48` stays compact, does not include full variants/gallery/detail fields, has public cache headers, and that `/api/catalog-detail`, `app.js`, and `styles.css` stay within bounded response-size and response-time budgets. Static assets must expose validator headers, return `304` on conditional requests, and support `HEAD` without a body. AutoFix runs only the offline self-test; the live command is for post-deploy verification.

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

Use an ignored local packet to validate the final field audit before marking this done:

```powershell
npm.cmd run audit:cwv-field -- --packet local-import-output/cwv-field-audit-packet.json --strict
```
