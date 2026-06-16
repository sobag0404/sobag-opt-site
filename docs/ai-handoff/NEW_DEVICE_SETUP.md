# New Device Setup

This project can be cloned and run locally without copying secrets. Do not copy `.env.local` or any tokens through chat.

## Install On The New Device

Install:
- Git
- Node.js / npm
- Python
- GitHub CLI (`gh`)
- Rust toolchain for local Rust checks, or use the Ubuntu GitHub/VPS gates

Use official login flows only:

```powershell
gh auth login
```

Do not paste tokens or passwords into chat.

## Clone

```powershell
cd "C:\Users\<YOUR_USER>\Documents"
git clone https://github.com/sobag0404/sobag-opt-site.git
cd sobag-opt-site
```

If the repo cannot be cloned, check that the GitHub account is logged in and can access `sobag0404/sobag-opt-site`.

## Install Local Dependencies

```powershell
npm install
```

The project is mostly static, but `npm install` is useful for scripts and API dependency lockfile consistency.

## Run Locally

For normal UI/layout work, use the lightweight static server:

```powershell
npm run dev:static
```

Open:
- `http://127.0.0.1:4173/`
- `http://127.0.0.1:4173/catalog.html`
- `http://127.0.0.1:4173/cart.html`
- `http://127.0.0.1:4173/favorites.html`
- `http://127.0.0.1:4173/about.html`
- `http://127.0.0.1:4173/contacts.html`

Local static server does not emulate the VPS API. For API/server checks use the local Node server, the configured VPS staging path, or the GitHub/VPS smoke workflows. Vercel is historical only and is not a deploy/runtime target.

## Basic Verification

```powershell
node --check app.js
node --check cart.js
node --check components\site-shell.js
node --check tools\autofix.mjs
python -m py_compile tools/product_importer.py tools/publish_imported_products.py
npm run check
git status --short
```

If Python is not installed, `npm run check` now skips only Python syntax checks with a warning. Install Python on the new device to restore full importer coverage.

Current recommended smoke checks after clone/pull:

```powershell
npm run ui:smoke
```

If a full smoke run is too slow, run the recently touched focused checks:

```powershell
npm run ui:smoke -- --grep "manager order|account favorites"
npm run ui:smoke -- --grep "mobile pages"
```

Manual checks:
- home page opens;
- catalog page opens;
- clicking `Каталог` while already in catalog does not visually reload;
- heart button toggles favorite without flashing the full product grid;
- favorites page opens;
- cart page opens;
- downloadable import templates exist under `templates/`;
- product import list values use `;`.

## Work And Deploy

Normal flow:

```powershell
git status --short
git add <files>
git commit -m "Your message"
git push origin main
```

Pushing to `main` should trigger the VPS deploy and production smoke workflows. Do not deploy to Vercel.

Production:
- `https://sobag-shop.online/`
- `https://sobag-shop.online/catalog`
- `https://sobag-shop.online/cart`
- `https://sobag-shop.online/api/health`

Expected health result:

```json
{"ok":true,"storage":"ready"}
```

## Moving Local Product Photos

Bulk product photos are not stored in Git. If testing import on a new device, copy or sync the source photo folder separately, for example through Yandex Disk.

Expected shape when categories are known:

```text
Фото товаров/
  Категория/
    Основной артикул/
      1.jpg
      2.jpg
      3.jpg
```

Generate a draft table:

```powershell
python tools/product_importer.py scan-photos --photos "C:\Path\To\Фото товаров" --out local-import-output\products-from-photo-folders.xlsx
```

## Do Not Copy Or Commit

Do not copy into repo or share in chat:
- `.env`
- `.env.local`
- tokens
- passwords
- SSH keys
- cookies
- database dumps
- production credentials
- raw 10k+ product photo folders
- local import output unless explicitly requested

## Before Switching Back

If work continues on the new device over the weekend, run the same handoff preparation there before returning to this device:
- update `docs/ai-handoff/*`;
- rebuild `project-ai-handoff-latest.zip`;
- push to GitHub;
- verify VPS production if site behavior changed.
