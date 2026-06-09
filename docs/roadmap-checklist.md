# Sobag Opt Roadmap Checklist

Last updated: 2026-06-09

## Already Mostly Done

- [x] Multi-page structure: home, catalog, favorites, cart, custom print, marketplaces, about, contacts, business terms.
- [x] Smart-ish catalog ranking: exact SKU first, exact name next, then similar text/theme matches.
- [x] Catalog URL state for category, collection, holiday, filters, and query.
- [x] Active filter chips above product grid.
- [x] Empty filter groups hidden when no matching values exist.
- [x] Recently viewed products.
- [x] Related products in product modal.
- [x] Product variant matrix: type, size, material, SKU, price, quick quantity.
- [x] Cart as commercial proposal: save draft, restore, rename, XLSX/CSV export, print/PDF, send to manager.
- [x] Buyer account basics: profile, companies/requisites, addresses, order history, favorites, saved carts.
- [x] Admin/manager order pages with statuses, manager notes, customer profile links, and status history.
- [x] Server-backed auth/orders/catalog/content through existing Vercel Functions and KV/Redis-compatible storage.
- [x] Admin catalog tools: products, prices, import, content, users/roles.
- [x] Product import workflow and local importer.
- [x] Basic SEO pages, sitemap, robots, Organization/CollectionPage/BreadcrumbList JSON-LD.
- [x] Smoke tests and autofix checks.
- [x] Separate search results page: `/search?q=...`, result count, suggestions, quick filters, exact SKU priority, production check.
- [x] Product reviews: authorized buyer form, rating/text, approved reviews in product modal, admin moderation and persistence through existing storage/API.
- [x] Goal-mode UI invariant: product photos and category/collection/holiday photos render as square 1:1 previews; selected catalog pages use `В каталог`, not `На главную`, for the top/catalog return action.

## Remaining Checklist

1. [done] Saved carts / commercial proposals polish:
   - [x] Saved proposals list as a separate account page: `quotes.html`.
   - [x] Saved proposal customer comment, internal manager comment, and history.
   - [x] Repeat saved proposal into cart with conflict warnings for changed prices or missing SKU.

2. [done] Order/customer CRM polish:
   - [x] Basic order status history and manager note are already visible in admin/manager flows.
   - [x] Admin can open order detail, customer profile, export order CSV/XLSX, and print/PDF order.
   - [x] Internal manager comments timeline beyond the current single manager note.
   - [x] Customer-visible comments/status messages.
   - [x] Export order detail to XLSX from admin.
   - [x] Better customer list and segmentation.

3. [planned] Import/PIM 2.0:
  - [x] Import batches with preview report and rollback.
     - First slice: KV-backed `/api/admin/import-batches`, admin preview/apply/reject/CSV report UI, and latest applied batch rollback snapshot.
     - Explicit update-existing mode in admin import UI: existing products update only when enabled, imports never delete old products, and omitted status/images are preserved on update.
   - [x] Product statuses: draft, published, hidden, archive.
   - [ ] Real object storage for product images instead of Git/static previews.
     - [x] First slice: object storage adapter, Vercel Blob provider, admin image API, product image metadata shape, and stronger ignored local photo folders.
     - [x] Admin import photo flow: preview matching, missing/repeated/failed/uploaded report, Blob API upload, and refreshed preview batch with image metadata.
     - [ ] Bulk CLI/importer photo migration to Blob/S3 and responsive WebP/AVIF variants for large catalogs.
       - [x] Bulk CLI upload/report path: `tools/bulk-upload-product-photos.mjs` scans product photo folders, supports dry-run, uploads through the object-storage adapter, writes CSV report, and outputs products JSON with image metadata without using JSON upload bodies.
       - [x] Responsive WebP/AVIF variants for large catalogs: bulk CLI supports `--responsive`, dry-run variant planning, optional Sharp-based generation/upload, image metadata `variants`, and WebP `srcset` rendering in product UI.
       - [x] S3-compatible provider for VPS/MinIO/R2: real SigV4 upload/list/delete adapter, safe readiness status, bulk CLI provider support, and offline smoke coverage.
   - [ ] Separate normalized database for products, variants, images, tags, and imports.
     - [x] First compatible sidecar payload in the current catalog storage shape: normalized products, variants, images, taxonomies, counts, and safe import batch summaries.
     - [x] Admin diagnostics/export endpoint for the PIM sidecar: summary/full/table views and CSV exports for products, variants, images, taxonomies, and import batches.
     - [x] VPS storage bridge: explicit `SOBAG_STORE_PROVIDER=file` backend for shared data, catalog, content, import batches, and sessions, while Vercel stays on Redis/KV.
     - [ ] Later DB/storage split for product, variant, image, taxonomy, and import-batch entities.

