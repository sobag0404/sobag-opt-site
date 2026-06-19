# Prompt For A New AI Chat

Continue work on the Sobag Opt wholesale textile website prototype.

User language: Russian. Answer in Russian.

Repository:
`https://github.com/sobag0404/sobag-opt-site`

Primary production:
`https://sobag-shop.online/`

Historical Vercel domain:
`https://sobag-opt-site.vercel.app/` (historical only; do not deploy or verify Vercel unless the user explicitly re-enables it)

Latest known cutover baseline:
Rust/VPS cutover complete; use `git log -1 --oneline` for the exact current HEAD.

Token-saving startup:
- Read `docs/ai-handoff/ACTIVE_CONTEXT.md` first.
- Then run `git status --short --branch`.
- Open long handoff files only when a concrete missing detail is needed.

Read first:
- `docs/ai-handoff/ACTIVE_CONTEXT.md`
- `docs/roadmap-checklist.md`
- `docs/ai-handoff/CURRENT_STATUS.md`

Read only if historical detail is missing:
- `docs/ai-handoff/AI_HANDOFF.md`
- `docs/ai-handoff/LIVE_CONTEXT.md`
- `docs/ai-handoff/NEW_DEVICE_SETUP.md`
- `docs/ai-handoff/SERVER_HANDOFF_STORAGE.md`
- `docs/product-import.md`
- `docs/backend-security.md`

Known pages:
- `/`
- `/catalog`
- `/cart`
- `/favorites`
- `/custom`
- `/marketplaces`
- `/about`
- `/contacts`

Core constraints:
- Do not use the old Tilda site or old site images as design/assets.
- Do not put secrets in chat, repo, docs, or ZIP.
- Day theme should remain black/white/gray; night theme may use orange.
- Product import list cells should use `;`, not comma, so sizes like `3,5` are safe.
- Do not commit raw bulk photo folders or generated import outputs unless explicitly asked.
- Vercel/Next.js are not active deploy/runtime targets.
- If switching devices again after weekend work, repeat handoff preparation before leaving that device.

Current implemented features:
- home/catalog/custom/marketplaces/about/contacts/cart/favorites pages;
- shared shell in `components/site-shell.js`;
- catalog categories, collections, holidays, and actual slider;
- product modal with type/size/material/quantity variants and changing SKU/price/name;
- favorites page for header heart button;
- cart page with quantity editing, discount scale, promo code, minimum sum, checkout modal;
- prototype accounts plus API-backed auth/session/order attempts;
- admin and manager order views;
- per-order CSV export/print view and extended checkout/customer fields;
- admin content controls for page text/images/logo/site name/dictionaries;
- content-manager role for product/content/price/import tools;
- server-backed cart/favorites prototype state through `/api/auth/me`;
- CSV/XLSX product template download;
- local importer that can scan nested category/article/photo folders and optionally update existing products with `--update-existing`;
- motion layer with reduced flicker after latest fixes.
- product reviews with buyer-only submission and admin moderation;
- saved commercial proposals on `quotes.html` with rename/export/print/send/restore;
- CRM order thread: internal manager notes, buyer-visible messages, buyer replies, customer segment panel in admin orders;
- hardened smoke tests for mobile pages and cross-origin map iframe.

Backend/storage state:
- Production exact API/SSR routes are Rust-owned on the VPS for auth, orders/briefs, admin orders/users/content/PIM/prices/catalog/import-batches/product-images, catalog/search/product pages, content pages, and catalog query/detail.
- Node remains only as static/root/cart compatibility fallback and explicit legacy fallback.
- VPS MinIO/S3-compatible storage is the active object storage target; Vercel Blob is historical only.
- Production health check should return storage ready: `https://sobag-shop.online/api/health`.
- Do not ask the user to paste secrets into chat. Use GitHub Actions/VPS secret paths only.

Before pushing changes:
1. Check `git status --short`.
2. Run syntax checks for touched JS/Python files.
3. Run `npm run check`.
4. Use local browser checks for UI changes.
5. Commit intentionally.
6. Push to `main`.
7. Deploy/verify VPS GitHub Actions when site behavior changes; do not deploy Vercel.
8. Check production URL affected by the change.
9. Update `docs/ai-handoff/ACTIVE_CONTEXT.md` before final responses after project work.
10. Update the longer handoff files only before device transfer or major milestones.

Current handoff focus:
- Order/customer CRM polish is implemented and marked done in `docs/roadmap-checklist.md`.
- For local development, prefer `npm run dev:static` for normal UI work. Do not use `vercel dev` unless the user explicitly re-enables Vercel work.
- Current backend contracts are in `docs/backend-pricing-reviews-contract.md`: grouped price-list export, admin CSV/Excel-compatible price import by group/SKU, promo rows, and buyer-only review eligibility.
- Next major stage is post-cutover functional/security backlog, keeping VPS/Rust gates green and avoiding UI/design unless explicitly requested.
- On a new device, install Python if possible. `npm run check` can pass without Python, but then Python importer syntax checks are skipped with a warning.

Recent verification to repeat after pulling:
- `npm.cmd run check`
- `npm.cmd run ui:smoke`
- If full smoke is slow, at least focused checks:
  - `npm.cmd run ui:smoke -- --grep "manager order|account favorites"`
  - `npm.cmd run ui:smoke -- --grep "mobile pages"`

If continuing product import work, start from:
- `tools/product_importer.py`
- `tools/publish_imported_products.py`
- `templates/sobag-products-template.xlsx`
- `docs/product-import.md`
