# Sobag Opt Roadmap Checklist

Last updated: 2026-06-11

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
- [x] Buyer account basics: profile, companies/requisites, addresses, dedicated order tab with statuses/messages, favorites, saved carts.
- [x] Admin/manager order pages with statuses, manager notes, customer profile links, and status history.
- [x] Server-backed auth/orders/catalog/content through the shared API handlers; active production target is VPS only.
- [x] Admin catalog tools: products, prices, import, content, users/roles, employees/manager access by email.
- [x] Product import workflow and local importer.
- [x] Basic SEO pages, sitemap, robots, Organization/CollectionPage/BreadcrumbList JSON-LD.
- [x] Footer informational pages exist for order flow, delivery, payment, returns, seller support, and wholesale lots, with editable admin content fields.
- [x] Custom print form is no longer fake: `/api/briefs` saves a server-side custom-print request, mirrors it into admin/manager order workflow, and VPS write-smoke verifies admin visibility.
- [x] Privacy/legal split: `privacy.html` is separate from the personal-data consent PDF, and footer/sitemap/content audit include the new privacy page.
- [x] Cart minimum is enforced consistently: UI blocks checkout below 30 000 ₽, saved quote sending checks the same minimum, and `/api/orders` rejects below-minimum order totals.
- [x] Contacts maps do not render for unconfirmed address text; legal/production maps appear only after admin content contains a concrete address.
- [x] P1 commercial UX polish: compact mobile header, balanced responsive hero H1, product modal quantity starts at 1 while still allowing 0, inactive promo field with honest manager note, and compact catalog collection list with show-more.
- [x] Smoke tests and autofix checks.
- [x] Separate search results page: `/search?q=...`, result count, suggestions, quick filters, exact SKU priority, production check.
- [x] Product reviews: authorized buyer form, rating/text, approved reviews in product modal, admin moderation and persistence through existing storage/API.
- [x] Goal-mode UI invariant: product photos and category/collection/holiday photos render as square 1:1 previews; catalog home uses `На главную`, while selected catalog pages use `В каталог` for the top return action.
- [x] Compact selected catalog header: category pages use one dense row with back button, title, count, and sorting, without the old large white heading area.

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
   - [x] Buyer account `Заказы` tab with order history, statuses, customer/admin messages, and repeat-order action.
   - [x] Export order detail to XLSX from admin.
   - [x] Better customer list and segmentation.
   - [x] Server-only order persistence guard: buyer/cart/saved-quote submissions and CRM order actions no longer report success from local-only fallback; guest order visibility is covered by VPS write smoke.

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
       - [x] Photo migration readiness audit: `tools/photo-migration-readiness.mjs` reports provider readiness, ignored raw/bulk folders, image metadata coverage, square image readiness, and WebP/AVIF readiness without uploading, deleting, or printing secrets.
       - [x] Photo migration manifest planner: `tools/photo-migration-manifest.mjs` matches local photo folders to products and writes a safe upload/variant manifest before real storage migration.
       - [x] Photo migration manifest audit: `tools/photo-migration-manifest-audit.mjs` validates pilot/full manifests before real upload, including counts, portable relative paths, provider label, `products/` storage prefixes, image extensions, and WebP/AVIF variant planning.
       - [x] Photo migration candidate audit: `tools/photo-migration-candidate-audit.mjs` verifies a candidate products JSON before publication, ensuring products are not removed, protected catalog fields stay unchanged, image metadata is complete/square/provider-safe, and optional WebP/AVIF variants exist.
       - [x] Photo migration pilot smoke: `tools/photo-migration-pilot-smoke.mjs` runs an offline end-to-end pilot over manifest planning, manifest audit, bulk CLI dry-run, and candidate metadata audit without uploads, deletes, secrets, or production data changes.
       - [x] Production storage readiness smoke: `tools/production-storage-readiness.mjs` reads live `/api/health` and reports object-storage/future DB cutover readiness without failing on pending env unless explicit `--require-*` cutover flags are used.
       - [x] Photo storage cutover runbook/audit: `docs/photo-storage-cutover-runbook.md` and `tools/photo-storage-cutover-audit.mjs` document and enforce the safe sequence for real provider setup, manifest planning, pilot upload, candidate audit, production readiness, and rollback without secrets or raw photos in Git.
       - [x] Object storage env packet validator: `docs/object-storage-env-packet.md` and `tools/object-storage-env-packet-audit.mjs` define an ignored no-secret provider readiness packet for S3-compatible/Vercel Blob settings before real photo migration.
       - [x] Object storage apply plan: `docs/object-storage-apply-plan.md` and `tools/object-storage-apply-plan.mjs` build an ignored no-secret provider/cutover plan from the strict object-storage packet without touching production env.
   - [ ] Separate normalized database for products, variants, images, tags, and imports.
     - [x] First compatible sidecar payload in the current catalog storage shape: normalized products, variants, images, taxonomies, counts, and safe import batch summaries.
     - [x] Admin diagnostics/export endpoint for the PIM sidecar: summary/full/table views and CSV exports for products, variants, images, taxonomies, and import batches.
     - [x] VPS storage bridge: explicit `SOBAG_STORE_PROVIDER=file` backend for shared data, catalog, content, import batches, and sessions; Vercel is no longer an active deploy target.
     - [x] Offline normalized PIM export for future DB import: products, variants, images, taxonomies, import-batches JSONL, and manifest.
     - [x] Offline image-variant export: normalized PIM export now writes `image-variants.jsonl` for the future PostgreSQL `image_variants` table when responsive image metadata exists.
     - [x] DB split contract bridge: PIM sidecar/export now includes product-taxonomy assignment rows and `tools/pim-db-contract-audit.mjs` validates the future product/variant/image/taxonomy/import-batch table contract offline.
     - [x] PostgreSQL target schema contract draft: `docs/pim-postgres-schema.sql` defines products, variants, images, image variants, taxonomies, product-taxonomies, and import batches; `tools/pim-postgres-schema-audit.mjs` guards it in AutoFix.
     - [x] PostgreSQL seed export rehearsal: `tools/pim-postgres-seed.mjs` generates an ignored SQL upsert seed for the future schema from the current normalized PIM bridge without connecting to DB or touching production data; AutoFix validates the current catalog seed shape in dry-run mode.
     - [x] Import batch row contract: future PostgreSQL schema, normalized export, and seed exporter now include safe `import_batch_rows` records while the runtime sidecar stays compact unless row export is explicitly requested.
     - [x] DB-backed public catalog read contract: normalized product records include description/min/max price/popular fields, and PostgreSQL schema now defines guarded `public_catalog_products` / `public_catalog_cards` views that expose only `published` non-hidden products for the future `/api/catalog-query` path.
     - [x] DB-backed query compatibility guard: `tools/pim-postgres-query-contract.mjs` builds future public product/card/detail rows from the normalized PIM bridge and checks compact card payload parity, published-only visibility, image metadata shape, and detail hydration without connecting to PostgreSQL or touching production data.
     - [x] Public catalog source seam: `api/_lib/catalog-source.js` centralizes public catalog/review loading for `/api/catalog`, `/api/catalog-query`, and `/api/catalog-detail`, so a later PostgreSQL source can replace store/static loading without changing the public route contracts.
     - [x] PostgreSQL row adapter prep: `api/_lib/catalog-db-rows.js` maps future snake_case `public_catalog_*`, variant, and image rows into current public card/detail payloads; `tools/catalog-db-rows-smoke.mjs` guards compact-card and detail hydration shape.
     - [x] PostgreSQL query builder prep: `api/_lib/catalog-db-query.js` builds parameterized future `public_catalog_cards` list/count and `public_catalog_products` detail SQL for compact reads with guarded sort/filter/page-size mapping; `tools/catalog-db-query-smoke.mjs` guards placeholders and bounded page size.
     - [x] PostgreSQL source adapter prep: `api/_lib/catalog-db-source.js` composes the DB query builder and row adapter behind a fake-client smoke, returning current `/api/catalog-query` and `/api/catalog-detail` compatible payloads without connecting to PostgreSQL or changing runtime storage.
     - [x] PostgreSQL runtime toggle prep: `SOBAG_CATALOG_SOURCE=postgres` can switch `/api/catalog-query` and `/api/catalog-detail` to the future DB source when a configured PostgreSQL URL exists; default production remains store/static, `/api/health` reports safe catalog DB status, and `docs/catalog-postgres-source.md` documents the guardrails.
     - [x] PostgreSQL rollback rehearsal: `tools/pim-postgres-rehearsal.mjs` builds the schema + live catalog seed SQL and can execute it inside one transaction that always rolls back, requiring explicit env-based DB config and remote-test confirmation.
     - [x] PostgreSQL public view compatibility fix: future `public_catalog_products` taxonomy fields are `text[]` arrays, matching the catalog query builder's `&& text[]` filters, and search indexes now cover `base_sku`, `name`, and `description`.
     - [x] PostgreSQL facet query prep: future DB source now has SQL-backed facet/facetOptions buckets for category, collection, holiday, tag, type, size, material, and stock, while keeping current public `/api/catalog-query` shape.
     - [x] PostgreSQL variant SKU search prep: future public catalog views expose `variant_skus`, and DB search SQL matches base SKU, variant SKU, name, and description without changing current runtime storage.
     - [x] PostgreSQL migration bundle prep: `tools/pim-postgres-migration-bundle.mjs` packages schema SQL, generated seed SQL, hashes, counts, and guardrails under ignored `local-import-output/` for future reviewed DB cutover.
     - [x] PostgreSQL migration bundle audit: `tools/pim-postgres-migration-bundle-audit.mjs` validates generated schema/seed/manifest hashes, counts, relative paths, and secret-free SQL before a future cutover review.
     - [x] PostgreSQL write statement prep: `api/_lib/catalog-db-write.js` builds parameterized upsert-only statements for future product, variant, image, image-variant, taxonomy, product-taxonomy, import-batch, and import-batch-row writes without deleting products or changing current runtime storage.
     - [x] PostgreSQL write transaction prep: future catalog write statements can run through a transaction wrapper that defaults to rollback/dry-run, commits only with explicit `dryRun: false`, and rolls back on errors; fake-client smoke covers begin/commit/rollback behavior.
     - [x] PostgreSQL write plan audit: `tools/catalog-db-write-plan-audit.mjs` validates the full current catalog can build upsert-only parameterized write statements with exact table/count coverage and no local path params, without connecting to PostgreSQL or touching production data.
     - [x] PostgreSQL write transaction rehearsal: `tools/catalog-db-write-rehearsal.mjs` runs the full current catalog through the future write transaction interface with a fake client and verifies rollback-only behavior, without connecting to PostgreSQL or touching production data.
     - [x] PostgreSQL catalog DB cutover runbook/audit: `docs/catalog-db-cutover-runbook.md` and `tools/catalog-db-cutover-audit.mjs` document and enforce the safe future switch sequence, including offline gates, rollback-only test DB rehearsal, runtime toggle, production readiness smoke, rollback, published-only reads, no product deletion, and no secrets in Git.
     - [x] PostgreSQL env packet validator: `docs/catalog-db-env-packet.md` and `tools/catalog-db-env-packet-audit.mjs` define an ignored no-secret test/staging DB readiness packet before rollback rehearsal or future runtime toggle.
     - [x] PostgreSQL apply plan: `docs/catalog-db-apply-plan.md` and `tools/catalog-db-apply-plan.mjs` build an ignored no-secret rehearsal/cutover plan from the strict DB packet without connecting to PostgreSQL or touching production env.
     - [x] VPS PostgreSQL public catalog cutover: PostgreSQL is installed on VPS, schema+seed were applied after rollback-only rehearsal, and production `/api/catalog-query` plus `/api/catalog-detail` now run with `SOBAG_CATALOG_SOURCE=postgres`.
     - [ ] Later DB write cutover for admin/import product, variant, image, taxonomy, and import-batch entities.

