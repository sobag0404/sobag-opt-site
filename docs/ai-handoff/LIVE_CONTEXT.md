# Live AI Context

Last updated: 2026-06-02

## Latest Session Notes

- Fixed a site-wide mojibake / broken UTF-8 regression where Russian text rendered as `Р...` sequences on production pages.
- Restored all static HTML pages to valid UTF-8 while preserving the current admin/catalog JavaScript behavior.
- Added an `autofix` guard that scans HTML plus key client scripts for common mojibake sequences before deploy.
- Verification passed locally:
  - `npm.cmd run autofix`
  - `npm.cmd run check`
  - `npm.cmd run ui:smoke` with 6/6 tests passing
  - Browser check on `/` and `/admin-products.html`: page titles/headings are valid Russian and no mojibake detected in visible text.
- Commit pushed: `89ebdca Fix UTF-8 text encoding guard`.
- Production verification passed on `https://sobag-shop.online/` and `/admin-products.html`:
  - HTML serves `20260602-encoding-fix`;
  - visible browser text has valid Russian headings;
  - no common mojibake sequences detected.
- Current focus: the user will manually check the admin panel.

## 2026-06-02 Admin / Orders / Import / Account Pass

- Strengthened the next 1-4 roadmap step:
  - `autofix` now scans server `api/**/*.js` for mojibake, not only HTML and client scripts.
  - Favorites are now stored per user with `sobag.favorites.{email}` while preserving legacy guest favorites.
  - Buyer account order cards now include `Повторить заказ`; it adds previous order lines back to the current cart and opens the cart page.
  - Buyer account shows saved address data collected from server/local order history.
  - Manager order detail now includes quick contact actions for phone/email when customer data exists.
  - Admin import preview flags existing base SKU duplicates and variant SKU conflicts before saving.
  - Admin import save now skips products whose generated variant SKUs collide with existing or same-batch variants; old products remain untouched.
- Verification passed:
  - `npm.cmd run check`
  - `npm.cmd run autofix`
  - `npm.cmd run ui:smoke` with 7/7 tests passing, including new repeat-order and per-user favorites coverage.
- Still to remind user after this pass:
  - Fill SEO/content pages: About, Contacts, Business Terms, legal docs, maps, requisites.
  - Later, move cart/favorites to server storage if cross-device persistence becomes required.

## 2026-06-02 Content Trust Pages Pass

- Added a dedicated `business.html` page for `Условия для бизнеса`.
- Header and footer business links now route to `business.html` instead of `index.html#wholesale`; legacy `data-scroll="#wholesale"` still resolves safely to the new page.
- Added editable admin text fields for the business page:
  - page title/lead;
  - minimum order block;
  - discount block;
  - production block;
  - manager communication block;
  - documents/agreement block.
- Added the business page to the admin content-section map and preview links.
- Added `terms.html` as a working user-agreement document page; footer agreement links now open it in a new tab.
- Existing personal-data consent PDF remains linked from registration and footer and opens in a new tab.
- Added CSS for business condition cards using existing panel primitives, without introducing extra decorative layers.
- Updated cache-busting version to `20260602-business-pages` across HTML references.
- Verification passed:
  - `npm.cmd run check`;
  - `npm.cmd run autofix`;
  - `npm.cmd run ui:smoke` with 7/7 tests passing;
  - local Playwright visual QA for `/business.html`, `/terms.html`, and `/admin-products.html#content`: no horizontal overflow and no mojibake in visible text.
- Open note: legal document text is a working placeholder and must be reviewed/replaced before treating it as final legal wording.

## 2026-06-02 Test Content Fill Pass

- Filled test content for trust pages and contacts:
  - `О компании Sobag Opt` now has a fuller B2B/production description.
  - `Контакты` now uses test contacts: `opt@sobag-shop.online`, `+7 900 123-45-67`, and a test Moscow address.
  - `Условия для бизнеса` now has fuller test text for minimum order, discount tiers, production, manager communication, and documents.
  - Footer defaults now use the same test email/phone/address.
  - `cart.js` defaults were updated separately so the cart footer matches the rest of the site.
- Added content migrations in `normalizeSiteContent()` so older saved placeholder strings are replaced by the new test defaults when they match exactly.
- Updated `tel:` href generation in `app.js` and `cart.js` so future admin phone edits update the clickable phone link too.
- Updated cache-busting version to `20260602-test-content`.
- Verification passed:
  - `npm.cmd run check`;
  - `npm.cmd run autofix`;
  - `npm.cmd run ui:smoke` with 7/7 tests passing;
  - local browser QA for About, Contacts, Business, and Cart: no old email/address in visible text, no mojibake, and no horizontal overflow.

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
- `https://sobag-shop.online/`
- fallback Vercel domain: `https://sobag-opt-site.vercel.app/`

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
- Variant SKU rule as of 2026-05-28: `baseSku_ТИП_Размер_МАТ`, joined with `_`. Type and material use the first 3 cleaned chars; size is kept full. Examples: `Подушка` -> `ПОД`, `Наволочка` -> `НАВ`, `Велюр` -> `ВЕЛ`, `Габардин` -> `ГАБ`.
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
- Home hero layout was refined after visual QA: the `30 000 ₽ / 7 дней / до 18%` stats block now follows the same right edge as the header/cart area so it does not drift past the cart at zoomed page scales; the `Актуально` slider is lower and its bottom aligns with the hero action buttons on desktop; mobile remains stacked.
- Applied modern web guidance pass for items 1-4:
  - image tags now include explicit dimensions, lazy/eager loading, async decoding, and priority hints for hero/active images;
  - product catalog JSON no longer uses timestamp cache busting, while Vercel gives browser cache + stale revalidation to assets and revalidation to `products-live.json`;
  - registration, request, and checkout forms now use autocomplete and inline field errors;
  - account/product/admin/checkout modals have Escape close, focus management, focus trap, and better dialog labels.
