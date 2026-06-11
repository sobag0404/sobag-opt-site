# Rust Deploy Runbook

Last updated: 2026-06-11

Purpose: keep the first Rust catalog slice deployable on the current VPS without removing Node.js.

## Current Shape

- Node.js stays the main application runtime on `127.0.0.1:3000`.
- Rust Axum runs as `sobag-opt-rust` under systemd on `127.0.0.1:3001`.
- Nginx routes only these public paths to Rust:
  - `/api/catalog-query`
  - `/api/catalog-detail`
- Node remains the fallback for all other routes and data workflows.

## Automated Deploy

The `vps-deploy` workflow now:

1. Checks out the exact green `main` commit.
2. Installs production Node dependencies.
3. Runs `cargo test --locked` in `rust-server/`.
4. Runs `cargo build --release --locked` in `rust-server/`.
5. Activates the Node release and verifies `http://127.0.0.1:3000/api/health`.
6. Backs up the previous Rust binary to `/opt/sobag-opt/shared/sobag-opt-rust.previous`.
7. Installs the new binary to `/opt/sobag-opt/shared/sobag-opt-rust`.
8. Writes/refreshes `/etc/systemd/system/sobag-opt-rust.service`.
9. Restarts `sobag-opt-rust`.
10. Verifies `http://127.0.0.1:3001/api/health-rust`.
11. Runs Node-vs-Rust shadow comparison on the VPS.

If the new Rust binary fails restart or health, the workflow restores the previous binary and fails the deploy.

## Manual Checks

```bash
systemctl is-active sobag-opt-rust
curl -fsS http://127.0.0.1:3001/api/health-rust
node /opt/sobag-opt/current/tools/rust-catalog-shadow-smoke.mjs --node-base http://127.0.0.1:3000 --rust-base http://127.0.0.1:3001
```

From local machine:

```bash
npm.cmd run smoke:prod -- --base-url https://sobag-shop.online
npm.cmd run smoke:prod:performance -- --base-url https://sobag-shop.online
```

## Route Rollback To Node

Use only if Rust catalog routes are unhealthy and the previous binary cannot be restored.

1. Edit `/etc/nginx/sites-available/sobag-opt`.
2. Remove or comment the exact locations for:
   - `location = /api/catalog-query`
   - `location = /api/catalog-detail`
3. Keep the generic `location /` proxy to `sobag_opt_app`.
4. Validate and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS https://sobag-shop.online/api/catalog-query?pageSize=2
```

After rollback, keep `sobag-opt-rust` stopped or running separately for debugging. Do not change production data during rollback.

## Next Stage

After this deploy path stays green, the next migration stage is SSR/HTMX for `/catalog`, `/search`, and product detail on top of Rust.