4. [planned] SEO/content:
   - [ ] Fill final legal/company/contact copy.
     - [x] First production-safe public copy pass: removed test/prototype wording from about, contacts, business, marketplace, footer, cart promo, and terms fallbacks without inventing final legal реквизиты or address.
     - [x] Footer informational page skeletons: `how-to-order.html`, `delivery.html`, `payment.html`, `returns.html`, `seller-support.html`, and `wholesale.html` now have production-safe placeholder copy editable from admin content.
     - [x] Offline SEO/content audit: public pages and current default content are checked for stale test/prototype/Tilda/placeholder copy, fake contacts, required meta descriptions, catalog SEO copy, FAQ schema surface, `В каталог`, and editable category/collection/holiday descriptions.
     - [x] Public fallback phone is no longer a fake `+7 900...` number; unconfirmed phone output points users to contacts, and Organization JSON-LD omits `telephone` until a real number is configured.
     - [x] Content readiness guard: `tools/content-readiness-report.mjs` reports final contact/address readiness, rejects fake/old public contact data, and keeps unconfirmed phone/address values explicitly pending until real facts are provided.
     - [x] Confirmed public contact details are published in static contacts/footer content and default site content: phone, email, legal address, and Kursk production branch; map widgets remain pending until exact Yandex URLs are confirmed.
     - [x] Final content packet validator: `docs/final-content-packet.md` and `tools/final-content-packet-audit.mjs` define and validate the local ignored packet for confirmed phone, company, legal/production addresses, schedule, and Yandex map URLs before publication.
     - [x] Final content apply plan: `docs/final-content-apply-plan.md` and `tools/final-content-apply-plan.mjs` build an ignored dry-run content patch from the strict final content packet without calling production APIs.
   - [x] Add Product/FAQ schema where appropriate.
     - [x] Product schema for public product modal/detail state, including offers, images, and approved review aggregate data.
     - [x] FAQ schema for the real business terms FAQ block.
   - [ ] SEO landing copy for important categories, collections, and holidays.
     - [x] First catalog landing copy slice: selected category/collection/holiday SEO descriptions are kept in the current content/admin state; the former visible catalog plaque was later hidden per UX feedback.
     - [x] Editable SEO descriptions for default collections and holidays: admin content supports `name | description | icon`, with backward compatibility for old `name | icon` rows.
     - [x] Current live catalog taxonomy coverage: default SEO entries now cover the actual `products-live.json` categories, collections, and holidays, and the content audit fails if a current catalog taxonomy is missing from default SEO content.
   - [ ] Yandex map final address setup.
     - Current public contacts layout supports separate legal and production addresses, each with its own Yandex map; final real values still require confirmation.

