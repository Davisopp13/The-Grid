import './styles.css';

const STORAGE_KEY = 'meridian_smoke_pr7_v2';
const AUDIO_DB_NAME = 'meridian-port';
const AUDIO_STORE_NAME = 'audio';
const AUDIO_DB_VERSION = 1;

const SECTIONS = [
  {
    id: 's1',
    num: 1,
    title: 'Smoke Setup',
    short: 'Setup',
    items: [
      { id: 'p1', text: 'Smoke environment or Vercel preview URL is open and recorded in Smoke Session.' },
      { id: 'p2', text: 'Hybrid trial access is detected for the scoped tester: `state.hybridAccessConfirmed === true` is visible via widget console log or monitor panel header.' },
      { id: 'p3', text: 'Broad non-hybrid bookmarklet remains manual-first; passive case-start remains off.' },
      { id: 'p4', text: 'Monitor panel loads without error - no red banners, no uncaught exceptions in browser console.' },
      { id: 'p5', text: 'Precision panel correctly handles an RPC failure - does NOT show a false empty-state; error state is visually distinct from genuine no-data.' },
    ],
  },
  {
    id: 's2',
    num: 2,
    title: 'Resolved Case Smoke',
    short: 'Resolved',
    items: [
      { id: 'r1', text: 'Manually start and track a case in Meridian (manual `case_start` only - passive case-start remains off).' },
      { id: 'r2', text: 'Resolve the same case in Salesforce (case status -> Resolved).' },
      { id: 'r3', text: 'Meridian silently closes the tracked case - no agent action required.' },
      { id: 'r4', text: 'No toast, card, banner, or extra UI appears in the widget during or after auto-close.' },
      { id: 'r5', text: 'Supabase check: `case_events` row exists with `type = "resolved"` for the test case.' },
      { id: 'r6', text: 'Supabase check: same `case_events` row has `source = "passive_auto"`.' },
      { id: 'r7', text: 'Linked row in `case_outcome_observations` reflects the passive auto-close: observation is linked to the passive `case_events` row, and the current auto-close marker is populated, such as `auto_closed_at` or the current passive-auto marker field.' },
      { id: 'r8', text: 'Monitor panel reflects the passive close - event appears in monitor log and/or count updates correctly.' },
    ],
  },
  {
    id: 's3',
    num: 3,
    title: 'Reclassified Case Smoke',
    short: 'Reclass',
    items: [
      { id: 'rc1', text: 'Manually start and track a different case in Meridian.' },
      { id: 'rc2', text: 'Reclassify the same case in Salesforce (type/subtype change that triggers the reclassification detection path).' },
      { id: 'rc3', text: 'Meridian silently closes the tracked case via passive detection - no agent action required.' },
      { id: 'rc4', text: 'Supabase check: `case_events` row exists with `type = "reclassified"` for the test case.' },
      { id: 'rc5', text: 'Supabase check: same `case_events` row has `source = "passive_auto"`.' },
      { id: 'rc6', text: 'Linked row in `case_outcome_observations` reflects the passive auto-close: observation is linked to the passive `case_events` row, and the current auto-close marker is populated, such as `auto_closed_at` or the current passive-auto marker field.' },
      { id: 'rc7', text: 'Monitor panel reflects the passive close for the reclassified case.' },
    ],
  },
  {
    id: 's4',
    num: 4,
    title: 'Complete-during-reclassification Guard',
    short: 'Complete guard',
    items: [
      { id: 'cg1', text: 'Manually start and track a case that can hit Complete while reclassification handling is in progress.' },
      { id: 'cg2', text: 'Trigger the Complete-during-reclassification path using the live widget/Salesforce workflow or the approved smoke repro path.' },
      { id: 'cg3', text: '`reclass_in_progress_at_complete` guard blocks unsafe passive auto-close while reclassification is still in progress.' },
      { id: 'cg4', text: 'No duplicate or incorrect production `case_events` close row is created during the guarded window.' },
      { id: 'cg5', text: 'Widget and monitor state remain coherent after the reclassification path settles.' },
    ],
  },
  {
    id: 's5',
    num: 5,
    title: 'Low-confidence / Shadow-only Smoke',
    short: 'Shadow',
    items: [
      { id: 'lc1', text: 'Trigger or observe a low-confidence or non-promoted candidate (confidence below promotion threshold).' },
      { id: 'lc2', text: 'Shadow outcome row may be recorded in `case_outcome_observations`, but it is not linked or marked as passive auto-closed; the current passive-auto marker field remains unset.' },
      { id: 'lc3', text: 'No production close happens for this candidate - no `case_events` row written with `source = "passive_auto"`.' },
      { id: 'lc4', text: 'Tracked case remains open in Meridian - low-confidence signal did NOT trigger an auto-close.' },
    ],
  },
  {
    id: 's6',
    num: 6,
    title: 'No-tracked-case Safety Smoke',
    short: 'Safety',
    items: [
      { id: 'nt1', text: 'Observe passive detection firing for a case that is NOT currently in `state.cases` (not tracked in this session).' },
      { id: 'nt2', text: 'No production close happens - no `case_events` write, no session state change for the untracked case.' },
      { id: 'nt3', text: 'Safety invariant confirmed: passive detection can only close a case that is actively tracked. No tracked case -> close nothing.' },
    ],
  },
  {
    id: 's7',
    num: 7,
    title: 'Regression Checks',
    short: 'Regression',
    items: [
      { id: 'rg1', text: 'Manual Resolve still works end-to-end - agent-triggered resolve logs a `case_events` row correctly; no regression from PR #7.' },
      { id: 'rg2', text: 'Manual Reclassify still works end-to-end - agent-triggered reclassification logs correctly.' },
      { id: 'rg3', text: 'Passive case-start remains off - manual case-start is still the only mechanism that adds a case to `state.cases`.' },
      { id: 'rg4', text: 'A non-hybrid or out-of-trial user does NOT auto-close: `PASSIVE_CLOSE_LIVE = false` and the `hybridAccessConfirmed` gate both block non-trial users.' },
      { id: 'rg5', text: 'Monitor / error UI correctly distinguishes RPC failure from genuine no-data - different error states render differently; no false positives.' },
    ],
  },
];

