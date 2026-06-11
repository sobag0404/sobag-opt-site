# Rust Migration Goal Prompt

Last updated: 2026-06-11

Use this prompt to start goal mode for the staged migration away from Node.js.

```text
Включи режим цели для Sobag Opt. Отвечай по-русски и кратко.

Цель: начать безопасную миграцию Sobag Opt с Node.js на Rust Axum + SSR/HTMX на текущем VPS `77.239.107.164`, чтобы уже сейчас поднять производительность и оставить путь для будущего апгрейда VPS. Production должен продолжать работать без поломки каталога, поиска, карточек товара, корзины, заказов, аккаунтов, админки и production data.

Контекст:
- repo: https://github.com/sobag0404/sobag-opt-site
- branch: main
- production: https://sobag-shop.online
- active deploy: только VPS, Vercel не деплоить и не проверять
- текущий VPS слабый: 1 vCPU / 2 GB RAM / 20 GB SSD
- PostgreSQL уже установлен на VPS
- публичный каталог уже читает PostgreSQL через `SOBAG_CATALOG_SOURCE=postgres`
- Node.js пока остается production fallback, пока Rust не покроет нужные маршруты

Целевая архитектура:
- Rust Axum как новый основной backend
- SSR HTML templates + HTMX для каталога/search/product и дальнейших интерактивных потоков
- PostgreSQL как основной источник каталога и будущих заказов/users/admin data
- Nginx reverse proxy
- systemd unit для Rust сервиса
- Redis/Meilisearch/MinIO НЕ ставить на текущем VPS на первом этапе
- на текущем VPS использовать PostgreSQL trigram/full-text search и легкий in-process cache
- после апгрейда VPS добавить Redis, Meilisearch, MinIO/S3-compatible и фоновые workers

Правила:
1. Сначала прочитай `docs/ai-handoff/ACTIVE_CONTEXT.md`.
2. Затем `git status --short --branch`, `git pull origin main`.
3. Открой только нужные файлы:
   - `docs/ai-handoff/CURRENT_STATUS.md`
   - `docs/catalog-postgres-source.md`
   - `docs/catalog-db-cutover-runbook.md`
   - `server.mjs`
   - `api-router.js`
   - `api/_lib/catalog-db-query.js`
   - `api/_lib/catalog-db-rows.js`
   - `server-routes/catalog-query.js`
   - `server-routes/catalog-detail.js`
4. Не печатай и не коммить секреты, `.env`, DB URL, пароли, cookies, SSH keys, дампы БД.
5. Не трогай production data без явной необходимости. Перед изменениями на VPS держать один актуальный backup.
6. Миграция только малыми зелеными этапами. Node.js не удалять, пока Rust route coverage и smoke не доказаны.
7. Если Rust route ломается, Nginx должен быстро возвращать этот route на Node.

Этап 1: Rust read-only catalog API рядом с Node.
- Создать Rust workspace/crate, например `rust-server/`.
- Использовать Axum + Tokio + SQLx/Postgres + Serde + Tracing.
- Не хранить секреты в repo.
- Реализовать:
  - `GET /api/health-rust`
  - `GET /rust/catalog-query` или внутренний route для будущего proxy
  - `GET /rust/catalog-detail`
- Читать из текущих PostgreSQL views: `public_catalog_cards`, `public_catalog_products`, variants/images.
- Сохранить совместимость payload с текущими `/api/catalog-query` и `/api/catalog-detail`.
- Добавить Rust tests для SQL row mapping/query params.
- Локально: cargo fmt, cargo test.
- Node checks не ломать: `npm.cmd run check`.

Этап 2: VPS deploy без переключения public traffic.
- Установить Rust toolchain на VPS только если отсутствует.
- Собрать release binary.
- Создать systemd service `sobag-opt-rust` на localhost port, например `127.0.0.1:3001`.
- Проверить с VPS:
  - `curl http://127.0.0.1:3001/api/health-rust`
  - catalog query/detail на Rust.
- Не менять основной Nginx routing до green checks.

Этап 3: Shadow/parallel verification.
- Добавить read-only smoke, сравнивающий Node и Rust responses по:
  - popular list
  - category filter
  - search lowercase/uppercase
  - detail by baseSku
  - pagination/cursor
- Допустить только безопасные расхождения, явно документировать.
- Проверить memory/CPU на VPS.

Этап 4: Точечный Nginx switch.
- Переключить только `/api/catalog-query` и `/api/catalog-detail` на Rust.
- Остальное оставить на Node.
- После переключения:
  - `npm.cmd run smoke:prod -- --base-url https://sobag-shop.online`
  - `npm.cmd run smoke:prod:performance -- --base-url https://sobag-shop.online`
  - live API comparison/smoke
  - ручная/Playwright проверка каталога, поиска, карточки товара, корзины.
- Если ошибка: вернуть эти routes на Node и перезапустить Nginx.

Этап 5: SSR/HTMX catalog.
- Только после стабильного Rust API.
- Добавить SSR pages for catalog/search/product fragments.
- HTMX для фильтров, поиска, пагинации.
- Не переписывать корзину/админку в этом этапе.

Этап 6: дальнейшая миграция.
- Перенести корзину/orders/account/admin/import на Rust отдельными goals.
- После полного покрытия удалить Node/PM2.
- После апгрейда VPS добавить Redis, Meilisearch, MinIO/S3, workers.

Проверки перед каждым push:
- `cargo fmt`
- `cargo test`
- `npm.cmd run check`
- при UI/API риске `npm.cmd run ui:smoke`

После deploy:
- GitHub Actions `autofix-check`, `vps-deploy`, `production-smoke` green
- live smoke по `https://sobag-shop.online`
- VPS health, systemd status, disk/RAM

Финальный отчет каждого этапа:
- что сделано
- какие routes работают через Rust
- что осталось на Node
- проверки и результат
- rollback-команда
- текущий VPS release
```

