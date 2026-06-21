# Meridian Hybrid Auto-Close Smoke Test

Static Vite app for the Meridian PR #7 scoped hybrid auto-close smoke test.

## Local Run

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## GitHub

This project includes `.gitignore` and a GitHub Actions build check. To connect it to GitHub:

```bash
git init
git add .
git commit -m "Initial Meridian smoke test app"
git branch -M main
git remote add origin git@github.com:Davisopp13/<repo-name>.git
git push -u origin main
```

## Vercel

Import the GitHub repo in Vercel. Vercel should detect Vite automatically.

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

No runtime environment variables are required for this static checklist.
