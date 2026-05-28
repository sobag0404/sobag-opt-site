# Sobag Opt Site AI Handoff

Last updated: 2026-05-27

## Project

Sobag Opt is a static prototype for a B2B wholesale textile website: printed pillows, pillowcases, blankets, bags, covers, custom-print requests, cart, discounts, prototype accounts, admin content controls, and local product import tooling.

Repository:
- GitHub: `https://github.com/sobag0404/sobag-opt-site`
- Branch: `main`
- Production: `https://sobag-opt-site.vercel.app/`
- Catalog: `https://sobag-opt-site.vercel.app/catalog`
- Cart: `https://sobag-opt-site.vercel.app/cart`
- Favorites: `https://sobag-opt-site.vercel.app/favorites`

Latest functional commit before this handoff update:
- `7bc2760 Add favorites page and semicolon import lists`

## Current State

The project is still a frontend-only static prototype. There is no backend, no database, no real authorization, no payment system, no CRM integration, and no production file storage yet.

Important files:
- `index.html`: home page.
- `catalog.html`: catalog page with category home and product listing.
- `favorites.html`: separate favorites page.
- `custom.html`: custom-print request page.
- `marketplaces.html`: marketplaces page.
- `cart.html`: separate cart page.
- `app.js`: main site logic, products, filters, favorites, account/admin prototype, import/export, product modal.
- `cart.js`: cart page logic, checkout modal, discounts, promo code prototype.
- `styles.css`: shared UI styling and responsive layout.
- `tools/product_importer.py`: local CSV/XLSX + photo-folder importer.
- `tools/publish_imported_products.py`: static preview product publisher for optimized image previews.
- `templates/sobag-products-template.csv` and `.xlsx`: downloadable product import templates.
- `docs/product-import.md`: current import workflow notes.
- `vercel.json`: clean URLs enabled.

## What Was Recently Completed

- Removed the previously published test imported product assets and test `data/products-live.json`.
- Added `favorites.html`.
- Header heart buttons now navigate to the favorites page.
- Favorites page shows only products stored in `sobag.favorites`.
- Empty favorites page has a clear empty state and a catalog button.
- Product import list fields now prefer `;` instead of comma:
  - `Типы товара`
  - `Размеры`
  - `Материалы`
  - `Подборки`
  - `Праздники`
  - `Теги`
  - `Фото галереи`
- Old comma-only list cells are still readable for backward compatibility.
- Import templates were regenerated with `;` examples.
- Local ignored CSV `local-import-output/products-from-photo-folders.csv` was converted to `;` in list fields.

## Current UX / Business Rules

- Day theme should stay black, white, and gray. Do not reintroduce orange into day theme.
- Night theme can use orange accents.
- Buttons should be uppercase, centered, and visually consistent.
- Product card in catalog should show only:
  - square photo;
  - base SKU with copy button;
  - product name;
  - price;
  - `ПЕРЕЙТИ В КАРТОЧКУ`.
- Product detail modal changes SKU and price by selected type, size, and material.
- Variant SKU rule: `baseSku_ТИП_Размер_МАТ`, where `_` is the separator, type and material use the first 3 cleaned chars, and size is kept full.
- Default quantity in product detail is `1`.
- Cart minimum total is `30 000 ₽`.
- Quantity discount tiers:
  - 30 items: 3%
  - 70 items: 7%
  - 150 items: 12%
  - 300 items: 18%
- Demo promo codes in `cart.js`:
  - `SOBAG5`
  - `OPT10`

## Product Import Notes

Recommended first-batch workflow:
1. Put photos in folders shaped like `Категория / Основной артикул / фото`.
2. Run `tools/product_importer.py scan-photos` to generate a draft CSV/XLSX from folder names.
3. Edit the generated table manually.
4. Use `;` inside list cells, especially for sizes, so decimal comma values like `3,5` remain valid.
5. Run the local importer against the edited table and photo root.
6. Publish only prepared/optimized preview assets when intentionally testing static preview data.

Local generated import outputs are intentionally ignored by Git:
- `local-import-output/`
- `assets/imported-products/`
- `assets/product-preview/`
- `data/products.import.json`
- `data/import-report.csv`
- `data/products-live.json`

Do not commit thousands of raw product photos to GitHub/Vercel.

## Important Constraints

- Do not use old Tilda site imagery or design as a visual source.
- Do not add secrets to repo, handoff files, ZIP, or chat:
  - no tokens;
  - no passwords;
  - no `.env`;
  - no SSH keys;
  - no cookies;
  - no database dumps.
- Prototype users, carts, favorites, orders, content edits, and admin uploads are localStorage-only.
- Admin image uploads in the browser are not permanent across devices.
- A browser page cannot automatically read arbitrary folders from the PC; photo matching needs either a user-selected folder or the local importer script.
- For 10k+ products, use real backend/storage later. Do not keep the production catalog in `app.js`, localStorage, or Git-tracked static JSON forever.

## Verification Status

Latest verified checks before this handoff:
- `node --check app.js`
- `node --check cart.js`
- `python -m py_compile tools/product_importer.py tools/publish_imported_products.py`
- Local browser check:
  - `/favorites.html` empty state works.
  - catalog heart click -> header favorites button -> `/favorites.html` shows `1 товар`.
- Production check:
  - `/favorites` returns 200.
  - production page serves `app.js?v=20260527-favorites-semicolon`.
  - production template CSV uses `;` list examples.
  - removed test `data/products-live.json` returns 404.

## Current Focus

The user is preparing the project for real product import. The next likely feature work is:
- improve bulk product loading from local/Yandex Disk photo folders;
- create price-editing files per variant;
- avoid duplicate imports on repeated scans;
- possibly infer short descriptions, tags, and collections from product photos later;
- eventually replace localStorage prototypes with backend storage.