const DECISION_OPTS = [
  {
    id: 'keep',
    cls: 'sel-keep',
    label: 'Ready - Keep Scoped Trial On',
    desc: 'All critical paths pass. Trial continues with PR #7 live.',
  },
  {
    id: 'rollback',
    cls: 'sel-rollback',
    label: 'Roll Back Scoped Trial',
    desc: 'Critical failure found. Revert HYBRID_AUTO_CLOSE_LIVE to false.',
  },
  {
    id: 'fix',
    cls: 'sel-fix',
    label: 'Needs Fix Before Continuing',
    desc: 'Blocked or failed items require resolution first. Trial paused.',
  },
];

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'complete', label: 'Passed' },
];

const AUDIT_OPTS = [
  {
    id: 'not-run',
    cls: 'audit-not-run',
    label: 'Not run',
    desc: 'Fresh clone audit has not been recorded.',
  },
  {
    id: 'ready',
    cls: 'audit-ready',
    label: 'READY FOR DAVIS-ONLY SMOKE',
    desc: 'Fresh clone audit returned a ready verdict.',
  },
  {
    id: 'hold',
    cls: 'audit-hold',
    label: 'HOLD - BLOCKER FOUND',
    desc: 'Fresh clone audit found a blocker.',
  },
];

const RUN_FIELDS = [
  { key: 'tester', label: 'Tester', placeholder: 'Davis / tester name' },
  { key: 'environmentUrl', label: 'Environment URL', placeholder: 'Vercel preview or deployed URL' },
];

const ITEM_FIELD_DEFS = [
  { key: 'caseNumber', label: 'Case #', placeholder: 'CT case number' },
  { key: 'evidenceLink', label: 'Evidence link', placeholder: 'Screenshot, admin, PR, or log link' },
  { key: 'testedAt', label: 'Timestamp', placeholder: 'Auto-filled on status change' },
];

const SMOKE_RECORD_SECTIONS = [
  {
    title: 'Containment boundary',
    items: [
      '`PASSIVE_CLOSE_LIVE = false` remains the broad passive close kill switch.',
      '`HYBRID_AUTO_CLOSE_LIVE = true` enables only the scoped hybrid trial path.',
      '`state.hybridAccessConfirmed === true` is required before production auto-close writes.',
      'No Supabase migration, schema, RLS, RPC, table, relay, dashboard, MPL, or Supabase client change is included.',
    ],
  },
  {
    title: 'Critical outcome paths',
    items: [
      'Resolved case auto-close smoke.',
      'Reclassified case auto-close smoke.',
      '`reclass_in_progress_at_complete` guard for Complete-during-reclassification safety.',
      'Low-confidence shadow-only behavior.',
      'No-tracked-case close-nothing safety.',
    ],
  },
  {
    title: 'Deployment separation',
    items: [
      'Human review, PR approval, merge, deployment, and post-deploy smoke remain separate gates.',
      'Rollback sets `PASSIVE_CLOSE_LIVE = false` and `HYBRID_AUTO_CLOSE_LIVE = false`.',
      'This artifact is approved as the human smoke record, not broad passive-close readiness evidence.',
    ],
  },
];

function finalFreshCloneAuditPrompt() {
  return [
    'Run tools now.',
    '',
    'Perform a Final Fresh Clone Readiness Audit for Meridian PR #7 controlled hybrid auto-close smoke readiness.',
    '',
    'Scope:',
    '- Focus only on PR #7 readiness for the Davis-only controlled hybrid auto-close smoke.',
    '- Do not re-audit all of Meridian.',
    '- Do not treat Codex claims, this working tree, stale local state, or Supabase migration history alone as source of truth.',
    '- Use GitHub source of truth from a fresh clone or fresh PR checkout.',
    '- Cite exact file paths and line numbers for every code claim.',
    '- Quote the relevant code lines for every required safety claim.',
    '',
    'Hard prohibitions:',
    '- Do not touch Supabase.',
    '- Do not apply migrations.',
    '- Do not flip flags.',
    '- Do not deploy anything.',
    '- Do not make code changes.',
    '',
    'Layer 1 - PR / code state:',
    '- Start from a fresh clone or fresh PR checkout.',
    '- Confirm PR #7 HEAD and base.',
    '- Confirm changed files.',
    '- Confirm only public/ct-widget.js changed.',
    '- Confirm PASSIVE_CLOSE_LIVE=false.',
    '- Confirm HYBRID_AUTO_CLOSE_LIVE=true.',
    '- Confirm the hybridAccessConfirmed gate remains intact.',
    '',
    'Layer 2 - Passive-close safety path:',
    '- Quote the close gate.',
    '- Quote the tracked-case invariant.',
    '- Quote resolved/reclassified-only promotion.',
    '- Quote low-confidence shadow-only behavior.',
    '- Quote no-tracked-case close-nothing behavior.',
    '',
    'Layer 3 - Complete-during-reclassification fix:',
    '- Confirm reclass_in_progress_at_complete blocker exists on main / PR branch.',
    '- Run or inspect the passive harness branch if needed.',
    '- Confirm the synthetic harness is green for signature_reclass_at_complete.',
    '- Explicitly state whether the manual corpus is active or inactive.',
    '',
    'Layer 4 - Operational readiness:',
    '- State remaining non-code gates:',
    '  - actual schema/RPC present,',
    '  - holdout or reconciliation posture,',
    '  - cohort scope,',
    '  - smoke checklist ready.',
    '',
    'Return format:',
    '- Keep it focused and concise.',
    '- Include cited evidence by file path and line number.',
    '- End with exactly one binary smoke verdict:',
    '  READY FOR DAVIS-ONLY SMOKE',
    '  HOLD - BLOCKER FOUND',
  ].join('\n');
}

