# Goal Completion Audit

Last updated: 2026-06-11

Use this as the final gate before claiming the active four-upgrade goal is complete.

```powershell
npm.cmd run audit:goal-completion
```

Strict mode fails while any required real input or gate is missing:

```powershell
npm.cmd run audit:goal-completion -- --strict
```

The audit combines:

- `audit:goal-readiness`
- `audit:goal-inputs`
- apply plan coverage for final content, object storage, catalog DB, and CWV field audit

It must stay pending until all four external packets are real and strict-ready:

- `local-import-output/final-content-packet.json`
- `local-import-output/object-storage-env-packet.json`
- `local-import-output/catalog-db-env-packet.json`
- `local-import-output/cwv-field-audit-packet.json`

When it finally reports complete, remind the user about point 5: the future no-Node migration to Rust Axum + HTMX/templates + PostgreSQL + Redis + Meilisearch + MinIO/S3 + Docker/systemd + Nginx.
