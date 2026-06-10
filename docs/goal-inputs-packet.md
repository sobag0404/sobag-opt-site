# Goal Inputs Packet

Last updated: 2026-06-10

The active Sobag Opt goal still depends on real external inputs. Do not invent these values and do not commit them if they contain secrets.

The expected local files live under ignored `local-import-output/`:

- `final-content-packet.json` for confirmed company, phone, legal address, production address, schedule, and Yandex map URLs.
- `object-storage-env-packet.json` for public, no-secret S3-compatible or Vercel Blob readiness confirmation.
- `catalog-db-env-packet.json` for no-secret PostgreSQL test/staging DB readiness confirmation.
- `cwv-field-audit-packet.json` for final 10k+ catalog field measurements after real photos are migrated.

Run the combined non-strict status check:

```powershell
npm.cmd run audit:goal-inputs
```

Run the strict gate only when all local packets are created:

```powershell
npm.cmd run audit:goal-inputs -- --strict
```

Rules:

- keep packet files out of Git;
- do not include passwords, tokens, connection URLs, cookies, or private keys;
- keep production runtime toggles disabled until there is a separate approval;
- final Core Web Vitals must be measured on `https://sobag-shop.online` after real migrated WebP/AVIF product images and realistic catalog scale.
