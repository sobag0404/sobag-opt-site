# Current Status Snapshot

Date: 2026-05-27

Latest functional commit before this handoff update:
- `7bc2760 Add favorites page and semicolon import lists`

Working tree at the start of handoff preparation:
- clean

Production URLs:
- Main: `https://sobag-opt-site.vercel.app/`
- Catalog: `https://sobag-opt-site.vercel.app/catalog`
- Cart: `https://sobag-opt-site.vercel.app/cart`
- Favorites: `https://sobag-opt-site.vercel.app/favorites`

Current focus:
- preparing the project to continue from another device;
- keeping handoff docs and ZIP current;
- continuing product-import workflow next.

Completed most recently:
- removed test imported product assets and `data/products-live.json`;
- added separate favorites page;
- made header heart button open favorites;
- kept favorites as localStorage prototype data;
- changed import list examples from comma to `;`;
- regenerated product templates;
- updated product-import documentation.

Remaining work:
- real product import workflow for large batches;
- duplicate-safe import/update process;
- optional AI-assisted descriptions/tags/collections from photos;
- separate price-editing file per variant;
- real backend and persistent storage;
- real user accounts and server-side roles;
- real order submission and manager/admin processing;
- legal pages and consent text;
- designer-provided product/category/actual images.

Important constraints:
- no secrets in repo/docs/ZIP/chat;
- do not use old Tilda site or old images;
- do not commit raw bulk product photo folders;
- day theme should remain black/white/gray;
- localStorage data is prototype-only.
