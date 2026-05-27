# Prompt For A New AI Chat

Continue work on the Sobag Opt wholesale textile website prototype.

User language: Russian. Answer in Russian.

Repository:
`https://github.com/sobag0404/sobag-opt-site`

Production:
`https://sobag-opt-site.vercel.app/`

Known pages:
- `https://sobag-opt-site.vercel.app/`
- `https://sobag-opt-site.vercel.app/catalog`
- `https://sobag-opt-site.vercel.app/cart`
- `https://sobag-opt-site.vercel.app/favorites`
- `https://sobag-opt-site.vercel.app/custom`
- `https://sobag-opt-site.vercel.app/marketplaces`

Latest functional commit before handoff docs update:
`7bc2760 Add favorites page and semicolon import lists`

Read first:
- `docs/ai-handoff/AI_HANDOFF.md`
- `docs/ai-handoff/CURRENT_STATUS.md`
- `docs/ai-handoff/LIVE_CONTEXT.md`
- `docs/ai-handoff/NEW_DEVICE_SETUP.md`
- `docs/ai-handoff/SERVER_HANDOFF_STORAGE.md`
- `docs/product-import.md`

Core constraints:
- Do not use the old Tilda site or old site images as design/assets.
- Do not put secrets in chat, repo, docs, or ZIP.
- The project is frontend-only for now.
- localStorage data is prototype data only.
- Day theme should remain black/white/gray; night theme may use orange.
- Product import list cells should use `;`, not comma, so sizes like `3,5` are safe.
- Do not commit raw bulk photo folders or generated import outputs unless explicitly asked.

Current implemented features:
- home/catalog/custom/marketplaces/cart/favorites pages;
- catalog categories, collections, holidays, and actual slider;
- product modal with type/size/material variants and changing SKU/price;
- favorites page for header heart button;
- cart page with quantities, discount scale, promo code, minimum sum, checkout modal;
- localStorage prototype accounts, roles, admin/manager order views;
- admin content controls for page text/images/logo/site name;
- CSV/XLSX product template download;
- local importer that can scan nested category/article/photo folders.

Before pushing changes:
1. Check `git status --short`.
2. Run syntax checks for touched JS/Python files.
3. Use local browser checks for UI changes.
4. Commit intentionally.
5. Push to `main`.
6. Verify Vercel got the fresh commit.
7. Check the production URL affected by the change.

If continuing product import work, start from:
- `tools/product_importer.py`
- `tools/publish_imported_products.py`
- `templates/sobag-products-template.xlsx`
- `docs/product-import.md`
