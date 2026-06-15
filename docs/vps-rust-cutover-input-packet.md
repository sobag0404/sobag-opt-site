# VPS/Rust Cutover Input Packet

Last updated: 2026-06-15

Use `local-import-output/vps-rust-cutover-packet.json` for cutover coordinates. The file is ignored by Git and must contain only public values, non-secret operational labels, paths, service names, or environment variable names. It must never contain credentials, connection strings, cookies, private keys, or raw `.env` values.

This packet is an input checklist for the VPS/Rust cutover agent. It is not the production secret store and it is not approval to cut over production traffic.

## Fill Process

1. Create local templates if the packet does not exist yet:

   ```powershell
   npm.cmd run prepare:goal-inputs
   ```

2. Open `local-import-output/vps-rust-cutover-packet.json` locally and replace every `TODO` value with a real non-secret value.
3. For any secret-backed value, write only the environment variable name that already exists in the secret store, for example `DATABASE_URL` or `SOBAG_S3_SECRET_ACCESS_KEY`.
4. Keep `productionCutoverApproved` set to `false` until a separate human cutover approval is recorded outside this packet.
5. Run the packet audit. Do not proceed while it reports missing fields, TODOs, secret-like values, or approval drift.

   ```powershell
   npm.cmd run audit:vps-rust-cutover-packet
   ```

6. Run the strict combined goal-input gate only after all local packets are real and no-secret:

   ```powershell
   npm.cmd run audit:goal-inputs -- --strict
   ```

## Required Fields

The audit currently validates these fields:

| Field | What to enter | Safe example |
| --- | --- | --- |
| `domain` | Public production domain. | `sobag-shop.online` |
| `vpsIp` | Public VPS IP. This is non-secret, but do not put credentials next to it. | `77.239.107.164` |
| `vpsHostAlias` | Local SSH alias or non-secret host label. Do not enter an IP if the team treats it as private. | `sobag-vps` |
| `healthUrl` | Public Node/current-service health endpoint. | `https://sobag-shop.online/api/health` |
| `sshHostEnvName` | Environment variable name containing the SSH host. | `VPS_HOST` |
| `sshUserEnvName` | Environment variable name containing the SSH user. | `VPS_USER` |
| `sshKeyEnvName` | Environment variable name or secret-store key name for the SSH private key. | `VPS_SSH_KEY` |
| `credentialAccessMode` | Non-secret access mode label. Use SSH key, local secret store, or interactive credential input outside Git/chat. | `ssh-key-or-secret-store` |
| `credentialRotationRequired` | Must be boolean `true` when a password was shared out-of-band and must be replaced or rotated. | `true` |
| `passwordStoredInRepo` | Must be boolean `false`. | `false` |
| `passwordPrintedInLogs` | Must be boolean `false`. | `false` |
| `sshUser` | Confirmed SSH username. Do not put the password in the packet. | `root` |
| `serverSidePreparationApproved` | Must be `true` before inventory, backup/quarantine, systemd/nginx prep, or deploy rehearsal. This is not DNS approval. | `true` |
| `serverSidePreparationScope` | Non-secret scope label for allowed server-side prep. | `inventory-backup-quarantine-systemd-nginx-deploy-prep` |
| `externalApprovalRef` | Non-secret approval reference. Do not paste passwords or chat secrets. | `confirmed-in-current-work-chat-2026-06-15-no-secret` |
| `linuxDistro` | VPS Linux distribution and release. | `Ubuntu 24.04 LTS` |
| `appDir` | Root application directory on the VPS. | `/opt/sobag-opt` |
| `deployPath` | Active release/deploy path on the VPS. | `/opt/sobag-opt` |
| `nodeServiceName` | Existing Node/systemd service name. | `sobag-opt` |
| `rustServiceName` | Rust/systemd service name. | `sobag-opt-rust` |
| `rustBinaryPath` | Absolute Rust binary path on the VPS. | `/opt/sobag-opt/shared/sobag-opt-rust` |
| `rustServicePath` | Absolute systemd unit file path. | `/etc/systemd/system/sobag-opt-rust.service` |
| `rustHealthUrl` | Rust health endpoint, preferably loopback if checked from the VPS. | `http://127.0.0.1:3001/api/health-rust` |
| `databaseUrlEnvName` | Environment variable name for the database URL. | `DATABASE_URL` |
| `sessionSecretEnvName` | Environment variable name for the session secret. | `SOBAG_SESSION_SECRET` |
| `jwtSecretEnvName` | Environment variable name for the JWT secret. | `SOBAG_JWT_SECRET` |
| `allowedOriginsEnvName` | Environment variable name for allowed origins. | `SOBAG_ALLOWED_ORIGINS` |
| `adminBootstrapEmailEnvName` | Environment variable name for the bootstrap admin email. | `SOBAG_ADMIN_EMAIL` |
| `adminBootstrapPasswordEnvName` | Environment variable name for the bootstrap admin password. | `SOBAG_ADMIN_PASSWORD` |
| `adminBootstrapReservedEmailGuard` | Must be boolean `true` to show the reserved admin guard is intentional. | `true` |
| `backupPath` | Absolute backup path on the VPS. | `/opt/sobag-opt/shared/backups` |
| `objectStorage.provider` | Must be exactly `s3-compatible`. | `s3-compatible` |
| `objectStorage.endpointEnvName` | Environment variable name for the S3-compatible endpoint. | `SOBAG_S3_ENDPOINT` |
| `objectStorage.bucketEnvName` | Environment variable name for the bucket. | `SOBAG_S3_BUCKET` |
| `objectStorage.regionEnvName` | Environment variable name for the region. | `SOBAG_S3_REGION` |
| `objectStorage.accessKeyIdEnvName` | Environment variable name for the access key ID. | `SOBAG_S3_ACCESS_KEY_ID` |
| `objectStorage.secretAccessKeyEnvName` | Environment variable name for the secret access key. | `SOBAG_S3_SECRET_ACCESS_KEY` |
| `objectStorage.publicBaseUrlEnvName` | Environment variable name for the public base URL. | `SOBAG_S3_PUBLIC_BASE_URL` |
| `rollbackCommand` | A rollback command or procedure name that does not print secrets. It should mention `nginx` or `systemctl`. | `sudo nginx -t && sudo systemctl reload nginx` |
| `requiredChecks` | Array of local/VPS checks required before cutover. Must include the exact required commands below. | see template |
| `productionCutoverApproved` | Must stay boolean `false` until separate approval. | `false` |
| `printsSecrets` | Must be boolean `false`. | `false` |

Environment variable names must be uppercase and match the audit format: `^[A-Z][A-Z0-9_]{2,}$`.

## Packet Shape

Use this shape as the target. Replace examples with the real non-secret values for the VPS, but keep all secret-backed fields as env names only.

