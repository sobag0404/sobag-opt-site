# Catalog Server Query API

Last updated: 2026-06-04

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

`items` are card payloads. They include price range, primary image metadata, taxonomy arrays, and counts, but not full gallery or full variants.

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

The public catalog/search list now progressively uses `/api/catalog-query` for compact card payloads, total counts, and cursor-based "load more" pagination. If the endpoint is unavailable, the old local/full-catalog rendering path remains the fallback. Favorites and admin catalog screens still use the local/admin catalog flow.

The next performance slice can move the visible filter/facet controls fully to the server facet payload and then add virtualization or smaller server-rendered pages for very large catalogs.
