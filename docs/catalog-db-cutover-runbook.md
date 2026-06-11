# Catalog DB Cutover Runbook

Last updated: 2026-06-11

Цель: безопасно подготовить будущий переход публичного каталога на PostgreSQL для product, variant, image, taxonomy и import-batch entities, сохранив текущие API и production data.

## Границы

- Не трогать production DB/data/env/cache без отдельного подтверждения.
- Не коммитить `.env`, connection strings, DB dumps, SQL dumps with real data, токены или пароли.
- Не переключать production на `SOBAG_CATALOG_SOURCE=postgres`, пока схема, seed, rehearsal и live smoke не подтверждены.
- `/api/catalog`, `/api/catalog-query` и `/api/catalog-detail` должны сохранить совместимый public contract.
- Public catalog must return only `published` non-hidden products.
- Imports must not delete existing products.
- Existing products can be updated only through explicit update mode.
- Vercel is excluded from the working deploy/verification path; keep this migration focused on the VPS.

## Offline Gates

Проверить текущий контракт:

```powershell
npm.cmd run smoke:catalog:source
npm.cmd run smoke:catalog:db-rows
npm.cmd run smoke:catalog:db-query
npm.cmd run smoke:catalog:db-source
npm.cmd run smoke:catalog:db-client
npm.cmd run smoke:catalog:db-write
npm.cmd run audit:catalog:db-write-plan
npm.cmd run rehearse:catalog:db-write
```

Проверить будущую PostgreSQL схему и seed:

```powershell
npm.cmd run audit:pim-db
npm.cmd run audit:pim-schema
npm.cmd run audit:pim-query
npm.cmd run export:pim:postgres -- --dry-run
npm.cmd run bundle:pim:postgres -- --dry-run
npm.cmd run audit:pim:postgres-bundle -- --dry-run
npm.cmd run rehearse:pim:postgres
```

Полная локальная проверка:

```powershell
npm.cmd run check
npm.cmd run ui:smoke
```

## Test DB Rehearsal

Only with an approved non-production PostgreSQL database:

```powershell
node tools/pim-postgres-rehearsal.mjs --execute --database-url-env SOBAG_CATALOG_DATABASE_URL --allow-remote-test
```

The rehearsal must run in one transaction and roll back. Do not use production DB credentials for rehearsal.

## Runtime Toggle

Default production stays unchanged:

```text
SOBAG_CATALOG_SOURCE unset or not postgres
```

Approved cutover env names:

```text
SOBAG_CATALOG_SOURCE=postgres
SOBAG_CATALOG_DATABASE_URL=<set-on-server>
```

Optional:

```text
SOBAG_CATALOG_DB_POOL_SIZE=<set-on-server>
SOBAG_CATALOG_DB_IDLE_MS=<set-on-server>
SOBAG_CATALOG_DB_CONNECT_MS=<set-on-server>
```

Do not write env values into Git, docs, chat, logs, or screenshots.

## Production Readiness

Before toggle:

```powershell
npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online
```

After approved toggle:

```powershell
npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online --require-catalog-db
npm.cmd run smoke:prod -- --base-url https://sobag-shop.online
npm.cmd run smoke:prod:performance -- --base-url https://sobag-shop.online
```

Manual checks:

- catalog category, collection, holiday, search, filter and sort pages;
- product modal detail hydration;
- cart add flow;
- admin import preview/apply only in approved mode;
- `/api/health` reports `catalogDb.enabled=true` and `catalogDb.configured=true` without printing secrets.

## Rollback

If catalog DB cutover fails:

1. Revert `SOBAG_CATALOG_SOURCE` to the previous non-PostgreSQL value.
2. Restart the app process on VPS.
3. Run:

```powershell
npm.cmd run smoke:prod -- --base-url https://sobag-shop.online
npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online
```

4. Keep the PostgreSQL data untouched for analysis.
5. Do not delete products or import batches as part of rollback.
