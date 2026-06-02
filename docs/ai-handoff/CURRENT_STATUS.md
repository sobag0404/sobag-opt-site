# Current Status Snapshot

Date: 2026-05-29

Latest functional commit before this handoff update:
- `6c7eb4a Prevent same-page navigation flicker`

Working tree at the start of handoff preparation:
- clean

Repository:
- `https://github.com/sobag0404/sobag-opt-site`
- branch: `main`
- repo visibility: private

Production URLs:
- Main: `https://sobag-shop.online/`
- Catalog: `https://sobag-shop.online/catalog`
- Cart: `https://sobag-shop.online/cart`
- Favorites: `https://sobag-shop.online/favorites`
- Custom print: `https://sobag-shop.online/custom`
- Marketplaces: `https://sobag-shop.online/marketplaces`
- About: `https://sobag-shop.online/about`
- Contacts: `https://sobag-shop.online/contacts`

Current focus:
- preparing the project to continue from another device;
- keeping handoff docs and ZIP current;
- next work likely continues UI polish, catalog behavior, admin/content controls, and product import workflow.

Completed most recently:
- fixed favorite-heart flicker by avoiding full product-grid rebuilds;
- fixed same-page navigation flicker, especially repeated clicks on `Каталог`;
- added same-route/placeholder link guards in both `app.js` and `cart.js`;
- kept catalog entrance animations from replaying after every data refresh;
- verified production script versions and storage health;
- confirmed GitHub repo is private with no outside collaborators, invitations, deploy keys, webhooks, or forks.

Backend/storage state:
- Vercel API routes exist under `api/`;
- Upstash Redis / Vercel KV-compatible storage is configured in Vercel;
- `/api/health` on production returns storage ready;
- do not expose env values in chat/docs/repo.

Important remaining work:
- continue visual polish and bug fixing;
- harden real backend/auth/order flows beyond prototype behavior;
- real product import workflow for large batches;
- duplicate-safe import/update process;
- optional AI-assisted descriptions/tags/collections from photos;
- separate price-editing file per variant;
- durable storage for admin uploads/product images;
- server cart/favorites are now backed by Redis/KV prototype endpoints, but full database/object storage is still the next production-grade step;
- legal pages and final consent/privacy text review.

Important constraints:
- no secrets in repo/docs/ZIP/chat;
- do not use old Tilda site or old images;
- do not commit raw bulk product photo folders;
- day theme should remain black/white/gray;
- night theme may use orange accents;
- use `;` for multi-value Excel/CSV cells;
- local/generated import output should stay ignored unless explicitly requested.
