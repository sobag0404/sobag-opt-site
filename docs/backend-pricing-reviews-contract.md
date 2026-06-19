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
4. Order pricing continues to use the trusted server catalog price until a separate business rule explicitly approves promo order-pricing precedence.

Import history and audit:

- `GET /api/admin/prices` includes `history`, newest first, limited to the latest 100 safe import summaries.
- Successful `apply` records `priceImportHistory[]` with actor email, source, status, row/change counts, affected SKU/product counts, promo-change count, and the apply summary.
- Successful `apply` also appends a compact `audit[]` record with action `price_import_apply`, actor, source/status, change count, affected SKU count, and timestamp.
- Raw uploaded files, raw CSV text, secrets, cookies, tokens, and private customer data are not stored in the history/audit records.
- History/audit persistence is best-effort after the transactional price apply; if the audit store is temporarily unavailable, the response exposes `historyRecorded: false` on Rust while preserving the already-successful price transaction.

## Order/Account/Cart Persistence

Order creation uses non-sequential `SO-*` identifiers for new orders. Buyer order comment updates validate the submitted order id with a bounded allowlist before checking ownership.

Order creation accepts an optional `Idempotency-Key` or `X-Idempotency-Key` header, or `idempotencyKey` body field, for safe customer retry handling. The server stores only a normalized opaque key and scoped owner marker (`email:*` or `phone:*`). A repeated order create with the same key and same owner scope returns the original order with `idempotent: true` instead of creating a duplicate. Different users or contacts cannot reuse another customer's idempotency key.

Coverage:

- Node and Rust order paths share the same normalized key/scope behavior and malformed order-id rejection.
- `tools/api-security-smoke.mjs` covers retry reuse through the public API and malformed buyer order ids.
- Rust unit coverage verifies scoped reuse, cross-scope replay prevention, and malformed order-id rejection.

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

- `tools/api-security-smoke.mjs` covers anonymous rejection, no-order rejection, completed-order success, another user's order rejection, duplicate rejection, pending-order rejection, and review write burst `429`; Rust unit coverage mirrors owned completed-order and duplicate eligibility decisions plus the review write bucket.
- `tools/price-groups-smoke.mjs` covers group collapse, promo rows, active/future promo windows, spaced Excel price values, positive price validation, formula rejection, public export, and transactional DB rollback on apply failure.

## Backup And Recovery Notes

- Before destructive catalog/price imports, keep the normal VPS release rollback plus a current PostgreSQL/catalog backup from the existing deploy/import runbooks.
- For price import mistakes, restore by applying a validated reverse import or a reviewed PostgreSQL/catalog backup; do not edit raw store files on production without first copying them aside.
- `priceImportHistory[]` and `audit[]` are operator evidence only. They should help identify who/when/how many rows changed, but they are not a full data backup.
- For reviews/orders/account data, prefer read-only inspection and targeted reversal through admin routes; avoid whole-store replacement unless the relevant backup is verified and the site is in a maintenance window.

## Next Backend Packet

The next backend/security packet should stay server-side and avoid UI redesign work:

- order/account/cart persistence hardening follow-up: write conflict handling and no partial account/cart corruption on failed persistence; order idempotency is now implemented;
- admin audit log hardening: extend the price-import pattern to media mutations, order changes, review moderation, catalog writes, and admin user mutations without logging secrets or private payloads;
- rate-limit follow-up: review writes now have a buyer-scoped limiter; next step is store-backed/distributed rate buckets for multi-process/VPS scaling without blocking normal admin workflows;
- import history follow-up: add preview/reject/rollback lifecycle records if the admin UX needs them; apply history is now recorded server-side;
- backup/restore hardening: automate no-secret backup evidence for file-store/PostgreSQL/MinIO rollback before destructive imports or catalog rewrites.
