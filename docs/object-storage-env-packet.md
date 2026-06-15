# Object Storage Env Packet

Last updated: 2026-06-15

Purpose: confirm S3-compatible object storage settings before real photo migration without publishing secrets in Git, chat, logs, or screenshots.

This packet is for product photos/media only. VPS app/session/order data can use the local file store through `SOBAG_STORE_PROVIDER=file` and `SOBAG_FILE_STORE_DIR`; that does not replace the current product-photo object-storage adapter.

Local file, never commit:

```text
local-import-output/object-storage-env-packet.json
```

Required no-secret structure:

```json
{
  "provider": "s3-compatible",
  "endpoint": "https://example.storage.endpoint",
  "bucket": "sobag-products",
  "region": "auto",
  "publicBaseUrl": "https://cdn.example.test/sobag-products",
  "forcePathStyle": true,
  "credentialsConfirmed": true,
  "publicReadConfirmed": true,
  "corsConfirmed": true
}
```

Check:

```powershell
npm.cmd run audit:object-storage-packet -- --packet local-import-output/object-storage-env-packet.json --strict
```

Rules:

- Do not include access keys, secret keys, tokens, connection strings, or `.env` values.
- Only `provider=s3-compatible` is accepted for the active VPS target.
- After provider/env confirmation, run `npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online --require-object-storage`.