let currentFilter = 'all';
let deferredInstallPrompt = null;
let state = loadState();
const audioUrls = new Map();

function defaultState() {
  return {
    items: {},
    audit: { verdict: 'not-run', notes: '' },
    run: { tester: '', environmentUrl: '' },
    audio: [],
    decision: { verdict: null, notes: '' },
    savedAt: null,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const defaults = defaultState();
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        items: parsed.items || defaults.items,
        audit: { ...defaults.audit, ...(parsed.audit || {}) },
        run: { ...defaults.run, ...(parsed.run || {}) },
        audio: Array.isArray(parsed.audio) ? parsed.audio : defaults.audio,
        decision: { ...defaults.decision, ...(parsed.decision || {}) },
      };
    }
  } catch {
    return defaultState();
  }
  return defaultState();
}

function persist() {
  state.savedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Local persistence is best-effort.
  }
  const saved = document.getElementById('last-saved');
  if (saved) saved.textContent = `Saved ${new Date(state.savedAt).toLocaleTimeString()}`;
}

function getStatus(id) {
  return state.items[id]?.status || 'not-tested';
}

function getNotes(id) {
  return state.items[id]?.notes || '';
}

function getItemField(id, key) {
  return state.items[id]?.[key] || '';
}

function ensureItem(id) {
  if (!state.items[id]) {
    state.items[id] = {
      status: 'not-tested',
      notes: '',
      caseNumber: '',
      evidenceLink: '',
      testedAt: '',
    };
  }
}

function setStatus(id, status) {
  ensureItem(id);
  state.items[id].status = status;
  if (status !== 'not-tested' && !state.items[id].testedAt) {
    state.items[id].testedAt = new Date().toISOString();
  }
  persist();
  refreshItemCard(id);
  refreshProgress();
}

function setNotes(id, notes) {
  ensureItem(id);
  state.items[id].notes = notes;
  persist();
}

function setItemField(id, key, value) {
  ensureItem(id);
  state.items[id][key] = value;
  persist();
}

function openAudioDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }

    const request = indexedDB.open(AUDIO_DB_NAME, AUDIO_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        db.createObjectStore(AUDIO_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open audio database'));
  });
}

async function withAudioStore(mode, action) {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE_NAME, mode);
    const store = transaction.objectStore(AUDIO_STORE_NAME);
    let request;

    try {
      request = action(store);
    } catch (error) {
      db.close();
      reject(error);
      return;
    }

    transaction.oncomplete = () => {
      db.close();
      resolve(request?.result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error('Audio database transaction failed'));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error('Audio database transaction aborted'));
    };
  });
}

function putAudioBlob(id, blob) {
  return withAudioStore('readwrite', (store) => store.put(blob, id));
}

function getAudioBlob(id) {
  return withAudioStore('readonly', (store) => store.get(id));
}

function deleteAudioBlob(id) {
  return withAudioStore('readwrite', (store) => store.delete(id));
}

function clearAudioStore() {
  return withAudioStore('readwrite', (store) => store.clear());
}

