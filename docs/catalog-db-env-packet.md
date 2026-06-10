# Catalog DB Env Packet

Last updated: 2026-06-10

Цель: перед test DB rehearsal и будущим catalog DB cutover подтвердить параметры PostgreSQL без публикации секретов.

## Где Готовить

Локальный файл, не коммитить:

```text
local-import-output/catalog-db-env-packet.json
```

## Структура

```json
{
  "provider": "postgres",
  "databaseKind": "test",
  "hostClass": "private-vps-or-managed",
  "databaseName": "sobag_catalog_test",
  "sslRequired": true,
  "schemaApplied": false,
  "seedSource": "bundle:pim:postgres",
  "rollbackRehearsalConfirmed": false,
  "productionCredentials": false,
  "runtimeToggleApproved": false
}
```

## Проверка

```powershell
npm.cmd run audit:catalog-db-packet -- --packet local-import-output/catalog-db-env-packet.json --strict
```

Без `--strict` команда работает как readiness report и не падает, если пакет еще не создан.

## Правила

- Не указывать `DATABASE_URL`, `SOBAG_CATALOG_DATABASE_URL`, password, token, user или connection string.
- `databaseKind` до production cutover должен быть `test` или `staging`.
- `productionCredentials` должен быть `false` для rehearsal.
- `runtimeToggleApproved` остается `false`, пока отдельно не подтвержден production switch.
- После подготовки test DB запускать только rollback rehearsal:

```powershell
node tools/pim-postgres-rehearsal.mjs --execute --database-url-env SOBAG_CATALOG_DATABASE_URL --allow-remote-test
```

Production toggle делать отдельным подтвержденным шагом через `docs/catalog-db-cutover-runbook.md`.
