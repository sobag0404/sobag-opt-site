Next implementation packet:
1. Verify GitHub Actions for commit `3fa61ef`: `autofix-check`, `rust-check`, `vps-deploy`, and `production-smoke`. Local `gh` token is invalid and shell network is blocked here, so use public Actions UI/API or re-authenticated `gh`.
2. Verify live VPS/domain after deploy: `npm.cmd run smoke:canonical-url -- --base-url https://sobag-shop.online --json`, production smoke, storage readiness, performance smoke, `/api/health`, Rust health, and rollback readiness.
3. Re-verify Rust on Linux/VPS/CI with `cd rust-server && cargo fmt --check && cargo check --locked && cargo test --locked`; local Windows remains environment-limited by missing MSVC linker and blocked crates.io.
4. Keep Vercel/Next absent from active runtime/deploy; rerun VPS release, storage, error, content/SEO, and canonical URL audits after each cutover step.
5. Fill `local-import-output/cwv-field-audit-packet.json` only from real post-migration field measurements after realistic 10k+ catalog scale, then run strict goal-input and goal-completion gates.
6. Continue only small functional/modularity slices when they do not slow the Rust/VPS critical path.

Status: NOT_READY. Score: 74/100.
Completed locally: canonical URL cleanup committed/pushed (`3fa61ef`), Unity-bundled Python readiness tests/run passed, `npm.cmd run check` passed.
Blockers: PROD-002 real CWV field packet is incomplete; live GitHub/VPS checks are blocked from this shell by network/GH auth limits.
Report: reports/project-readiness/latest.md. GoAL: reports/project-readiness/latest-chat.md.