function makeAudioId(file) {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `audio-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function setAudioUrl(id, blob) {
  revokeAudioUrl(id);
  const url = URL.createObjectURL(blob);
  audioUrls.set(id, url);
  return url;
}

function revokeAudioUrl(id) {
  const existing = audioUrls.get(id);
  if (existing) URL.revokeObjectURL(existing);
  audioUrls.delete(id);
}

function revokeAllAudioUrls() {
  Array.from(audioUrls.keys()).forEach((id) => revokeAudioUrl(id));
}

async function hydrateAudioUrls() {
  await Promise.all((state.audio || []).map(async (item) => {
    try {
      const blob = await getAudioBlob(item.id);
      if (blob) setAudioUrl(item.id, blob);
    } catch {
      // Missing or unavailable blobs leave the metadata visible for cleanup.
    }
  }));
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmtText(text) {
  return esc(text).replace(/`([^`]+)`/g, '<code>$1</code>');
}

function totals() {
  let total = 0;
  let pass = 0;
  let fail = 0;
  let blocked = 0;
  let nt = 0;

  SECTIONS.forEach((section) => {
    section.items.forEach((item) => {
      total += 1;
      const status = getStatus(item.id);
      if (status === 'pass') pass += 1;
      else if (status === 'fail') fail += 1;
      else if (status === 'blocked') blocked += 1;
      else nt += 1;
    });
  });

  const tested = pass + fail + blocked;
  const pct = total ? Math.round((tested / total) * 100) : 0;
  return { total, pass, fail, blocked, nt, tested, pct };
}

function renderShell() {
  document.getElementById('app').innerHTML = `
    <div class="scope-banner" role="status">
      <div class="scope-kicker">Scoped trial guardrail</div>
      <div>
        This checklist validates PR #7 only. Do not use it as broad
        <code>PASSIVE_CLOSE_LIVE</code> readiness evidence.
      </div>
      <button class="audit-copy-btn" id="btn-audit-top" type="button">
        Copy Final Fresh Clone Audit Prompt
      </button>
    </div>

    <header class="app-header">
      <a class="brand" href="#top" aria-label="Meridian smoke test home">
        <span class="brand-mark"><img src="/meridian-mark-192.png" alt="" /></span>
        <span>
          <span class="brand-name">Meridian Port</span>
          <span class="brand-subtitle">Hybrid Auto-Close Smoke Test</span>
        </span>
      </a>
      <div class="header-meta" aria-label="Trial context">
        <button class="install-btn" id="btn-install" type="button" hidden>Install</button>
        <span class="meta-pill pwa-state" id="pwa-state">Online</span>
        <span class="meta-pill">PR #7</span>
        <span class="meta-pill">Hybrid live</span>
        <span class="meta-pill muted">Passive close off</span>
      </div>
    </header>

    <main class="layout" id="top">
      <section class="hero" aria-labelledby="page-title">
        <div class="hero-copy">
          <div class="eyebrow">Davis / trusted cohort only</div>
          <h1 id="page-title">Scoped hybrid auto-close validation</h1>
          <p>
            Hapag-Lloyd IDT Export Rail smoke checklist for confirming passive
            close behavior while keeping the broad passive close flag off.
          </p>
        </div>
        <aside class="status-panel" aria-label="Feature flags">
          <div class="flag-row">
            <span>HYBRID_AUTO_CLOSE_LIVE</span>
            <strong>true</strong>
          </div>
          <div class="flag-row critical">
            <span>PASSIVE_CLOSE_LIVE</span>
            <strong>false</strong>
          </div>
          <div class="flag-note">Must remain false through the entire trial.</div>
        </aside>
      </section>

      ${renderSmokeRecord()}

      ${renderSmokeSession()}

      <section class="progress-panel" aria-label="Smoke test progress">
        <div class="progress-head">
          <div>
            <div class="panel-label">Smoke Test Progress</div>
            <div class="progress-title" id="progress-title">0 of 0 tested</div>
          </div>
          <div class="progress-percent" id="progress-percent">0%</div>
        </div>
        <div class="progress-track" aria-hidden="true">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
        <div class="progress-counts" id="progress-counts"></div>
        <div class="progress-actions" aria-label="Checklist view controls">
          <div class="filter-group" role="group" aria-label="Filter checklist items">
            ${FILTERS.map((filter) => `
              <button
                class="filter-btn${filter.id === currentFilter ? ' is-active' : ''}"
                type="button"
                data-filter="${filter.id}"
                aria-pressed="${filter.id === currentFilter}"
              >${filter.label}</button>
            `).join('')}
          </div>
          <button class="btn btn-secondary btn-next" id="btn-next-open" type="button">
            Next unchecked
          </button>
        </div>
        <div class="readiness-summary" id="readiness-summary"></div>
      </section>

      <div class="section-nav" id="section-nav" aria-label="Checklist sections"></div>
      <div class="filter-empty" id="filter-empty" hidden>No checklist items match the current view.</div>
      <div id="section-container"></div>
      <div id="audio-inbox-container"></div>
    </main>

    <div class="toast" id="toast">Copied to clipboard</div>

    <footer class="bottom-bar">
      <span class="last-saved" id="last-saved">Not yet saved</span>
      <button class="btn btn-secondary" id="btn-reset" type="button">Reset</button>
      <button class="btn btn-primary" id="btn-export" type="button">Export Summary</button>
    </footer>
  `;
}

function renderSmokeRecord() {
  return `
    <section class="record-panel" aria-labelledby="record-title">
      <div class="record-head">
        <div>
          <div class="panel-label">Approved Smoke Record</div>
          <h2 id="record-title">Scoped hybrid auto-close trial checklist</h2>
        </div>
        <span class="record-status">Approved artifact</span>
      </div>
      <div class="record-grid">
        ${SMOKE_RECORD_SECTIONS.map((section) => `
          <article class="record-group">
            <h3>${esc(section.title)}</h3>
            <ol>
              ${section.items.map((item) => `<li>${fmtText(item)}</li>`).join('')}
            </ol>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderSmokeSession() {
  const audit = state.audit || defaultState().audit;
  const run = state.run || defaultState().run;
  return `
    <section class="session-panel" aria-labelledby="session-title">
      <div class="session-head">
        <div>
          <div class="panel-label">Smoke Session</div>
          <h2 id="session-title">Fresh clone gate and run metadata</h2>
        </div>
        <button class="btn btn-audit" id="btn-audit-session" type="button">
          Copy Final Fresh Clone Audit Prompt
        </button>
      </div>
      <div class="run-fields">
        ${RUN_FIELDS.map((field) => `
          <label class="run-field" for="run-${field.key}">
            <span>${esc(field.label)}</span>
            <input
              id="run-${field.key}"
              data-run-field="${field.key}"
              value="${esc(run[field.key] || '')}"
              placeholder="${esc(field.placeholder)}"
            />
          </label>
        `).join('')}
      </div>
      <div class="audit-verdict-group" role="group" aria-label="Fresh clone audit verdict">
        ${AUDIT_OPTS.map((opt) => {
          const selected = audit.verdict === opt.id;
          return `
            <button
              class="audit-option${selected ? ` ${opt.cls}` : ''}"
              type="button"
              data-audit-verdict="${opt.id}"
              aria-pressed="${selected}"
            >
              <span>${esc(opt.label)}</span>
              <small>${esc(opt.desc)}</small>
            </button>
          `;
        }).join('')}
      </div>
      <label class="audit-notes-label" for="audit-notes">Fresh clone audit notes</label>
      <textarea
        class="audit-notes"
        id="audit-notes"
        placeholder="Paste audit verdict, blocker summary, or cited evidence links"
      >${esc(audit.notes || '')}</textarea>
    </section>
  `;
}

function renderSections() {
  const nav = document.getElementById('section-nav');
  const container = document.getElementById('section-container');

  nav.innerHTML = SECTIONS.map((section) => `
    <a class="section-link" href="#sec-${section.id}">
      <span>${section.num}</span>${esc(section.short)}
    </a>
  `).join('') + `
    <a class="section-link" href="#audio-inbox">
      <span>A</span>Audio
    </a>
  `;

  let html = '';

  SECTIONS.forEach((section) => {
    html += `
      <section class="section" id="sec-${section.id}">
        <div class="section-head">
          <div>
            <div class="section-number">Section ${section.num}</div>
            <h2>${esc(section.title)}</h2>
          </div>
          <span class="section-tally" id="tally-${section.id}">0/${section.items.length}</span>
        </div>
        <div class="items">
    `;

    section.items.forEach((item, idx) => {
      const status = getStatus(item.id);
      const notes = getNotes(item.id);
      const cardClass = `item-card${status !== 'not-tested' ? ` s-${status}` : ''}`;

      html += `
        <article class="${cardClass}" id="card-${item.id}" data-item-id="${item.id}" data-status="${status}">
          <div class="item-row">
            <span class="item-num">${idx + 1}</span>
            <div class="item-copy">${fmtText(item.text)}</div>
            <div class="status-buttons" aria-label="Status for item ${idx + 1}">
              ${mkStatusButton(item.id, 'pass', 'PASS', status)}
              ${mkStatusButton(item.id, 'fail', 'FAIL', status)}
              ${mkStatusButton(item.id, 'blocked', 'BLOCKED', status)}
              ${mkStatusButton(item.id, 'not-tested', 'N/T', status)}
            </div>
          </div>
          <label class="notes-wrap">
            <span class="sr-only">Notes for item ${idx + 1}</span>
            <textarea class="notes-input" id="ta-${item.id}" placeholder="Notes" rows="1">${esc(notes)}</textarea>
          </label>
          <div class="evidence-grid" aria-label="Evidence for item ${idx + 1}">
            ${ITEM_FIELD_DEFS.map((field) => `
              <label class="evidence-field" for="${field.key}-${item.id}">
                <span>${esc(field.label)}</span>
                <input
                  id="${field.key}-${item.id}"
                  data-item-field="${field.key}"
                  data-item-id="${item.id}"
                  value="${esc(getItemField(item.id, field.key))}"
                  placeholder="${esc(field.placeholder)}"
                />
              </label>
            `).join('')}
          </div>
        </article>
      `;
    });

    html += '</div></section>';
  });

  html += renderDecision();
  container.innerHTML = html;

  SECTIONS.forEach((section) => {
    section.items.forEach((item) => attachItemListeners(item.id));
  });
  attachDecisionListeners();
}

function renderAudioInbox() {
  const container = document.getElementById('audio-inbox-container');
  if (!container) return;

  const items = state.audio || [];
  container.innerHTML = `
    <section class="section audio-inbox" id="audio-inbox" aria-labelledby="audio-inbox-title">
      <div class="section-head">
        <div>
          <div class="section-number">Audio Inbox</div>
          <h2 id="audio-inbox-title">Tron Audio Reports</h2>
        </div>
        <span class="section-tally">${items.length} report${items.length === 1 ? '' : 's'}</span>
      </div>
      <div class="audio-upload-row">
        <label class="audio-upload" for="audio-upload-input">
          <span>Add audio reports</span>
          <input id="audio-upload-input" type="file" accept="audio/*" multiple />
        </label>
        <p>Audio files stay local in this browser through IndexedDB. Transcripts save with the checklist state.</p>
      </div>
      <div class="audio-list">
        ${items.length ? items.map((item) => renderAudioItem(item)).join('') : `
          <div class="audio-empty">
            No Tron audio reports yet. Add audio files to build the local inbox for this smoke run.
          </div>
        `}
      </div>
    </section>
  `;

  attachAudioInboxListeners();
}

function renderAudioItem(item) {
  const src = audioUrls.get(item.id) || '';
  return `
    <article class="audio-card" data-audio-id="${esc(item.id)}">
      <div class="audio-card-head">
        <div>
          <div class="audio-name">${esc(item.name)}</div>
          <div class="audio-added">Added ${new Date(item.addedAt).toLocaleString()}</div>
        </div>
        <button class="btn btn-secondary btn-audio-remove" type="button" data-audio-remove="${esc(item.id)}">
          Remove
        </button>
      </div>
      <div class="audio-controls-row">
        <audio controls preload="metadata" src="${esc(src)}"></audio>
        <button class="btn btn-secondary btn-audio-stop" type="button" data-audio-stop="${esc(item.id)}">
          Stop
        </button>
      </div>
      <label class="audio-transcript-wrap" for="audio-transcript-${esc(item.id)}">
        <span>Transcript</span>
        <textarea
          id="audio-transcript-${esc(item.id)}"
          class="audio-transcript"
          data-audio-transcript="${esc(item.id)}"
          placeholder="Paste or draft the Tron audio report transcript"
        >${esc(item.transcript || '')}</textarea>
      </label>
    </article>
  `;
}

function mkStatusButton(itemId, status, label, current) {
  const active = current === status ? ' is-active' : '';
  return `
    <button
      class="status-btn status-${status}${active}"
      type="button"
      data-id="${itemId}"
      data-status="${status}"
      aria-pressed="${current === status}"
    >${label}</button>
  `;
}

function renderDecision() {
  const decision = state.decision || { verdict: null, notes: '' };
  return `
    <section class="section decision-section" id="sec-final">
      <div class="section-head">
        <div>
          <div class="section-number">Section ${SECTIONS.length + 1}</div>
          <h2>Final Decision</h2>
        </div>
      </div>
      <div class="decision-card">
        <div class="audit-gate">
          <div>
            <div class="audit-gate-label">Fresh clone gate</div>
            <p>
              Copy a focused prompt that forces PR #7 readiness evidence from
              GitHub source of truth before any live smoke.
            </p>
          </div>
          <button class="btn btn-audit" id="btn-audit-decision" type="button">
            Copy Final Fresh Clone Audit Prompt
          </button>
        </div>
        <div class="decision-options">
          ${DECISION_OPTS.map((opt) => {
            const selected = decision.verdict === opt.id;
            return `
              <button
                class="decision-option${selected ? ` ${opt.cls}` : ''}"
                type="button"
                id="decopt-${opt.id}"
                data-verdict="${opt.id}"
                aria-pressed="${selected}"
              >
                <span class="decision-label">${esc(opt.label)}</span>
                <span class="decision-desc">${esc(opt.desc)}</span>
              </button>
            `;
          }).join('')}
        </div>
        <label class="decision-notes-label" for="dec-notes">Notes / evidence links</label>
        <textarea
          class="decision-notes"
          id="dec-notes"
          placeholder="Paste links, describe failures, record evidence"
        >${esc(decision.notes || '')}</textarea>
      </div>
    </section>
  `;
}

function attachItemListeners(id) {
  const card = document.getElementById(`card-${id}`);
  if (!card) return;

  card.querySelectorAll('.status-btn').forEach((button) => {
    button.addEventListener('click', () => {
      setStatus(id, button.dataset.status);
    });
  });

  const textarea = document.getElementById(`ta-${id}`);
  if (textarea) {
    textarea.addEventListener('input', () => {
      setNotes(id, textarea.value);
      autoResize(textarea);
    });
    autoResize(textarea);
  }

  card.querySelectorAll('[data-item-field]').forEach((input) => {
    input.addEventListener('input', () => {
      setItemField(id, input.dataset.itemField, input.value);
    });
  });
}

function attachSmokeSessionListeners() {
  document.getElementById('btn-audit-session')?.addEventListener('click', copyAuditPrompt);

  document.querySelectorAll('[data-run-field]').forEach((input) => {
    input.addEventListener('input', () => {
      state.run[input.dataset.runField] = input.value;
      persist();
    });
  });

  document.querySelectorAll('[data-audit-verdict]').forEach((button) => {
    button.addEventListener('click', () => {
      state.audit.verdict = button.dataset.auditVerdict;
      persist();
      refreshAuditVerdict();
      refreshProgress();
    });
  });

  const auditNotes = document.getElementById('audit-notes');
  if (auditNotes) {
    auditNotes.addEventListener('input', () => {
      state.audit.notes = auditNotes.value;
      persist();
      autoResize(auditNotes);
    });
    autoResize(auditNotes);
  }
}

function attachDecisionListeners() {
  document.getElementById('btn-audit-decision')?.addEventListener('click', copyAuditPrompt);

  document.querySelectorAll('.decision-option').forEach((button) => {
    button.addEventListener('click', () => {
      state.decision.verdict = button.dataset.verdict;
      persist();
      refreshDecision();
    });
  });

  const notes = document.getElementById('dec-notes');
  if (notes) {
    notes.addEventListener('input', () => {
      state.decision.notes = notes.value;
      persist();
      autoResize(notes);
    });
    autoResize(notes);
  }
}

function attachAudioInboxListeners() {
  const upload = document.getElementById('audio-upload-input');
  upload?.addEventListener('change', async () => {
    await addAudioFiles(Array.from(upload.files || []));
    upload.value = '';
  });

  document.querySelectorAll('[data-audio-transcript]').forEach((textarea) => {
    textarea.addEventListener('input', () => {
      const id = textarea.dataset.audioTranscript;
      const item = state.audio.find((entry) => entry.id === id);
      if (!item) return;
      item.transcript = textarea.value;
      persist();
      autoResize(textarea);
    });
    autoResize(textarea);
  });

  document.querySelectorAll('[data-audio-stop]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('.audio-card');
      const audio = card?.querySelector('audio');
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    });
  });

  document.querySelectorAll('[data-audio-remove]').forEach((button) => {
    button.addEventListener('click', async () => {
      await removeAudioItem(button.dataset.audioRemove);
    });
  });
}

