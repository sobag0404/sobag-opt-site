# Backend Pricing And Reviews Contract

This document records the post-Rust-cutover backend contract for price-list, price import, promo rows, and buyer review eligibility. It is server-side only and does not define visual/UI behavior.

## Runtime Ownership

- Public price export: `GET /api/price-list` exposes only public catalog pricing.
- Admin price management: exact `GET/POST /api/admin/prices` is Rust-owned in production, with Node kept only as compatibility fallback for non-switched legacy paths.
- Buyer review write path: exact account/auth routes are Rust-owned in production; Node route code remains a compatibility reference while it exists.
- Vercel/Next.js are historical only and are not active deploy/runtime targets.

## Public Price List

`GET /api/price-list` returns CSV by default and JSON with `?format=json`.

Rows are grouped by price category/group, not by every SKU. A group is resolved from explicit `priceGroup`/`priceGroupName` first, then from variant type/material/size, then product name fallback. Each base row contains the group label and current positive price. If an active promo exists for the group and the current date is inside its optional ISO date window, the export includes a second row with an `Акция ` prefix and the promo price.

Required public response guardrails:

- no personal/admin data;
- no zero/negative/NaN prices;
- `Content-Disposition` for CSV download;
- short public cache only;
- spreadsheet-formula escaping in CSV cells.

## Admin Price Import

`GET /api/admin/prices?template=1` downloads a CSV template. The template is Excel-compatible CSV; XLSX styling/export remains a UI/client capability unless a later backend XLSX library is introduced.

`POST /api/admin/prices` accepts:

- `action: "preview"` or `action: "apply"`;
- `rows: [...]` for parsed Excel/CSV rows; or
- `csv: "..."` for semicolon/comma CSV text exported from Excel.

Accepted target columns include:

- group/category: `Категория/группа`, `Группа`, `priceGroup`, `group`, `category`;
- SKU override: `Артикул`, `SKU`, `sku`, `variantSku`;
- base price: `Цена`, `Базовая цена`, `price`, `basePrice`, `groupPrice`;
- promo price: `Акция цена`, `promoPrice`, `salePrice`;
- promo metadata: `promoActive`, `saleActive`, `promoStart`, `promoEnd`.

Validation rules:

- admin/content session is required;
- all prices must be positive finite integers;
- prices may include common Excel spacing such as `1 250`, but still resolve to positive finite integers;
- unknown group/SKU targets are rejected;
- duplicate target updates in one import are rejected;
- spreadsheet formulas are rejected for target and price cells;
- promo date windows must use ISO date/datetime values and `promoStart` must not be after `promoEnd`;
- `preview` returns changes/errors without mutating data;
- `apply` is rejected when preview errors exist and otherwise applies atomically through PostgreSQL transaction in production.

Precedence:

1. SKU price override from an import row updates matched variants.
2. Group price updates every SKU in the matched price group.
3. Promo price is stored separately in variant payload and appears as an additional public price-list row when active.
4. Order pricing continues to use the trusted server catalog base price until a separate business rule explicitly approves promo order-pricing precedence. `tools/price-integrity-smoke.mjs` preserves this current behavior.

Import history and audit:

- `GET /api/admin/prices` includes `history`, newest first, limited to the latest 100 safe import summaries.
- Successful `apply` records `priceImportHistory[]` with actor email, source, status, row/change counts, affected SKU/product counts, promo-change count, and the apply summary.
- Successful `apply` also appends a compact `audit[]` record with action `price_import_apply`, actor, source/status, change count, affected SKU count, and timestamp.
- Raw uploaded files, raw CSV text, secrets, cookies, tokens, and private customer data are not stored in the history/audit records.
- History/audit persistence is best-effort after the transactional price apply; if the audit store is temporarily unavailable, the response exposes `historyRecorded: false` on Rust while preserving the already-successful price transaction.

## Order/Account/Cart Persistence

