# Access Audit

Access audit is a static guard for Sobag Opt API routes. It keeps the expected route access matrix in `tools/access-audit.mjs` and fails when an API route is added or changed without an explicit access review.

Run it locally:

```bash
npm.cmd run audit:access
```

It is also included in:

```bash
npm.cmd run check
```

Because `autofix-check` already runs on push, pull request, and the weekly Monday schedule, this gives the project a lightweight periodic access audit without touching production data or runtime env.

## Current Matrix

- Public read routes: `/api/catalog`, `/api/catalog-query`, `/api/catalog-detail`, `/api/content`, `/api/health`.
- Public auth routes: `/api/auth/login`, `/api/auth/register`.
- Optional-session route: `/api/auth/logout`.
- Session-owned routes: `/api/auth/me`, buyer-owned `/api/orders` comment updates.
- Admin/content routes: catalog, content, import batches, PIM diagnostics, product images.
- Admin/manager routes: order admin and user/customer lookup.
- Admin-only mutation inside admin/manager route: role changes in `/api/admin/users` PATCH.

## What The Audit Checks

- Every active API route file outside `server-routes/_lib` is listed in the access matrix.
- Listed files still exist and map to the expected route path.
- Expected HTTP methods are guarded and unsupported methods call `methodNotAllowed`.
- Admin routes use `requireUser(req, [...])` with the expected role set.
- Admin routes never grant `buyer` access.
- Session-owned routes call `currentUser(req)` and keep unauthenticated writes at `401`.
- Buyer order comment updates verify order ownership.
- Routes that reference password fields must also use `publicUser` sanitization.

When a new API route is added, update `tools/access-audit.mjs` in the same change and describe the intended access level.
