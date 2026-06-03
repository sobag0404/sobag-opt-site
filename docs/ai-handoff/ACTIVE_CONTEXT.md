# Active Context

Last updated: 2026-06-03

Use this file as the primary short context for ongoing Sobag Opt work. Read the long chat, `LIVE_CONTEXT.md`, or `AI_HANDOFF.md` only when a missing historical detail is actually needed.

## Token-Saving Rule

- Start from this file first.
- Use `docs/roadmap-checklist.md` for the current product plan.
- Use `CURRENT_STATUS.md` for setup/deploy notes.
- Avoid rereading the whole conversation unless the user asks about an old decision.
- After meaningful code/design/deploy changes, update this file briefly.

## Project

- Workspace: `C:\Users\SoBag\OneDrive\Документы\New project\sobag-opt-site`
- GitHub: `https://github.com/sobag0404/sobag-opt-site`
- Branch: `main`
- Production: `https://sobag-shop.online`
- Fallback Vercel domain: `https://sobag-opt-site.vercel.app`
- Stack: static HTML/CSS/JS with small Vercel API routes under `api/`.
- Storage: Vercel KV / Upstash-compatible storage configured in Vercel.
- Do not add secrets, `.env`, tokens, passwords, cookies, DB dumps, or raw private keys to repo or chat.

## Current User Preferences

- Language: Russian.
- Day theme: black/white/gray only.
- Night theme may use orange accents.
- Old Tilda site and its images must not be used.
- Big product photo folders must not be committed to Git/Vercel.
- Keep Vercel Hobby function count low. Prefer extending existing endpoints instead of adding new Functions.
- After pushes, verify production on Vercel.
- Avoid excessive token use: inspect focused files only.

## Latest Done

- Search results page added:
  - `search.html`
  - header search opens `/search?q=...`
  - exact SKU search with digits returns exact SKU matches instead of all `opt_*` products
  - search page has result count, suggestions, and quick filters
- Product-modal SKU copy toast fixed:
  - toast z-index is above product modal
  - production check confirmed toast `140`, modal `100`
- AutoFix mojibake guard strengthened across HTML, JS/MJS, CSS, MD, and JSON.
- Roadmap checklist added: `docs/roadmap-checklist.md`
- Latest pushed commits:
  - `9d0d4f9 Add search results page and roadmap checklist`
  - `f232ec0 Update handoff after search production check`

## Latest Verification

Local:

- `node --check app.js`
- `node --check tools/autofix.mjs`
- `node --check tools/ui-smoke.spec.js`
- `npm.cmd run check`
- `npm.cmd run ui:smoke`

Production:

- `/`
- `/catalog`
- `/cart`
- `/search?q=opt_22434`
- `/api/health`
- Fresh marker: `20260603-search-results`
- Exact search returned one product: `OPT_22434`
- `/api/health` returned storage ready.

## Current Next Work

Next planned feature: product reviews.

Requirements:

- Only registered/logged-in buyers can leave reviews.
- Review contains stars and text.
- Reviews appear in product modal.
- Admin sees all reviews and can manage/moderate them.
- Prefer existing storage/API layer without adding new Vercel Functions.
- Add checks to AutoFix/smoke where practical.

## Useful Files

- Main frontend: `app.js`
- Cart page logic: `cart.js`
- Styles: `styles.css`
- Product data fallback: `data/products-live.json`
- API storage helper: `api/_lib/store.js`
- Auth helpers: `api/_lib/auth.js`
- Existing user/profile endpoint: `api/auth/me.js`
- Existing orders endpoint: `api/orders.js`
- Admin orders endpoint: `api/admin/orders.js`
- Admin users endpoint: `api/admin/users.js`
- Admin catalog endpoint: `api/admin/catalog.js`
- Smoke tests: `tools/ui-smoke.spec.js`
- AutoFix: `tools/autofix.mjs`

## Working Rule

Before starting a new task:

1. Read this file.
2. Check `git status --short --branch`.
3. Inspect only the files needed for the current task.
4. Run focused checks.
5. Push and verify production after site changes.