Order creation uses non-sequential `SO-*` identifiers for new orders. Buyer order comment updates validate the submitted order id with a bounded allowlist before checking ownership.

Order creation accepts an optional `Idempotency-Key` or `X-Idempotency-Key` header, or `idempotencyKey` body field, for safe customer retry handling. The server stores only a normalized opaque key and scoped owner marker (`email:*` or `phone:*`). A repeated order create with the same key and same owner scope returns the original order with `idempotent: true` instead of creating a duplicate. Different users or contacts cannot reuse another customer's idempotency key.

Account/order ownership is bound to the authenticated account field `userEmail`. Customer contact email is a delivery/contact field only; registering an account with a matching `customer.email` must not grant account-order history, order comment, or review eligibility access to a guest/other-user order. Guest order claim remains a future verified claim-flow task.

Coverage:

- Node and Rust order paths share the same normalized key/scope behavior and malformed order-id rejection.
- `tools/api-security-smoke.mjs` covers retry reuse through the public API, malformed buyer order ids, own-order history isolation, cross-account buyer order update rejection, and the customer-email alias case.
- Rust unit coverage verifies scoped reuse, cross-scope replay prevention, malformed order-id rejection, and the customer-email alias case.

Account cart writes:

- cart item keys are constrained to a safe ASCII key shape; unsafe client keys fall back to the trusted SKU or are dropped with the line;
- duplicate cart lines for the same SKU are merged server-side and quantities are capped at `99_999`;
- account responses include `cartUpdatedAt`;
- clients may send `expectedCartUpdatedAt` with `cartItems` updates. If the server cart changed on another device, the write is rejected with `409 cart_conflict` instead of silently overwriting the newer cart.
- account responses also include `favoritesUpdatedAt` and `savedCartsUpdatedAt`;
- clients may send `expectedFavoritesUpdatedAt` with `favoriteItems` and `expectedSavedCartsUpdatedAt` with `savedCarts`. Stale writes return `409 favorites_conflict` or `409 saved_carts_conflict` with the current sanitized server payload and timestamp.

## Admin Audit And Rate Limits

Admin audit records are compact operational evidence, not raw payload storage. Current server-side coverage:

- order status/manager/comment changes append `order_update`;
- review moderation/delete appends `review_update` or `review_delete`;
- price import apply appends `price_import` / `price_import_apply` history and audit summaries;
- catalog saves append `catalog_update`;
- content saves append `content_update`;
- catalog import preview/reject/apply/rollback lifecycle appends `catalog_import`;
- product image upload/delete/mark-unused appends `media_update`;
- admin user invite/role/remove appends `user_admin_update` with action, actor, target email, previous role, resulting role, and timestamp;
- `GET /api/admin/users?audit=1&limit=...` returns a sanitized newest-first audit summary for admins only, normalizing both legacy string actors and structured actor objects while exposing compact entity/result fields.

Audit records must not store passwords, password hashes, cookies, tokens, raw import files, raw CSV text, private order notes beyond a type/id summary, or full customer payloads.

Rate-limit contract:

- Node global unsafe-route and route-specific write guards use the shared store-backed limiter by default, with an in-process fallback if the limiter store is temporarily unavailable;
- setting `SOBAG_RATE_LIMIT_FAIL_CLOSED=1` makes limiter store failures return a safe service error instead of falling back;
- `SOBAG_RATE_LIMIT_STORE=memory` is reserved for local/debug runs;
- Rust auth/review/account/order/brief/admin-user/admin-content write guards use the same store-key family by default and fall back to the existing in-process bucket if the store is unavailable;
- admin catalog save, import-batch writes, price-import writes, product-image mutations, content writes, order admin updates, and user admin mutations are also rate-limited per admin identity/IP on the Node compatibility path; Rust production routes keep the same guarded route family through deploy smokes.

## Buyer Review Eligibility

