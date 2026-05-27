# Server And Storage Handoff

## Current Hosting

There is no custom backend server.

The site is deployed as static files on Vercel from GitHub:
- `index.html`
- `catalog.html`
- `favorites.html`
- `custom.html`
- `marketplaces.html`
- `cart.html`
- `app.js`
- `cart.js`
- `styles.css`
- `assets/*`
- `templates/*`

`vercel.json`:

```json
{
  "cleanUrls": true,
  "trailingSlash": false
}
```

Clean URL examples:
- `/catalog` serves `catalog.html`
- `/cart` serves `cart.html`
- `/favorites` serves `favorites.html`

## Current Storage

All dynamic state is browser localStorage prototype data.

Known localStorage keys:
- `sobag.currentUser`: selected prototype user email.
- `sobag.users`: prototype users and roles.
- `sobag.orders.v1`: prototype order history for buyers/admins/managers.
- `sobag.products.v8`: optional product catalog override from admin/import prototype.
- `sobag.cart.guest`: guest cart.
- `sobag.cart.<email>`: per-user cart.
- `sobag.favorites`: favorite product IDs.
- `sobag.siteContent.v1`: editable site content from admin prototype.
- `sobag.theme`: day/night theme.

No real database exists.

## Product Data

Demo products are currently in `app.js`.

Removed test imported data should stay removed unless intentionally testing a new import:
- `data/products-live.json`
- `assets/product-preview/`

Generated local import outputs are ignored and should not be committed by default:
- `local-import-output/`
- `assets/imported-products/`
- `data/products.import.json`
- `data/import-report.csv`

## Import Storage Direction

For real production, do not rely on localStorage or Git-tracked static files for 10k+ products.

Recommended future storage:
- product catalog database;
- object storage for images;
- background import job for Excel/CSV + images;
- duplicate detection by base SKU and photo folder;
- import report with created/updated/skipped rows.

## Future Backend Entities

Recommended first backend model:
- User
- Role
- Product
- ProductVariant
- Category
- Collection
- Holiday
- ProductTag
- ProductImage
- Cart
- CartItem
- Order
- OrderItem
- PromoCode
- ImportBatch
- ImportRow

## Security Notes

Do not treat current prototype login/roles as real security.

Before real production:
- add proper authentication;
- add server-side authorization for admin and manager roles;
- store orders server-side;
- move admin uploads to real storage;
- add privacy policy and personal data consent pages;
- add audit trail for order status changes and imports.
