# Prompt For A New AI Chat

Continue work on the Sobag Opt wholesale textile website prototype.

User language: Russian. Answer in Russian.

Repository:
`https://github.com/sobag0404/sobag-opt-site`

Primary production:
`https://sobag-shop.online/`

Fallback Vercel domain:
`https://sobag-opt-site.vercel.app/`

Latest functional commit before this handoff update:
`c7f54d2 Fit personal state sync within Vercel Hobby limits`

Read first:
- `docs/ai-handoff/AI_HANDOFF.md`
- `docs/ai-handoff/CURRENT_STATUS.md`
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
- Vercel should have GitHub access; this is expected.
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

Backend/storage state:
- Vercel API routes exist in `api/`.
- Upstash Redis / Vercel KV-compatible storage is configured in Vercel.
- Production health check should return storage ready:
  `https://sobag-shop.online/api/health`
- Do not ask the user to paste secrets into chat. Use official Vercel/GitHub CLI or dashboard flows.

Before pushing changes:
1. Check `git status --short`.
2. Run syntax checks for touched JS/Python files.
3. Run `npm run check`.
4. Use local browser checks for UI changes.
5. Commit intentionally.
6. Push to `main`.
7. Deploy/verify Vercel when site behavior changes.
8. Check production URL affected by the change.
9. Update `docs/ai-handoff/LIVE_CONTEXT.md` before final responses after project work.

If continuing product import work, start from:
- `tools/product_importer.py`
- `tools/publish_imported_products.py`
- `templates/sobag-products-template.xlsx`
- `docs/product-import.md`
