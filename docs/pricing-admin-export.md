# Pricing Admin and Export

Current backend contract for price groups:

- Public download: `GET /api/price-list`
  - Default format: CSV.
  - JSON format: `GET /api/price-list?format=json`.
  - Rows are grouped by price category, for example `Подушка Велюр 40x40`.
  - Active promo rows are exported as separate `Акция <group>` rows.
  - Public response contains only public price data and uses short public cache headers.

- Admin preview/export: `GET /api/admin/prices`
  - Requires `admin` or `content` role.
  - CSV export: `GET /api/admin/prices?format=csv`.
  - Import template: `GET /api/admin/prices?template=1`.
  - Backend template/export is CSV-only. XLSX parsing/export is a browser-side admin UI capability through SheetJS; backend receives parsed `rows` or CSV text and does not execute spreadsheet formulas.

- Admin import/apply: `POST /api/admin/prices`
  - Requires `admin` or `content` role.
  - Body: `{ "action": "preview" | "apply", "rows": [...] }` or `{ "action": "...", "csv": "..." }`.
  - Supported columns: `Категория/группа`, `Артикул`, `Цена`, `Акция цена`, `Акция активна`, `Акция с`, `Акция до`.
  - `Цена` changes the base price for a whole group or one SKU.
  - `Акция цена` stores an active promo price for a whole group or one SKU.
  - Spreadsheet formula-like input is rejected; zero, negative, NaN, and unknown groups/SKUs are rejected.

Runtime behavior:

- The canonical price group is derived from variant `type + material + size`.
- SKU override remains supported through `variantPrices[sku]` for file/static catalog storage.
- PostgreSQL runtime updates `variants.price` directly and stores promo metadata in `variants.payload`.
- Rust catalog/order paths read the same PostgreSQL `variants.price`, so base price updates remain Node/Rust compatible.
- Promo export is available through the Rust-owned public/admin price endpoints in production; Node route code remains a compatibility fallback while present. Automatic promo order pricing is not enabled until the business rule is explicitly confirmed.
