# Sobag Opt Site AI Handoff

Last updated: 2026-05-22

## Project

Sobag wholesale textile prototype for B2B sales of printed textile products. The site is currently a static frontend prototype deployed from GitHub to Vercel.

Repository:
- GitHub: `https://github.com/sobag0404/sobag-opt-site`
- Branch: `main`
- Production URL: `https://sobag-opt-site.vercel.app/`
- Cart URL: `https://sobag-opt-site.vercel.app/cart.html`

Latest known commit at handoff time:
- `ef70dbd Add cart page and expanded demo catalog`

## Current State

The project is a static HTML/CSS/JavaScript site:
- `index.html`: main landing/catalog page.
- `app.js`: catalog, filters, product modal, favorites, account prototype, cart write logic, hero "Актуально" slider.
- `styles.css`: shared visual design, responsive layout, product cards, modal, cart page styles.
- `cart.html`: separate cart page.
- `cart.js`: cart page logic, quantity controls, discount scale, promo codes, checkout modal.
- `assets/`: generated/test imagery.
- `vercel.json`: clean URLs and no trailing slash.

No real backend, database, payment system, CRM, email sending, auth provider, or production storage exists yet. User/account/order data is a localStorage prototype only.

## What Was Done

Major implemented behavior:
- Redesigned site from scratch, not using the old Tilda site as a visual reference or asset source.
- Built a catalog-first structure:
  - category tiles on the start page;
  - product list only after opening a category, collection, holiday, or search;
  - no filters on the initial catalog home screen.
- Replaced "Тематики" with:
  - `Подборки`: Anime, memes, animals, patterns, games, space, military, brand, gifts, named products;
  - `Праздники`: New Year, 14 February, 8 March, 23 February, Teacher's Day, Birthday.
- Added "Актуально":
  - right-top hero promo slider;
  - large clickable slides;
  - manual left/right arrows;
  - automatic slide change every 15 seconds;
  - slides link to collection or holiday views.
- Added 18 test products, 3 per category:
  - Подушки;
  - Наволочки;
  - Пледы;
  - Мешки для обуви;
  - Чехлы на кулер;
  - Чехлы на чемодан.
- Product cards in catalog show only:
  - square photo;
  - SKU;
  - name;
  - price;
  - `Перейти в карточку`.
- Product detail modal includes:
  - square main image;
  - gallery thumbnails;
  - variant controls for type, size, material;
  - default quantity `1`;
  - calculated price/discount/total;
  - tags linking to category, collection, or holiday catalog views;
  - `Добавить в корзину`.
- Favorites:
  - heart toggles on/off;
  - active heart is red.
- Cart:
  - cart button in header opens `cart.html`;
  - header button shows item quantity and cart total;
  - separate cart page supports quantity editing, removal, discount scale, promo code, minimum order sum, and checkout flow;
  - checkout modal has required fields: name, email, phone, consent checkbox for personal data processing.
- Mobile:
  - category/collection tiles are 2 columns on small screens;
  - filters are hidden behind `Открыть фильтры` in listing view;
  - no horizontal overflow found in QA.

## Current Business Rules In Prototype

Minimum order total:
- `30 000 ₽`

Quantity discount tiers:
- 30 items: 3%
- 70 items: 7%
- 150 items: 12%
- 300 items: 18%

Promo codes in `cart.js`:
- `SOBAG5`: 5%
- `OPT10`: 10%

Cart total applies quantity discount first, promo discount second.

## Important Constraints

Do not add secrets to the repo or handoff:
- no tokens;
- no passwords;
- no `.env`;
- no SSH keys;
- no cookies;
- no production database dumps.

Do not use old site imagery or the old Sobag/Tilda visual style as a design source. The user specifically said the old site looks bad and should not be used as a reference.

Current UI is still a prototype with test product data and generated/test assets. Real product names, SKUs, images, categories, collections, holidays, prices, and Excel import details still need final business data.

Vercel preview deployment URLs may redirect to Vercel login because of project/team protection. The production domain `https://sobag-opt-site.vercel.app/` has been the reliable public URL.

## Known Gaps / Next Work

Recommended next focus:
- Replace test product data with real catalog data from Excel.
- Decide final product model:
  - category;
  - product base card;
  - variants by type/size/material;
  - collections;
  - holidays;
  - tags;
  - images/gallery.
- Implement real backend before production:
  - users;
  - orders;
  - cart persistence;
  - admin product import;
  - Excel import/export;
  - promocodes;
  - email/Telegram/CRM notifications.
- Replace generated/test images with designer-made category/product visuals.
- Legal text:
  - personal data processing consent link/text;
  - privacy policy;
  - offer/order terms.
- Decide if checkout should be one-page cart, modal, or multi-step.
- Add real analytics after production domain is ready.

## Verification Already Done

Recent QA checks:
- `node --check app.js`
- `node --check cart.js`
- `git diff --check`
- Browser checks on localhost:
  - hero "Актуально" slider position, arrows, no title overlap;
  - mobile no horizontal overflow;
  - cart empty state;
  - cart with a saved item;
  - quantity discount scale;
  - promo code `SOBAG5`;
  - checkout modal fields and required consent checkbox.
- Production checks after last deploy:
  - `https://sobag-opt-site.vercel.app/`;
  - `https://sobag-opt-site.vercel.app/cart.html`;
  - Vercel deployment for commit `ef70dbd` succeeded.

## Useful Commands

Run locally:

```powershell
cd "C:\Users\SoBag\OneDrive\Документы\New project\sobag-opt-site"
python -m http.server 4173 --bind 127.0.0.1
```

Open:
- `http://127.0.0.1:4173/`
- `http://127.0.0.1:4173/cart.html`

Basic checks:

```powershell
node --check app.js
node --check cart.js
git status --short
```

Deploy check via GitHub/Vercel deployments:

```powershell
$sha = (git rev-parse HEAD).Trim()
gh api repos/sobag0404/sobag-opt-site/deployments --jq ".[] | select(.sha == `"$sha`") | {id, sha, created_at}"
```

## Current Focus

The user is iterating on B2B ecommerce UX before adding real product data. The immediate focus has been:
- better hero promo/seasonal navigation;
- proper cart and checkout flow;
- more realistic demo catalog density;
- mobile usability.

