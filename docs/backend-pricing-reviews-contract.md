# Backend Pricing And Reviews Contract

This document records the post-Rust-cutover backend contract for price-list, price import, promo rows, and buyer review eligibility. It is server-side only and does not define visual/UI behavior.

## Runtime Ownership

- Public price export: `GET /api/price-list` exposes only public catalog pricing.
- Admin price management: exact `GET/POST /api/admin/prices` is Rust-owned in production, with Node kept only as compatibility fallback for non-switched legacy paths.
- Buyer review write path: exact account/auth routes are Rust-owned in production; Node route code remains a compatibility reference while it exists.
- Vercel/Next.js are historical only and are not active deploy/runtime targets.

## Public Price List

`GET /api/price-list` returns CSV by default and JSON with `?format=json`.

Rows are grouped by price category/group, not by every SKU. A group is resolved from explicit `priceGroup`/`priceGroupName` first, then from variant type/material/size, then product name fallback. Each base row contains the group label and current positive price. If an active promo exists for the group, the export includes a second row with an `Акция ` prefix and the promo price.

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
- unknown group/SKU targets are rejected;
- duplicate target updates in one import are rejected;
- spreadsheet formulas are rejected for target and price cells;
- `preview` returns changes/errors without mutating data;
- `apply` is rejected when preview errors exist and otherwise applies atomically through PostgreSQL transaction in production.

Precedence:

1. SKU price override from an import row updates matched variants.
2. Group price updates every SKU in the matched price group.
3. Promo price is stored separately in variant payload and appears as an additional public price-list row when active.
4. Order pricing continues to use the trusted server catalog price until a separate business rule explicitly approves promo order-pricing precedence.

## Buyer Review Eligibility

A product review can be created only by an authenticated user who has a confirmed order for the same product/SKU.

Server-side rules:

- anonymous users cannot review;
- registered users without an eligible order get `403` with `REVIEW_ORDER_REQUIRED`;
- only orders with status `shipped` or `done` are eligible;
- product match is checked by product id, base SKU, item key, or variant SKU;
- a user cannot use another user's order;
- duplicate review per user/product or user/base SKU returns `409` with `REVIEW_ALREADY_EXISTS`;
- legacy reviews are not deleted automatically and remain subject to admin moderation.

Coverage:

- `tools/api-security-smoke.mjs` covers no-order rejection, completed-order success, duplicate rejection, and pending-order rejection.
- `tools/price-groups-smoke.mjs` covers group collapse, promo rows, positive price validation, formula rejection, public export, and transactional DB apply shape.
