# Next Goal Prompt

Last updated: 2026-06-10

Use this prompt when starting the next goal-mode run for Sobag Opt.

```text
Включи goal mode для Sobag Opt. Отвечай по-русски и кратко.

Цель: последовательно закрыть следующие 4 апгрейда текущего Sobag Opt на VPS, без перехода на новый стек и без поломки production: 1) SEO/content, 2) photo storage/images, 3) Import/PIM DB split preparation, 4) performance/Core Web Vitals. После завершения этих 4 пунктов обязательно напомнить пользователю о пункте 5: будущая миграция без Node.js на Rust Axum + HTMX + PostgreSQL + Redis + Meilisearch + MinIO/S3.

Контекст:
- repo: https://github.com/sobag0404/sobag-opt-site
- branch: main
- production: https://sobag-shop.online
- VPS: 77.239.107.164
- текущая архитектура: static HTML/CSS/JS + Node.js API на VPS
- Vercel исключен из рабочего контура: не деплоить и не проверять, активная цель только VPS; кодовую совместимость убрать позже в отдельной миграции без Node.js
- P0/P1 commercial readiness уже закрыт: custom print request сохраняется на сервере, footer pages есть, privacy/consent разделены, карты не строятся по заглушкам, checkout ниже 30 000 ₽ заблокирован, mobile/header/qty/promo/skeleton/H1/collections исправлены

Стартовый протокол:
1. `git pull origin main`
2. прочитать `docs/ai-handoff/ACTIVE_CONTEXT.md`
3. прочитать `docs/ai-handoff/CURRENT_STATUS.md`
4. прочитать `docs/roadmap-checklist.md`
5. `git status --short --branch`

Общие правила:
- Не трогать production env/cache/user data без явного разрешения.
- Не добавлять секреты, `.env`, токены, cookies, SSH-ключи, дампы БД.
- Не использовать старый Tilda-сайт и старые изображения.
- Не коммитить raw/bulk photo folders.
- Дневная тема черно-бело-серая; ночную тему поддерживать для всех UI-изменений.
- Перед изменениями проверять `git status --short --branch`.
- Двигаться крупными, но безопасными блоками.
- После каждого крупного блока обновлять `docs/roadmap-checklist.md`, `docs/ai-handoff/ACTIVE_CONTEXT.md`, `docs/ai-handoff/CURRENT_STATUS.md`, `project-ai-handoff-latest.zip`.
- Подробные prompts/handoff сохранять в `docs/ai-handoff/` и пушить на GitHub; в чат отдавать версию до 4000 символов.

Проверки:
- после крупного блока: `npm.cmd run check`
- перед push: `npm.cmd run check` и `npm.cmd run ui:smoke`
- после push дождаться GitHub Actions: `autofix-check`, `vps-deploy`, `production-smoke`
- после deploy проверить: `npm.cmd run smoke:prod -- --base-url https://sobag-shop.online`
- при UI/API риске запускать focused smoke или локально `npm run dev:static`

Пункт 1. SEO/content
- Довести публичные тексты до production-ready без фейковых реквизитов.
- Не выдумывать реальные юридические данные, ИНН, адрес, телефон, карту; финальные реальные данные добавлять только после подтверждения пользователя.
- Проверить страницы: главная, каталог, custom, business, marketplaces, about, contacts, terms, privacy, footer info pages.
- Улучшить SEO landing copy для важных категорий/коллекций/праздников через текущую content/admin систему.
- Сохранить Product schema и FAQ schema, не переделывать без причины.
- Проверить sitemap/meta/content audit.

Пункт 2. Photo storage / images
- Текущий путь уже есть: object-storage adapter, S3-compatible provider, bulk photo CLI, responsive WebP/AVIF metadata, frontend `<picture>`.
- Подготовить реальную миграцию фото: проверить provider/env readiness безопасно, без печати секретов.
- Не загружать raw/bulk фото в Git.
- Проверять image metadata: `url`, `storageKey`, `provider`, `width`, `height`, `mime`, `uploadedAt`, `variants`.
- Все фото товаров, категорий, подборок и праздников должны оставаться квадратными 1:1.
- Валидировать WebP/AVIF на реальном мигрированном наборе, когда данные/provider подтверждены.

Пункт 3. Import/PIM DB split preparation
- Не делать резкий переписанный backend.
- Двигаться малыми совместимыми шагами к normalized DB/storage split для product, variant, image, taxonomy, import-batch.
- Сохранять совместимость публичного `/api/catalog` и текущих `/api/catalog-query`, `/api/catalog-detail`.
- Публичные API отдают только `published`.
- Импорт не удаляет существующие товары.
- Обновление существующих товаров только через явный update mode.
- Использовать существующие PIM sidecar/export/diagnostics как bridge к будущей PostgreSQL-схеме.

Пункт 4. Performance / Core Web Vitals
- Сохранять server-side `/api/catalog-query` + `/api/catalog-detail`.
- Поддерживать маленький payload списка, 48-card pages, no full `/api/catalog` bootstrap при успешном query API.
- Проверить skeleton/loading, поиск, фильтры, product modal, mobile header.
- Core Web Vitals аудит делать после реального роста данных/фото; если данных пока мало, подготовить tooling/план и не имитировать production выводы.
- Не ухудшать catalog/cart/admin UX ради синтетических метрик.

После пунктов 1-4:
- Напомнить пользователю о пункте 5: будущая миграция без Node.js.
- Целевой стек пункта 5:
  Backend: Rust Axum
  HTML/SSR: Rust templates + HTMX
  DB: PostgreSQL
  Cache/session: Redis
  Search: Meilisearch
  Files/photos: MinIO/S3-compatible
  Deploy: Docker Compose или systemd на VPS
  Nginx остается reverse proxy
- Миграцию делать позже параллельно, не ломая текущий production.
```