5. [planned] Performance:
   - [ ] Server-side search/pagination for 10k+ products.
     - [x] First compatible backend slice: `/api/catalog-query` for published card results with query/filter/sort/page/cursor and `/api/catalog-detail` for full published product payloads.
     - [x] First Rust Axum catalog runtime slice: VPS runs `sobag-opt-rust` under systemd on `127.0.0.1:3001`; Nginx routes only `/api/catalog-query` and `/api/catalog-detail` to Rust, with Node left as fallback for the rest of the site.
     - [x] Rust deploy automation: VPS deploy now tests/builds `rust-server`, updates the systemd binary, verifies `/api/health-rust`, runs Node-vs-Rust shadow comparison, and restores the previous binary on failed Rust health.
     - [x] Rust SSR/HTMX preview slice: internal Rust routes for catalog, search, product detail, listing fragments, product fragments, and deploy-time SSR smoke are prepared without switching public production routing away from Node fallback.
     - [x] Rust content page preview slice: internal `/rust/pages/:slug` templates render the editable content-page set from file-store content when available, with safe defaults and deploy-time SSR smoke coverage, while public routes still use Node/static fallback.
     - [x] Full Rust migration plan: `docs/rust-full-migration-plan.md` defines the staged Axum + SSR/HTMX + PostgreSQL + Redis/Meilisearch/S3-compatible path, parallel-agent split, gates, and rollback rules.
     - [x] Rust auth/orders/admin migration plan: `docs/rust-auth-orders-admin-migration-plan.md` freezes session, PBKDF2, roles, order, brief, admin, content, review, test, route cutover, and rollback contracts; AutoFix audits it via `tools/rust-auth-orders-admin-plan-audit.mjs`.
     - [x] Rust auth/store foundation prep: Rust now has Node-compatible session constants, session key/cookie parsing helpers, file-store key/wrapper helpers, and PBKDF2 SHA-256 password verification fixtures without switching any auth/order/admin production route.
     - [x] Migrate frontend catalog list/product modal to the new smaller API payloads.
       - [x] Product modal now hydrates public product detail from `/api/catalog-detail` with static/local fallback.
       - [x] Catalog/search list rendering now uses `/api/catalog-query` compact cards and cursor pagination with local fallback.
     - [x] Full server-side facet UI migration beyond the current fallback filter controls: `/api/catalog-query` now returns `facetOptions`, and visible catalog/search filters use them with local fallback.
     - [x] Avoid full `/api/catalog` bootstrap on public server-query listing pages when `/api/catalog-query` succeeds, with full/static fallback when the query endpoint is unavailable.
     - [x] 10k catalog query scale smoke and helper optimization: AutoFix now covers synthetic 10k published-only pagination, compact card payloads, exact SKU lookup, and detail hydration.
   - [ ] Image storage with responsive WebP/AVIF variants.
     - [x] Frontend `<picture>` rendering uses stored AVIF sources first and WebP fallback for product cards, related cards, product modal/gallery, and admin product previews.
     - [x] Offline image metadata audit for migrated catalogs: provider metadata, square dimensions, and WebP/AVIF variant records can be checked before publication.
     - [x] Offline photo migration readiness report summarizes whether the current or candidate catalog is ready for real object-storage images.
     - [ ] Validate WebP/AVIF behavior on the real migrated catalog image set.
   - [x] Catalog virtualization or smaller server pages.
     - [x] Smaller public catalog page payload: frontend now requests `/api/catalog-query` with the server default `pageSize=48` instead of 120, and UI smoke asserts the request size.
     - [x] Smaller local fallback catalog pages: when `/api/catalog-query` is unavailable, the client renders 48 cards per step instead of 120.
     - [x] Runtime list rendering optimization: server cursor pages append only new cards instead of replacing existing first-page DOM, and product cards use browser rendering containment for long lists.
     - [x] Browser 10k pagination smoke: Playwright simulates a 10k server-query catalog, verifies 48-card cursor pages, bounded DOM growth after repeated "show more", stable first-page DOM, and no full `/api/catalog` bootstrap.
   - [x] Current performance guard: `tools/catalog-performance-audit.mjs` verifies compact 48-card list payloads, bounded public query/detail browser cache, append-only cursor rendering hooks, card rendering containment, and reports current real-catalog image migration readiness.
   - [x] Core Web Vitals readiness guard: `tools/core-web-vitals-readiness.mjs` verifies bundle budgets, deferred scripts on key pages, no first-render XLSX CDN load, static image hints, public cache headers, static ETag/Last-Modified revalidation with HEAD live-smoke coverage, bounded public query/detail browser cache, skeleton loading, 48-card query pages, append-only rendering, card containment, and current image migration readiness without pretending final field CWV is done.
   - [x] Production performance smoke: `tools/production-performance-smoke.mjs` checks live VPS compact `/api/catalog-query?pageSize=48` payload, no full list-card detail fields, public API cache headers, bounded `/api/catalog-detail`, static `app.js`/`styles.css` budgets, static validator headers, conditional `304`, and `HEAD` without body.
   - [x] Post-deploy production readiness workflow: `production-smoke.yml` now runs basic production smoke, performance smoke, and non-strict storage readiness after successful VPS deploy, with `tools/production-workflow-audit.mjs` guarding the HTTPS domain default and read-only checks.
   - [x] Goal readiness report: `tools/goal-readiness-report.mjs` aggregates SEO/content, photo migration, DB split readiness, and CWV readiness so the project does not claim the four-upgrade goal complete while final external inputs are still missing.
   - [x] Goal external-input packet audit: `docs/goal-inputs-packet.md` and `tools/goal-inputs-packet-audit.mjs` aggregate the four ignored local packets for final content facts, object storage readiness, PostgreSQL test DB readiness, and final CWV field measurements.
   - [x] Goal completion audit: `docs/goal-completion-audit.md` and `tools/goal-completion-audit.mjs` combine readiness, external packets, and apply-plan coverage as the final strict gate before claiming the four-upgrade goal complete.
   - [x] Goal input packet templates: `tools/goal-inputs-packet-template.mjs` and `npm run prepare:goal-inputs` create ignored starter JSON packets for the remaining external inputs without secrets and without overwriting existing local packets by default.
   - [x] CWV field audit packet validator: `docs/cwv-field-audit-packet.md` and `tools/cwv-field-audit-packet.mjs` define the ignored final audit packet for real 10k+ catalog/photo data, required pages, WebP/AVIF usage, and LCP/CLS/INP/TBT/payload thresholds.
   - [x] CWV field apply plan: `docs/cwv-field-apply-plan.md` and `tools/cwv-field-apply-plan.mjs` build an ignored final performance verification plan from the strict field packet without calling production APIs or changing server state.
   - [x] VPS static revalidation: `server.mjs` returns ETag/Last-Modified for static assets and supports conditional 304 responses so repeat page loads do not redownload unchanged JS/CSS/assets.
   - [ ] Core Web Vitals audit after real catalog growth.

