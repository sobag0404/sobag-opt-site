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
- Локальный запуск: `npm run dev:static` для легкой верстки без API; `npm run dev:vercel` только для Vercel Functions/env проверок.

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
- Текущий проход 2026-06-04: готов первый backend-срез фото-хранилища. Добавлен `api/_lib/object-storage.js` с provider switch, Vercel Blob provider, S3-compatible placeholder и interface `upload/getPublicUrl/deleteOrMarkUnused/listByProduct`; добавлен `/api/admin/product-images` для ролей `admin/content`; `/api/health` показывает безопасный objectStorage status; продукты сохраняют `images` metadata (`url/storageKey/provider/width/height/mime/uploadedAt`) рядом со старыми `image/gallery`; валидатор допускает remote URL и проверяет metadata; `.gitignore` усилен для bulk/raw photo folders.
- Текущий проход 2026-06-04: готов первый срез Import Batches 2.0. Добавлен `/api/admin/import-batches` для ролей `admin/content`, отдельное хранение партий, preview без изменения каталога, отчет created/skipped/updated/errors, проверки дублей `baseSku` и variant SKU, apply со snapshot каталога, rollback только последней примененной партии, а в `admin-import.html` появились карточки партий, кнопки применить/отклонить/откатить/скачать CSV. CSV в браузере теперь читается встроенным parser fallback без зависимости от внешнего XLSX CDN.
- Текущий проход 2026-06-04: готов первый срез Import/PIM 2.0 - статусы публикации товаров `draft/published/hidden/archive` во фронтенде, админке, API, локальном импортере и шаблонах. Публичный `/api/catalog` отдает только `published`, новые импорты по умолчанию становятся `draft`, полные проверки `npm.cmd run check` и `npm.cmd run ui:smoke` прошли.
- Последние важные изменения: добавлена CRM-лента по заказам: внутренние комментарии менеджеров, комментарии видимые покупателю, сообщения покупателя по заказу, фильтрация внутренних записей из покупательских API, клиентская панель в админском списке заказов с сегментами; сохраненные КП 2.1 и отзывы товаров уже реализованы ранее.
- Локальная RAM-правка: осиротевшие `vercel dev --listen 4173` и `@vercel/node/dist/dev-server.mjs` процессы были точечно остановлены; добавлен легкий `tools/static-server.mjs` и npm scripts `dev:static`/`dev:vercel`.
- Последние коммиты до handoff: `7788c84 Protect internal saved quote notes`, `5fb959e Add saved quote workspace`, `c252c4c Add product reviews workflow`.
- Что уже проверено в текущем проходе: `node --check app.js`; `node --check api/admin/orders.js`; `node --check api/orders.js`; `node --check api/auth/me.js`; `node --check tools/autofix.mjs`; `node --check tools/ui-smoke.spec.js`; `npm.cmd run check`; focused smoke `manager order|account favorites`; focused smoke `mobile pages`.
- Важно: `npm.cmd run check` теперь не падает без установленного Python, но явно пропускает Python syntax checks; на новом устройстве желательно установить Python и вернуть полную проверку импортеров.

## Current Next Work
- Следующая задача после первого storage adapter: подключить admin/bulk photo upload flow к `/api/admin/product-images`, добавить отчет upload preview/success/fail/missing/repeated image, затем расширить import batches на явный `updateExisting` режим в UI.
- Следующий PIM шаг: нормализованный payload product/variant/images/tags/categories/collections/holidays/import batch metadata, публичный `/api/catalog` только для `published`.
- Риски: не удалить старые товары без команды, не создать дубли по `baseSku`, не сломать текущий каталог, цены, варианты, реальные фото и импортный workflow.

## Useful Files
- Главные файлы проекта: `app.js`, `cart.js`, `styles.css`, `components/site-shell.js`, `data/products-live.json`.
- Документация: `docs/roadmap-checklist.md`, `docs/ai-handoff/CURRENT_STATUS.md`, `docs/product-import.md`, `docs/object-storage.md`, `docs/backend-security.md`.
- Проверки: `package.json`, `tools/autofix.mjs`, `tools/ui-smoke.spec.js`, `tools/audit_catalog.py`.
- API/Backend: `api/_lib/store.js`, `api/_lib/auth.js`, `api/_lib/http.js`, `api/_lib/object-storage.js`, `api/catalog.js`, `api/auth/me.js`, `api/orders.js`, `api/admin/orders.js`, `api/admin/users.js`, `api/admin/catalog.js`, `api/admin/content.js`, `api/admin/product-images.js`.

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
