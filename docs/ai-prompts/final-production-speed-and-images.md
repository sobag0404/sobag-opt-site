# Final Production Speed And Images Closure

Use this prompt for a worker thread when frontend/page speed is the top priority and the remaining work must be closed end-to-end.

```text
GOAL: FINAL PRODUCTION SPEED, IMAGES, SMOKE, AND LIGHTWEIGHT MOTION CLOSURE. No secrets. Work as a full end-to-end slice until this speed issue is genuinely production-ready. Do not stop after first improvement. If a blocker is in your scope, self-diagnose and fix it. If a blocker belongs to the other worker scope, produce exact safe evidence and continue all unblocked speed work.

Context:
- User says real page speed still needs to be as fast as realistically possible.
- Previous speed fixes:
  - UI `a53b15a`: first catalog product images eager/high, mobile header overlap fixed.
  - UI `9affdfb`: catalog home stopped rendering hidden 48-card grid, product loading deferred, repeat/SPA home uses validated cached counts.
  - Backend `0c3302e`: compact `/api/price-list?format=json`, VPS live warmup/perf PASS; production-smoke was skipped.
- Remaining speed closure items:
  1. real production browser speed verification;
  2. image optimization;
  3. make production-smoke not skipped / prove automation coverage;
  4. lightweight transitions.dev only where they improve perceived speed without slowing the site.

Scope rules:
- Prefer UI/frontend changes for image/render/motion work.
- Backend/VPS/deploy changes are allowed only if needed for image delivery, cache headers, production-smoke, or clear server latency issue.
- Do not print secrets. Do not edit env, user data, DB dumps, SSH keys, or production data destructively.
- Keep comments short.

Definition of done:
1. Production browser checks on `https://sobag-shop.online` show acceptable first-screen speed:
   - `/`, `/catalog.html`, representative category listing, product detail/modal if reachable, cart/favorites/static page;
   - mobile 390, tablet 768, desktop 1366;
   - collect safe numbers: category tiles visible, first cards visible, first contentful visual state, image load blockers, console errors, horizontal overflow.
2. Image bottlenecks are addressed:
   - above-the-fold images have explicit dimensions/aspect ratio and proper `loading`, `fetchpriority`, `decoding`;
   - below-fold images lazy-load;
   - thumbnails/previews are not unnecessarily huge for card sizes;
   - real image URLs do not block category/home first screen;
   - if source images are too heavy, implement or document a safe bounded thumbnail/preload strategy and enforce what can be done now.
3. Automation coverage is not skipped:
   - investigate why `production-smoke` was skipped after `0c3302e`;
   - fix workflow/test trigger/conditions if it is safe;
   - prove latest Actions/deploy/smoke status via available channel, or state exact safe blocker once.
4. Lightweight motion only if beneficial:
   - Use transitions.dev ideas only for perceived-speed UX: skeleton reveal, tooltip, icon swap, text state swap, error shake;
   - do not add heavy animations, card tilt, page-wide transitions, libraries, or decorative effects;
   - preserve `prefers-reduced-motion`.
5. No regressions:
   - no stale page-sized `48` counts on catalog home;
   - private cart/favorites/profile/orders preserved;
   - mobile/header/filter/search do not overlap;
   - static pages do not regress.
6. Checks green:
   - targeted production/browser speed check you create or update;
   - image/perf smoke if added;
   - `npm.cmd run check`;
   - `npm.cmd run ui:smoke`;
   - backend/perf/cache smoke if backend files changed;
   - `git diff --check`;
   - commit/push after green checks.

Tasks:
1. Inspect `git status --short --branch`, HEAD/origin, recent handoff docs, and latest Actions state if possible.
2. Build a production baseline first, with numbers and evidence. Do not optimize blindly.
3. Inspect current image markup and CSS:
   - product cards;
   - category tiles;
   - hero/actual/theme tiles;
   - modal/detail gallery;
   - static content pages;
   - cart/favorites thumbnails.
4. Inspect image payload strategy:
   - actual dimensions served vs rendered dimensions;
   - formats and cache headers;
   - whether card thumbnails use original large media;
   - whether first-screen images block useful UI.
5. Implement safe speed/image fixes:
   - correct `imageAttrs` or equivalent helpers;
   - stable width/height/aspect ratio;
   - eager/high only for first visible items;
   - lazy/async for below fold;
   - reduce unnecessary preloading;
   - defer non-critical product/detail fetches;
   - add compact thumbnail/preview path only if safe and supported;
   - fix production-smoke skip if it is a workflow/test issue.
6. Optionally add lightweight transitions:
   - skeleton reveal for loading placeholders if it reduces perceived harshness;
   - tooltip/icon/text/error transitions only on existing controls;
   - no heavy decorative motion.
7. Re-measure production and local after changes. Include before/after for key routes.
8. Run all checks listed above. If any check fails, fix and rerun. Do not stop at first failure unless it requires secrets or destructive production action.
9. Commit and push after green checks.

Final answer max 6 lines:
- PASS/FAIL for production speed closure;
- before/after key production/local numbers;
- image fixes made;
- production-smoke final status;
- checks result;
- commit hash and any remaining blocker with exact safe evidence.
```
