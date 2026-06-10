# Object Storage Env Packet

Last updated: 2026-06-10

Цель: перед реальной миграцией фото подтвердить параметры object storage без публикации секретов в Git, чат, логи или screenshots.

## Где Готовить

Локальный файл, не коммитить:

```text
local-import-output/object-storage-env-packet.json
```

## Структура

```json
{
  "provider": "s3-compatible",
  "endpoint": "https://example.storage.endpoint",
  "bucket": "sobag-products",
  "region": "auto",
  "publicBaseUrl": "https://cdn.example.ru/sobag-products",
  "forcePathStyle": true,
  "credentialsConfirmed": true,
  "publicReadConfirmed": true,
  "corsConfirmed": true
}
```

Для Vercel Blob:

```json
{
  "provider": "vercel-blob",
  "credentialsConfirmed": true,
  "publicReadConfirmed": true
}
```

## Проверка

```powershell
npm.cmd run audit:object-storage-packet -- --packet local-import-output/object-storage-env-packet.json --strict
```

Без `--strict` команда работает как readiness report и не падает, если пакет еще не создан.

## Правила

- Не указывать access key, secret key, token, connection string или `.env` значения.
- `provider=s3-compatible` требует endpoint, bucket, publicBaseUrl и подтверждения public read/CORS.
- `provider=vercel-blob` требует только подтверждения credentials/public read.
- После подтверждения provider/env запускать `npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online --require-object-storage`.