async function addAudioFiles(files) {
  const audioFiles = files.filter((file) => file.type.startsWith('audio/'));
  if (!audioFiles.length) return;

  for (const file of audioFiles) {
    const id = makeAudioId(file);
    try {
      await putAudioBlob(id, file);
      setAudioUrl(id, file);
      state.audio.push({
        id,
        name: file.name,
        transcript: '',
        addedAt: new Date().toISOString(),
      });
    } catch {
      showToastMessage(`Could not save ${file.name}`);
    }
  }

  persist();
  renderAudioInbox();
}

async function removeAudioItem(id) {
  if (!id) return;
  revokeAudioUrl(id);
  state.audio = state.audio.filter((item) => item.id !== id);
  try {
    await deleteAudioBlob(id);
  } catch {
    // Metadata removal still wins; stale blobs can be cleared by Reset.
  }
  persist();
  renderAudioInbox();
}

function copyAuditPrompt() {
  copyToClipboard(finalFreshCloneAuditPrompt());
}

function setFilter(filter) {
  currentFilter = FILTERS.some((item) => item.id === filter) ? filter : 'all';
  document.querySelectorAll('.filter-btn').forEach((button) => {
    const active = button.dataset.filter === currentFilter;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  applyFilter();
}

function itemMatchesFilter(status) {
  if (currentFilter === 'open') return status === 'not-tested';
  if (currentFilter === 'attention') return status === 'fail' || status === 'blocked';
  if (currentFilter === 'complete') return status === 'pass';
  return true;
}

function applyFilter() {
  let visibleCount = 0;
  document.querySelectorAll('.item-card').forEach((card) => {
    const status = card.dataset.status || 'not-tested';
    const visible = itemMatchesFilter(status);
    card.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  SECTIONS.forEach((section) => {
    const sectionEl = document.getElementById(`sec-${section.id}`);
    if (!sectionEl) return;
    const hasVisibleItems = Array.from(sectionEl.querySelectorAll('.item-card'))
      .some((card) => !card.hidden);
    sectionEl.hidden = !hasVisibleItems;
  });

  const empty = document.getElementById('filter-empty');
  if (empty) empty.hidden = visibleCount > 0;
}

function jumpToNextOpen() {
  const next = SECTIONS
    .flatMap((section) => section.items)
    .find((item) => getStatus(item.id) === 'not-tested');
  if (!next) {
    showToastMessage('All items tested');
    return;
  }

  if (currentFilter !== 'all' && currentFilter !== 'open') setFilter('all');
  const card = document.getElementById(`card-${next.id}`);
  card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card?.querySelector('.status-btn')?.focus({ preventScroll: true });
}

function refreshItemCard(id) {
  const status = getStatus(id);
  const card = document.getElementById(`card-${id}`);
  if (!card) return;

  card.className = `item-card${status !== 'not-tested' ? ` s-${status}` : ''}`;
  card.dataset.status = status;
  card.querySelectorAll('.status-btn').forEach((button) => {
    const isActive = button.dataset.status === status;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
  const timestampInput = document.getElementById(`testedAt-${id}`);
  if (timestampInput) timestampInput.value = getItemField(id, 'testedAt');
}

function refreshDecision() {
  document.querySelectorAll('.decision-option').forEach((button) => {
    const opt = DECISION_OPTS.find((item) => item.id === button.dataset.verdict);
    const selected = state.decision.verdict === button.dataset.verdict;
    button.className = `decision-option${selected && opt ? ` ${opt.cls}` : ''}`;
    button.setAttribute('aria-pressed', String(selected));
  });
}

function refreshAuditVerdict() {
  document.querySelectorAll('[data-audit-verdict]').forEach((button) => {
    const opt = AUDIT_OPTS.find((item) => item.id === button.dataset.auditVerdict);
    const selected = state.audit.verdict === button.dataset.auditVerdict;
    button.className = `audit-option${selected && opt ? ` ${opt.cls}` : ''}`;
    button.setAttribute('aria-pressed', String(selected));
  });
}

function refreshSmokeSession() {
  document.querySelectorAll('[data-run-field]').forEach((input) => {
    input.value = state.run?.[input.dataset.runField] || '';
  });
  const auditNotes = document.getElementById('audit-notes');
  if (auditNotes) {
    auditNotes.value = state.audit?.notes || '';
    autoResize(auditNotes);
  }
  refreshAuditVerdict();
}

function refreshProgress() {
  const count = totals();
  const fill = document.getElementById('progress-fill');
  const title = document.getElementById('progress-title');
  const pct = document.getElementById('progress-percent');
  const counts = document.getElementById('progress-counts');

  if (fill) fill.style.width = `${count.pct}%`;
  if (title) title.textContent = `${count.tested} of ${count.total} tested`;
  if (pct) pct.textContent = `${count.pct}%`;
  if (counts) {
    counts.innerHTML = `
      ${mkCountPill('pass', count.pass, 'pass')}
      ${mkCountPill('fail', count.fail, 'fail')}
      ${mkCountPill('blocked', count.blocked, 'blocked')}
      ${mkCountPill('nt', count.nt, 'not tested')}
    `;
  }

  updateReadinessSummary(count);

  SECTIONS.forEach((section) => {
    const tally = document.getElementById(`tally-${section.id}`);
    if (!tally) return;
    let tested = 0;
    let fail = 0;
    let blocked = 0;
    section.items.forEach((item) => {
      const status = getStatus(item.id);
      if (status !== 'not-tested') tested += 1;
      if (status === 'fail') fail += 1;
      if (status === 'blocked') blocked += 1;
    });
    const warnings = [
      fail ? `${fail} fail` : '',
      blocked ? `${blocked} blocked` : '',
    ].filter(Boolean);
    tally.textContent = `${tested}/${section.items.length}${warnings.length ? ` - ${warnings.join(', ')}` : ''}`;
  });

  applyFilter();
}

function mkCountPill(cls, value, label) {
  return `
    <span class="count-pill count-${cls}">
      <span class="count-dot"></span>
      <span>${value} ${label}</span>
    </span>
  `;
}

function updateReadinessSummary(count) {
  const summary = document.getElementById('readiness-summary');
  if (!summary) return;

  let tone = 'neutral';
  let text = `${count.nt} items remain unchecked.`;
  if (state.audit?.verdict === 'hold') {
    tone = 'attention';
    text = 'Fresh clone audit is HOLD - BLOCKER FOUND. Do not start live smoke.';
  } else if (state.audit?.verdict !== 'ready') {
    tone = 'attention';
    text = 'Fresh clone audit verdict is not recorded as READY FOR DAVIS-ONLY SMOKE.';
  } else if (count.fail || count.blocked) {
    tone = 'attention';
    text = `${count.fail + count.blocked} item${count.fail + count.blocked === 1 ? '' : 's'} need attention before smoke.`;
  } else if (count.nt === 0) {
    tone = 'ready';
    text = 'All checklist items are tested. Record the final decision before smoke.';
  }

  summary.className = `readiness-summary ${tone}`;
  summary.textContent = text;
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

function plainText(text) {
  return text.replace(/`([^`]+)`/g, '$1');
}

function itemEvidence(id) {
  const item = state.items[id] || {};
  return {
    caseNumber: item.caseNumber || '',
    evidenceLink: item.evidenceLink || '',
    testedAt: item.testedAt || '',
    notes: item.notes || '',
  };
}

function appendEvidence(md, evidence) {
  const lines = [];
  if (evidence.caseNumber.trim()) lines.push(`  - Case: ${evidence.caseNumber.trim()}`);
  if (evidence.evidenceLink.trim()) lines.push(`  - Evidence: ${evidence.evidenceLink.trim()}`);
  if (evidence.testedAt.trim()) lines.push(`  - Timestamp: ${evidence.testedAt.trim()}`);
  if (evidence.notes.trim()) lines.push(`  - Notes: ${evidence.notes.trim().replace(/\n/g, '\n    ')}`);
  return lines.length ? `${md}${lines.join('\n')}\n` : `${md}  - Evidence: _(none recorded)_\n`;
}

function exportSummary() {
  const now = new Date().toISOString();
  const decision = state.decision || { verdict: null, notes: '' };
  const option = DECISION_OPTS.find((item) => item.id === decision.verdict);
  const audit = state.audit || defaultState().audit;
  const auditOpt = AUDIT_OPTS.find((item) => item.id === audit.verdict);
  const run = state.run || defaultState().run;
  const count = totals();

  let md = '';
  md += '# Meridian Port - Hybrid Auto-Close Smoke Test - PR #7\n';
  md += `**Exported:** ${now}\n\n`;
  md += '## Context\n';
  md += '- HYBRID_AUTO_CLOSE_LIVE: true (PR #7)\n';
  md += '- PASSIVE_CLOSE_LIVE: false (must remain off)\n';
  md += '- Scope: Davis / trusted cohort only - Hapag-Lloyd IDT Export Rail\n\n';
  md += '## Smoke Session\n';
  md += `- Tester: ${run.tester?.trim() || '_Not recorded_'}\n`;
  md += `- Environment URL: ${run.environmentUrl?.trim() || '_Not recorded_'}\n`;
  md += `- Fresh clone audit verdict: ${auditOpt ? auditOpt.label : '_Not recorded_'}\n`;
  if (audit.notes?.trim()) md += `- Fresh clone audit notes: ${audit.notes.trim().replace(/\n/g, '\n  ')}\n`;
  md += '\n';
  md += '## Summary\n';
  md += `- Pass: ${count.pass}\n`;
  md += `- Fail: ${count.fail}\n`;
  md += `- Blocked: ${count.blocked}\n`;
  md += `- Not tested: ${count.nt}\n`;
  md += `- Tested: ${count.tested}/${count.total} (${count.pct}%)\n\n`;
  md += '## Final Decision\n';
  md += `**Verdict:** ${option ? option.label : '_Not yet recorded_'}\n`;
  if (decision.notes?.trim()) md += `**Notes:** ${decision.notes.trim()}\n`;
  md += '\n';

  const badItems = [];
  SECTIONS.forEach((section) => {
    section.items.forEach((item) => {
      const status = getStatus(item.id);
      if (status === 'fail' || status === 'blocked') {
        badItems.push({ section, item, status, evidence: itemEvidence(item.id) });
      }
    });
  });

  md += '## Failed / Blocked Items\n\n';
  if (!badItems.length) {
    md += '_None. All tested items passed or are not yet tested._\n\n';
  } else {
    let lastSectionId = null;
    badItems.forEach(({ section, item, status, evidence }) => {
      if (lastSectionId !== section.id) {
        md += `### ${section.num}. ${section.title}\n`;
        lastSectionId = section.id;
      }
      md += `- ${status.toUpperCase()} - ${plainText(item.text)}\n`;
      md = appendEvidence(md, evidence);
    });
    md += '\n';
  }

  const evidenceItems = [];
  SECTIONS.forEach((section) => {
    section.items.forEach((item) => {
      const evidence = itemEvidence(item.id);
      const hasEvidence = ['caseNumber', 'evidenceLink', 'testedAt', 'notes']
        .some((key) => evidence[key]?.trim());
      if (hasEvidence && getStatus(item.id) !== 'not-tested') {
        evidenceItems.push({ section, item, status: getStatus(item.id), evidence });
      }
    });
  });

  md += '## Recorded Smoke Evidence\n\n';
  if (!evidenceItems.length) {
    md += '_No item evidence recorded._\n\n';
  } else {
    evidenceItems.forEach(({ section, item, status, evidence }) => {
      md += `- ${section.num}.${section.items.indexOf(item) + 1} ${status.toUpperCase()} - ${plainText(item.text)}\n`;
      md = appendEvidence(md, evidence);
    });
    md += '\n';
  }

  md += '---\n';
  md += '*This checklist validates the scoped hybrid auto-close trial only.*\n';
  md += '*Do not use as proof of broad PASSIVE_CLOSE_LIVE readiness.*\n';

  copyToClipboard(md);
}

function copyToClipboard(text, toastText = 'Copied to clipboard') {
  const showToast = () => showToastMessage(toastText);

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(showToast).catch(() => fallbackCopy(text, showToast));
  } else {
    fallbackCopy(text, showToast);
  }
}

function showToastMessage(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2400);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      updatePwaState('Offline cache unavailable');
    });
  });
}

