# VPS Launch Runbook

Last updated: 2026-06-09

Цель: безопасно поднять Sobag Opt на VPS, не меняя production data, DNS, Vercel env/cache/user data и не ломая Vercel fallback.

## Границы

- Не переносить и не удалять production data без отдельного подтверждения.
- Не коммитить `.env`, токены, пароли, cookies, SSH-ключи, дампы БД, raw/bulk фото.
- Vercel fallback остается на Redis/KV и не переводится на `SOBAG_STORE_PROVIDER=file`.
- DNS cutover делать только отдельным шагом после зеленых проверок на VPS URL.

## Перед VPS

Локально:

```bash
git status --short --branch
npm.cmd run check
npm.cmd run ui:smoke
npm.cmd run audit:vps-release
```

Если планируется перенос локального file-store каталога, сначала сделать backup:

```bash
npm.cmd run backup:store -- --source .sobag-store --dest sobag-store-backups
```

`sobag-store-backups/` игнорируется Git. Не добавлять архивы данных в репозиторий.

## Подготовка VPS

На сервере нужны Node.js 20+, Git, reverse proxy с TLS и отдельные директории данных:

```bash
sudo mkdir -p /opt/sobag-opt /var/lib/sobag-opt/store /var/backups/sobag-opt
sudo chown -R "$USER":"$USER" /opt/sobag-opt /var/lib/sobag-opt/store /var/backups/sobag-opt
cd /opt/sobag-opt
git clone https://github.com/sobag0404/sobag-opt-site.git .
git checkout main
npm ci
```

Env хранить только на сервере. Значения ниже являются именами переменных, не готовым `.env` для коммита:

```bash
SOBAG_STORE_PROVIDER=file
SOBAG_FILE_STORE_DIR=/var/lib/sobag-opt/store
SOBAG_ADMIN_EMAIL=<set-on-server>
SOBAG_ADMIN_PASSWORD=<set-on-server>
SOBAG_OBJECT_STORAGE_PROVIDER=s3-compatible
SOBAG_S3_ENDPOINT=<set-on-server>
SOBAG_S3_BUCKET=<set-on-server>
SOBAG_S3_REGION=<set-on-server>
SOBAG_S3_ACCESS_KEY_ID=<set-on-server>
SOBAG_S3_SECRET_ACCESS_KEY=<set-on-server>
SOBAG_S3_PUBLIC_BASE_URL=<set-on-server>
PORT=3000
HOST=127.0.0.1
```

## Проверка До Запуска

На VPS:

```bash
npm run preflight:vps
npm run smoke:vps
npm run smoke:vps:write
```

`preflight:vps` печатает только безопасные статусы. Если он падает, не запускать публичный cutover.

## Запуск

Минимальная команда:

```bash
npm run start:vps
```

В production запускать через process manager/systemd, а наружу отдавать через Nginx/Caddy:

- app слушает `127.0.0.1:3000`;
- reverse proxy отвечает за TLS, gzip/brotli, лимиты размера запроса и access logs;
- `/api/health` должен возвращать `ok=true` и `store.provider=file`.

## Проверка VPS URL

До DNS cutover проверить временный домен или IP через reverse proxy:

```bash
npm.cmd run smoke:prod -- --base-url https://vps-preview.example
```

Проверить вручную:

- главная, каталог, поиск, карточка товара;
- корзина и отправка тестовой заявки;
- вход администратора;
- админка заказов и товаров;
- `/api/health`.

## Cutover

Делать отдельным подтвержденным шагом:

1. Backup текущего VPS file-store.
2. Финальный `npm run preflight:vps`.
3. Финальный smoke по VPS URL.
4. DNS переключение.
5. `npm.cmd run smoke:prod -- --base-url https://sobag-shop.online`.
6. Проверка fallback: `npm.cmd run smoke:prod -- --base-url https://sobag-opt-site.vercel.app`.

## Rollback

Если после cutover есть критическая ошибка:

1. Вернуть DNS на прежний target или fallback.
2. Не менять данные в панике.
3. Снять логи reverse proxy/app.
4. При повреждении file-store восстановить только подтвержденный backup:

```bash
npm run backup:store -- --restore /var/backups/sobag-opt/store-YYYYMMDDTHHMMSSZ --target /var/lib/sobag-opt/store --force
```

5. Повторить `npm run smoke:vps` и `npm run smoke:vps:write`.

## Фото И Каталог

До реальной миграции фото на S3-compatible storage публичный каталог может продолжать использовать текущие static/legacy image URL.

Перед публикацией migrated image catalog:

```bash
node tools/image-metadata-audit.mjs --products local-import-output/products-with-object-images.json --published-only --require-metadata --require-responsive --require-square
```

Raw/bulk фото и `local-import-output/` не добавлять в Git.

## Rust Catalog Slice

Current VPS keeps Node.js as the main runtime and runs Rust only for catalog read routes:

- Node: `127.0.0.1:3000`
- Rust systemd service: `sobag-opt-rust` on `127.0.0.1:3001`
- Nginx Rust routes: `/api/catalog-query`, `/api/catalog-detail`

Deploy is handled by `.github/workflows/vps-deploy.yml`: it builds `rust-server`, restarts the systemd service, verifies `/api/health-rust`, and runs shadow comparison against Node. Detailed rollback steps are in `docs/rust-deploy-runbook.md`.
