# Sobag Opt Roadmap Checklist

Last updated: 2026-06-03

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

## Remaining Checklist

1. [in progress] Separate search results page:
   - [x] Dedicated `search.html` route.
   - [x] Header search opens `/search?q=...`.
   - [x] Search URL is preserved and refresh-safe.
   - [x] Result count, "maybe you searched", and quick filters.
   - [x] Exact SKU queries with digits return SKU matches instead of all `opt_*` products.
   - [x] Production verification after deploy.

2. [planned] Product reviews:
   - [ ] Registered buyers can leave star rating and text.
   - [ ] Reviews appear in product modal.
   - [ ] Admin sees all reviews.
   - [ ] Admin can approve, hide, edit status, or delete reviews.
   - [ ] Review data persists through existing storage without adding extra Hobby-plan Functions.

3. [planned] Saved carts / commercial proposals polish:
   - [ ] Saved proposals list as a separate account tab/page.
   - [ ] Saved proposal comments and manager reply history.
   - [ ] Repeat saved proposal into cart with conflict warnings for changed prices.

4. [planned] Order/customer CRM polish:
   - [ ] Internal manager comments timeline.
   - [ ] Customer-visible comments/status messages.
   - [ ] Export order detail to XLSX/PDF from admin.
   - [ ] Better customer list and segmentation.

5. [planned] Import/PIM 2.0:
   - [ ] Import batches with preview report and rollback.
   - [ ] Product statuses: draft, published, hidden, archive.
   - [ ] Real object storage for product images instead of Git/static previews.
   - [ ] Separate normalized database for products, variants, images, tags, and imports.

6. [planned] SEO/content:
   - [ ] Fill final legal/company/contact copy.
   - [ ] Add Product/FAQ schema where appropriate.
   - [ ] SEO landing copy for important categories, collections, and holidays.
   - [ ] Yandex map final address setup.

7. [planned] Performance:
   - [ ] Server-side search/pagination for 10k+ products.
   - [ ] Image storage with responsive WebP/AVIF variants.
   - [ ] Catalog virtualization or smaller server pages.
   - [ ] Core Web Vitals audit after real catalog growth.

8. [planned] QA/security/ops:
   - [x] Stronger mojibake guard in AutoFix.
   - [ ] Automated production smoke after deploy.
   - [ ] Error monitoring/log review workflow.
   - [ ] Periodic security/access audit.
