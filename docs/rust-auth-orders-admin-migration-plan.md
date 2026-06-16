# Rust Auth, Orders, Admin Migration Plan

Last updated: 2026-06-11

## Goal

Prepare the next Sobag Opt migration stage from Node.js to Rust Axum without switching production write routes yet.

This plan covers auth, account, orders, briefs, admin orders, admin users, admin content, reviews, and later admin catalog/PIM/media writes. Node stays authoritative until every route group has Rust parity, shadow tests, temporary-store write tests, production smoke, and rollback rehearsal.

## Current State

- Rust is live on VPS as `sobag-opt-rust` at `127.0.0.1:3001`.
- Nginx routes only `/api/catalog-query` and `/api/catalog-detail` to Rust.
- Rust internal preview routes exist for catalog/search/product and content pages.
- Rust auth/store foundation helpers exist for Node-compatible `sobag_session`, session store keys, file-store key/wrapper handling, Redis/Upstash REST store access, and PBKDF2 SHA-256 verification fixtures.
- Internal `/rust/auth/me` preview exists for file-store/session fixtures and preserves the current `GET /api/auth/me` response shape without exposing password fields or internal buyer-hidden notes.
- Internal `/rust/admin/orders` and `/rust/admin/users` previews exist for admin/manager order and user/customer views from the same Node-compatible file-store.
- Deploy-time `tools/rust-auth-me-shadow-smoke.mjs` compares Node `/api/auth/me` and Rust `/rust/auth/me` on a temporary file-store for anonymous, buyer, manager, content, admin, and expired sessions; it also compares Node admin orders/users reads with Rust preview routes for admin/manager sessions and verifies unauthorized/forbidden cases. Rust-only temporary write checks cover admin order status/manager/comment PATCH plus admin user invite, role patch, and employee removal without touching production data.
- Internal `/rust/orders` preview can create an order in a temporary file-store and `tools/rust-orders-write-smoke.mjs` verifies minimum total, quantity sanitizing, server-side persistence, and admin visibility without touching production data.
- Internal `/rust/briefs` preview can create a custom print brief in a temporary file-store, mirror it into a `custom_brief` admin order, and verify validation/persistence through the same smoke without touching production data.
- Node remains fallback and still owns auth, account, carts, orders, briefs, admin, content writes, reviews, import/PIM, and media writes.
- VPS shared app data uses Redis; PostgreSQL currently backs public catalog reads. Rust Redis-backed store parity is implemented, but production `/api/orders` and `/api/briefs` stay on Node fallback until Redis smokes pass in GitHub/VPS and the exact-route re-cutover is applied.

## Contracts To Preserve

- Session cookie: `sobag_session`, HttpOnly, Path `/`, SameSite Lax, Secure in production, 30-day TTL.
- Session store key: `sobag:session:<token>` with `{ email, createdAt }`.
- Passwords: PBKDF2 SHA-256, 310000 iterations, 32-byte key, hex salt/hash, existing users must keep logging in.
- User response: never expose `passwordHash`, `passwordSalt`, raw session token, or internal audit fields.
- Roles: `admin`, `manager`, `content`, `buyer`; `admin@sobag` is locked owner/admin.
- Content write limit: 4 MB object payload, roles `admin|content`.
- Order minimum: 30 000 RUB for order submission.
- Orders: preserve guest admin visibility, buyer-owned comments, customer-visible messages, internal manager notes, status history, assigned manager, and repeat-order compatibility.
- Briefs: custom print requests must persist server-side and mirror into admin/manager order workflow.
- Admin users: manager/content role edits must not delete historical order/action attribution.
- Import/PIM: imports must not delete products; update existing products only in explicit update mode.

## Migration Order

1. Rust shared foundation:
   - Split Rust code into modules: `config`, `store`, `auth`, `errors`, `templates`, `account`, `orders`, `admin`.
   - Add file-store read/write adapter compatible with Node file-store wrapper format.
   - Add request id, method guard, JSON error shape, cookie helpers, and role helpers.
   - Current status: first compatibility helpers and tests are in `rust-server/src/main.rs`; module split and write adapter are still pending.

2. Read-only account:
   - Implement internal Rust preview/shadow for `GET /api/auth/me`.
   - Compare Node vs Rust for anonymous, buyer, manager, content, admin, and expired session.
   - Do not route production to Rust yet.
   - Current status: internal `/rust/auth/me` preview exists for file-store fixtures; deploy-time Node-vs-Rust shadow comparison covers anonymous, buyer, manager, content, admin, and expired sessions.

