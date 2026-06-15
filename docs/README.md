# Sobag Opt Documentation Index

Use this index for active implementation work. Older files under `docs/ai-handoff/` can contain historical Vercel-era notes; current deployment and runtime authority is VPS-only.

## Active Runtime And Deploy

- `docs/vps-rust-runtime-map.md` - current Node/VPS, Rust, compatibility, storage, and rollback ownership.
- `docs/vps-launch-runbook.md` - VPS launch and rollback checklist.
- `docs/vps-migration-notes.md` - VPS migration notes and current target-state.
- `docs/deploy-checklist.md` - deploy verification checklist.
- `docs/rust-deploy-runbook.md` - Rust build and VPS verification notes.

## Security, Storage, And Operations

- `docs/backend-security.md` - backend auth, headers, env, and role guardrails.
- `docs/object-storage.md` - S3-compatible/MinIO/R2 object storage target.
- `docs/object-storage-env-packet.md` - no-secret storage env packet shape.
- `docs/photo-storage-cutover-runbook.md` - photo storage migration/cutover procedure.
- `docs/access-audit.md` - API access matrix and audit notes.
- `docs/error-log-review.md` - API error-log review workflow.

## Product And Data Workflows

- `docs/product-import.md` - import/PIM workflow notes.
- `docs/catalog-db-apply-plan.md` - PostgreSQL catalog apply plan.
- `docs/object-storage-apply-plan.md` - object storage apply plan.
- `docs/goal-inputs-packet.md` - required no-secret inputs for final readiness.

## Handoff And Readiness

- `docs/ai-handoff/ACTIVE_CONTEXT.md` - short active handoff context.
- `docs/ai-handoff/CURRENT_STATUS.md` - longer current status snapshot.
- `docs/project-readiness-agent.md` - readiness-agent operation and extension notes.
- `reports/project-readiness/latest.md` - full readiness report.
- `reports/project-readiness/latest-chat.md` - short GoAL/start prompt.