- Security/backend item 5 started:
  - Added Vercel API layer in `api/` for auth, HttpOnly sessions, orders, admin order status updates, and admin user role updates.
  - Server passwords are hashed with PBKDF2; server sessions are stored in Upstash Redis/Vercel KV-compatible storage.
  - Added `docs/backend-security.md` with required Vercel env vars. Do not commit secrets.
  - Frontend now tries server API first for auth/order/role/status flows, then falls back to prototype `localStorage` if backend storage is not configured.
  - Added `npm run check` / `npm run autofix` and GitHub Actions `autofix-check` on push, PR, and weekly schedule.
  - Added baseline security headers in `vercel.json`.
  - Remaining production task: connect Upstash Redis/Vercel KV env vars and set `SOBAG_ADMIN_EMAIL` / `SOBAG_ADMIN_PASSWORD` in Vercel.
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
- Handoff preparation for moving to another device:
  - refreshed `AI_HANDOFF.md`, `CURRENT_STATUS.md`, `NEW_CHAT_PROMPT.md`, `NEW_DEVICE_SETUP.md`, and `SERVER_HANDOFF_STORAGE.md`;
  - removed stale/mojibake text from older handoff docs;
  - documented the current production URLs, latest functional commit, local setup commands, import constraints, and no-secrets policy;
  - rebuilt `project-ai-handoff-latest.zip` from `docs/ai-handoff`.
- Product-photo folder analysis on 2026-05-28:
  - source folder: `C:\Users\SoBag\OneDrive\Рабочий стол\карточки сайт`;
  - user asked to analyze only, not add to site;
  - found 808 product folders and 2768 `.png` images;
  - all first images are readable, square, and 1024x1024;
  - no empty folders found;
  - image counts per product folder: 484 have 3 images, 290 have 4, 22 have 6, and 12 have 2;
  - structure is flat (`opt_...` product folders directly under root), so category/type must be inferred from image and/or folder name/reference Excel rather than parent folder;
  - contact sheets generated locally under ignored folder `local-import-output/contact-sheets/` for visual QA.

- Product suggestion workbook prepared on 2026-05-28:
  - fixed one source folder typo by renaming trailing underscore folder `opt_65598_` to `opt_65598`;
  - matched the photo folders against the extracted reference Excel folder `C:\Users\SoBag\OneDrive\Рабочий стол\опт`;
  - generated editable workbook `local-import-output/ai-product-suggestions.xlsx` with 808 product rows and 808 embedded thumbnail images;
  - generated semicolon-delimited mirror file `local-import-output/ai-product-suggestions.csv`;
  - 515 articles matched reference Excel themes; 293 did not match and are marked in the comment column;
  - category and product type columns are intentionally left blank because the user asked not to auto-fill category/type; collections, holidays, tags, names, descriptions, source photo paths, gallery image names, and confidence/comments are prefilled for review;
  - no products or photos from this batch were added to the site.
- Import rules updated on 2026-05-28:
  - product tables now use `Категории` and support multiple categories in one cell separated by `;`, e.g. `Подушки; Наволочки`;
  - old `Категория` column remains supported as an alias;
  - frontend filtering, category tiles, search, export, and modal category tags now read `product.categories`;
  - variants now carry display names generated from type, so `Подушка капибара` with type `Наволочка` displays as `Наволочка капибара` in the product modal/cart;
  - browser Excel import and admin save now skip duplicate `Основной артикул` values and never remove existing catalog products;
  - local `tools/product_importer.py import` now appends to an existing output JSON by default, skips duplicate base SKUs into the report, and only replaces output when explicitly run with `--replace`;
  - regenerated `templates/sobag-products-template.csv/.xlsx`; local suggestion workbook was updated to use the `Категории` header.
  - checks passed: `node --check app.js`, `python -m py_compile tools/product_importer.py`, template readback, and a duplicate-import smoke test under ignored `local-import-output/dup-test`.
- Filled product suggestion workbook update on 2026-05-28:
  - regenerated `local-import-output/ai-product-suggestions.xlsx` and `local-import-output/ai-product-suggestions-filled.xlsx` with categories, product types, sizes/material defaults, collections, holidays, tags, names, descriptions, confidence, and comments;
  - classification used product-photo templates plus reference Excel topics; no products/photos were added to the site;
  - auto-category counts: 517 `Подушки/наволочки`, 156 `Мешки для обуви`, 65 `Флаги`, 51 `Чехлы на чемодан`, 19 `Ремувки`;
  - examples: `opt_00104` -> `Ремувка брелок`; `opt_22434` -> `Подушка Паттерны`; `opt_81486` actual local photo is a pillow with `День рождения`, not a flag;
  - `app.js` variant display names now include selected size/material, except generic `Стандарт`, so cart/modal names can change with selected characteristics.
