# Live AI Context

Last updated: 2026-05-27

## Standing Reminder For Codex

Before every final response after doing project work, update this file with:
- what changed;
- current focus;
- latest commit/deploy status when relevant;
- important user preferences and constraints;
- any open risks or next steps.

Do not store secrets here: no tokens, passwords, cookies, `.env`, SSH keys, production credentials, database dumps, or private customer data.

## Project

Sobag Opt B2B wholesale textile/catalog prototype.

Repository:
- `https://github.com/sobag0404/sobag-opt-site`
- branch: `main`

Production:
- `https://sobag-opt-site.vercel.app/`

Workspace:
- `C:\Users\SoBag\OneDrive\Документы\New project\sobag-opt-site`

## User Preferences

- Speak Russian.
- Deploy and verify Vercel after pushed site changes.
- Check production after deployment.
- Do not use the old Tilda site or its images as visual reference.
- Day scheme must be black/white/gray only, no orange in borders, text, buttons, or accents.
- Night scheme may use orange accents.
- Buttons should use one standard: centered text, uppercase visual style, rectangular with small rounded corners.
- Product cards should have square photos, SKU, name, price, and a card button only in listing.
- Use correct Russian pluralization: `1 товар`, `2 товара`, `5 товаров`.
- Use agents only when a task naturally splits into meaningful parallel work; do not create agents for every small change.
- Install extra skills only when they are clearly useful for the current work.

## Current Implementation Snapshot

Static frontend prototype:
- pages: `index.html`, `catalog.html`, `custom.html`, `marketplaces.html`, `cart.html`;
- shared app logic: `app.js`;
- cart page logic: `cart.js`;
- styling: `styles.css`;
- deployment: GitHub to Vercel.

Recently completed:
- Multi-page structure for home, catalog, custom print, marketplaces, cart.
- Cart page with quantity editing, promo code, discount scale, checkout form.
- Admin prototype for content editing via localStorage.
- Admin content editor now includes broad page text controls:
  - top line;
  - nav/cart labels;
  - hero;
  - benefits;
  - catalog headings;
  - request/cart panel;
  - wholesale tiers;
  - marketplaces;
  - custom print section;
  - footer;
  - cart page and checkout text.
- Button text is visually lowercase and centered.
- Day scheme orange accents removed in latest checked build.
- Category tile count uses button-like shape and correct pluralization.
- Text smoothing added via CSS.
- Admin product CSV workflow now supports extended columns: descriptions, badge, popularity, photo folder, and gallery.
- Admin has export buttons for all products and the currently filtered product set.
- Recommended mass product import shape: one table row per base article/print; variants are generated from type, size, and material columns.
- For 10k+ products and local photos, plan a local importer or backend storage flow instead of relying on browser localStorage.
- Fixed catalog listing layout after unified button styling made the desktop filter toggle participate in the grid.
- Product cards now use an adaptive grid so the catalog does not collapse into very narrow cards when sidebars are visible.
- Catalog title preservation now uses `selectedCategory`, `selectedCollection`, `selectedHoliday`, and search state instead of stale `current*` fields.
- Theme toggle labels now say `ночная тема` and `дневная тема` instead of `ночная схема` / `дневная схема`.
- Registration now blocks duplicate emails and requires name + phone for new users.
- User profiles store phone numbers and can fill checkout contact fields from the profile.
- Orders from catalog and cart flows are saved into a shared `sobag.orders.v1` order history.
- Buyer profiles show personal order history; admins and managers see all orders with statuses and customer data.
- Admins can assign or remove the `manager` role for non-admin users; managers can process orders but cannot open the full site admin/content panel.
- In progress / latest local changes:
  - Added editable admin dictionaries for catalog categories, collections, holidays, and `Актуально`.
  - Admin can upload images for collections, holidays, and actual slides; category cards still use schematic tiles until designer assets are ready.
  - Catalog home now renders categories, collections, holidays, and actual slides from saved site content instead of hardcoded lists.
  - Added `XLSX-шаблон` download button in admin and renamed template column to `Основной артикул` with aliases for older columns.
  - Added local importer `tools/product_importer.py` with commands `template`, `scan-photos`, and `import`.
  - Generated `templates/sobag-products-template.csv` and `templates/sobag-products-template.xlsx`.
  - Added `docs/product-import.md` with the mass import workflow and Yandex Disk sync recommendation.
  - Added `.gitignore` rules for local import output and copied product photos.

Latest verified production commit:
- `7636da0 Publish first imported product batch`

Latest production verification:
- Local verification passed for category, collection, home, custom, marketplaces, and cart pages before push.
- `node --check app.js` passed.
- Production category page serves `styles.css?v=20260527-filter-layout` and `app.js?v=20260527-filter-layout`.
- Production category layout checked: filters are left, products are centered, cart panel is right, and no horizontal overflow.
- Production theme toggle label checked: `ночная тема`.
- Local syntax verification passed for `app.js` and `cart.js` after profile/order-management changes.
- Full browser form-entry test was limited by the in-app browser text-entry/clipboard restriction, so production verification should confirm fresh scripts and then manual form behavior can be checked by the user.
- Production catalog serves `app.js?v=20260527-profile-orders` and `styles.css?v=20260527-profile-orders`.
- Production cart canonical route is `https://sobag-opt-site.vercel.app/cart`; it serves `cart.js?v=20260527-profile-orders` and shows the profile-fill checkout button.
- Production `app.js` and `cart.js` contain the shared order history key `sobag.orders.v1`.
- Local verification for importer/admin dictionary work:
  - `node --check app.js` passed.
  - `node --check cart.js` passed.
  - `python -m py_compile tools/product_importer.py` passed.
  - `python tools/product_importer.py template --out templates` generated CSV/XLSX templates.
  - `scan-photos` and `import` were tested against a temp photo folder and created CSV, XLSX, copied images, JSON, and import report.
  - Local catalog at `http://127.0.0.1:4174/catalog.html` rendered 6 categories, 3 actual slides, 10 collections, 6 holidays, and no browser console errors.
  - Local template URL `/templates/sobag-products-template.xlsx` returned HTTP 200.
