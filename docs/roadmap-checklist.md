# Sobag Opt Roadmap Checklist

Last updated: 2026-06-04

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

## Remaining Checklist

1. [done] Saved carts / commercial proposals polish:
   - [x] Saved proposals list as a separate account page: `quotes.html`.
   - [x] Saved proposal customer comment, internal manager comment, and history.
   - [x] Repeat saved proposal into cart with conflict warnings for changed prices or missing SKU.

2. [planned] Order/customer CRM polish:
   - [x] Basic order status history and manager note are already visible in admin/manager flows.
   - [x] Admin can open order detail, customer profile, export order CSV/XLSX, and print/PDF order.
   - [ ] Internal manager comments timeline beyond the current single manager note.
   - [ ] Customer-visible comments/status messages.
   - [x] Export order detail to XLSX from admin.
   - [ ] Better customer list and segmentation.

3. [planned] Import/PIM 2.0:
   - [ ] Import batches with preview report and rollback.
   - [ ] Product statuses: draft, published, hidden, archive.
   - [ ] Real object storage for product images instead of Git/static previews.
   - [ ] Separate normalized database for products, variants, images, tags, and imports.

4. [planned] SEO/content:
   - [ ] Fill final legal/company/contact copy.
   - [ ] Add Product/FAQ schema where appropriate.
   - [ ] SEO landing copy for important categories, collections, and holidays.
   - [ ] Yandex map final address setup.

5. [planned] Performance:
   - [ ] Server-side search/pagination for 10k+ products.
   - [ ] Image storage with responsive WebP/AVIF variants.
   - [ ] Catalog virtualization or smaller server pages.
   - [ ] Core Web Vitals audit after real catalog growth.

6. [planned] QA/security/ops:
   - [x] Stronger mojibake guard in AutoFix.
   - [ ] Automated production smoke after deploy.
   - [ ] Error monitoring/log review workflow.
   - [ ] Periodic security/access audit.
