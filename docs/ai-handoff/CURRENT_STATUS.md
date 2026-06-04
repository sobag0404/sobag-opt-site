# Current Status Snapshot

Date: 2026-06-04

Latest committed state before this working update:
- `3690ba2 Add responsive product image variants`

Repository:
- `https://github.com/sobag0404/sobag-opt-site`
- branch: `main`
- repo visibility: private

Production URLs:
- Main: `https://sobag-shop.online/`
- Catalog: `https://sobag-shop.online/catalog`
- Search: `https://sobag-shop.online/search?q=opt_22434`
- Cart: `https://sobag-shop.online/cart`
- Quotes: `https://sobag-shop.online/quotes`
- Favorites: `https://sobag-shop.online/favorites`
- Custom print: `https://sobag-shop.online/custom`
- Marketplaces: `https://sobag-shop.online/marketplaces`
- About: `https://sobag-shop.online/about`
- Contacts: `https://sobag-shop.online/contacts`
- Health: `https://sobag-shop.online/api/health`

Current focus:
- keeping `ACTIVE_CONTEXT.md` as the first short context file;
- Import/PIM 2.0 is underway;
- next implementation stage: deeper normalized PIM payloads, then SEO/content/performance work.

Completed most recently:
- Normalized PIM sidecar first slice:
  - added `api/_lib/pim.js` to build a normalized sidecar from the current catalog without changing the public catalog shape;
  - sidecar includes normalized products, generated variants, image metadata including responsive variants, category/collection/holiday/tag taxonomies, counts, and safe import batch summaries;
  - `saveCatalog` writes `pim` next to the existing `products` array and preserves/imports batch summaries;
  - import batch apply/rollback rebuilds the catalog sidecar with final batch metadata;
  - `/api/catalog` strips `pim` from public responses, while admin catalog reads can inspect it;
  - added `tools/pim-smoke.mjs` and included it in `tools/autofix.mjs`;
  - added `docs/pim-normalized-payload.md`;
- Responsive image variants:
  - bulk CLI now supports `--responsive`, `--variant-widths`, `--variant-formats`, and `--variant-quality`;
  - dry-run plans `ready_variant` rows without requiring Blob env or Sharp;
  - real responsive generation uses optional `sharp` and uploads generated WebP/AVIF variants through the existing object-storage adapter;
  - image metadata now preserves `variants` in `api/_lib/object-storage.js`, frontend normalization, and product validation;
  - product cards, product modal main image, gallery thumbnails, and admin product cards use WebP variants as `srcset` when metadata is present;
  - AVIF metadata is preserved for a later `<picture>`/format-selection pass;
- Bulk CLI photo upload path:
  - added `tools/bulk-upload-product-photos.mjs` for large product photo folders;
  - dry-run scans products and photo folders and writes a CSV report without Blob env;
  - real upload uses the existing object-storage adapter, so Vercel Blob works now and the output shape stays provider-ready;
  - image bytes are read from disk and uploaded file-by-file, not sent through `/api/admin/product-images` JSON bodies;
  - successful uploads write products JSON with `images` metadata plus compatible `image`/`gallery`;
  - report statuses cover `ready`, `uploaded`, `skipped`, `missing`, and `failed`;
  - `tools/bulk-upload-product-photos.test.mjs` covers dry-run matching/reporting and is called from `tools/autofix.mjs`;
  - added npm script `upload:photos`;
- Explicit update-existing mode in admin import UI:
  - `admin-import.html` now has an `Обновлять существующие товары по baseSku` checkbox before file upload;
  - preview requests send `updateExisting` to `/api/admin/import-batches`, and local fallback batches keep the same mode;
  - existing products are updated only when the mode is enabled, and imports still never delete old products;
  - update previews preserve existing `id`, `status`, `image`, `gallery`, `images`, and common optional fields when the uploaded file omits them;
  - batch cards show whether they are in update mode or create-only mode;
  - smoke covers the checkbox and update-mode batch label;
- Admin import photo flow:
  - `admin-import.html` now has a photo workspace for the current product import preview;
  - admins can select image files or a folder;
  - preview matches images to products by `baseSku`, `photoFolder`, or product id;
  - report statuses cover `ready`, `missing`, `repeated`, `uploaded`, and `failed`;
  - report CSV export is available;
  - upload sends matched images to `/api/admin/product-images`;
  - successful uploads merge returned storage metadata into product `images` and create a refreshed preview batch, so applying the batch writes image metadata into the catalog;
  - smoke now verifies the photo preview report without requiring Blob env;
