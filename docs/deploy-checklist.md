# Deploy Checklist

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

На устройстве, где `npm.cmd` недоступен, использовать bundled Node/Python из handoff.

## После Deploy

GitHub Actions workflow `.github/workflows/production-smoke.yml` запускается после успешного `autofix-check` для push в `main`.
Он делает live production smoke с retry, чтобы дождаться асинхронного Vercel deploy.

Этот же workflow можно запустить вручную через `workflow_dispatch` и передать fallback/preview URL.

Production smoke является read-only: он делает только `GET`-запросы к публичным URL и не использует Vercel API.

```bash
npm.cmd run smoke:prod
```

По умолчанию проверяются:

- `https://sobag-shop.online/`
- `https://sobag-shop.online/catalog`
- `https://sobag-shop.online/cart`
- `https://sobag-shop.online/api/health`

Для fallback или preview URL:

```bash
npm.cmd run smoke:prod -- --base-url https://sobag-opt-site.vercel.app
```

Для отдельного пути:

```bash
npm.cmd run smoke:prod -- --path /api/health
```

Офлайн-проверка самого smoke-скрипта:

```bash
npm.cmd run smoke:prod:self-test
```
