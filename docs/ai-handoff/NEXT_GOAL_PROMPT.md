# Next Goal Prompt

Last updated: 2026-06-10

Use this prompt when starting the next goal-mode run for Sobag Opt.

```text
Включи goal mode для Sobag Opt. Отвечай по-русски и кратко.

Цель: продолжить Sobag Opt после закрытия текущего P0/P1 commercial-readiness среза: проверить, что VPS-production остается зеленым, затем двигаться к следующим апгрейдам по roadmap без поломки каталога, поиска, карточки товара, корзины, заказов, аккаунтов, админки и production data. Новый стек пока НЕ внедрять; после закрытия текущих апгрейдов напомнить пользователю про будущий переход без Node.js на этом же VPS или более мощном VPS.

Контекст:
- repo: https://github.com/sobag0404/sobag-opt-site
- branch: main
- production: https://sobag-shop.online
- VPS: 77.239.107.164
- текущая архитектура: static HTML/CSS/JS + Node.js API на VPS; Vercel сохранен как fallback/reference и обычно не деплоится на каждый push
- последний важный зеленый срез: `fe383b3 Close commercial readiness gaps`; сначала сделать `git pull origin main` и смотреть актуальный `git log -1 --oneline`
- стартовый протокол: прочитать `docs/ai-handoff/ACTIVE_CONTEXT.md`, выполнить `git status --short --branch`, затем открыть `docs/roadmap-checklist.md` и `docs/ai-handoff/CURRENT_STATUS.md`

Правила:
- Не читать длинные handoff-файлы/старую историю без конкретной причины.
- Перед любыми изменениями проверять `git status --short --branch`.
- Не трогать production env/cache/user data без явного разрешения.
- Не добавлять секреты, `.env`, токены, cookies, SSH-ключи, дампы БД.
- Не использовать старый Tilda-сайт и старые изображения.
- Не коммитить raw/bulk photo folders.
- Дневная тема остается черно-бело-серой; ночная тема должна получать все UI-изменения.
- Подробные prompt/handoff сохранять в `docs/ai-handoff/` и пушить на GitHub; в чат отдавать короткую версию до 4000 символов.

Уже закрыто в P0/P1 commercial-readiness:
- `custom.html` больше не показывает фейковый успех: `/api/briefs` сохраняет custom-print заявку на сервере и зеркалит ее в admin/manager orders.
- `/api/orders`, cart checkout и saved quote send-to-manager блокируют отправку ниже 30 000 ₽.
- Промокод не выглядит фейково работающим: поле отключено, условия согласует менеджер.
- `privacy.html` отделен от PDF согласия на обработку персональных данных.
- Карты контактов не строятся по заглушкам; юридический/производственный адрес редактируются в админке и требуют реальных данных.
- Мобильный header сокращен, product modal quantity открывается с `1`, но допускает `0`; hero H1 имеет responsive wrapping; коллекции в каталоге свернуты через `Показать еще`.

Следующие апгрейды:
1. Production verification
- После pull проверить `npm.cmd run check`, `npm.cmd run ui:smoke`.
- Проверить Actions после push: `autofix-check`, `vps-deploy`, `production-smoke`.
- Проверить live smoke: `npm.cmd run smoke:prod -- --base-url https://sobag-shop.online`.
- Если есть UI/API риск, проверить затронутые страницы локально через `npm run dev:static`.

2. SEO/content
- Довести финальные company/legal/contact/business/marketplace тексты, но не выдумывать реальные реквизиты, адреса, телефон или карту.
- Реальные адреса/Yandex maps настраивать только после подтвержденных данных от пользователя.
- Продолжить SEO landing copy для важных категорий/коллекций/праздников через текущую content/admin систему.

3. Photo storage / images
- Текущий путь: object-storage adapter, S3-compatible provider, responsive WebP/AVIF metadata уже есть.
- Следующий шаг: реальная миграция фото через CLI/provider только с подтвержденными env/provider и без raw фото в Git.
- Проверять metadata: `url`, `storageKey`, `provider`, `width`, `height`, `mime`, `uploadedAt`, `variants`.
- Все товарные и категорийные превью должны оставаться квадратными 1:1.

4. Import/PIM
- DB/storage split делать только малыми совместимыми шагами.
- Сохранять совместимость публичного `/api/catalog`.
- Публичные API отдают только `published`.
- Импорт не удаляет существующие товары.
- Обновление существующих товаров только через явный update mode.
- Следующий крупный этап: later DB split для product, variant, image, taxonomy, import-batch entities.

5. Performance 10k+
- Серверные `/api/catalog-query` и `/api/catalog-detail` уже используются.
- Поддерживать маленький payload списка, 48-card pages, no full `/api/catalog` bootstrap при успешном query API.
- Валидировать WebP/AVIF на реальном мигрированном каталоге.
- Core Web Vitals аудит делать после реального роста данных.

6. QA/Ops/Security
- Не ослаблять access audit, error-log audit, VPS release/preflight/backups.
- После каждого крупного блока обновлять `docs/roadmap-checklist.md`, `docs/ai-handoff/ACTIVE_CONTEXT.md`, `docs/ai-handoff/CURRENT_STATUS.md`, `project-ai-handoff-latest.zip`.
- Коммитить и пушить только зеленые завершенные срезы.
- VPS деплоится на каждый green push; Vercel fallback запускать только намеренно/редко, через текущий throttle/marker.

Будущая миграция без Node.js, только напомнить после текущих апгрейдов:
- Backend: Rust Axum
- HTML/SSR: Rust templates + HTMX
- DB: PostgreSQL
- Cache/session: Redis
- Search: Meilisearch
- Files/photos: MinIO/S3-compatible
- Deploy: Docker Compose или systemd на VPS
- Nginx остается reverse proxy
- Миграцию делать позже параллельно, не ломая текущий сайт.
```
