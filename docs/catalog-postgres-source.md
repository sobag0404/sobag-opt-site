# Catalog PostgreSQL Source

This is a future runtime path for the public catalog list/detail APIs.

Current production default stays unchanged:

- `SOBAG_CATALOG_SOURCE` unset or not `postgres`: use the existing store/static catalog path.
- `SOBAG_CATALOG_SOURCE=postgres`: `/api/catalog-query` and `/api/catalog-detail` read through the PostgreSQL source adapter.

Required env for the PostgreSQL path:

- `SOBAG_CATALOG_SOURCE=postgres`
- `SOBAG_CATALOG_DATABASE_URL` preferred, or `DATABASE_URL` / `POSTGRES_URL` fallback.

Optional env:

- `SOBAG_CATALOG_DB_POOL_SIZE`
- `SOBAG_CATALOG_DB_IDLE_MS`
- `SOBAG_CATALOG_DB_CONNECT_MS`

Safety rules:

- Do not enable this in production until the PostgreSQL schema from `docs/pim-postgres-schema.sql` is applied and seeded outside Git.
- Do not commit DB dumps, connection strings, or `.env` files.
- Keep public API compatibility for `/api/catalog`, `/api/catalog-query`, and `/api/catalog-detail`.
- Public reads must expose only `published` non-hidden products through the guarded public views.
- Vercel is excluded from the working deploy/verification path; keep this migration focused on the VPS.

Checks:

- `npm.cmd run smoke:catalog:db-client`
- `npm.cmd run smoke:catalog:db-source`
- `npm.cmd run rehearse:pim:postgres`
- `npm.cmd run check`

Rollback-only rehearsal:

- `npm.cmd run rehearse:pim:postgres` builds schema + seed SQL locally and does not connect.
- `node tools/pim-postgres-rehearsal.mjs --execute` connects through `SOBAG_CATALOG_DATABASE_URL`, runs schema + seed in one transaction, and always rolls back.
- Remote test databases require `--allow-remote-test`.
- Do not run rehearsal against production data or with production DB credentials.
