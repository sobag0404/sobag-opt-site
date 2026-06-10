# CWV Field Apply Plan

Last updated: 2026-06-10

Use this only after `local-import-output/cwv-field-audit-packet.json` contains real measurements from `https://sobag-shop.online` after the catalog has realistic 10k+ scale and product images are migrated to WebP/AVIF-capable object storage.

Build a local dry-run final performance plan:

```powershell
npm.cmd run plan:cwv-field -- --packet local-import-output/cwv-field-audit-packet.json
```

Output:

```text
local-import-output/cwv-field-apply-plan.json
```

The command does not call production APIs and does not change server state. It summarizes the strict field packet, page metrics, guardrails, and verification commands before the project can mark final Core Web Vitals as done.

Required verification:

```powershell
npm.cmd run audit:cwv-field -- --strict
npm.cmd run audit:cwv
npm.cmd run smoke:prod:performance -- --base-url https://sobag-shop.online
npm.cmd run smoke:prod:storage -- --base-url https://sobag-shop.online
npm.cmd run smoke:prod -- --base-url https://sobag-shop.online
```

Do not use synthetic 10k fixtures or current 808-product legacy-image catalog as final CWV proof.
