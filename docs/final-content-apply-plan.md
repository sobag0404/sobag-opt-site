# Final Content Apply Plan

Last updated: 2026-06-10

Use this only after `local-import-output/final-content-packet.json` contains confirmed real public data and passes strict audit.

Build a local dry-run patch:

```powershell
npm.cmd run plan:final-content -- --packet local-import-output/final-content-packet.json
```

Output:

```text
local-import-output/final-content-apply-plan.json
```

The command does not call production APIs and does not touch server content. It prepares the exact public content keys that should be reviewed before an admin/content-manager applies them through the existing content system:

- `footerEmail`
- `footerPhone`
- `footerAddress`
- `contactsAddress`
- `contactsLegalAddress`
- `contactsProductionAddress`
- `contactsSchedule`
- optional `contactsLegalMapUrl`
- optional `contactsProductionMapUrl`

After applying final content through admin/content flow:

```powershell
npm.cmd run audit:content-readiness
npm.cmd run check
npm.cmd run smoke:prod -- --base-url https://sobag-shop.online
```
