# Backend and Security Setup

This project now has a Vercel API layer for accounts, roles, sessions, orders, and the shared product catalog.

## What Moved Server-Side

- Registration and login can use `/api/auth/register` and `/api/auth/login`.
- Passwords are hashed server-side with PBKDF2.
- Sessions are stored in Redis and sent to the browser as an HttpOnly cookie.
- Orders can be saved through `/api/orders`.
- Admins/managers can read orders through `/api/admin/orders`.
- Admins can assign the `manager` role through `/api/admin/users`.
- Visitors read the product catalog through `/api/catalog`; if server storage has no catalog yet, it falls back to `data/products-live.json`.
- Admins save product and variant-price changes through `/api/admin/catalog`.

The old `localStorage` flow still exists as a prototype fallback so the site remains usable until production storage is connected or an admin is not signed into a server session.

## Required Vercel Environment Variables

Create an Upstash Redis database or Vercel KV-compatible Redis storage, then add these variables in Vercel:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

or the Vercel KV aliases:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Bootstrap admin is created automatically when these are present:

- `SOBAG_ADMIN_EMAIL`
- `SOBAG_ADMIN_PASSWORD`
- `SOBAG_ADMIN_NAME` optional
- `SOBAG_ADMIN_PHONE` optional

Do not commit these values to Git and do not paste them into chat.

## Health Check

After setting environment variables and redeploying:

```bash
curl https://sobag-shop.online/api/health
```

Expected:

```json
{"ok":true,"storage":"ready"}
```

If storage is not configured, the API returns `503` and the frontend uses the prototype fallback.

## AutoFix

Local checks:

```bash
npm run check
```

The same check runs in GitHub Actions on push, pull request, and every Monday at 06:00 UTC.