- Latest importer update:
  - `scan-photos` now supports nested folders shaped as `category/article/photos`.
  - Category is read from the penultimate folder, base SKU from the last folder, and `Папка фото` stores the relative path.
  - Empty collections stay empty instead of being forced into `Без подборки`.
  - Frontend Excel import auto-adds missing categories to site content with a temporary `tag` icon.
  - User test folder scanned successfully: `C:\Users\SoBag\OneDrive\Рабочий стол\Сайт\Тест импорт товаров`.
  - Scan result: 58 folders/products; categories: `пляжные сумки` 19, `Ремувки` 19, `шевроны 8х10` 14, `шевроны 8х5` 6.
  - Generated local files: `local-import-output\products-from-photo-folders.xlsx`, `local-import-output\products-from-photo-folders.csv`, and `local-import-output\photo-folder-report.csv`.
- First test import publication:
  - User finished editing `local-import-output\products-from-photo-folders.xlsx`; prices are temporary and will be edited later.
  - Ran importer against the user's nested photo folder and created 58 products in `data/products.import.json`.
  - Import result: categories `Сумки пляжные` 19, `Ремувки` 19, `Шевроны` 20; 213 source photos matched; no import warnings.
  - Added `tools/publish_imported_products.py` to optimize imported images for the static preview catalog.
  - Published preview data to `data/products-live.json` and optimized WebP assets under `assets/product-preview/`.
  - Optimized static asset size: about 24 MB for 213 WebP files instead of about 317 MB source images.
  - `app.js` now fetches `data/products-live.json` for visitors who do not already have products saved in localStorage.
  - Local browser check at `http://127.0.0.1:4174/catalog.html` showed 58 product cards and 9 category tiles including `Сумки пляжные`, `Ремувки`, `Шевроны`.
  - Production verification passed after deploy:
    - `https://sobag-opt-site.vercel.app/catalog` serves `app.js?v=20260527-first-import`.
    - `https://sobag-opt-site.vercel.app/data/products-live.json` returns 58 products.
    - sample image `assets/product-preview/68029/1.webp` returns HTTP 200.
    - browser check on production showed 58 product cards and 9 category tiles.
- Test import assets were later removed at the user's request:
  - deleted tracked `assets/product-preview/` and `data/products-live.json`;
  - removed local generated `assets/imported-products/`, `data/products.import.json`, and `data/import-report.csv`;
  - removed the frontend `products-live.json` fetch so production does not make a dead test-data request;
  - kept `local-import-output/products-from-photo-folders.xlsx` locally so the user's edited import table is not lost.
- Production verification after push:
  - `https://sobag-opt-site.vercel.app/catalog` serves `app.js?v=20260527-importer-admin`.
  - Production `app.js?v=20260527-importer-admin` contains the XLSX template download handler and editable catalog admin fields.
  - `https://sobag-opt-site.vercel.app/templates/sobag-products-template.xlsx` returned HTTP 200 with the expected template file.
- Latest local work before the next push:
  - Added a separate `favorites.html` page for the header heart button.
  - Header favorite buttons on the main static pages now navigate to `favorites.html`.
  - Favorites page reuses catalog cards and filters but only shows products saved in `sobag.favorites`.
  - Empty favorites now show a clear empty state with a catalog button.
  - Template/list parsing now prefers `;` for multi-value cells and still reads old comma-only cells for backward compatibility.
  - Regenerated `templates/sobag-products-template.csv` and `templates/sobag-products-template.xlsx` with `;` in list examples.
  - Updated `docs/product-import.md` to explain `;` and decimal-comma sizes like `3,5`.
  - Local ignored CSV `local-import-output/products-from-photo-folders.csv` was also converted from comma-list examples to `;`; the edited XLSX already had no comma delimiters in checked list columns.
  - Local checks passed:
    - `node --check app.js`
    - `node --check cart.js`
    - `python -m py_compile tools/product_importer.py tools/publish_imported_products.py`
    - browser check at `http://127.0.0.1:4174/favorites.html` verified empty favorites.
    - browser flow check from category catalog -> heart click -> header favorites button verified `1 товар` on `favorites.html`.

## Important Constraints

- No backend exists yet.
- Users, carts, admin changes, and orders are localStorage prototype data.
- Admin image uploads are local browser storage only and are not permanent across devices.
- Excel/CSV import and export are prototype-level in frontend.
- Local importer output (`local-import-output/`, `assets/imported-products/`, `data/products.import.json`, `data/import-report.csv`) is intentionally gitignored.
- A browser page cannot automatically read arbitrary folders from the user's PC; local photo matching needs explicit folder selection or a local importer script.
- 10k+ products and photo assets should not be stored in `app.js`, GitHub, Vercel static bundle, or localStorage for production.
- No real payment, CRM, email, auth provider, database, or production file storage yet.

## Useful Test Accounts

Prototype admin login:
- email: `admin@sobag.local`
- password: `admin`

This is demo-only localStorage data, not a production secret.

## Next Likely Work

- Continue polishing visual style and typography.
- Replace prototype images with designer assets later.
- Expand admin from localStorage to real backend/storage when ready.
- Design and build the real product import workflow: Excel/CSV + local photo folders -> normalized products + uploaded photo URLs.
- Add legal/personal data pages and real consent text.
- Build production order submission path.
