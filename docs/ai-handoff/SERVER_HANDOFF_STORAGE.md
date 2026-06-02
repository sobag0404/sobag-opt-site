# Server And Storage Handoff

Last updated: 2026-05-29

## Hosting

The site is deployed on Vercel from GitHub repo:
- `sobag0404/sobag-opt-site`
- branch: `main`

Primary production domain:
- `https://sobag-shop.online/`

Fallback Vercel domain:
- `https://sobag-opt-site.vercel.app/`

Clean URLs are enabled through `vercel.json`, for example:
- `/catalog` serves `catalog.html`
- `/cart` serves `cart.html`
- `/favorites` serves `favorites.html`
- `/about` serves `about.html`
- `/contacts` serves `contacts.html`

## API Layer

There is a Vercel API layer under `api/`.

Current purpose:
- auth/login/session/logout;
- prototype server-backed user/session flow;
- order storage and retrieval;
- admin/manager order status updates;
- admin role updates;
- health check.

Health check:
- `https://sobag-shop.online/api/health`

Expected response:

```json
{"ok":true,"storage":"ready"}
```

## Storage

Upstash Redis / Vercel KV-compatible storage is connected in Vercel.

Configured in Vercel without exposing values in repo:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- related Upstash/Vercel KV variables
- `SOBAG_ADMIN_EMAIL`
- `SOBAG_ADMIN_PASSWORD`

Do not put these values in:
- chat;
- Git;
- docs;
- ZIP handoff;
- screenshots.

If a new device needs Vercel operations, authenticate through official CLI/dashboard:

```powershell
vercel login
```

Do not ask the user to paste secrets into chat.

## Browser Prototype Storage

Some UI state still uses browser localStorage for prototype behavior and admin preview data.

Known localStorage keys include:
- `sobag.currentUser`
- `sobag.users`
- `sobag.orders.v1`
- `sobag.products.v8`
- `sobag.cart.guest`
- `sobag.cart.<email>`
- `sobag.favorites`
- `sobag.siteContent.v1`
- `sobag.theme.v1`

Do not treat localStorage-only roles/content as production security.

## Product Data And Images

The current catalog can load imported/static product preview data when intentionally published, but large raw photos must stay out of Git.

Generated local import outputs are ignored and should not be committed by default:
- `local-import-output/`
- `assets/imported-products/`
- `data/products.import.json`
- `data/import-report.csv`

Large production direction:
- database for product/catalog/order data;
- object storage for images;
- backend import job for Excel/CSV + image folders;
- duplicate detection by base SKU and import batch;
- import report with created/updated/skipped rows.

## Future Backend Entities

Recommended first real backend model:
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

## Current Store Additions

As of 2026-06-02, the shared Redis/KV store also keeps lightweight personal state:
- `store.carts[email] = { items, updatedAt }`
- `store.favorites[email] = { items, updatedAt }`

Endpoint:
- `GET /api/auth/me` returns `cartItems` and `favoriteItems` for the signed-in user;
- `PUT /api/auth/me` accepts `cartItems` and/or `favoriteItems` and saves them for the signed-in user.

These are still prototype-grade JSON blobs, but they make cart/favorites portable across devices once the user is logged in. Product images/admin uploads still need durable object storage later.

## Security Notes

Current state is better than the early localStorage-only prototype but still not final production security.

Before full production:
- finish server-side authorization for admin/manager endpoints;
- avoid trusting browser-local role state;
- store orders and users only server-side;
- move admin uploads to durable object storage;
- finalize privacy policy/personal data consent with legal review;
- add audit trail for order status changes and imports;
- review GitHub/Vercel access periodically.

Most recent GitHub access audit:
- repo is private;
- only collaborator found: `sobag0404`;
- no pending invitations;
- no deploy keys;
- no webhooks;
- no forks;
- no tracked high-risk secret patterns found.

Vercel GitHub access is expected and should remain installed.
