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

## Cloudflare Deployment Prep

Target architecture:

- Cloudflare Pages serves the Vite PWA from `dist`.
- Pages Functions in `functions/api` provide the API skeleton.
- D1 stores report/task metadata through the `GRID_DB` binding.
- R2 stores audio/report/evidence assets through `GRID_ASSETS` or `GRID_AUDIO`.
- KV is optional later for settings or prompt templates through `GRID_KV`.
- Cloudflare Access should protect the UI before private operational data is stored.

The build output is declared in both Vite and `wrangler.toml`:

- Build command: `npm run build`
- Output directory: `dist`
- Pages Functions directory: `functions`

### Required Bindings And Environment

Do not hardcode secrets in the repo or frontend.

- `GRID_INGEST_TOKEN`: Cloudflare secret used by machine ingestion clients.
- `GRID_DB`: D1 database binding for report metadata.
- `GRID_ASSETS` or `GRID_AUDIO`: R2 bucket binding for audio/report/evidence files.
- `GRID_KV`: optional KV namespace binding for future settings or prompt templates.
- `VITE_GRID_API_BASE`: optional frontend build variable. Set to `/api` for same-origin Cloudflare Pages Functions, or to a full API origin for a split deployment. Leave unset for static/local-first mode.

Local-first browser storage remains the default when `VITE_GRID_API_BASE` is unset.

### API Routes

`GET /api/health`

Returns status, app name, version, and server time.

`GET /api/reports`

Read-only route for recent reports. If `GRID_DB` is not bound, it returns an empty list with `mode: "d1-unavailable"` so the UI can show a disconnected/unwired state.

`POST /api/reports`

Authenticated report ingestion. Requires:

```http
Authorization: Bearer <GRID_INGEST_TOKEN>
Content-Type: application/json
```

Payload:

```json
{
  "port": "meridian",
  "type": "audit",
  "title": "Audit report",
  "body": "Report markdown or text",
  "transcript": "Optional transcript",
  "source": "tron",
  "metadata": {}
}
```

Writes report metadata to D1 when `GRID_DB` is configured. Without D1, it fails clearly with HTTP 503.

`POST /api/audio`

Optional authenticated skeleton for future Tron audio reports. It accepts base64 JSON and requires both D1 and an R2 binding before storing anything:

```json
{
  "port": "meridian",
  "type": "audio_report",
  "title": "Audio report",
  "body": "Optional summary",
  "transcript": "Optional transcript",
  "source": "tron",
  "metadata": {},
  "fileName": "report.mp3",
  "contentType": "audio/mpeg",
  "audioBase64": "..."
}
```

No task execution or two-way Hermes/Tron messaging is implemented.

### D1 Schema

The schema draft lives at `cloudflare/schema.sql`.

For local D1 testing, create a local database and apply the schema locally:

```bash
npx wrangler d1 create the-grid
npx wrangler d1 execute the-grid --local --file=cloudflare/schema.sql
```

Do not run remote migrations until the Cloudflare project and data retention rules are approved.

### Local Cloudflare Dev

Cloudflare Pages dev can run without production credentials:

```bash
npm run build
npx wrangler pages dev dist
```

For local frontend reads against Pages Functions, set the Vite API base before building:

```bash
VITE_GRID_API_BASE=/api npm run build
npx wrangler pages dev dist
```

Without local D1/R2 bindings, write endpoints return explicit 503 responses instead of silently stubbing writes.

### Deploy

After creating the Cloudflare Pages project and real D1/R2 resources:

```bash
npm run build
npx wrangler pages deploy dist
```

Then set the production secret out of band:

```bash
npx wrangler pages secret put GRID_INGEST_TOKEN
```

Update `wrangler.toml` with the real D1 database ID and bucket names before production deployment.

### Security Notes

- Write endpoints require `Authorization: Bearer <GRID_INGEST_TOKEN>`.
- Do not put `GRID_INGEST_TOKEN` or Meridian production secrets in frontend code or `VITE_*` variables.
- Protect the UI with Cloudflare Access before storing real private reports, audio, or evidence.
- R2 objects must not be public-write.
- The Grid must not store Meridian production secrets in the frontend.
- Meridian Port remains local-first for smoke checklist state.

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
