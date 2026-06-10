# Rust/VPS migration prompt

GitHub page: https://github.com/sobag0404/sobag-opt-site/blob/main/docs/rust-vps-migration-prompt.md

Raw prompt: https://raw.githubusercontent.com/sobag0404/sobag-opt-site/main/docs/rust-vps-migration-prompt.md

## Working prompt

```text
Repo: https://github.com/sobag0404/sobag-opt-site
Branch: main
Production: https://sobag-shop.online
Known baseline: c90bfeb Polish catalog header and footer pages

Goal: migrate Sobag Opt from the current HTML/CSS/JavaScript + Node/Vercel-era prototype to an independent production ecommerce platform without Vercel.

Hard exclusions:
- Do not use Vercel, Vercel serverless routes, `vercel.json`, `npx vercel dev`, `@vercel/blob`, or Vercel fallback.
- Do not touch production env, cache, or user data without an explicit migration step and rollback.

Target architecture:
- Backend/core: Rust, Axum + Tokio + SQLx.
- Storefront: Rust server-side rendered HTML for SEO, with HTMX and small TypeScript islands only where needed.
- Admin/CRM: separate TypeScript SPA on React/Vue + Vite.
- DB: PostgreSQL.
- Cache/sessions: Redis.
- Search/filtering: Meilisearch first, OpenSearch-ready later.
- Media: S3-compatible storage or MinIO.
- Background jobs: Rust workers + Redis Streams initially.
- Deploy: Docker Compose on VPS/dedicated server with Caddy or Nginx.

Scale target: large ecommerce catalog with SEO pages, categories, filters, product cards, cart, orders, user profiles, roles, admin panel, CRM, imports/exports, product photos, integrations, audit logs, backups, monitoring, and load testing.

Mandatory commercial readiness items to include in the migration:
1. Custom print brief must never show fake success. Save a real server-side request visible in admin, or replace the form with honest CTA until implemented.
2. Cart checkout must be fully hidden/disabled under 30,000 RUB and server-side minimum validation must remain.
3. Add a real `privacy.html`; footer must distinguish privacy policy from personal-data consent.
4. Contacts must not invent addresses. Admin must edit legal and production addresses. No map for placeholder addresses.
5. Mobile header must be compact with no horizontal overflow, while preserving logo/catalog, search, account, favorites, cart.
6. Product modal quantity defaults to 1; add button disabled if quantity is 0; variant matrix must not break.
7. Promo code UI must be honest: disabled/manager-approved unless real promo logic exists.
8. Home H1/hero typography must avoid bad single-letter wrapping and clearly communicate textile/product catalog.
9. Long catalog collections need "show more" or compact grouping without breaking search, filters, or SEO.
10. Keep catalog, cart, orders, admin, and production data safe.

Workflow:
1. Start with `git pull origin main` and `git status --short --branch`.
2. Audit current structure, Vercel dependencies, slow browser paths, data model, and user/admin flows.
3. Design DB schema, Rust module boundaries, API contracts, SSR URL model, roles, SEO, import/media/search strategy, and rollback.
4. Build infrastructure skeleton: Rust app, PostgreSQL, Redis, Meilisearch, MinIO/S3, worker, Docker Compose, health checks, logging.
5. Migrate in slices: commercial readiness fixes, catalog/search, SSR storefront, cart/orders, users/auth, admin/CRM, imports/media, deploy/monitoring.
6. After each large slice run `npm.cmd run check` for legacy code while it exists plus Rust/backend/admin tests for the new stack.
7. Before push run all relevant checks, including UI smoke where applicable.
8. Commit only green completed slices, update handoff docs, and keep rollback available.
```

## Detailed action plan

### 0. Repository guardrails

- Work from `main` after `git pull origin main`.
- Record `git status --short --branch` before edits.
- Do not delete the old site until a verified replacement slice exists.
- Remove Vercel only through explicit replacement: routing, storage, dev commands, deploy docs, and fallbacks must have VPS/Docker equivalents first.
- Keep production env, cache, uploaded files, orders, users, and catalog data untouched unless the step includes backup and rollback.

### 1. Discovery and risk map

- Map current pages, API routes, storage helpers, admin flows, catalog data, images, carts, orders, content, and env requirements.
- Identify code that causes browser freezes: full catalog load, client-side filtering, oversized `app.js`, image pressure, DOM rerenders, and admin/catalog overlap.
- List all Vercel-specific files and dependencies to replace.
- Capture existing SEO URLs and sitemap behavior for redirect planning.

### 2. Target design

- Define Rust module boundaries: `catalog`, `pricing`, `search`, `orders`, `users`, `crm`, `admin`, `content`, `media`, `seo`, `jobs`, `audit`.
- Design PostgreSQL schema and migrations for products, variants, categories, attributes, prices, stock, users, roles, orders, CRM records, content, SEO metadata, admin audit, brief requests, and media.
- Define API contracts for the admin SPA and internal workers.
- Define SSR route model for home, category, collection, product, search landing pages, cart, account, legal pages, and redirects.

### 3. Infrastructure foundation

- Add Rust Axum service with health checks, structured logs, config loading, DB pool, Redis client, search client, and media abstraction.
- Add Docker Compose for app, PostgreSQL, Redis, Meilisearch, MinIO, worker, and Caddy/Nginx.
- Add backup and restore scripts for DB and media.
- Add local seed/migration commands.

### 4. Commercial readiness slice

- Implement the listed P0/P1 fixes as migration requirements, not as later cleanup.
- Prefer server-side truth for forms, checkout eligibility, contacts, privacy/legal pages, promo behavior, and product quantity validation.
- Keep existing legacy behavior only where it remains honest and safe.

### 5. Catalog, search, and SEO storefront

- Move catalog query, filtering, sorting, pagination, and product detail resolution to Rust/search.
- Index products into Meilisearch with attributes and facets.
- Render SEO-safe category, collection, product, and landing pages server-side.
- Add canonical rules, sitemap generation, product structured data, and redirect map.
- Do not send the full catalog to the browser.

### 6. Cart, orders, users, and CRM

- Store carts and orders server-side.
- Enforce minimum order value on both UI and server.
- Add auth, profiles, roles, permissions, customer records, notes, order history, and admin audit logs.
- Add safe import/export flows with background jobs.

### 7. Admin/CRM app

- Build separate TypeScript/Vite admin with product, price, stock, order, user, CRM, content, SEO, import, media, and audit screens.
- Use API contracts generated or documented from Rust.
- Keep public storefront and admin concerns separate.

### 8. Cutover and operations

- Run automated checks, UI smoke, Rust tests, admin tests, migration dry-run, production smoke against staging, and load tests.
- Prepare DNS/proxy cutover, backup, rollback, and old URL redirect validation.
- Update `docs/ai-handoff/ACTIVE_CONTEXT.md`, `docs/ai-handoff/CURRENT_STATUS.md`, `docs/roadmap-checklist.md`, and `project-ai-handoff-latest.zip` during real implementation slices.