3. Auth writes:
   - Implement login, register, logout, profile update against temporary file-store first.
   - Verify PBKDF2 compatibility with existing Node-generated fixtures.
   - Verify cookie flags and no password fields in responses.
   - Current status: internal `/rust/auth/login`, `/rust/auth/register`, `/rust/auth/logout`, and `PUT /rust/auth/me` exist only as temp-store preview routes. Deploy smoke verifies login by phone/email, invalid login rejection, profile phone/INN sanitizing, session cookie set/clear, registration session creation, and no password-field leaks. Public `/api/auth/*` remains on Node.

4. Orders and briefs:
   - Implement `/api/orders` POST/PATCH and `/api/briefs` POST in Rust temp-store mode.
   - Verify minimum order, guest order visibility in admin, buyer comments, internal-note filtering, and custom brief mirroring.
   - Current status: preview POST `/rust/orders` and `/rust/briefs` write to the configured file-store or Redis-compatible provider; deploy smoke verifies successful order create, custom brief mirroring, admin visibility, and validation failures in both fixture modes. Production `/api/orders` and `/api/briefs` still stay on Node until re-cutover gates are green.

5. Admin orders/users:
   - Implement admin/manager order list/update and admin users/employees management.
   - Verify role matrix, manager assignment, status history, internal notes, and historical actor preservation.
   - Current status: `/rust/admin/orders` read/write temp-store preview and `/rust/admin/users` read/write temp-store preview exist. Node-vs-Rust shadow comparisons cover reads, and Rust temp-store smoke covers order status/manager/comment PATCH plus user invite/role/delete writes; production `/api/admin/orders` and `/api/admin/users` remain on Node.

6. Admin content/reviews:
   - Implement admin content GET/PUT and review moderation PATCH.
   - Keep public content/page preview compatible with the same stored content object.
   - Current status: internal `/rust/admin/content` supports admin/content GET and PUT against the Node-compatible content key, including review-list preview via `?reviews=1`. Internal `PATCH /rust/admin/content` supports temporary-store review approve/hide/delete moderation with audit records. Deploy smoke verifies content-role access, buyer rejection, invalid content/status rejection, update persistence, review listing, moderation, and deletion. Public `/api/admin/content` still remains on Node.

7. Admin catalog/import/media/PIM:
   - Move only after auth/admin/orders are stable.
   - Use PostgreSQL write transaction rehearsals, object-storage readiness, and import rollback checks.

8. Route cutover:
   - Switch one route group at a time in Nginx.
   - Keep Node handler available for immediate rollback.
   - Run production smoke after every route group switch.

## Required Tests

- `cargo fmt --check`
- `cargo test --locked`
- Rust route/unit tests for file-store wrapper, sessions, PBKDF2, cookie flags, role matrix, order filters, and admin mutations.
- Node compatibility smoke with the current API shape.
- Temporary-store write smoke for auth/profile/cart/order/brief/admin/users/content/reviews.
- Node-vs-Rust shadow compare for read paths before routing.
- Security checks: no password fields, no internal CRM notes in buyer responses, buyer cannot access admin routes, unsupported methods return 405.
- `npm.cmd run check`
- `npm.cmd run ui:smoke` for UI/API-risk changes.
- `npm.cmd run smoke:prod -- --base-url https://sobag-shop.online` after deploy.

## Rollback

Rollback must be route-level:

1. Remove the Nginx location for the migrated route group.
2. Reload Nginx.
3. Verify Node serves the same API route.
4. Restore previous Rust binary only if Rust service health is the issue.
5. Verify `/api/health`, affected route group, and production smoke.

## Parallel Work Split

- Agent A: Rust `store/auth` foundation and PBKDF2/session fixtures.
- Agent B: account/auth read-write handlers and shadow tests.
- Agent C: orders/briefs handlers and temp-store write smoke.
- Agent D: admin orders/users/content/reviews handlers and role tests.
- Agent E: QA/security/runbooks, access matrix, rollback and deploy checks.

Agents must not edit the same file group at the same time. The main thread integrates and runs final gates.

## Do Not Do Yet

- Do not route public auth/order/admin write endpoints to Rust.
- Do not delete Node handlers.
- Do not touch production data, env, secrets, cookies, DB dumps, or raw photo folders.
- Do not migrate admin catalog/import/media writes before auth/orders/admin roles are verified.
