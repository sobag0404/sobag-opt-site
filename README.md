# Sobag Opt Site

Sobag Opt is a B2B storefront for wholesale textile products with print/custom-order workflows.

## Current Runtime

- Static HTML/CSS/JS storefront.
- Node.js API on the VPS through `server.mjs`, `api-router.js`, and `server-routes/`.
- Legacy Vercel-style `api/` compatibility wrappers are retired; `server-routes/` is the active Node/VPS API authority.
- Rust migration work lives in `rust-server/` with smoke/audit scripts under `tools/`.
- Next.js runtime is absent; the migration target is VPS/Rust, not Next.js.
- Vercel deploy/runtime is not used; Vercel references in old handoff logs are historical unless explicitly re-enabled.

## Key Commands

```powershell
npm run check
npm run dev:static
npm run start:vps
python tools/project_readiness_agent/run.py
```

Use `npm run ui:smoke` before UI-sensitive release or cutover work.

## Handoff And Readiness

- Active context: `docs/ai-handoff/ACTIVE_CONTEXT.md`
- Current status: `docs/ai-handoff/CURRENT_STATUS.md`
- Readiness agent docs: `docs/project-readiness-agent.md`
- VPS/Rust runtime map: `docs/vps-rust-runtime-map.md`
- Full readiness report: `reports/project-readiness/latest.md`
- New GoAL chat prompt: `reports/project-readiness/latest-chat.md`

The current product direction is to finish the Rust/no-Node transition only through reviewed shadow/parity/cutover gates with a rollback path. Do not commit secrets, `.env` values, production data, raw photo dumps, or private credentials.
