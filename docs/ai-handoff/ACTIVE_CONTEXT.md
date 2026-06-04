# Active Context

Last updated: 2026-06-04

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
- Что это за проект: B2B-сайт Sobag Opt для оптовой продажи текстиля с каталогом, вариантами товаров, корзиной-КП, заявками, аккаунтами, ролями и админ-инструментами.
- Главная цель сейчас: двигаться по roadmap к удобному оптовому магазину: сохраненные КП 2.1, CRM заказов/клиентов, Import/PIM 2.0, SEO/content, performance, QA/security.
- Что важно не сломать: каталог, поиск, карточку товара, корзину/КП, авторизацию, заказы, админку, storage-ready production API, текущий черно-белый дневной стиль.

## Current User Preferences
- Язык ответов: русский.
- Дизайн/стиль: дневная тема черно-бело-серая; ночная тема может использовать оранжевые акценты.
- Ограничения: не использовать старый Tilda-сайт и его изображения; не коммитить большие папки фото/импорт-выводы; беречь лимит Vercel Hobby Functions.
- Что нельзя делать без разрешения: добавлять секреты, `.env`, токены, пароли, cookies, дампы БД, приватные SSH-ключи; менять production/deploy/cache/user data; делать крупные архитектурные изменения.

## Latest Done
- Последние важные изменения: исправлены квадратные фото в карточке товара; добавлен стабильный `readJson` для API; добавлены отзывы товаров без новых Vercel Functions; админ может видеть, одобрять, скрывать и удалять отзывы; smoke-тест блокирует изображения/шрифты для экономии ресурсов.
- Последние коммиты: `6f41dbb Update active handoff context`, `d9d736a Add active context for token-efficient handoff`, `f232ec0 Update handoff after search production check`.
- Что уже проверено: `node --check app.js`; `node --check` для измененных API; `node --check tools/ui-smoke.spec.js`; `npm.cmd run check`; `npm.cmd run ui:smoke` locally.

## Current Next Work
- Следующая задача: Saved carts / commercial proposals polish.
- Требования: отдельный раздел/страница сохраненных КП, комментарий покупателя, внутренний комментарий менеджера, предупреждение при повторе КП в корзину, если цены или SKU изменились.
- Риски: не сломать текущие сохраненные корзины старого формата, отправку КП менеджеру, корзину и историю заказов.

## Useful Files
- Главные файлы проекта: `app.js`, `cart.js`, `styles.css`, `components/site-shell.js`, `data/products-live.json`.
- Документация: `docs/roadmap-checklist.md`, `docs/ai-handoff/CURRENT_STATUS.md`, `docs/product-import.md`, `docs/backend-security.md`.
- Проверки: `package.json`, `tools/autofix.mjs`, `tools/ui-smoke.spec.js`, `tools/audit_catalog.py`.
- API/Backend: `api/_lib/store.js`, `api/_lib/auth.js`, `api/_lib/http.js`, `api/catalog.js`, `api/auth/me.js`, `api/orders.js`, `api/admin/orders.js`, `api/admin/users.js`, `api/admin/catalog.js`, `api/admin/content.js`.

## Verification
- Какие команды запускать перед финальным ответом: `npm.cmd run check`; для JS-изменений `node --check <file>`; для UI-изменений `npm.cmd run ui:smoke` или focused smoke.
- Что проверять вручную: затронутые страницы, product modal, header search, cart/account/admin flows по риску изменения.
- Что проверять после деплоя: affected production URL, `/api/health`, storage-ready signal, отсутствие visual regressions на ключевых страницах.

## Working Rule
1. Сначала читать `ACTIVE_CONTEXT.md`.
2. Потом `git status --short --branch`.
3. Затем открывать только файлы, нужные для текущей задачи.
4. Не читать весь старый чат без причины.
5. Не менять архитектуру проекта на основании сжатого контекста.
6. Если информации не хватает, сначала искать в handoff/docs, а не выдумывать.
