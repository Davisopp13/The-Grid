# The Grid

Static Vite PWA for Davis's project maintenance and operations shell.

The Grid is the human-facing command surface for project status, audit prompts,
smoke checklists, evidence capture, reports, and local audio/report intake.
Hermes remains the agent/runtime system.

Meridian Port is the first project module inside The Grid. It owns the Meridian
PR #7 scoped hybrid auto-close smoke workflow.

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

No runtime environment variables are required for this static shell.