- Variant price export update on 2026-05-28:
  - base SKUs generated from photo folders now keep the `opt_` prefix, e.g. folder/article `67895` becomes `opt_67895`;
  - frontend no longer uppercases entered/imported base SKUs, but duplicate checks still compare case-insensitively;
  - admin now has CSV export buttons for variant prices (`sobag-variant-prices-all.csv` and filtered variants), where each row is one variant SKU with type, size, material, and price;
  - generated local editable files `local-import-output/variant-prices.xlsx` and `local-import-output/variant-prices.csv` from the current 808-product suggestion workbook; result: 10,733 variant rows;
  - local suggestion workbook was regenerated so `Основной артикул` values are `opt_...` (`opt_00104`, `opt_22434`, etc.).
- First real product catalog publication on 2026-05-28:
  - user edited `local-import-output/ai-product-suggestions.xlsx`; workbook cleanup normalized collections/tags/holidays, merging forms like `Однотонный`/`Однотонные`, `Детский`/`Детские`, and `9мая`/`9 мая`, and removed duplicate list entries;
  - backup before cleanup: `local-import-output/ai-product-suggestions-before-taxonomy-cleanup.xlsx`;
  - local import from the cleaned workbook produced 808 products with no duplicate base SKUs;
  - published persistent static catalog files: `data/products-live.json` plus optimized WebP images under `assets/product-preview-live/`;
  - optimized output: 2,768 WebP files, about 83 MB total; source copied import photos remain ignored locally under `assets/imported-products/` and are about 3.2 GB;
  - `app.js` now fetches `data/products-live.json`; if no browser-local products exist, the live catalog replaces the old test drafts, and if local products exist, it merges without deleting them;
  - published data automatically adds missing categories, collections, and holidays into site content in the browser; collections/holidays from the workbook therefore become visible even if not in the original defaults;
  - regenerated local `variant-prices.xlsx/.csv` after the user's edits; result: 12,962 variant rows;
  - local HTTP checks passed for `data/products-live.json` and sample image `assets/product-preview-live/opt-00104/1.webp`;
  - full Playwright screenshot check was attempted but blocked because the Playwright browser binary is not installed (`npx playwright install` would be needed).
- Deployment verification on 2026-05-28:
  - committed and pushed `afc5876 Publish imported live product catalog` to `origin/main`;
  - production URL `https://sobag-opt-site.vercel.app/data/products-live.json` returned HTTP 200 with 808 products;
  - production sample image `https://sobag-opt-site.vercel.app/assets/product-preview-live/opt-00104/1.webp` returned HTTP 200 as `image/webp`;
  - production `app.js` contains the live catalog loader and `data/products-live.json` reference.
- Product cleanup/fixes requested on 2026-05-28:
  - removed embedded prototype product drafts and deleted old `assets/hero-products-*.png` test images;
  - static "actual" images now point at real imported product WebP assets;
  - product normalization no longer appends old generated images to every product gallery;
  - stale localStorage prototype products and cart lines are filtered out by `SB-` SKU / old image references;
  - fixed Cyrillic variant name replacement so `Подушка Паттерны` becomes `Наволочка Паттерны ...` for cover variants instead of `Наволочка Подушка ...` or `Подушка Подушка ...`;
  - modal title sizing was reduced, "Итого по позиции" was renamed to "ИТОГО";
  - unit price now reflects the applied cart quantity discount in modal/cart displays;
  - discount hint now shows an approximate remaining basket amount to the next tier;
  - empty filter groups (for example holidays with no options in the current category) are hidden.
- Domain setup on 2026-05-28:
  - Vercel CLI is available via `npx.cmd vercel` and authenticated as `ashumakov0404-7596`;
  - added `sobag-shop.online` and `www.sobag-shop.online` to Vercel project `sobag-opt-site`;
  - user set REG.RU DNS records in the panel: `A @ 76.76.21.21` and `A www 76.76.21.21`;
  - DNS propagation is still pending as of the latest check: `ns1.reg.ru` and public resolvers still return old `194.58.112.174`;
  - added `.vercelignore` to exclude local importer artifacts from CLI deploys; without it Vercel tried to upload local `assets/imported-products` (~3.2 GB);
  - manual `npx.cmd vercel deploy --prod -y` succeeded and aliased production to `https://sobag-shop.online`;
  - production `https://sobag-opt-site.vercel.app` now serves the latest prototype-data cleanup code.
- Product photo order fix on 2026-05-28:
  - user reported that numbered photo 3/4 should be the main product photo, not photo 1;
  - current `data/products-live.json` was reordered so galleries run from the highest numeric filename down to 1, e.g. `4.webp, 3.webp, 2.webp, 1.webp`;
  - `tools/product_importer.py` now copies numeric source photos in descending order for future imports;
  - `tools/publish_imported_products.py` now reorders product `image`/`gallery` after WebP publishing so old imported JSON cannot republish the wrong main image order;
  - static "actual" slide fallbacks were updated from `1.webp` to the highest available sample photo for the referenced product folders.
- Catalog card and discount hint adjustment on 2026-05-28:
  - catalog product cards were compacted by replacing the "перейти в карточку" button text with the product price on the button itself;
  - product modal copy spacing was normalized between title, short description, and detailed description;
  - basket discount hints now show a remaining ruble amount to the next basket discount tier, e.g. `29 440 ₽ до скидки 5%`, instead of a plain `0%` discount label.

