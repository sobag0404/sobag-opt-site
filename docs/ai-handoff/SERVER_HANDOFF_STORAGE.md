# Server And Storage Handoff

## Current Server State

There is no custom server.

The project is deployed as static files on Vercel from GitHub:
- `index.html`
- `cart.html`
- `app.js`
- `cart.js`
- `styles.css`
- `assets/*`

`vercel.json` contains:

```json
{
  "cleanUrls": true,
  "trailingSlash": false
}
```

## Current Storage State

All dynamic state is browser localStorage prototype data.

Known localStorage keys:
- `sobag.currentUser`: currently selected local prototype user email.
- `sobag.users`: local prototype users and their order history.
- `sobag.products.v8`: optional saved/generated product catalog override.
- `sobag.cart.guest`: guest cart.
- `sobag.cart.<email>`: per-user cart prototype.
- `sobag.favorites`: product IDs marked as favorites.
- `sobag.lastOrder`: last checkout order created from `cart.html`.

No real database exists.

## Prototype Users

The app seeds local prototype users in `app.js`.

Prototype login data is demo-only and must not be treated as real authentication. Do not put real credentials into source code, chat, handoff files, or ZIP archives.

## Product Data

Product test data is hardcoded in `app.js` in `productDrafts`.

Current storage version:
- `sobag.products.v8`

Changing the version forces users to receive the latest hardcoded test product data instead of an old localStorage override.

## Cart Logic

Main page:
- adding a product writes a cart entry into localStorage.

Cart page:
- reads the same cart key;
- allows quantity changes and item removal;
- applies quantity discounts;
- applies demo promo codes;
- saves cart changes back to localStorage;
- checkout stores a demo `sobag.lastOrder` and clears the cart.

Minimum cart total:
- `30 000 ₽`

Discount tiers:
- 30 items: 3%
- 70 items: 7%
- 150 items: 12%
- 300 items: 18%

Promo codes:
- `SOBAG5`: 5%
- `OPT10`: 10%

## Future Backend Recommendations

Before real production usage, replace localStorage with server-side persistence:
- product catalog DB;
- users and auth;
- carts;
- orders;
- promo codes;
- admin Excel import;
- order notification pipeline, for example email, Telegram, CRM, or admin dashboard.

Recommended first backend entities:
- Product
- ProductVariant
- Category
- Collection
- Holiday
- ProductImage
- Cart
- CartItem
- Order
- OrderItem
- PromoCode
- User

Do not migrate browser localStorage data as production truth.