```json
{
  "domain": "sobag-shop.online",
  "vpsIp": "77.239.107.164",
  "vpsHostAlias": "sobag-vps",
  "healthUrl": "https://sobag-shop.online/api/health",
  "sshHostEnvName": "VPS_HOST",
  "sshUserEnvName": "VPS_USER",
  "sshKeyEnvName": "VPS_SSH_KEY",
  "credentialAccessMode": "ssh-key-or-secret-store",
  "credentialRotationRequired": true,
  "passwordStoredInRepo": false,
  "passwordPrintedInLogs": false,
  "sshUser": "root",
  "serverSidePreparationApproved": true,
  "serverSidePreparationScope": "inventory-backup-quarantine-systemd-nginx-deploy-prep",
  "externalApprovalRef": "confirmed-in-current-work-chat-2026-06-15-no-secret",
  "linuxDistro": "Ubuntu 24.04 LTS",
  "appDir": "/opt/sobag-opt",
  "deployPath": "/opt/sobag-opt",
  "nodeServiceName": "sobag-opt",
  "rustServiceName": "sobag-opt-rust",
  "rustBinaryPath": "/opt/sobag-opt/shared/sobag-opt-rust",
  "rustServicePath": "/etc/systemd/system/sobag-opt-rust.service",
  "rustHealthUrl": "http://127.0.0.1:3001/api/health-rust",
  "databaseUrlEnvName": "DATABASE_URL",
  "sessionSecretEnvName": "SOBAG_SESSION_SECRET",
  "jwtSecretEnvName": "SOBAG_JWT_SECRET",
  "allowedOriginsEnvName": "SOBAG_ALLOWED_ORIGINS",
  "adminBootstrapEmailEnvName": "SOBAG_ADMIN_EMAIL",
  "adminBootstrapPasswordEnvName": "SOBAG_ADMIN_PASSWORD",
  "adminBootstrapReservedEmailGuard": true,
  "backupPath": "/opt/sobag-opt/shared/backups",
  "objectStorage": {
    "provider": "s3-compatible",
    "endpointEnvName": "SOBAG_S3_ENDPOINT",
    "bucketEnvName": "SOBAG_S3_BUCKET",
    "regionEnvName": "SOBAG_S3_REGION",
    "accessKeyIdEnvName": "SOBAG_S3_ACCESS_KEY_ID",
    "secretAccessKeyEnvName": "SOBAG_S3_SECRET_ACCESS_KEY",
    "publicBaseUrlEnvName": "SOBAG_S3_PUBLIC_BASE_URL"
  },
  "rollbackCommand": "sudo nginx -t && sudo systemctl reload nginx",
  "requiredChecks": [
    "npm.cmd run check",
    "python tools/project_readiness_agent/run.py",
    "cd rust-server && cargo check --locked",
    "cd rust-server && cargo test --locked"
  ],
  "productionCutoverApproved": false,
  "printsSecrets": false
}
```

## Safe To Share In Chat

- field names;
- public domain and public health URLs;
- service names;
- non-secret paths;
- Linux distribution and release;
- env variable names, as names only;
- pass/fail check results;
- rollback procedure names;
- sanitized excerpts of `systemctl status` or logs after removing headers, tokens, cookies, and env values.

## Never Share

- SSH private keys;
- SSH host/user values if the team treats them as private; use `sshHostEnvName` and `sshUserEnvName` instead;
- passwords;
- access keys;
- DB connection URLs;
- session/JWT secrets;
- cookies;
- raw `.env` values;
- private bucket URLs if they embed credentials;
- bearer tokens, basic-auth URLs, signed URLs, or presigned upload/download links;
- full `systemctl show`, process environment, shell history, or command output that includes env values.

The current VPS public IP is `77.239.107.164`. A password was provided outside this repository context and must not be copied into Markdown, reports, Git, shell commands, shell history, prompts, or logs. Prefer SSH key access; otherwise use a local secret store or interactive prompt outside the repo. After cutover, replace or rotate password-based access and keep `credentialRotationRequired` set to `true` until that is complete.

## Fill Checklist

- [ ] `local-import-output/vps-rust-cutover-packet.json` exists locally and is ignored by Git.
- [ ] No field contains `TODO`.
- [ ] No field contains an SSH key, password, token, cookie, database URL, signed URL, or raw `.env` value.
- [ ] `vpsIp` is recorded as `77.239.107.164`, while credentials stay only in SSH keys, secret store, or interactive input.
- [ ] Every `*EnvName` field contains only an uppercase environment variable name.
- [ ] `credentialAccessMode` is a label only; it does not contain a password or key.
- [ ] `credentialRotationRequired` is `true` until password access is replaced or rotated.
- [ ] `passwordStoredInRepo` and `passwordPrintedInLogs` are both `false`.
- [ ] `sshUser` is `root`, with no password value stored in the packet.
- [ ] `serverSidePreparationApproved` is `true`; `productionCutoverApproved` remains `false` until just-in-time traffic cutover approval.
- [ ] `objectStorage.provider` is exactly `s3-compatible`.
- [ ] `adminBootstrapReservedEmailGuard` is `true`.
- [ ] `productionCutoverApproved` is `false`.
- [ ] `printsSecrets` is `false`.
- [ ] `requiredChecks` includes at least these required baseline commands:
  - `npm.cmd run check`
  - `python tools/project_readiness_agent/run.py`
  - `cd rust-server && cargo check --locked`
  - `cd rust-server && cargo test --locked`