- Product card/detail polish on 2026-05-28:
  - catalog favorite buttons were made smaller;
  - catalog product name typography was reduced and SKU/name/copy/price button spacing was separated;
  - product detail now opens with quantity `0`, so the preview unit is not counted toward basket discount until the user increases quantity;
  - product detail quantity uses visible minus/plus buttons next to the number, and adding with zero quantity is blocked with a toast.
- Flag photo order exception on 2026-05-28:
  - Excel files contain 65 rows in category `Флаги`;
  - current `data/products-live.json` was updated so only flag products use gallery order `1.webp, 2.webp, 3.webp...`;
  - other products keep the "last numbered photo first" order;
  - `tools/product_importer.py` and `tools/publish_imported_products.py` now preserve this category-specific rule for future imports/publications.

- Header redesign on 2026-05-29:
  - top line became compact navigation: `Условия для бизнеса`, `Мы на маркетплейсах`, `О компании`, `Контакты`, plus the theme toggle;
  - lower header now keeps only the larger Sobag Opt logo, catalog button, search, account, favorites, and cart;
  - old top text snippets and lower-row marketplace/business buttons were removed from shared pages;
  - `benefits` sections now have `id="about"` and footers have `id="contacts"` so new top links have targets;
  - cart page received the same top navigation and local theme-toggle handling in `cart.js`.
- Header nav tweak on 2026-05-29:
  - top navigation order changed so `Мы на маркетплейсах` comes before `Условия для бизнеса`;
  - all four top navigation links now share the same button styling and equal width based on the widest phrase.
- Current header/search/admin tweak on 2026-05-29:
  - top navigation was made shorter and lighter, with smaller animated equal-width buttons;
  - search logic now ranks exact SKU first, exact product name second, then partial matches, and renders similar product suggestions under the search input when there is no exact match;
  - seeded admin account is now `admin@sobag` / `admin`, and the public login modal no longer displays admin credentials;
  - admin content settings are grouped by page so future new pages should be added to `siteTextFieldPages` immediately.
- Theme toggle tweak on 2026-05-29:
  - top nav links are borderless by default and show the border only on hover;
  - the theme switcher is a compact toggle with the same height as top nav links and text `ночная тема` / `дневная тема`.

## Important Constraints

- No backend exists yet.
- Users, carts, admin changes, and orders are localStorage prototype data.
- Admin image uploads are local browser storage only and are not permanent across devices.
- Excel/CSV import and export are prototype-level in frontend.
- Local importer output (`local-import-output/`, `assets/imported-products/`, `data/products.import.json`, `data/import-report.csv`) is intentionally gitignored.
- A browser page cannot automatically read arbitrary folders from the user's PC; local photo matching needs explicit folder selection or a local importer script.
- 10k+ products and photo assets should not be stored in `app.js`, GitHub, Vercel static bundle, or localStorage for production.
- No real payment, CRM, email, auth provider, database, or production file storage yet.

## Next Likely Work

- Continue polishing visual style and typography.
- Replace prototype images with designer assets later.
- Expand admin from localStorage to real backend/storage when ready.
- Design and build the real product import workflow: Excel/CSV + local photo folders -> normalized products + uploaded photo URLs.
- Add legal/personal data pages and real consent text.
- Build production order submission path.

## Latest Update 2026-05-29

- Search control was softened: no heavy inner/focus frame, larger radius, subtle focus shadow only.
- Top navigation spacing was equalized, and the daytime hover state for the theme toggle keeps readable text.
- `about.html` and `contacts.html` were added as separate pages, and all top links now point to those pages instead of old anchors.
- Contacts page includes an address field and Yandex Maps iframe/link without an API key.
- Admin content settings now include fields for the new about/contact pages and footer columns.
- Shared footer was expanded into columns (`Компания`, `Клиентам`, `Партнерам`, `Контакты`) across pages, including the cart page.
- Registration now requires a personal-data consent checkbox only when registering, not when logging in.
- Draft consent files were added at `assets/legal/personal-data-consent.html` and `assets/legal/personal-data-consent.pdf`; this is a draft template and needs legal review before production use.
- Follow-up on 2026-05-29:
  - footer links that resolve to PDF documents now render with `target="_blank" rel="noopener"` even when generated from admin-editable footer text;
  - catalog section state is now synced into the URL on category/collection/holiday/search changes, so refresh keeps the same catalog section via `?category=...`, `?collection=...`, `?holiday=...`, and `?q=...`.
- Home benefits copy update on 2026-05-29:
  - first benefit became `Скидка от суммы заказа`: basket total controls discount and recalculates immediately;
  - production/marketplace benefits were rewritten;
  - fourth benefit became `Прямая связь`: personal manager and direct communication with production;
  - `normalizeSiteContent()` softly migrates old default benefit phrases from saved localStorage content to the new copy.
- Hero stats swap on 2026-05-29:
  - hero stats block was moved up into the previous `Актуально` position, while `Актуально` was moved lower on the right;
  - hero stats copy now reads `30 000 ₽ / минимальная сумма заказа`, `7 дней / тестовый запуск партии`, `до 18% / скидка при заказе`;
  - `normalizeSiteContent()` softly migrates old saved hero stats strings from browser content storage.