function setupPwaControls() {
  const installButton = document.getElementById('btn-install');
  updatePwaState(navigator.onLine ? 'Online' : 'Offline ready');

  window.addEventListener('online', () => updatePwaState('Online'));
  window.addEventListener('offline', () => updatePwaState('Offline ready'));

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (installButton) installButton.hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (installButton) installButton.hidden = true;
    updatePwaState('Installed');
  });

  installButton?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.hidden = true;
  });

  if (window.matchMedia('(display-mode: standalone)').matches && installButton) {
    installButton.hidden = true;
    updatePwaState('Installed');
  }
}

function updatePwaState(label) {
  const stateEl = document.getElementById('pwa-state');
  if (!stateEl) return;
  stateEl.textContent = label;
  stateEl.classList.toggle('is-offline', !navigator.onLine);
}

function fallbackCopy(text, onDone) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
  } catch {
    // Clipboard fallback is best-effort.
  }
  document.body.removeChild(textarea);
  onDone();
}

async function resetAll() {
  const ok = window.confirm(
    'Reset all checklist state?\n\nThis clears every status, evidence field, audit verdict, audio report, note, and final decision.'
  );
  if (!ok) return;
  revokeAllAudioUrls();
  state = defaultState();
  try {
    await clearAudioStore();
  } catch {
    showToastMessage('Audio store could not be cleared');
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
  renderSections();
  renderAudioInbox();
  refreshProgress();
  refreshSavedTime();
  refreshSmokeSession();
}

function refreshSavedTime() {
  const saved = document.getElementById('last-saved');
  if (!saved) return;
  saved.textContent = state.savedAt
    ? `Saved ${new Date(state.savedAt).toLocaleTimeString()}`
    : 'Not yet saved';
}

async function init() {
  await hydrateAudioUrls();
  renderShell();
  renderSections();
  renderAudioInbox();
  refreshProgress();
  refreshSavedTime();
  setupPwaControls();
  registerServiceWorker();
  attachShellListeners();
}

function attachShellListeners() {
  document.getElementById('btn-reset')?.addEventListener('click', resetAll);
  document.getElementById('btn-export')?.addEventListener('click', exportSummary);
  document.getElementById('btn-audit-top')?.addEventListener('click', copyAuditPrompt);
  document.getElementById('btn-next-open')?.addEventListener('click', jumpToNextOpen);
  attachSmokeSessionListeners();
  document.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => setFilter(button.dataset.filter));
  });
}

init();
