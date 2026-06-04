# Current Status Snapshot

Date: 2026-06-04

Latest committed state before this handoff update:
- `337f9bd Add product publication statuses`

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
- next implementation stage: object storage adapter for product photos and durable image metadata.

Completed most recently:
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
- `node --check app.js`
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
1. Install Node.js, Git, Python, GitHub CLI, and optionally Vercel CLI.
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
- Import/PIM 2.0: expose explicit update-existing mode in the admin batch UI, deepen normalized product/import payloads, and keep public `/api/catalog` published-only.
- Durable image storage: Vercel Blob first through a storage adapter, later S3-compatible storage or Cloudflare R2; no large raw photos in Git.
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
