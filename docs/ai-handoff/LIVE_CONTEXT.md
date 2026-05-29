# Live AI Context

Last updated: 2026-05-29

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
