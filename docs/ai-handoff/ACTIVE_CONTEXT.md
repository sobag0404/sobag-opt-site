# Active Context

Last updated: 2026-06-03

## Token-Saving Rule
- Читать этот файл первым.
- Старый чат, большие handoff-файлы и длинные логи открывать только если не хватает конкретной детали.
- После важных изменений кратко обновлять этот файл.

## Project
- Путь к проекту: `C:\Users\SoBag\OneDrive\Документы\New project\sobag-opt-site`
- Репозиторий: `https://github.com/sobag0404/sobag-opt-site`
- Основная ветка: `main`
- Production/preview URL: `https://sobag-shop.online`, fallback `https://sobag-opt-site.vercel.app`
- Основной стек: static HTML/CSS/JS, Vercel API routes, Upstash Redis / Vercel KV-compatible storage.
- Где лежит основной код: `app.js`, `cart.js`, HTML pages in repo root, shared shell in `components/site-shell.js`, API in `api/`.
- Где лежат тесты/проверки: `tools/autofix.mjs`, `tools/ui-smoke.spec.js`, `tools/audit_catalog.py`.

## Current Product / Goal
- Что это за проект: B2B-сайт Sobag Opt для оптовой продажи текстиля с каталогом, корзиной, заявками, аккаунтами и админ-инструментами.
- Главная цель сейчас: продолжать развитие витрины и backend/API без раздувания Vercel Hobby Functions; ближайшая продуктовая задача - отзывы к товарам.
- Что важно не сломать: каталог, поиск, корзину/сохраненные КП, авторизацию, заказы, админку, storage-ready production API, текущий визуальный стиль.

## Current User Preferences
- Язык ответов: русский.
- Дизайн/стиль: дневная тема черно-бело-серая; ночная тема может использовать оранжевые акценты.
- Ограничения: не использовать старый Tilda-сайт и его изображения; не коммитить большие папки фото/импорт-выводы; беречь лимит Vercel Hobby Functions.
- Что нельзя делать без разрешения: добавлять секреты, `.env`, токены, пароли, cookies, дампы БД, приватные SSH-ключи; менять production/deploy/cache/user data; делать крупные архитектурные изменения.

## Latest Done
- Последние важные изменения: добавлена отдельная страница поиска `search.html`; header search ведет на `/search?q=...`; точный SKU-поиск исправлен; усилен AutoFix mojibake guard; добавлен `docs/roadmap-checklist.md`.
- Последние коммиты: `d9d736a Add active context for token-efficient handoff`, `f232ec0 Update handoff after search production check`, `9d0d4f9 Add search results page and roadmap checklist`.
- Что уже проверено: `node --check app.js`; `node --check tools/autofix.mjs`; `node --check tools/ui-smoke.spec.js`; `npm.cmd run check`; `npm.cmd run ui:smoke`; production `/`, `/catalog`, `/cart`, `/search?q=opt_22434`, `/api/health`.

## Current Next Work
- Следующая задача: продуктовые отзывы.
- Требования: только зарегистрированные/авторизованные покупатели оставляют оценку и текст; отзывы показываются в product modal; админ видит и модерирует отзывы; по возможности использовать существующий storage/API слой.
- Риски: не добавить лишние Vercel Functions без необходимости; не сломать product modal, auth/session, admin tools и storage schema.

## Useful Files
- Главные файлы проекта: `app.js`, `cart.js`, `styles.css`, `components/site-shell.js`, `data/products-live.json`.
- Документация: `docs/roadmap-checklist.md`, `docs/ai-handoff/CURRENT_STATUS.md`, `docs/product-import.md`, `docs/backend-security.md`.
- Проверки: `package.json`, `tools/autofix.mjs`, `tools/ui-smoke.spec.js`, `tools/audit_catalog.py`.
- API/Backend, если есть: `api/_lib/store.js`, `api/_lib/auth.js`, `api/auth/me.js`, `api/orders.js`, `api/admin/orders.js`, `api/admin/users.js`, `api/admin/catalog.js`.

## Verification
- Какие команды запускать перед финальным ответом: `npm.cmd run check`; для JS-изменений `node --check <file>`; для UI-изменений `npm.cmd run ui:smoke` или focused browser check.
- Что проверять вручную: затронутые страницы, product modal, header search, cart/account/admin flows по риску изменения.
- Что проверять после деплоя: affected production URL, `/api/health`, storage-ready signal, отсутствие visual regressions на ключевых страницах.

## Working Rule
1. Сначала читать ACTIVE_CONTEXT.md.
2. Потом git status.
3. Затем открывать только файлы, нужные для текущей задачи.
4. Не читать весь старый чат без причины.
5. Не менять архитектуру проекта на основании сжатого контекста.
6. Если информации не хватает, сначала искать в handoff/docs, а не выдумывать.