- Motion layer on 2026-05-29:
  - added a centralized CSS motion layer inspired by transitions.dev, with reduced-motion support;
  - product/category/theme/actual cards now reveal softly on render and keep subtle hover movement without changing the day/night palette;
  - modal open/close now animates in `app.js`, and cart checkout close animates in `cart.js`;
  - cart/favorites counters and key totals use a small pop animation only when values change;
  - form fields replay a small shake when validation fails.

- Vercel storage setup on 2026-05-29:
  - Upstash for Redis resource `upstash-kv-beige-lens` was provisioned through Vercel Marketplace and connected to `sobag-opt-site`;
  - Vercel created encrypted `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL`, and `REDIS_URL` for Production, Preview, and Development;
  - `SOBAG_ADMIN_EMAIL` and `SOBAG_ADMIN_PASSWORD` were added as encrypted variables for Production and Development;
  - Vercel CLI refused adding admin variables to Preview for the production branch `main`; production uses the configured variables.

- UI refactoring pass on 2026-05-29:
  - backup created at `C:\Users\SoBag\OneDrive\Документы\New project\backups\sobag-opt-site-backup-20260529-145930.zip` without `.env`, `.git`, `.vercel`, `node_modules`, or large QA screenshots;
  - shared `topline`, commerce header, cart header, and footer were moved into `components/site-shell.js`;
  - HTML pages now keep only semantic shell placeholders (`data-site-topline`, `data-site-header`, `data-site-footer`) and page-specific content;
  - product/category animation delays were moved from inline `style` attributes to CSS classes `motion-delay-*`;
  - `tools/autofix.mjs` now checks `components/site-shell.js`, rejects duplicated header/footer shell markup in HTML pages, and rejects inline `style=` in HTML/JS outside the shell component.

- UI page split pass on 2026-05-29:
  - `index.html`, `catalog.html`, `favorites.html`, `custom.html`, and `marketplaces.html` were split into true page-specific composition files instead of carrying repeated sections hidden by CSS;
  - the old cross-page `display: none` routing layer was removed from `styles.css`;
  - `tools/autofix.mjs` now verifies section ownership for the large pages so hidden duplicate sections are not accidentally reintroduced;
  - local visual QA was run for home, catalog, favorites, custom print, marketplaces, and mobile catalog via Playwright screenshots under ignored `output/playwright/`.
  - committed as `b7f05c0 Split page-specific sections` and pushed to `origin/main`;
  - production deploy succeeded on Vercel, aliased to `https://sobag-shop.online`;
  - production QA screenshots passed for home, catalog, custom print, and marketplaces; `https://sobag-shop.online/api/health` returned `{"ok":true,"storage":"ready"}`.

- Favorite click flicker fix on 2026-05-29:
  - user video showed the catalog visually blinking when clicking favorite hearts;
  - root cause: favorite clicks called `renderProducts()`, rebuilding the whole product grid, while product cards replayed `motion-enter` animations on every rebuild;
  - catalog favorite clicks now update only matching favorite buttons and the header counter, without rebuilding the grid;
  - product listing cards no longer receive entrance animation classes from `renderProducts()`, so filter/sort/search redraws are quieter;
  - HTML app cache-bust was updated to `app.js?v=20260529-favorite-no-flash` so browsers fetch the fixed script.

- Navigation flicker fix on 2026-05-29:
  - added `navigateWithinSite()` to avoid full page reloads when a button/link points to the current route;
  - header `Каталог` on an already-open catalog page now clears the catalog state in-place instead of reloading the page;
  - same-page internal links and `href="#"` placeholders are intercepted so they do not jump/reload visually;
  - cart page received the same same-route/placeholder link guard;
  - catalog home tiles keep their entrance animation only on the first render, avoiding repeated reveal animations after data refreshes.

- Device handoff prep on 2026-05-29:
  - refreshed `AI_HANDOFF.md`, `CURRENT_STATUS.md`, `NEW_CHAT_PROMPT.md`, `NEW_DEVICE_SETUP.md`, and `SERVER_HANDOFF_STORAGE.md` with current production domain, latest commit, Vercel API/KV state, GitHub access audit, navigation flicker fixes, and no-secrets constraints;
  - primary production domain is now `https://sobag-shop.online/`; `https://sobag-opt-site.vercel.app/` remains the fallback Vercel domain;
  - latest functional commit before handoff docs update is `6c7eb4a Prevent same-page navigation flicker`;
  - if work continues on a different device over the weekend, repeat handoff prep there before switching back.
  - handoff docs and ZIP were committed and pushed in `11bf9b8 Refresh device handoff package`;
  - rebuilt `project-ai-handoff-latest.zip` from `docs/ai-handoff`; size is 23,251 bytes; the ZIP is tracked in GitHub but intentionally excluded from Vercel by `.vercelignore`, so a public Vercel 404 for this ZIP is expected;
  - production deploy after handoff docs succeeded and was aliased to `https://sobag-shop.online/`;
  - `https://sobag-shop.online/api/health` returned storage ready, and published handoff markdown on Vercel contains the current production domain and latest functional commit.

