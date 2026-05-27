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

Latest verified production commit:
- pending verification for the upcoming catalog layout/theme-label commit

Latest production verification:
- Local verification passed for category, collection, home, custom, marketplaces, and cart pages before push.
- `node --check app.js` passed.
- Vercel verification still needs to run after pushing the current commit.

## Important Constraints

- No backend exists yet.
- Users, carts, admin changes, and orders are localStorage prototype data.
- Admin image uploads are local browser storage only and are not permanent across devices.
- Excel/CSV import and export are prototype-level in frontend.
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