6. [planned] QA/security/ops:
   - [x] VPS runtime path: `server.mjs` serves static clean URLs plus existing `/api/*` handlers, with file-store read/write smoke coverage.
   - [x] VPS launch runbook: step-by-step preflight, launch, smoke, DNS cutover, rollback, backup, and fallback checks without touching production env/cache/user data.
   - [x] VPS DNS/SSL cutover: `sobag-shop.online` and `www.sobag-shop.online` resolve to `77.239.107.164`, certbot/Nginx HTTPS is active, `npm.cmd run smoke:prod -- --base-url https://sobag-shop.online` passes, and repo variable `PRODUCTION_BASE_URL` targets the domain.
   - [x] VPS release audit: offline check for required runtime files/scripts, ignore rules, and forbidden tracked secret/local-output artifacts.
   - [x] VPS env preflight: `tools/vps-preflight.mjs` checks Node 20+, file-store readiness, bootstrap admin env, and S3-compatible object-storage env without printing secrets; AutoFix covers the self-test fixture.
   - [x] VPS file-store backup/restore fixture: `tools/file-store-backup.mjs` copies only JSON store records with a manifest, supports guarded restore, and AutoFix covers the self-test.
   - [x] Stronger mojibake guard in AutoFix.
   - [x] Automated production smoke after deploy.
     - [x] Read-only production smoke script for `/`, `/catalog`, `/cart`, and `/api/health`, with offline self-test in AutoFix.
     - [x] Wire the live smoke into the post-deploy routine after push/deploy: GitHub Actions runs it after successful `autofix-check` on `main`, with manual fallback/preview dispatch support.
   - [x] Vercel deploy disabled: VPS deploys every green push; Vercel Git builds are always skipped by `tools/vercel-daily-deploy-gate.mjs`.
   - [x] Error monitoring/log review workflow.
     - [x] Structured server-side `api_error` logs in the shared API error handler with request ids.
     - [x] `tools/error-log-audit.mjs`, npm script `audit:errors`, AutoFix coverage, and `docs/error-log-review.md` runbook.
   - [x] Periodic security/access audit.
     - [x] Static API access matrix in `tools/access-audit.mjs`, npm script `audit:access`, and AutoFix/weekly GitHub Actions coverage.
