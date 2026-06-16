Next implementation packet:
1. Deploy and verify canonical home URL cleanup: `/` is canonical, `/index.html` returns 301 to `/`, key pages/assets stay healthy on `https://sobag-shop.online/`.
2. After push, rerun GitHub Actions gates for `autofix-check`, `rust-check`, and `vps-deploy`; investigate failures without weakening VPS-only/no-secret gates.
3. Run production smokes after deploy: canonical URL smoke, production smoke, storage readiness, performance smoke, Node health, Rust health, and rollback readiness.
4. Keep Vercel/Next absent from active runtime/deploy; rerun VPS release, storage, error, and content/SEO audits after each cutover step.
5. Fill `local-import-output/cwv-field-audit-packet.json` only from real post-migration field measurements after realistic 10k+ catalog scale, then run strict goal-input and goal-completion gates.
6. Continue small functional slices only when they do not slow the Rust/VPS critical path.

Status: NOT_READY. Score: 74/100.
Current completed local packet: canonical URL cleanup prepared and locally verified; Python readiness agent could not be rerun in this sandbox because Python is unavailable.
Blockers: PROD-002 real CWV field packet is still incomplete; GitHub Actions/VPS deploy must be rechecked after push.
Report: reports/project-readiness/latest.md. GoAL: reports/project-readiness/latest-chat.md.
