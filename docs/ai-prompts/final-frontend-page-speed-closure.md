# Final Frontend Page Speed Closure

Use this prompt for the UI worker thread when the goal is to fully close perceived frontend page speed, not just make a small optimization.

```text
GOAL: FINAL FRONTEND PAGE SPEED CLOSURE, UI/perceived-speed owner, no secrets. Work as a full end-to-end slice until page loading speed is genuinely production-ready, not just a small optimization. Do not stop after the first improvement. If a blocker is in UI scope, self-diagnose and fix it. If it is clearly backend/VPS/API, produce exact safe evidence for backend/coordinator and continue any UI work that is not blocked.

Context:
- User still sees page loads as too slow.
- Previous UI speed commit `a53b15a` improved first 4 catalog images and fixed mobile header overlap, but this is not enough.
- Cache architecture exists; backend/VPS thread owns server/API/cache headers. You own perceived frontend speed: first screen, skeleton duration, image strategy, render blocking, client fetch/render flow, repeat navigation, mobile/desktop layout stability.
- Use transitions.dev only if it improves perceived speed without slowing the site: skeleton reveal/tooltips/icon/text/error states only. No decorative heavy motion.
- Do not edit backend/deploy/security/Rust files unless a proven tiny integration change is impossible to avoid; if so, stop and report before touching them.

Definition of done:
1. `/catalog.html` first screen becomes usable fast on desktop and mobile:
   - category tiles visible quickly;
   - no long blank/skeleton-only state;
   - no stale page-sized `48` item counts on the catalog home;
   - no layout overlap.
2. Repeat load/navigation feels near-instant using valid cache:
   - catalog home from cache visible immediately;
   - background revalidate does not hide valid data;
   - private cart/favorites/profile/order data preserved.
3. Category listing and product detail are fast:
   - first visible cards render promptly;
   - above-the-fold images prioritized;
   - below-the-fold images lazy-loaded;
   - product modal/detail does not wait unnecessarily.
4. Static pages/header/cart/favorites do not regress.
5. Mobile 390, tablet 768, desktop 1366 pass visual/perf checks.
6. Checks green and commit/push done.

Tasks:
1. Inspect `git status --short --branch`, current HEAD, recent handoff docs. Do not overwrite unrelated dirty files.
2. Build a real baseline with numbers before changing more:
   - local static/server route measurements for `/`, `/catalog.html`, representative category listing, product detail/modal, cart/favorites/static page;
   - mobile 390, tablet 768, desktop 1366;
   - cold load and repeat load;
   - collect: time until category tiles visible, time until first product cards visible, skeleton count/duration, first image visibility, console errors, horizontal overflow.
3. Inspect bottlenecks in frontend code:
   - `app.js` render/fetch order;
   - public cache restore path;
   - category/home summary render path;
   - product-card image attributes;
   - skeleton rendering and replacement;
   - modal/detail hydration;
   - CSS that blocks/overlaps first screen;
   - expensive DOM rebuilds or duplicated fetches.
4. Implement all safe UI fixes needed:
   - render valid cached catalog summary immediately before network;
   - keep cached counts/cards visible during background revalidate;
   - never show page-limited category counts on catalog home;
   - avoid full skeleton reset when useful cached content exists;
   - prioritize above-the-fold images with correct `loading`, `fetchpriority`, `decoding`, dimensions/aspect-ratio;
   - lazy-load below-fold images;
   - reduce layout shift by stable card/tile dimensions;
   - remove unnecessary re-renders/refetches;
   - make API slow/fail state neutral and usable, not misleading;
   - add lightweight skeleton reveal only if it improves perceived speed and respects `prefers-reduced-motion`;
   - do not add heavy animations, libraries, or decorative effects.
5. Add or tighten targeted tests:
   - cold catalog first screen visible;
   - repeat catalog load from cache visible immediately;
   - category listing -> header Catalog button never returns stale page-sized `48` counts on the catalog home;
   - API slow/fail does not hide valid cached data or show wrong counts;
   - private cart/favorites survive public cache cleanup;
   - first product images have expected priority, later ones lazy;
   - mobile header/search/catalog controls do not overlap.
6. Run:
   - targeted perf script/check you create or update;
   - `npm.cmd run check`;
   - `npm.cmd run ui:smoke`;
   - `git diff --check`.
7. If checks fail, fix them. Do not stop at first failed check unless it requires secrets/destructive production action.
8. Commit and push after green checks.
9. Final answer max 5 lines:
   - exact speed issues found;
   - what changed;
   - before/after numbers for key routes;
   - checks result;
   - commit hash and any remaining backend/VPS blocker with exact safe evidence.
```
