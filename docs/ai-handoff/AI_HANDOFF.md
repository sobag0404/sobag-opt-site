# Sobag Opt Site AI Handoff

Last updated: 2026-06-03

## Project

Sobag Opt is a B2B wholesale textile/catalog prototype for printed textile products: pillows, pillowcases, blankets, shoe bags, cooler covers, luggage covers, flags, removki/keychains, custom-print requests, carts, discounts, prototype accounts, admin/manager/content-manager workspaces, editable site content, server-backed cart/favorites prototype state through `/api/auth/me`, and local bulk product import tooling.

Repository:
- GitHub: `https://github.com/sobag0404/sobag-opt-site`
- Branch: `main`
- Primary production domain: `https://sobag-shop.online/`
- Vercel fallback/project domain: `https://sobag-opt-site.vercel.app/`

Latest functional commit before this handoff update:
- `2a36944 Record production verification`

## Current State

The project is a mostly static frontend with a small Vercel API layer.

Frontend:
- Pages are plain HTML files with shared JavaScript and CSS.
- Shared shell markup lives in `components/site-shell.js`.
- Main UI/state logic lives in `app.js`.
- Cart page logic lives in `cart.js`.
- Styling lives in `styles.css`.

Backend/storage:
- Vercel API routes under `api/` support auth, sessions, orders, admin role/order updates, and health checks.
- Upstash Redis / Vercel KV-compatible storage is configured in Vercel.
- Do not store or paste env values in chat or docs.
- Health check: `https://sobag-shop.online/api/health` should return `{"ok":true,"storage":"ready"}`.

## Important Files

- `index.html`: home page.
- `catalog.html`: catalog page with category home and product listing.
- `favorites.html`: separate favorites page.
- `custom.html`: custom-print request page.
- `marketplaces.html`: marketplace page.
- `about.html`: about page.
- `contacts.html`: contacts page with Yandex map iframe/link.
- `cart.html`: separate cart page.
- `components/site-shell.js`: shared top line, header, cart header, and footer.
- `app.js`: main site logic, catalog, filters, favorites, accounts, admin panel, content editing, orders, import/export.
- `cart.js`: cart page logic, checkout modal, discounts, promo code prototype.
- `styles.css`: shared UI styling, day/night themes, responsive layout, transitions.
- `api/`: Vercel API layer.
- `tools/product_importer.py`: local CSV/XLSX + photo-folder importer.
- `tools/publish_imported_products.py`: static preview product publisher for optimized WebP previews.
- `tools/autofix.mjs`: repository checks.
- `templates/sobag-products-template.csv` and `.xlsx`: downloadable product import templates.
- `docs/product-import.md`: current import workflow notes.
- `docs/backend-security.md`: backend/security setup notes.
- `vercel.json`: Vercel clean URLs, headers, and caching.

## Recently Completed

- Custom domain `sobag-shop.online` is connected to Vercel.
- Upstash Redis / Vercel KV storage is configured in Vercel.
- Production admin env variables are configured in Vercel without exposing values in repo.
- Header/footer shell was extracted into `components/site-shell.js`.
- Large pages were split so each page owns only its own content sections.
- AutoFix now checks shell ownership, page section ownership, image hints, and inline style regressions.
- Motion/transition layer was added, then tuned to avoid catalog flicker.
- Product-card favorite clicks now update only the clicked state and header counter instead of rebuilding the entire product grid.
- Same-page navigation flicker was fixed:
  - clicking `Каталог` while already in catalog no longer reloads the page;
  - same-route links and `href="#"` placeholders no longer jump/reload visually;
  - cart page has the same same-route/placeholder guard.
- Catalog product cards no longer replay entrance animation on every product render.
- Catalog home tiles animate only on first render.
- Catalog B2B UX pass was added on 2026-06-03:
  - active filter chips above the product grid;
  - first 120 products rendered with "show more" pagination to reduce catalog DOM weight;
  - recently viewed products;
  - related products inside the product modal;
  - variant matrix for type/size/material/SKU/price/quick quantity;
  - product price CSV download from the modal;
  - Organization, CollectionPage, and BreadcrumbList JSON-LD on catalog states.