4. [planned] SEO/content:
   - [ ] Fill final legal/company/contact copy.
     - [x] First production-safe public copy pass: removed test/prototype wording from about, contacts, business, marketplace, footer, cart promo, and terms fallbacks without inventing final legal реквизиты or address.
   - [x] Add Product/FAQ schema where appropriate.
     - [x] Product schema for public product modal/detail state, including offers, images, and approved review aggregate data.
     - [x] FAQ schema for the real business terms FAQ block.
   - [ ] SEO landing copy for important categories, collections, and holidays.
     - [x] First catalog landing copy slice: selected category/collection/holiday pages now render contextual SEO copy from the current content/catalog state.
     - [x] Editable SEO descriptions for default collections and holidays: admin content supports `name | description | icon`, with backward compatibility for old `name | icon` rows.
   - [ ] Yandex map final address setup.

5. [planned] Performance:
   - [ ] Server-side search/pagination for 10k+ products.
     - [x] First compatible backend slice: `/api/catalog-query` for published card results with query/filter/sort/page/cursor and `/api/catalog-detail` for full published product payloads.
     - [x] Migrate frontend catalog list/product modal to the new smaller API payloads.
       - [x] Product modal now hydrates public product detail from `/api/catalog-detail` with static/local fallback.
       - [x] Catalog/search list rendering now uses `/api/catalog-query` compact cards and cursor pagination with local fallback.
     - [x] Full server-side facet UI migration beyond the current fallback filter controls: `/api/catalog-query` now returns `facetOptions`, and visible catalog/search filters use them with local fallback.
     - [x] Avoid full `/api/catalog` bootstrap on public server-query listing pages when `/api/catalog-query` succeeds, with full/static fallback when the query endpoint is unavailable.
   - [ ] Image storage with responsive WebP/AVIF variants.
     - [x] Frontend `<picture>` rendering uses stored AVIF sources first and WebP fallback for product cards, related cards, product modal/gallery, and admin product previews.
     - [ ] Validate WebP/AVIF behavior on the real migrated catalog image set.
   - [ ] Catalog virtualization or smaller server pages.
     - [x] Smaller public catalog page payload: frontend now requests `/api/catalog-query` with the server default `pageSize=48` instead of 120, and UI smoke asserts the request size.
     - [x] Smaller local fallback catalog pages: when `/api/catalog-query` is unavailable, the client renders 48 cards per step instead of 120.
   - [ ] Core Web Vitals audit after real catalog growth.

6. [planned] QA/security/ops:
   - [x] VPS runtime path: `server.mjs` serves static clean URLs plus existing `/api/*` handlers, with file-store read/write smoke coverage and Vercel fallback preserved.
   - [x] VPS env preflight: `tools/vps-preflight.mjs` checks Node 20+, file-store readiness, bootstrap admin env, and S3-compatible object-storage env without printing secrets; AutoFix covers the self-test fixture.
   - [x] VPS file-store backup/restore fixture: `tools/file-store-backup.mjs` copies only JSON store records with a manifest, supports guarded restore, and AutoFix covers the self-test.
   - [x] Stronger mojibake guard in AutoFix.
   - [x] Automated production smoke after deploy.
     - [x] Read-only production smoke script for `/`, `/catalog`, `/cart`, and `/api/health`, with offline self-test in AutoFix.
     - [x] Wire the live smoke into the post-deploy routine after push/deploy: GitHub Actions runs it after successful `autofix-check` on `main`, with manual fallback/preview dispatch support.
   - [x] Error monitoring/log review workflow.
     - [x] Structured server-side `api_error` logs in the shared API error handler with request ids.
     - [x] `tools/error-log-audit.mjs`, npm script `audit:errors`, AutoFix coverage, and `docs/error-log-review.md` runbook.
   - [x] Periodic security/access audit.
     - [x] Static API access matrix in `tools/access-audit.mjs`, npm script `audit:access`, and AutoFix/weekly GitHub Actions coverage.