- Object storage first slice for product photos:
  - added `@vercel/blob`;
  - added `api/_lib/object-storage.js` with provider switch, Vercel Blob implementation, S3-compatible placeholder, upload/list/delete-or-markUnused/getPublicUrl interface;
  - added `/api/admin/product-images` for admin/content image upload, list, delete, and mark-unused actions;
  - `/api/health` now returns safe object storage readiness metadata without exposing env values;
  - product normalization now preserves `images` metadata (`url`, `storageKey`, `provider`, `width`, `height`, `mime`, `uploadedAt`) while keeping legacy `image`/`gallery` rendering compatible;
  - product validation allows remote image URLs and validates image metadata shape;
  - docs and `.gitignore` now reinforce that raw/bulk photo folders must stay out of Git;
- Import Batches 2.0 first slice:
  - new `/api/admin/import-batches` endpoint for admin/content roles;
  - import batches are stored separately from catalog data under the import-batches storage key;
  - preview mode reports created/skipped/updated/errors without saving catalog changes;
  - duplicate `baseSku`, repeated batch SKU, required-field errors, variant SKU collisions, and fallback image warnings are reported per row;
  - applying a preview batch saves a catalog snapshot and never deletes existing products;
  - rollback is limited to the latest applied batch created by this new mechanism;
  - `admin-import.html` now shows batch cards, row preview, apply/reject, rollback for the latest applied batch, refresh, and CSV report download;
  - CSV upload has an in-browser parser fallback, so smoke tests do not depend on the external XLSX CDN for `.csv` files;
- Import/PIM 2.0 first slice:
  - product publication statuses `draft/published/hidden/archive`;
  - admin product filter, badges, per-card status selector, and quick hide/publish action;
  - frontend normalization keeps old `hidden` data compatible;
  - public `/api/catalog` returns only `published` products and filters reviews to public products;
  - admin `/api/admin/catalog` preserves all statuses and normalizes saved products;
  - local importer, generated CSV/XLSX templates, and in-browser import now include `Статус публикации`;
  - new imported/generated products default to `draft`;
  - `--update-existing` preserves an existing product status when the table omits the new status column;
  - product validation now checks allowed statuses and `hidden` consistency;
- product reviews with buyer-only submission and admin moderation;
- saved commercial proposal workspace on `quotes.html`;
- saved proposal comments, manager-only internal notes, history, export/print/send/restore;
- order detail XLSX export from admin;
- order/customer CRM thread:
  - internal manager comments;
  - customer-visible manager messages;
  - buyer replies in account order history;
  - internal entries stripped from buyer APIs;
  - customer segment panel in admin orders;
- smoke-test hardening:
  - external CDN resources aborted during smoke;
  - cross-origin map iframe no longer breaks localStorage document-load counter;
  - mobile overflow smoke is stable again;
- local RAM cleanup:
  - duplicate/orphaned `vercel dev --listen 4173` processes and their `@vercel/node` children were stopped by exact PID/command line;
  - port `4173` was freed after cleanup;
  - `dev:static` and `dev:vercel` scripts were added;
- `npm run check` now passes even if Python is absent, while warning that Python importer syntax checks were skipped.

Verification from this handoff pass:
- Current PIM sidecar pass:
  - `node --check api/_lib/pim.js`
  - `node --check api/_lib/store.js`
  - `node --check api/admin/import-batches.js`
  - `node --check tools/pim-smoke.mjs`
  - `node tools/pim-smoke.mjs`: passed for 808 products, 12943 variants, 2768 images, 6 categories.
  - `git diff --check`
  - equivalent of `npm run check`: bundled Node with `tools/autofix.mjs --check`; passed product validation, PIM smoke, and bulk photo dry-run fixture.
  - bundled Python: `python -m py_compile tools/product_importer.py tools/publish_imported_products.py tools/audit_catalog.py`
  - equivalent of `npm run ui:smoke`: bundled Node with `node_modules/@playwright/test/cli.js test tools/ui-smoke.spec.js`; 8/8 passed.