A product review can be created only by an authenticated user who has a confirmed order for the same product/SKU.

Server-side rules:

- anonymous users cannot review;
- registered users without an eligible order get `403` with `REVIEW_ORDER_REQUIRED`;
- only orders with status `shipped` or `done` are eligible;
- product match is checked by product id, base SKU, item key, or variant SKU;
- a user cannot use another user's order;
- duplicate review per user/product or user/base SKU returns `409` with `REVIEW_ALREADY_EXISTS`;
- review creation is rate-limited per buyer identity/IP to slow abuse without blocking normal account/profile/cart updates;
- legacy reviews are not deleted automatically and remain subject to admin moderation.

Coverage:

- `tools/api-security-smoke.mjs` covers anonymous rejection, no-order rejection, completed-order success, different product/SKU rejection, another user's order rejection, duplicate rejection, pending-order rejection, canceled-order rejection, and review write burst `429`; `tools/review-eligibility-contract-audit.mjs` guards the Node/Rust eligibility markers and smoke coverage; Rust unit coverage mirrors owned completed-order and duplicate eligibility decisions plus the review write bucket.
- `tools/price-groups-smoke.mjs` covers group collapse, SKU-only override preview, promo apply history, promo rows, active/future promo windows, spaced Excel price values, positive price validation, formula rejection, public export, and transactional DB rollback on apply failure.

## Backup And Recovery Notes

- Before destructive catalog/price imports, keep the normal VPS release rollback plus a current PostgreSQL/catalog backup from the existing deploy/import runbooks.
- For file-store evidence, `node tools/file-store-backup.mjs --source <store-dir> --dest <backup-dir> --dry-run` reports what would be copied, and `--restore <backup-dir> --target <store-dir> --dry-run` reports restore scope without modifying production data.
- `node tools/backend-evidence-smoke.mjs --store <store.json>` reports safe counts/status summaries for orders, reviews, price groups, import history, audit logs, and media-image metadata without raw payloads or secrets. For post-Rust PostgreSQL/MinIO evidence packets, use `--packet <no-secret-evidence-packet.json> --strict`; the packet should contain provider class, backup path class/timestamp, row/object counts, compact audit types, and import statuses only. `--self-test` is part of the local check suite.
- For price import mistakes, restore by applying a validated reverse import or a reviewed PostgreSQL/catalog backup; do not edit raw store files on production without first copying them aside.
- `priceImportHistory[]` and `audit[]` are operator evidence only. They should help identify who/when/how many rows changed, but they are not a full data backup.
- For reviews/orders/account data, prefer read-only inspection and targeted reversal through admin routes; avoid whole-store replacement unless the relevant backup is verified and the site is in a maintenance window.
- Production smoke now includes safe public API checks for catalog-query non-zero pricing, public price-list rows, canonical `/index.html -> /`, and anonymous admin media denial in addition to health and HTML shell checks.

## Next Backend Packet

The next backend/security packet should stay server-side and avoid UI redesign work:

- order/account/cart persistence hardening follow-up: cart duplicate merge, safe cart keys, cart/favorites/saved-cart stale-write conflict checks, and account sync timestamps are implemented; remaining work is deeper order-draft recovery UX;
- admin audit log hardening: user/admin, order, review, price apply, catalog save, catalog import lifecycle, and media mutation summaries are covered;
- rate-limit follow-up: unsafe Node writes, account/review/order/brief writes, and admin catalog/import/media/price/content/order/user mutations now have store-backed buckets with documented memory fallback; remaining work is optional live limiter telemetry if abuse evidence appears;
- import history follow-up: add preview/reject/rollback lifecycle records if the admin UX needs them; apply history is now recorded server-side;
- backup/restore hardening: no-secret file-store evidence is automated for current JSON stores, including media-image metadata counts; PostgreSQL/MinIO rollback evidence remains a runbook-backed operator step before destructive imports or catalog rewrites.