- Cart page now behaves more like a commercial proposal:
  - discount is calculated from basket amount;
  - save draft;
  - download CSV;
  - print commercial proposal.
- GitHub access audit was performed:
  - repo is private;
  - only collaborator found: `sobag0404`;
  - no pending invitations;
  - no deploy keys;
  - no webhooks;
  - no forks;
  - no tracked high-risk secret patterns found.

## Current UX / Business Rules

- Day theme should stay black, white, and gray. Do not reintroduce orange into day theme.
- Night theme can use orange accents.
- Buttons should be uppercase, centered, and visually consistent.
- Product cards in catalog show:
  - square photo;
  - base SKU with copy button;
  - product name;
  - price as the button text.
- Product detail modal changes SKU, product name, unit price, and total by selected type, size, material, and quantity.
- Product detail default quantity is `0`, so opening a card does not affect basket discount until the buyer increases quantity.
- Variant SKU rule: `baseSku_ТИП_Размер_МАТ`, where `_` is the separator, type and material use the first 3 cleaned chars, and size is kept full.
- Cart minimum total is `30 000 ₽`.
- Basket discount tiers by cart sum:
  - `30 000 ₽`: 5%
  - `70 000 ₽`: 7%
  - `150 000 ₽`: 12%
  - `300 000 ₽`: 18%
- Quantity tiers still exist for some UI/calculation flows:
  - 30 items: 3%
  - 70 items: 7%
  - 150 items: 12%
  - 300 items: 18%
- Demo promo codes in `cart.js`:
  - `SOBAG5`
  - `OPT10`

## Product Import Notes

Recommended workflow:
1. Keep photos outside Git, for example in a local folder or synced Yandex Disk folder.
2. Use folder shape like `Фото товаров / Категория / Основной артикул / фото` when categories are known.
3. Run `tools/product_importer.py scan-photos` to generate a draft CSV/XLSX from folders.
4. Edit the generated table manually.
5. Use `;` inside list cells, especially for sizes, so decimal comma values like `3,5` remain valid.
6. Run the local importer against the edited table and photo root.
7. Publish only optimized/static preview assets intentionally.

Important import rules:
- Multiple categories are supported in `Категории` with `;`.
- If `Типы товара` contains `Подушка;Наволочка`, display names should adapt by type.
- Duplicate imports must be skipped/updated intentionally; do not delete existing products unless explicitly commanded.
- `tools/product_importer.py import --update-existing` intentionally updates existing products by `baseSku`; without that flag duplicate base SKUs are skipped.
- For flags, photo order is `1,2,3...`; for most other product categories, the highest numbered photo is main.

Ignored/generated import outputs:
- `local-import-output/`
- `assets/imported-products/`
- `data/products.import.json`
- `data/import-report.csv`

Large product-photo folders must not be committed to GitHub/Vercel.

## Important Constraints

- Do not use old Tilda site imagery or design as a visual source.
- Do not add secrets to repo, handoff files, ZIP, or chat:
  - no tokens;
  - no passwords;
  - no `.env`;
  - no SSH keys;
  - no cookies;
  - no database dumps;
  - no production credentials.
- Browser-local data is still used for some prototype UI states and admin content previews.
- Admin image uploads in the browser are not permanent production storage.
- A browser page cannot automatically read arbitrary folders from the user's PC; photo matching needs an explicit local importer or user-selected folder flow.
- For 10k+ products, keep moving toward real backend/database/object storage instead of Git-tracked static catalog data.

## Verification Status

Latest verified checks before this handoff update:
- `node --check app.js`
- `node --check cart.js`
- `npm run check`
- `npm run ui:smoke`
- extra Playwright spot-check for `/catalog?category=Подушки`, product modal variant matrix/related products, and `/cart`.

## Current Focus

Current focus is stabilizing the prototype before continuing larger catalog/import/backend work:
- keep navigation smooth, without reload-like flicker;
- keep handoff docs current before moving between devices;
- continue polishing catalog/cart/admin UX;
- continue real product import workflow later.

If moving again after weekend work, repeat handoff preparation on that device before switching back.