- Stability/data pass on 2026-06-01:
  - continued on the same device; no weekend device switch happened;
  - added `tools/validate-products.mjs` and wired it into `npm run check` through `tools/autofix.mjs`;
  - product validation now checks duplicate base SKUs, required taxonomy arrays, duplicate taxonomy values, missing images, prototype/test image references, generated variant SKU uniqueness, and positive generated prices;
  - current `data/products-live.json` validates as 808 base products and 12,962 generated variants;
  - added Playwright smoke tests in `tools/ui-smoke.spec.js` plus `npm run ui:smoke`; tests cover catalog navigation without same-document reload, favorite toggles, filters, product modal, variant SKU changes, cart add, exact SKU search, and fuzzy suggestions;
  - local verification passed with `npm run check` and `SOBAG_BASE_URL=http://127.0.0.1:4173 npm run ui:smoke`;
  - production smoke verification also passed with `SOBAG_BASE_URL=https://sobag-shop.online npm run ui:smoke`; the test accepts both local `/catalog.html` and Vercel clean URL `/catalog`.

- Import pipeline hardening on 2026-06-01:
  - strengthened `tools/product_importer.py` for the next mass-import pass;
  - numeric base SKUs from tables now normalize to `opt_...`, for example `67895` becomes `opt_67895`;
  - if `data/products.import.json` is missing, importer now uses `data/products-live.json` as the base catalog, so a new small batch does not accidentally replace all live products;
  - import reports now include statuses such as `created`, `duplicate_skipped`, and `variant_duplicate_skipped`;
  - importer now generates `variant-prices.xlsx` and `variant-prices.csv` with one row per calculated variant;
  - importer now checks generated variant SKU collisions during import, not only later in product validation;
  - `tools/publish_imported_products.py` now builds optimized images in a temporary folder and replaces the target folder only after a successful build; fallback/external images outside imported assets are left untouched;
  - `npm run check` now also compiles the Python importer/publisher scripts;
  - smoke-tested importer with a temporary two-row CSV: one `opt_67895` product was created, the duplicate row was skipped, old 808 live products were kept, and variant price files were created.

- Catalog audit pass on 2026-06-01:
  - user asked to audit points 1-6 for the currently loaded products: categories, names, collections/tags, photos, prices/variants, and storefront UI;
  - added `tools/audit_catalog.py` and `npm run audit:catalog`; output is intentionally local/ignored under `local-import-output/catalog-audit`;
  - latest local report file is `local-import-output/catalog-audit/catalog-audit.xlsx` with companion CSV/Markdown reports;
  - the audit workbook includes a `Замечания` sheet for manual cleanup items such as empty collections, planned categories with zero products, remuvki size splits, and risky brand/theme names;
  - audit result: 808 products, 12,962 calculated variants, 6 categories, 33 collections, 5 holidays;
  - no duplicate base SKUs, no generated variant SKU collisions from validation, no missing product images, and all checked live images are standardized square assets;
  - category counts: `Подушки` 517, `Наволочки` 517, `Мешки для обуви` 170, `Флаги` 65, `Чехлы на чемодан` 37, `Ремувки` 19; `Пледы` and `Чехлы на кулер` are planned categories but currently have 0 real products;
  - data-quality notes: 101 products have empty collections, remuvki sizes appear split as `13х3` plus `5` instead of likely `13х3,5`, and many products have theme-level duplicate names such as `Подушка Паттерны` or `Подушка Цветы`;
  - added a mobile overflow smoke test in `tools/ui-smoke.spec.js` for home, catalog, cart, favorites, marketplaces, about, and contacts pages;
  - fixed mobile header overflow in `styles.css` by restoring the compact two-column mobile grid after later desktop header overrides;
  - local checks passed: `npm run audit:catalog`, `npm run check`, and local `npm run ui:smoke` against `http://127.0.0.1:4173`.
  - committed and pushed as `e09b416 Add catalog audit workflow`; production deploy succeeded on Vercel and was aliased to `https://sobag-shop.online`;
  - production verification passed: home/catalog returned HTTP 200, `/api/health` returned `{"ok":true,"storage":"ready"}`, production `npm run ui:smoke` passed, and mobile overflow is 0px on home, catalog, and cart at 390px width.

- Remuvki size cleanup on 2026-06-01:
  - user confirmed remuvki should have one size `13х3,5`;
  - fixed 19 remuvki in `data/products-live.json`, replacing split sizes `13х3` and `5` with one size `13х3,5`;
  - also fixed the ignored local working import file `data/products.import.json` so a local republish does not reintroduce the split size;
  - catalog audit now reports 12,943 generated variants instead of 12,962 because each remuvka now has one size variant rather than two;
  - `local-import-output/catalog-audit/data-quality.csv` no longer contains `Размеры` rows for the remuvki decimal-size issue.

- Order management/customer profile pass on 2026-06-01:
  - empty planned categories are hidden from the catalog start page when they have 0 live products;
  - added standalone management pages `admin-order.html` and `admin-customer.html`;
  - admins and managers can open an order in a new tab, change its status, assign a manager, save a manager note, and open the buyer profile/history in a new tab;
  - current order statuses: `new`, `processing`, `waiting`, `done`, `canceled`;
  - admin API now allows managers to read users/orders, while role changes remain admin-only;
  - customer address is stored with new orders and mirrored into the registered user's profile, address history, and last customer data;
  - guest customer profile pages can be synthesized from order history, so managers can inspect non-registered buyers too;
  - order CSV export now includes customer address;
  - cart/catalog request forms include address field with browser autocomplete;
  - local checks passed: `npm.cmd run check`, `npm.cmd run ui:smoke`; smoke now includes admin order/customer pages for a guest customer.
  - committed and pushed as `0b21384 Add order management pages`;
  - production deploy succeeded on Vercel and was aliased to `https://sobag-shop.online`;
  - production verification passed: `/`, `/catalog`, `/admin-order`, `/admin-customer` returned 200 after Vercel clean-route redirects where applicable, `/api/health` returned storage ready, and production `npm run ui:smoke` passed.

