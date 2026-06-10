# Catalog Server Query API

Last updated: 2026-06-10

## Goal

This is the first performance slice for a 10k+ product catalog. The current public `/api/catalog` stays compatible and can still return the full published catalog. New endpoints provide smaller server-side list/detail payloads so the frontend can migrate in steps.

## Endpoints

### `GET /api/catalog-query`

Returns published product cards only. Draft, hidden, and archived products are excluded.

Supported query parameters:

- `q` or `query`: text or SKU search.
- `category` / `categories`
- `collection` / `collections`
- `holiday` / `holidays`
- `tag` / `tags`
- `type` / `types`
- `size` / `sizes`
- `material` / `materials`
- `stock`
- `minPrice`
- `maxPrice`
- `sort`: `relevance`, `name`, `price_asc`, `price_desc`, `sku`, `popular`.
- `pageSize` or `limit`: defaults to 48, capped at 120.
- `page`: 1-based page number.
- `cursor`: opaque cursor from `pageInfo.nextCursor`.

Repeated params and comma/semicolon separated values are both accepted:

```text
/api/catalog-query?category=Подушки&material=Велюр&material=Габардин&pageSize=24
/api/catalog-query?categories=Подушки; Наволочки&sort=sku
```

Response shape:

```json
{
  "items": [],
  "total": 0,
  "facets": {},
  "facetOptions": {},
  "pageInfo": {
    "page": 1,
    "pageSize": 48,
    "offset": 0,
    "total": 0,
    "totalPages": 1,
    "hasMore": false,
    "nextCursor": ""
  },
  "applied": {},
  "updatedAt": null,
  "source": "server"
}
```

`items` are card payloads. They include price range, primary image metadata, taxonomy arrays, and variant counts, but not full gallery, gallery counts, detail copy, or full variants.

`facets` describe the current filtered result set. `facetOptions` are prepared for UI filter controls: each bucket is calculated with the current query and all other filters, but without the filter from the same bucket. This keeps alternative values visible in the active group while still respecting the rest of the search context.

### `GET /api/catalog-detail`

Returns one published product with generated variants and image records.

Lookup params:

- `id`
- `baseSku`
- `sku` for either base SKU or generated variant SKU.

Example:

```text
/api/catalog-detail?baseSku=opt_00104
```

Response shape:

```json
{
  "product": {
    "id": "opt-00104-f0ab1b",
    "baseSku": "opt_00104",
    "variants": [],
    "images": []
  },
  "updatedAt": null,
  "source": "server"
}
```

## Compatibility

Both endpoints read the server catalog from storage when available and fall back to `data/products-live.json` when storage env is absent. They do not write to KV/Redis and do not expose PIM sidecar internals.

The product modal tries `/api/catalog-detail` before rendering, then falls back to the already loaded local product when the API is unavailable or returns 404. This keeps static local development working while letting production hydrate full detail from the smaller endpoint.

The public catalog/search list now progressively uses `/api/catalog-query` for compact card payloads, total counts, cursor-based "load more" pagination, and visible filter options from `facetOptions`. On active server-query listing pages, successful `/api/catalog-query` bootstrap skips the full `/api/catalog` request. If the endpoint is unavailable, the old local/full-catalog rendering path remains the fallback. Favorites, catalog home, empty search, and admin catalog screens still use the local/admin/full catalog flow.

The frontend requests the server default `pageSize=48` for public listing pages, so the initial list and cursor pages do not force the previous 120-card payload. Cursor-page rendering appends new product cards instead of replacing the existing first-page DOM, and product cards use browser rendering containment (`content-visibility`) to reduce layout/paint work on long lists.

`npm run check` also runs an offline 10k-product synthetic scale smoke (`tools/catalog-query-scale-smoke.mjs`). It verifies published-only filtering, 48-card cursor pages, compact card payloads without full variants/images/detail/gallery fields, exact SKU lookup, and full detail hydration through the same query helpers.

`npm run audit:performance` runs `tools/catalog-performance-audit.mjs`. It checks the current catalog performance invariants: 48-card server pages, compact list payloads, append-only cursor rendering hooks, product-card rendering containment, and current real-catalog image migration readiness.

`npm run audit:cwv` runs `tools/core-web-vitals-readiness.mjs`. It is not a replacement for a real Core Web Vitals field/lab measurement after the catalog and photo set grow. It is a readiness gate that keeps the current performance assumptions true: JS/CSS bundle budgets, deferred scripts, static image hints, public cache headers for catalog query/detail data, skeleton loading, no cache-busting full catalog bootstrap, 48-card server pages, append-only cursor rendering, and product-card containment.

The Playwright UI smoke includes a synthetic 10k server-query catalog case. It verifies bounded DOM growth after repeated cursor pages, a stable first-page card node, 48-card requests, and no full `/api/catalog` bootstrap while `/api/catalog-query` succeeds.
