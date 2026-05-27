# New Device Setup

This project currently does not require secrets to run locally. It is a static frontend prototype.

## Install

Install on the new device:
- Git
- Node.js
- Python
- GitHub CLI (`gh`), optional but useful for authentication and deployment checks

Vercel CLI is not required for normal work because Vercel is connected to GitHub.

## Clone

```powershell
cd "C:\Users\<YOUR_USER>\Documents"
git clone https://github.com/sobag0404/sobag-opt-site.git
cd sobag-opt-site
```

If GitHub asks for access, use official authentication:

```powershell
gh auth login
```

Do not paste tokens or passwords into chat.

## Run Locally

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open:
- `http://127.0.0.1:4173/`
- `http://127.0.0.1:4173/catalog.html`
- `http://127.0.0.1:4173/cart.html`
- `http://127.0.0.1:4173/favorites.html`

## Basic Verification

```powershell
node --check app.js
node --check cart.js
python -m py_compile tools/product_importer.py tools/publish_imported_products.py
git status --short
```

Manual checks:
- home page opens;
- catalog page opens;
- heart button in the header opens favorites;
- adding a product to favorites makes it appear on favorites page;
- cart page opens;
- downloadable import template exists under `templates/`;
- product import list values use `;`.

## Work And Deploy

Pushing to `main` triggers Vercel.

```powershell
git status --short
git add <files>
git commit -m "Your message"
git push origin main
```

Production URL:
`https://sobag-opt-site.vercel.app/`

Useful production checks:
- `https://sobag-opt-site.vercel.app/catalog`
- `https://sobag-opt-site.vercel.app/cart`
- `https://sobag-opt-site.vercel.app/favorites`
- `https://sobag-opt-site.vercel.app/templates/sobag-products-template.csv`

## Moving Local Product Photos

Bulk product photos are not stored in Git. If testing import on a new device, copy or sync the photo source folder separately, for example through Yandex Disk.

Expected shape:

```text
Фото товаров/
  Категория/
    Основной артикул/
      1.jpg
      2.jpg
      3.jpg
```

Then generate a draft table:

```powershell
python tools/product_importer.py scan-photos --photos "C:\Path\To\Фото товаров" --out local-import-output\products-from-photo-folders.xlsx
```

## Do Not Copy Or Commit

Do not copy into repo or share in chat:
- `.env`
- tokens
- passwords
- SSH keys
- cookies
- database dumps
- production credentials
- raw 10k+ product photo folders
