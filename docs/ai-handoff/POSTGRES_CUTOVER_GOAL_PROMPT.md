# PostgreSQL Cutover Goal Prompt

Last updated: 2026-06-11

Use this prompt to start goal mode for the real PostgreSQL catalog migration on the VPS.

```text
Включи режим цели для Sobag Opt. Отвечай по-русски и кратко.

Цель: безопасно перевести публичный каталог Sobag Opt на PostgreSQL на текущем VPS `77.239.107.164`, сохранив работоспособность сайта, корзины, заказов, админки и production data. Vercel исключен из рабочего контура: не деплоить и не проверять Vercel.

Контекст:
- repo: https://github.com/sobag0404/sobag-opt-site
- branch: main
- production: https://sobag-shop.online на VPS 77.239.107.164
- текущий backend все еще Node.js; переход без Node.js будет отдельным будущим этапом после PostgreSQL
- текущий каталог еще не PostgreSQL: `/api/health` должен показывать `catalogDb.enabled=false`, пока cutover не сделан
- PostgreSQL path уже подготовлен в коде: `docs/pim-postgres-schema.sql`, `tools/pim-postgres-*`, `api/_lib/catalog-db-*`, runtime toggle `SOBAG_CATALOG_SOURCE=postgres`
- на VPS мало диска, поэтому после deploy хранить только текущий и один предыдущий release

Правила:
1. Сначала прочитай `docs/ai-handoff/ACTIVE_CONTEXT.md`.
2. Затем `git status --short --branch`, `git pull origin main`.
3. Потом открой только нужные файлы:
   - `docs/catalog-postgres-source.md`
   - `docs/catalog-db-cutover-runbook.md`
   - `docs/pim-postgres-schema.sql`
   - `tools/pim-postgres-rehearsal.mjs`
   - `tools/pim-postgres-migration-bundle.mjs`
4. Не печатай секреты, пароли, connection strings, `.env`, cookies, SSH keys, дампы БД.
5. Не трогай заказы/users/cache/store без необходимости. Перед любым изменением на VPS сделай один актуальный backup текущего store, старые backup можно заменить.
6. Production cutover делать только после rollback rehearsal и green smoke.
7. Если что-то падает, откати `SOBAG_CATALOG_SOURCE` обратно в non-postgres, перезапусти PM2 и проверь сайт.

План работ:
1. Проверить текущее состояние:
   - `git status --short --branch`
   - `npm.cmd run check`
   - `npm.cmd run smoke:prod -- --base-url https://sobag-shop.online`
   - VPS: disk/RAM/current release, `/api/health`, список releases.

2. Подготовить VPS:
   - если PostgreSQL не установлен, установить PostgreSQL из Ubuntu packages;
   - включить сервис PostgreSQL;
   - создать отдельную БД и пользователя для каталога;
   - пароль сгенерировать на VPS, не выводить в чат и не коммитить;
   - установить conservative настройки для текущего слабого VPS: маленький pool, без лишних сервисов.

3. Backup:
   - сохранить только последний backup `/var/lib/sobag-opt/store`;
   - не делать и не коммитить SQL dump с реальными данными;
   - проверить свободное место после backup.

4. Offline/local gates:
   - `npm.cmd run audit:pim-schema`
   - `npm.cmd run audit:pim-db`
   - `npm.cmd run audit:pim-query`
   - `npm.cmd run export:pim:postgres -- --dry-run`
   - `npm.cmd run bundle:pim:postgres -- --dry-run`
   - `npm.cmd run audit:pim:postgres-bundle -- --dry-run`
   - `npm.cmd run rehearse:pim:postgres`
   - `npm.cmd run audit:catalog:db-write-plan`
   - `npm.cmd run rehearse:catalog:db-write`

5. Test DB rehearsal:
   - создать migration bundle в ignored `local-import-output/pim-postgres-migration`;
   - передать SQL на VPS безопасно без Git и без печати секретов;
   - сначала выполнить rollback-only rehearsal:
     `node tools/pim-postgres-rehearsal.mjs --execute --database-url-env SOBAG_CATALOG_DATABASE_URL --allow-remote-test`
   - убедиться, что rehearsal проходит и не оставляет частично записанных данных.

6. Real seed/cutover:
   - после успешного rehearsal применить schema + seed к новой PostgreSQL БД;
   - добавить на VPS в `/opt/sobag-opt/shared/.env`:
     `SOBAG_CATALOG_DATABASE_URL=...`
     `SOBAG_CATALOG_DB_POOL_SIZE=2`
     `SOBAG_CATALOG_DB_IDLE_MS=30000`
     `SOBAG_CATALOG_DB_CONNECT_MS=5000`
   - сначала НЕ ставить `SOBAG_CATALOG_SOURCE=postgres`; перезапустить PM2 и проверить, что сайт работает по старому источнику;
   - затем включить `SOBAG_CATALOG_SOURCE=postgres`, перезапустить PM2.

7. Проверки после cutover:
   - `/api/health` должен показать `catalogDb.enabled=true`, `catalogDb.configured=true`;
   - `npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online --require-catalog-db`
   - `npm.cmd run smoke:prod -- --base-url https://sobag-shop.online`
   - `npm.cmd run smoke:prod:performance -- --base-url https://sobag-shop.online`
   - вручную/Playwright проверить: каталог, категории, фильтры, поиск, карточка товара, добавление в корзину, админка.

8. Git/docs:
   - если менялись docs/scripts/workflows, обновить `docs/roadmap-checklist.md`, `docs/ai-handoff/ACTIVE_CONTEXT.md`, `docs/ai-handoff/CURRENT_STATUS.md`, `project-ai-handoff-latest.zip`;
   - `npm.cmd run check`;
   - при UI/API риске `npm.cmd run ui:smoke`;
   - commit/push только зеленый срез;
   - дождаться `autofix-check`, `vps-deploy`, `production-smoke`.

9. Финальный отчет:
   - что сделано;
   - текущий release;
   - PostgreSQL включен или нет;
   - какие проверки прошли;
   - rollback-команда;
   - напомнить: следующий большой этап после стабилизации PostgreSQL - миграция без Node.js на Rust Axum + SSR/HTMX + PostgreSQL + Redis + Meilisearch + MinIO/S3.
```