- `node --check app.js`
- `node --check api/_lib/object-storage.js`
- `node --check tools/bulk-upload-product-photos.mjs`
- `node --check tools/validate-products.mjs`
- `node tools/bulk-upload-product-photos.test.mjs` with `--responsive` dry-run fixture: 1 ready original, 6 ready variants, 1 missing.
- equivalent of `npm run check`: bundled Node with `tools/autofix.mjs --check`; passed product validation and responsive dry-run fixture.
- `node --check tools/bulk-upload-product-photos.mjs`
- `node --check tools/bulk-upload-product-photos.test.mjs`
- `node --check tools/autofix.mjs`
- `node tools/bulk-upload-product-photos.test.mjs`
- Bundled Node/Python were used on this device because `npm.cmd` is not installed in PATH and the WindowsApps Codex `node.exe` returns Access denied in PowerShell.
- `C:\Users\Lodbr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check app.js`
- `C:\Users\Lodbr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check api/admin/import-batches.js`
- `C:\Users\Lodbr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check tools/ui-smoke.spec.js`
- equivalent of `npm run check`: bundled Node with `tools/autofix.mjs --check` and PATH prefixed to bundled Node; passed product validation for 808 products / 12943 variants.
- bundled Python: `python -m py_compile tools/product_importer.py tools/audit_catalog.py`
- equivalent of `npm run ui:smoke`: bundled Node with `node_modules/@playwright/test/cli.js test tools/ui-smoke.spec.js`; 8/8 passed.
- `node --check app.js`
- `node --check tools/ui-smoke.spec.js`
- `node --check api/_lib/object-storage.js`
- `node --check api/admin/product-images.js`
- `node --check api/health.js`
- `node --check api/admin/import-batches.js`
- `node --check api/catalog.js`
- `node --check api/admin/catalog.js`
- `node --check tools/validate-products.mjs`
- `python -m py_compile tools/product_importer.py`
- `node --check tools/ui-smoke.spec.js`
- `npm.cmd run check`
- `npm.cmd run ui:smoke`
- Browser plugin check on `http://127.0.0.1:4173/admin-products.html`: access panel renders, no mojibake, no horizontal overflow.

Previous handoff verification:
- `node --check app.js`
- `node --check api/admin/orders.js`
- `node --check api/orders.js`
- `node --check api/auth/me.js`
- `node --check tools/autofix.mjs`
- `node --check tools/ui-smoke.spec.js`
- `npm.cmd run check`
- `npm.cmd run ui:smoke -- --grep "manager order|account favorites"`
- `npm.cmd run ui:smoke -- --grep "mobile pages"`

Recommended first verification on a new device:
1. Install Node.js 20+, Git, Python, GitHub CLI, and optionally Vercel CLI.
2. Clone/pull the repo.
3. Run `npm install`.
4. Use `npm run dev:static` for ordinary UI work.
5. Use `npm run dev:vercel` only for Vercel Functions/env checks.
6. Run `npm.cmd run check`.
7. Run `npm.cmd run ui:smoke`; if slow, first run the two focused smoke commands listed above.

Backend/storage state:
- Vercel API routes exist under `api/`.
- Upstash Redis / Vercel KV-compatible storage is configured in Vercel.
- `/api/health` on production should return storage ready.
- Do not expose env values in chat/docs/repo.

Important remaining work:
- Import/PIM 2.0: use the new normalized sidecar for admin diagnostics/export, deepen import report rows if needed, and keep public `/api/catalog` published-only.
- Durable image storage: later implement the S3-compatible provider for VPS/MinIO/R2 and consider a `<picture>` AVIF/WebP frontend pass after real catalog image tests.
- Content/SEO: final copy for about/contacts/business/marketplaces, SEO category text, Product/FAQ schema, final Yandex map setup.
- Performance for 10k+ products: server search, pagination, smaller API responses, WebP/AVIF responsive images.
- QA/Ops: production smoke automation, access audit cadence, lightweight log review.

Important constraints:
- no secrets in repo/docs/ZIP/chat;
- do not use old Tilda site or old images;
- do not commit raw bulk product photo folders;
- day theme should remain black/white/gray;
- night theme may use orange accents;
- use `;` for multi-value Excel/CSV cells;
- local/generated import output should stay ignored unless explicitly requested.
