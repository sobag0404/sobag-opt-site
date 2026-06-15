# Catalog DB Apply Plan

Last updated: 2026-06-10

Use this only after `local-import-output/catalog-db-env-packet.json` contains confirmed non-production PostgreSQL facts and passes strict audit.

Build a local dry-run rehearsal/cutover plan:

```powershell
npm.cmd run plan:catalog-db -- --packet local-import-output/catalog-db-env-packet.json
```

Output:

```text
local-import-output/catalog-db-apply-plan.json
```

The command does not connect to PostgreSQL, does not read env secrets, and does not change VPS env. It writes only public packet facts, env names, guardrails, offline commands, rollback-rehearsal commands, and approved-cutover checks.

Planned env names:

- `SOBAG_CATALOG_SOURCE`
- secret env name only: `SOBAG_CATALOG_DATABASE_URL`
- optional tuning names: `SOBAG_CATALOG_DB_POOL_SIZE`, `SOBAG_CATALOG_DB_IDLE_MS`, `SOBAG_CATALOG_DB_CONNECT_MS`

Before any test DB execution:

```powershell
npm.cmd run audit:catalog:db-packet -- --strict
npm.cmd run bundle:pim:postgres -- --dry-run
npm.cmd run audit:pim:postgres-bundle -- --dry-run
npm.cmd run rehearse:pim:postgres
```

Only after an approved non-production PostgreSQL database is configured in the local/session env:

```powershell
node tools/pim-postgres-rehearsal.mjs --execute --database-url-env SOBAG_CATALOG_DATABASE_URL --allow-remote-test
```

Production runtime toggle remains a separate approval step through `docs/catalog-db-cutover-runbook.md`.