- Admin orders/workspace pass on 2026-06-01:
  - added `admin-orders.html`, a standalone manager/admin work page for all orders;
  - order list supports status filtering, text search by order/customer/SKU data, status counters, CSV export, and direct links to each order/customer profile in new tabs;
  - the account modal now links managers/admins to the full orders page instead of forcing all order work inside the profile modal;
  - content admin modal now starts with a 9-card visual section map: header/global, home, catalog, marketplaces, custom print, about, contacts, cart, and footer;
  - content sections now have stable anchors and mini schematic previews so it is clearer which text belongs to which page/block;
  - local checks passed: `npm.cmd run check`, `npm.cmd run ui:smoke`, and a Playwright spot-check for `admin-orders.html` plus admin content map.
  - skill repository review: keep ideas from Composio `webapp-testing`, frontend design QA, and 1C skills as references; do not bulk-install external skill packs because of noise/OAuth/action risks.

- Admin products workspace pass on 2026-06-01:
  - added `admin-products.html`, an admin-only product management page;
  - product admin supports search by SKU/name/tag text, filters by category, collection, holiday, size, material, and visibility;
  - each product row has quick product-card preview, copy SKU, editable name/base price/short description/detail description, variant details, and hide/show action;
  - no product delete action was added; hiding sets `hidden: true`, `saveProducts()` preserves the product, and public catalog/filter/category counts ignore hidden products;
  - CSV exports support selected products or, when nothing is selected, the currently filtered product list; variant price export uses the same selection/filter scope;
  - local checks passed: `npm.cmd run check`, `npm.cmd run ui:smoke`, and a Playwright spot-check that edited `opt_00104` price locally and toggled hidden without deleting the product.

- Admin variant price editor pass on 2026-06-01:
  - added `admin-prices.html`, an admin-only table for variant-level prices;
  - product variants now support `variantPrices` overrides keyed by variant SKU, so a variant can keep a custom price independent of base product price;
  - price editor includes search and filters by category, collection, holiday, type, size, and material;
  - bulk price tools support percent, ruble delta, fixed price, and rounding step;
  - manual per-row price edits, CSV/XLSX import, and bulk tools all build a preview first; changes are saved only after clicking apply;
  - visible table is capped at 500 rows for performance, while exports and bulk actions use the full current filter when nothing is selected;
  - local checks passed: `npm.cmd run check`, `npm.cmd run ui:smoke`, manual Playwright spot-check for manual preview/apply to `variantPrices`, and CSV import preview.
  - committed and pushed as `e0ad76a Add variant price admin page`;
  - production deploy succeeded on Vercel and was aliased to `https://sobag-shop.online`;
  - production verification passed for `/`, `/catalog`, `/admin-prices`, `/admin-products`, `/api/health`, and production `tools/ui-smoke.spec.js`.

- Server catalog persistence pass on 2026-06-01:
  - added separate Redis/KV catalog storage under `sobag:catalog:v1`, so auth/orders do not need to read the full catalog blob;
  - added public `GET /api/catalog`, which returns the server catalog when present and falls back to `data/products-live.json` when the server catalog is empty or local storage is not configured;
  - added admin-only `GET/PUT /api/admin/catalog` for saving the full cleaned product catalog, including `variantPrices`;
  - frontend catalog loading now prefers `/api/catalog`, treats a real server catalog as authoritative across devices, and only merges local products when the API source is the static fallback;
  - `saveProducts()` still writes a local fallback but also debounces a server save for signed-in admins, so product edits, hidden flags, and variant price overrides can be shared across devices;
  - admin products and prices pages include a `Сохранить каталог на сервере` button for the first explicit catalog sync without making a fake product edit;
  - local checks passed: API syntax checks, `npm.cmd run check`, public API fallback smoke, and `npm.cmd run ui:smoke`.
  - committed and pushed as `230d3a1 Persist catalog changes on server`;
  - production deploy succeeded on Vercel and was aliased to `https://sobag-shop.online`;
  - production verification passed for `/`, `/catalog`, `/admin-prices`, `/admin-products`, `/api/health`, `/api/catalog`, and production `tools/ui-smoke.spec.js`;
  - `/api/catalog` currently reports `source=static` and 808 products until an admin performs the first server-backed catalog save.
  - follow-up commit `e187e50 Add manual catalog server sync` added a manual `Сохранить каталог на сервере` button to product and price admin pages; production deploy and smoke passed after this change.

