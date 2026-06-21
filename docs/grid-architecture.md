# The Grid Architecture

The Grid is the top-level local-first operations shell for Davis's projects. It is not a replacement for Hermes. Hermes remains the agent/runtime system; The Grid is the structured human command surface for current project state, evidence, reports, prompts, and local audio/report intake.

## Shell And Ports

The Grid owns shared shell concerns:

- top-level navigation
- active project / port selection
- global audio inbox metadata
- saved reports
- prompt library surfaces
- local data export/import
- settings and namespace visibility

Each project gets a Port. A Port should keep its data, language, prompts, export format, and maintenance workflow isolated enough that it can later be spun off into a standalone tool.

## Meridian Port

Meridian Port is the first Port. It owns Meridian-specific readiness work:

- fresh-clone audit prompt flow
- PR #7 scoped hybrid auto-close smoke checklist
- smoke evidence fields
- final ready / hold / rollback decision
- Meridian smoke export format
- Meridian prompt cards

The smoke checklist remains focused on live Salesforce/widget smoke testing. Source-code review and readiness audit work belongs in prompts, not in checklist rows.

## Source Layout

- `src/app` owns app state orchestration and view selection.
- `src/shell` owns the Grid shell, navigation, and port switcher.
- `src/ports/meridian` owns Meridian Port rendering, data, prompts, storage, and export format.
- `src/shared` is reserved for cross-port components, storage helpers, export helpers, and audio utilities.

## Local-First MVP Storage

The MVP has no backend and no Supabase writes. Data is stored locally using namespaced browser storage:

- `grid:activePort`
- `grid:activeView`
- `grid:inbox`
- `grid:reports`
- `grid:meridian-port:audit`
- `grid:meridian-port:smoke-checklist`
- `grid:meridian-port:metadata`
- `grid:meridian-port:exports`

Audio blobs are stored in IndexedDB. Metadata stays in localStorage so it can be exported with the rest of The Grid data.

## Audio Inbox

The Audio Inbox exists because Telegram media playback can chain or loop through old messages, and technical reports can get buried in chat. The Grid MVP supports manual/local intake only: paste a report, upload an audio file, or provide an audio URL.

A static PWA cannot receive live Tron messages automatically by itself. Future versions may add one of these ingress paths:

- webhook/API endpoint such as `POST /api/inbox`
- local folder watcher for a local desktop mode, such as `~/tron-outbox/`
- hosted file/audio URL ingestion

Those are intentionally out of scope for the static MVP.
