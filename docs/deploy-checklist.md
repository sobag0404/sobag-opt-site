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

`npm.cmd run check` включает offline-аудит SEO/content и VPS/Vercel fallback готовности: публичные тексты без старых test/prototype/Tilda/placeholder формулировок, обязательные runtime-файлы, package scripts, ignore-правила для секретов/local output/raw фото и отсутствие запрещенных tracked artifacts.

На устройстве, где `npm.cmd` недоступен, использовать bundled Node/Python из handoff.

## После Deploy

GitHub Actions workflow `.github/workflows/production-smoke.yml` запускается после успешного `vps-deploy` для push в `main`.
VPS деплоится после каждого зеленого push в `main`. Vercel fallback через Git integration ограничен `ignoreCommand`: по умолчанию строится первый push за день по МСК; срочный fallback deploy можно принудить commit message с `[vercel]`, `[fallback]` или `[force-vercel]`.

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

Если production smoke упал, использовать runbook `docs/error-log-review.md`.

Для VPS запуска и cutover использовать `docs/vps-launch-runbook.md`.