- Roadmap pass 1-8 on 2026-06-02:
  - implemented the next requested batch in order: server admin-content persistence, order workspace/status history improvements, role audit, import workspace page, price XLSX export, catalog SEO metadata, and a first custom-print calculator;
  - added shared content storage under `sobag:content:v1` with public `GET /api/content` and admin-only `GET/PUT /api/admin/content`;
  - site text/images/"Актуально" content now loads from server content when present and remains local/default as fallback when storage is empty or unavailable;
  - expanded order statuses to `new`, `processing`, `waiting`, `production`, `ready`, `shipped`, `done`, and `canceled`;
  - order changes now keep a compact `statusHistory` trail for status/manager/note updates in both frontend fallback storage and `/api/admin/orders`;
  - verified role split: product/catalog/content APIs are admin-only, order/user reading is admin+manager, and role changes remain admin-only;
  - added standalone `admin-import.html` and linked it from the admin profile controls; it reuses the existing XLSX/CSV import preview and duplicate-safe save path;
  - added XLSX export for selected/current admin price rows, alongside existing CSV and variant-price exports;
  - catalog pages now update `title`, description, Open Graph title/description, and canonical URL based on selected category/collection/holiday/search/favorites state;
  - `custom.html` now has a client-side preliminary calculator for product type, material, quantity, packaging, unit price, discount, and total; it is intentionally an estimate and not a binding order price;
  - smoke tests were hardened to use clean Vercel-style routes and live catalog data instead of brittle hard-coded category/query assumptions;
  - local checks passed: JS syntax checks for changed API/client files, `npm.cmd run check`, and `SOBAG_BASE_URL=http://localhost:4173 npm.cmd run ui:smoke` with 6/6 passing;
  - committed and pushed as `b661ff8 Add admin content sync and roadmap improvements`;
  - production deploy succeeded on Vercel and was aliased to `https://sobag-shop.online`;
  - production verification passed for `/`, `/catalog`, `/custom`, `/admin-import`, `/api/health`, `/api/catalog`, and `/api/content`;
  - production API state after deploy: `/api/health` returned storage ready, `/api/catalog` returned 808 products from server storage, and `/api/content` returned `source=default` because no admin content settings have been saved yet;
  - production smoke passed for 5 storefront/admin-ui scenarios; the local-only guest-order smoke is intentionally excluded on production because live backend/session data can overwrite the synthetic localStorage order fixture.

- Admin content editor UX pass on 2026-06-02:
  - redesigned the content admin modal into a clearer page editor: sticky save toolbar, left page/block navigation, right-side editable sections, mini schematic previews, and "Открыть страницу" links for page-level groups;
  - content save now explicitly waits for `/api/admin/content` and updates an inline save status instead of firing server sync only in the background;
  - updated all HTML cache-bust query strings to `20260602-content-editor` for `app.js` and `styles.css`, so deployed browsers should pick up the new admin editor;
  - hardened `tools/ui-smoke.spec.js` to check the admin content editor render path and increased the smoke timeout to 60 seconds because the real 808-product catalog can make local/production tests slower;
  - fixed mobile horizontal overflow found during verification on `admin-prices.html` and `marketplaces.html` by allowing long headings/page-back titles to wrap;
  - local checks passed: `node --check app.js`, `node --check tools/ui-smoke.spec.js`, `npm.cmd run check`, and `SOBAG_BASE_URL=http://localhost:4173 npm.cmd run ui:smoke` with 6/6 passing;
  - committed and pushed as `fb79361 Improve admin content editor`;
  - production deploy succeeded on Vercel and was aliased to `https://sobag-shop.online`;
  - production verification passed for `/`, `/admin-import`, `/api/health`, and `/api/content`; production smoke passed for 5 public/admin-ui scenarios, with the local-only synthetic guest-order scenario excluded on production.

- Workflow/order/SEO/import roles pass on 2026-06-02:
  - implemented the requested 1-6 batch: richer manager order cards, checkout fields, server cart/favorites storage, SEO files/metas, importer battle reports, and staff role split;
  - added `/api/cart` and `/api/favorites`, backed by the existing Redis/KV store under `store.carts` and `store.favorites`; frontend merges local and server cart/favorites after login and syncs changes back softly;
  - added a readiness guard so initial local cart/favorites render does not overwrite server cart/favorites before the first server load completes;
  - expanded checkout/request forms with company/IP data, INN validation, city, address, delivery method, packaging option, comment, and layout filename capture;
  - order API and local fallback now preserve company, INN, city, delivery, packaging, layout filename, address, and comments in user profiles/order history;
  - manager/admin order cards now include per-order CSV export and a print/PDF view; full order CSV export includes the new customer fields;
  - added `content` role ("Контент-менеджер"): admin can assign/remove it, content managers can open product/content/price/import tools, while order/user management remains admin+manager/admin-only as before;
  - added `robots.txt`, `sitemap.xml`, canonical/OpenGraph/Twitter metadata for key public pages;
  - `tools/product_importer.py` report now includes `action`, `variantCount`, and `duplicateReason`; default duplicate behavior still skips existing products, while new `--update-existing` updates by `baseSku` intentionally;
  - updated cache-busting query strings to `20260602-workflow`;
  - local verification passed: JS/API syntax checks, `python -m py_compile tools/product_importer.py`, `npm.cmd run check`, `npm.cmd run autofix`, `npm.cmd run ui:smoke` with 7/7 passing, local Playwright spot-check for checkout/request fields, content-manager product access, `robots.txt`, and `sitemap.xml`;
  - importer smoke with a temp CSV verified created -> duplicate_skipped -> updated behavior and report output.
  - committed locally as `6c98411 Add order workflow and personal state sync`.
