# Goal Inputs Packet

Last updated: 2026-06-10

The active Sobag Opt goal still depends on real external inputs. Do not invent these values and do not commit them if they contain secrets.

The expected local files live under ignored `local-import-output/`:

- `final-content-packet.json` for confirmed company, phone, legal address, production address, schedule, and Yandex map URLs.
- `object-storage-env-packet.json` for public, no-secret S3-compatible/MinIO/R2 readiness confirmation.
- `catalog-db-env-packet.json` for no-secret PostgreSQL test/staging DB readiness confirmation.
- `cwv-field-audit-packet.json` for final 10k+ catalog field measurements after real photos are migrated.
- `vps-rust-cutover-packet.json` for no-secret VPS/Rust cutover coordinates: domain, health URLs, service names, deploy path, rollback command, and secret environment variable names only.

Detailed VPS/Rust packet schema and safe-share rules: `docs/vps-rust-cutover-input-packet.md`.

Run the combined non-strict status check:

```powershell
npm.cmd run audit:goal-inputs
```

Create local starter templates when you are ready to fill the real values:

```powershell
npm.cmd run prepare:goal-inputs
```

The command writes only ignored local files and does not overwrite existing packets unless run with `-- --force`.

Run the strict gate only when all local packets are created:

```powershell
npm.cmd run audit:goal-inputs -- --strict
```

Rules:

- keep packet files out of Git;
- do not include passwords, tokens, connection URLs, cookies, or private keys;
- keep production runtime toggles disabled until there is a separate approval;
- store only secret variable names such as `VPS_SSH_KEY`, `DATABASE_URL`, and `SOBAG_S3_SECRET_ACCESS_KEY`; never store the values;
- include rollback and health-check commands that can be run without printing env values;
- include only environment variable names for SSH, DB, object storage, session/JWT, allowed origins, and admin bootstrap values;
- include the VPS Linux distribution, deploy path, backup path, Rust binary path, and systemd service path as non-secret coordinates;
- final Core Web Vitals must be measured on `https://sobag-shop.online` after real migrated WebP/AVIF product images and realistic catalog scale.
