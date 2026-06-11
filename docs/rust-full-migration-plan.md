# Rust Full Migration Plan

Last updated: 2026-06-11

## Target

Move Sobag Opt from the current Node.js runtime to Rust Axum + server-rendered HTML/HTMX on the existing VPS, keeping the current production site working during the migration.

Current production stays on `https://sobag-shop.online`. Vercel is not an active deploy target. Node remains fallback until Rust covers a route group and rollback is tested.

## Architecture

- Backend: Rust Axum.
- Rendering: Rust templates plus HTMX partials for catalog, account, orders, admin, and content forms.
- Database: PostgreSQL for catalog first, then users, sessions, carts, orders, content, reviews, import/PIM.
- Cache/session: Redis-compatible store where needed; do not store secrets in repo.
- Search: Meilisearch after Rust routes are stable, with PostgreSQL fallback.
- Files/photos: S3-compatible storage such as MinIO/R2, through the existing metadata contract.
- Deploy: systemd on current VPS first; Docker Compose can be added later if it simplifies PostgreSQL/Redis/Meilisearch/MinIO operations.
- Reverse proxy: Nginx keeps routing only approved paths to Rust.

## Route Migration Order

1. Rust platform foundation:
   - Split Rust code into modules for config, store, auth, errors, templates, catalog, account, orders, admin.
   - Keep `/api/health-rust`, `/api/catalog-query`, `/api/catalog-detail` stable.
   - Add shadow/smoke checks before any public route switch.

2. Public SSR preview:
   - Add Rust-rendered preview pages for catalog, search, and product detail.
   - Keep them under Rust-only preview paths until UI parity is proven.
   - Use HTMX fragments for pagination/search/detail partials.
   - Current status: `/rust/catalog`, `/rust/search`, `/rust/product`, and related fragments are implemented as internal preview routes.

3. Content pages:
   - Move read-only public pages to Rust templates.
   - Keep admin content writes on Node until Rust auth/admin roles are migrated.
   - Current status: `/rust/pages/:slug` renders internal preview pages for `about`, `business`, `marketplaces`, `contacts`, `how-to-order`, `delivery`, `payment`, `returns`, `seller-support`, and `wholesale`.
   - The preview reads current file-store content when `SOBAG_STORE_PROVIDER=file`; otherwise it falls back to safe built-in defaults.

4. Auth/account:
   - Preserve `sobag_session` cookie, 30-day TTL, PBKDF2 password compatibility, and public user sanitization.
   - Migrate `GET /api/auth/me` first, then login/register/logout/profile writes.

5. Orders and briefs:
   - Migrate cart order submission, custom print briefs, buyer order history, comments, and status visibility.
   - Keep minimum order, guest visibility in admin, and buyer/internal note separation.
   - Detailed route contracts, tests, and rollback gates are tracked in `docs/rust-auth-orders-admin-migration-plan.md`.

6. Admin:
   - Migrate admin orders/users/employees/content/reviews.
   - Then migrate catalog/import/media/PIM writes.
   - Do not delete products during import; update existing products only in explicit update mode.
   - Public routing must not switch to Rust until the admin/auth/orders plan audit and write smokes are green.

7. Search/storage scale:
   - Add Meilisearch for large catalog search after PostgreSQL route parity.
   - Move real photos to S3-compatible storage with square metadata and WebP/AVIF variants.

8. Node retirement:
   - Retire Node only after every public/admin route has Rust parity, green smokes, backup, and rollback rehearsal.

## Parallel Agent Split

Use agents only with disjoint ownership:

- Agent A: Rust SSR catalog/search/product templates and HTMX fragments.
- Agent B: Rust auth/session/account contract and tests.
- Agent C: Rust orders/briefs/admin order migration plan and route tests.
- Agent D: admin/content/reviews/PIM migration plan.
- Agent E: QA/security/deploy runbooks, smoke scripts, rollback checks.

No two agents should edit the same file group at once. The main thread integrates changes and runs final checks.

## Required Gates

For every completed block:

- `cargo fmt --check`
- `cargo test --locked`
- `npm.cmd run check`
- `npm.cmd run ui:smoke` when UI/API behavior is touched
- route-specific smoke or shadow compare
- production smoke after deploy

For write routes:

- test against temporary store/database first;
- backup current production store;
- verify rollback;
- never print secrets or production dumps.

## Rollback

Rollback must stay simple:

1. Remove or revert the Nginx location that points the route to Rust.
2. Restart/reload Nginx.
3. Keep Node route handling the same URL.
4. Restore previous Rust binary if Rust service health fails.
5. Verify `/api/health`, affected page/API, and production smoke.

## Final Prompt Rule

For future goal prompts: put the detailed plan in repo docs and give the chat a prompt under 4000 characters with GitHub links to the docs.