- [ ] `rollbackCommand` is a safe command/procedure that does not echo env values and references `nginx` or `systemctl`.
- [ ] Local packet audit passes.
- [ ] Strict combined goal-input audit passes only after the other local input packets are also complete.

## Local Verification Commands

Create missing local templates:

```powershell
npm.cmd run prepare:goal-inputs
```

Audit the VPS/Rust cutover packet:

```powershell
npm.cmd run audit:vps-rust-cutover-packet
```

Show machine-readable audit details when debugging a packet failure:

```powershell
npm.cmd run audit:vps-rust-cutover-packet -- --json
```

Run the strict combined gate only after every local packet is real and no-secret:

```powershell
npm.cmd run audit:goal-inputs -- --strict
```

Required local project checks before asking for cutover review:

```powershell
npm.cmd run check
python tools/project_readiness_agent/run.py
```

Optional local Rust checks when the Windows Rust toolchain is installed:

```powershell
Set-Location rust-server
cargo check --locked
cargo test --locked
Set-Location ..
```

Local Windows `cargo check --locked` may fail if MSVC `link.exe` is missing. That is an environment blocker; verify through Linux/VPS/CI or install Visual Studio Build Tools with the C++ toolchain before treating it as a code failure.

## VPS Verification Commands

Run these on the VPS or in Linux CI. They must not print secrets.

```bash
cd /opt/sobag-opt/rust-server
cargo check --locked
cargo test --locked
```

Confirm service and health wiring without dumping environment values:

```bash
sudo systemctl status sobag-opt --no-pager
sudo systemctl status sobag-opt-rust --no-pager
curl --fail --silent --show-error https://sobag-shop.online/api/health
curl --fail --silent --show-error http://127.0.0.1:3001/api/health-rust
sudo nginx -t
```

If service names, ports, or paths differ from the examples, use the values recorded in the packet. Do not run `systemctl show`, `env`, `printenv`, `cat .env`, or commands that echo secrets into chat or logs.

## Strict Gate Expectations

The VPS/Rust packet gate passes only when:

- the packet exists at `local-import-output/vps-rust-cutover-packet.json`;
- every required field is present and non-empty;
- no scalar value matches the audit's secret-like patterns, including private keys, long opaque base64-like strings, database URLs with credentials, or URLs with embedded basic auth;
- no value starts with `TODO`;
- every present `*EnvName` field is an env variable name, not the secret value;
- `objectStorage.provider` is exactly `s3-compatible`;
- `requiredChecks` includes `npm.cmd run check`, `python tools/project_readiness_agent/run.py`, `cd rust-server && cargo check --locked`, and `cd rust-server && cargo test --locked`;
- `credentialRotationRequired` is `true`;
- `passwordStoredInRepo` is `false`;
- `passwordPrintedInLogs` is `false`;
- `serverSidePreparationApproved` is `true`;
- `adminBootstrapReservedEmailGuard` is `true`;
- `productionCutoverApproved` is `false`;
- `printsSecrets` is `false`.

The combined strict gate, `npm.cmd run audit:goal-inputs -- --strict`, also requires the final-content, object-storage, catalog DB, and CWV field packets to be complete. A VPS/Rust packet can be ready while the combined gate still fails because another packet is pending.
