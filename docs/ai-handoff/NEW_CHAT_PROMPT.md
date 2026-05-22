# Prompt For A New AI Chat

You are continuing work on the Sobag Opt wholesale textile website prototype.

Project folder on the old machine:
`C:\Users\SoBag\OneDrive\Документы\New project\sobag-opt-site`

GitHub repo:
`https://github.com/sobag0404/sobag-opt-site`

Production:
`https://sobag-opt-site.vercel.app/`

Cart:
`https://sobag-opt-site.vercel.app/cart.html`

Latest known commit:
`ef70dbd Add cart page and expanded demo catalog`

Read these files first:
- `docs/ai-handoff/AI_HANDOFF.md`
- `docs/ai-handoff/NEW_DEVICE_SETUP.md`
- `docs/ai-handoff/SERVER_HANDOFF_STORAGE.md`

Important context:
- The user speaks Russian. Answer in Russian.
- The current site is a static prototype: `index.html`, `app.js`, `styles.css`, `cart.html`, `cart.js`.
- Do not use the old Tilda site or old site images as visual reference.
- Do not add secrets to repo or chat.
- No backend exists yet. User/account/cart/order behavior is localStorage-only.
- Vercel preview URLs may require login; production URL is usually public.

Current implemented features:
- catalog home with category tiles;
- separate `Подборки` and `Праздники`;
- large right-top hero `Актуально` slider with arrows and 15-second auto rotation;
- 18 test products;
- square product cards;
- product modal with variants, gallery, tags, price, quantity;
- favorite heart toggle;
- separate cart page with quantity controls, discount scale, promo codes, checkout modal and personal data consent checkbox.

Likely next tasks:
- refine cart UX and checkout;
- add real catalog data from Excel;
- implement admin import/export;
- prepare backend and persistent storage;
- replace test/generated images with real designer assets.

Before pushing changes:
1. Run `git status --short`.
2. Run syntax checks for touched JS files.
3. Check locally in browser if UI changed.
4. Commit intentionally.
5. Push to GitHub.
6. Verify Vercel deployment success.
7. Open production URL and verify the updated behavior.

