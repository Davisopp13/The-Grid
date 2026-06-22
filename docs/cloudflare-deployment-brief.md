# The Grid Cloudflare Deployment Brief

## Executive Summary

- The Grid now has a Cloudflare-ready deployment path using Pages for the PWA and Pages Functions for `/api/*`.
- The current implementation is intentionally a secure skeleton: local-first app behavior remains the default, while Cloudflare report/audio ingestion is prepared for Tron but not fully automated.
- Cloudflare resources have been created for the Grid path: D1 database `the-grid` and R2 bucket `the-grid-assets`.
- The deployed API is live and read-safe. Write routes require `Authorization: Bearer <GRID_INGEST_TOKEN>`.
- Remote D1 schema application, Pages secret setup, and one-way report ingest smoke testing are complete.

## Current Deployment

- Pages project: `the-grid`
- Production URL: `https://the-grid-c3j.pages.dev`
- Latest verified deployment: `https://11e491d0.the-grid-c3j.pages.dev`
- D1 database: `the-grid`
- D1 database ID: `b6a82e25-443a-404d-a02e-5ec80808804f`
- R2 bucket: `the-grid-assets`
- Frontend API base for Cloudflare builds: `VITE_GRID_API_BASE=/api`

## Architecture

- Cloudflare Pages serves the static Vite PWA from `dist`.
- Pages Functions provide:
  - `GET /api/health`
  - `GET /api/reports`
  - `POST /api/reports`
  - `POST /api/audio`
- D1 stores report metadata and ingest events.
- R2 is the planned object store for audio, report, and evidence files.
- KV remains optional for future prompt templates or settings.

## Security Controls

- No secrets are hardcoded in the repo.
- Browser code never receives `GRID_INGEST_TOKEN`.
- Write endpoints reject unauthenticated requests.
- R2 is not public-write.
- Cloudflare Access should be enabled before storing private operational reports, audio, or evidence.
- Meridian production app code, Supabase, Meridian schema, and Meridian backend writes remain untouched.

## Validation Completed

- Local build passed with `npm run build`.
- Cloudflare build passed with `VITE_GRID_API_BASE=/api npm run build`.
- Cloudflare Pages deploy completed.
- `GET /api/health` returned `ok`.
- Remote D1 schema was applied and table verification found `reports` and `ingest_events`.
- `GET /api/reports` returned `mode: "d1"`.
- Unauthenticated `POST /api/reports` returned `401 Unauthorized`.
- Authenticated `POST /api/reports` persisted report `c1608f11-7478-4d96-90c9-1b6a2bc1c891`.
- Live Reports view displayed the ingested `Tron ingest test` report.
- Unauthenticated `POST /api/audio` returned `401 Unauthorized`.

## Open Next Steps

1. If Tron needs the bearer token value, rotate `GRID_INGEST_TOKEN` and pass the new value through a secure secret channel, not chat or the browser.
2. Enable Cloudflare Access before real private data is stored.
3. Keep audio delivery in skeleton mode until report ingest is stable.
4. Do not add two-way Hermes control yet.

## Out Of Scope For This Change

- Hermes bridge or two-way Tron messaging.
- Task execution.
- Meridian production app changes.
- Supabase changes.
- Meridian schema or migrations.
