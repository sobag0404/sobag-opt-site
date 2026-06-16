# Synthetic CWV / Scale Evidence

Status: accepted as transition readiness evidence, not field data.

Structured evidence:
- `reports/project-readiness/synthetic-cwv-evidence.json`

Scope:
- Domain: `https://sobag-shop.online`
- Commit baseline: `3a3dad4` and later; readiness finalized at `633745d` and later
- Deploy target: VPS only
- Runtime target: Rust-first with current Node fallback

Verified external gates, 2026-06-16:
- `autofix-check`: PASS, run `27601300541`
- `rust-check`: PASS, run `27601300644`
- `vps-deploy`: PASS, run `27601339072`
- `production-smoke`: PASS, run `27601476435`
- `https://sobag-shop.online/`: 200
- `https://sobag-shop.online/index.html`: 301 to `/`

Local synthetic/performance gates:
- `node tools/catalog-query-scale-smoke.mjs`: PASS, 10000 products, 48-card pages
- `npm.cmd run audit:cwv`: PASS, bundle and static/CWV readiness budgets passed
- `npm.cmd run smoke:prod:performance -- --self-test`: PASS
- `npm.cmd run check`: PASS

Decision:
- Real field CWV is not available and must not be represented as field data.
- Synthetic 10k catalog and performance evidence is sufficient for the Rust/VPS transition readiness decision after successful deploy and production smoke gates.
- Real field CWV remains a post-launch monitoring item in `local-import-output/cwv-field-audit-packet.json`.
