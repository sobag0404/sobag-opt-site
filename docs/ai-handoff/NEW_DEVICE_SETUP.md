# New Device Setup

This project does not require secrets to run locally because it is currently a static frontend prototype.

## Requirements

Install:
- Git
- Node.js, for `node --check` and optional tooling
- Python, for a quick local static server
- GitHub CLI (`gh`), only if you want to push and inspect deployments from terminal

Vercel CLI is not required for normal work because deployment is connected through GitHub.

## Clone

```powershell
cd "C:\Users\<YOUR_USER>\Documents"
git clone https://github.com/sobag0404/sobag-opt-site.git
cd sobag-opt-site
```

If the repo is private, authenticate using official GitHub tools:

```powershell
gh auth login
```

Do not paste access tokens into chat.

## Run Locally

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open:
- `http://127.0.0.1:4173/`
- `http://127.0.0.1:4173/cart.html`

## Verify

```powershell
node --check app.js
node --check cart.js
git status --short
```

Manual checks:
- main page loads;
- category tiles show 3 products per category;
- `Актуально` slider is in the top-right hero area and arrows work;
- cart button shows quantity and sum;
- cart button opens `cart.html`;
- cart page shows empty state or localStorage cart;
- promo code form exists;
- checkout modal has name, email, phone, and consent checkbox.

## Deployment

Pushing to `main` triggers Vercel through GitHub.

```powershell
git status --short
git add <files>
git commit -m "Your message"
git push origin main
```

Verify deployment:
- GitHub repo deployments, or
- Vercel dashboard, or
- `gh api` deployment checks if authenticated.

Known public production URL:
`https://sobag-opt-site.vercel.app/`

Known cart URL:
`https://sobag-opt-site.vercel.app/cart.html`

## Do Not Move / Share Secrets

Do not copy or commit:
- `.env`
- tokens
- SSH keys
- cookies
- database dumps
- production credentials

No such secrets are required for the current static prototype.

