# Deploy Checklist

Last updated: 2026-06-11

Короткий чеклист для безопасного push/deploy Sobag Opt.

## Перед Push

- Не добавлять секреты, `.env`, токены, cookies, дампы БД, SSH-ключи.
- Не добавлять raw/bulk фото и локальные импортные папки.
- Не трогать production env/cache/user data без отдельного подтверждения.
- Проверить локально:

```bash
npm.cmd run check
npm.cmd run ui:smoke
```

`npm.cmd run check` включает offline-аудит SEO/content и VPS-ready состояния: публичные тексты без старых test/prototype/Tilda/placeholder формулировок, обязательные runtime-файлы, package scripts, ignore-правила для секретов/local output/raw фото и отсутствие запрещенных tracked artifacts.

## После Deploy

GitHub Actions workflow `.github/workflows/production-smoke.yml` запускается после успешного `vps-deploy` для push в `main`.

VPS деплоится после каждого зеленого push в `main`.

Vercel deploy отключен: `tools/vercel-daily-deploy-gate.mjs` всегда возвращает skip, commit markers больше не включают Vercel build. Не проверять и не деплоить Vercel без отдельной явной команды пользователя.

Workflow можно запустить вручную через `workflow_dispatch`, передавая production VPS URL.

Production smoke является read-only: он делает только `GET`-запросы к публичным URL и не использует Vercel API.

```bash
npm.cmd run smoke:prod -- --base-url https://sobag-shop.online
npm.cmd run smoke:prod:performance -- --base-url https://sobag-shop.online
npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online
```

Rust catalog API is deployed by the same VPS workflow: it runs `cargo test --locked`, builds `rust-server`, restarts `sobag-opt-rust`, checks `/api/health-rust`, and runs `npm run smoke:rust:shadow` equivalent on the VPS. If Rust restart/health fails, the workflow restores the previous Rust binary and fails the deploy.

По умолчанию проверяются:

- `https://sobag-shop.online/`
- `https://sobag-shop.online/catalog`
- `https://sobag-shop.online/cart`
- `https://sobag-shop.online/api/health`

## После Реального Cutover

Для photo storage или catalog DB strict-флаги включать только после отдельного подтверждения:

```bash
npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online --require-object-storage
npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online --require-catalog-db
```
