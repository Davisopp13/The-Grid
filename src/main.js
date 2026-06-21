import './styles.css';

const STORAGE_KEY = 'meridian_smoke_pr7_v2';

const SECTIONS = [
  {
    id: 's1',
    num: 1,
    title: 'Pre-flight Gates',
    short: 'Gates',
    items: [
      { id: 'p1', text: 'PR #7 / preview build is deployed and active on the test environment (Vercel preview URL confirmed).' },
      { id: 'p2', text: '`PASSIVE_CLOSE_LIVE = false` confirmed in the deployed build (Vercel env vars or feature-flag config).' },
      { id: 'p3', text: '`HYBRID_AUTO_CLOSE_LIVE = true` confirmed in the deployed build.' },
      { id: 'p4', text: 'Hybrid access is active for the test user: `state.hybridAccessConfirmed === true` - visible via widget console log or monitor panel header.' },
      { id: 'p5', text: 'Monitor panel loads without error - no red banners, no uncaught exceptions in browser console.' },
      { id: 'p6', text: 'Precision panel correctly handles an RPC failure - does NOT show a false empty-state; error state is visually distinct from genuine no-data.' },
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
      { id: 'r7', text: 'Linked observation in `passive_observations` is marked auto-closed (`review_action = "auto"`, `promoted_event_id` populated).' },
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
      { id: 'rc6', text: 'Linked observation in `passive_observations` is marked auto-closed (`review_action = "auto"`, `promoted_event_id` populated).' },
      { id: 'rc7', text: 'Monitor panel reflects the passive close for the reclassified case.' },
    ],
  },
  {
    id: 's4',
    num: 4,
    title: 'Low-confidence / Shadow-only Smoke',
    short: 'Shadow',
    items: [
      { id: 'lc1', text: 'Trigger or observe a low-confidence or non-promoted candidate (confidence below promotion threshold).' },
      { id: 'lc2', text: 'Shadow observation may be recorded in `passive_observations` (check Supabase: row exists but `review_action` is null or pending, NOT `"auto"`).' },
      { id: 'lc3', text: 'No production close happens for this candidate - no `case_events` row written with `source = "passive_auto"`.' },
      { id: 'lc4', text: 'Tracked case remains open in Meridian - low-confidence signal did NOT trigger an auto-close.' },
    ],
  },
  {
    id: 's5',
    num: 5,
    title: 'No-tracked-case Safety Smoke',
    short: 'Safety',
    items: [
      { id: 'nt1', text: 'Observe passive detection firing for a case that is NOT currently in `state.cases` (not tracked in this session).' },
      { id: 'nt2', text: 'No production close happens - no `case_events` write, no session state change for the untracked case.' },
      { id: 'nt3', text: 'Safety invariant confirmed: passive detection can only close a case that is actively tracked. No tracked case -> close nothing.' },
    ],
  },
  {
    id: 's6',
    num: 6,
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

let state = loadState();

function defaultState() {
  return { items: {}, decision: { verdict: null, notes: '' }, savedAt: null };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
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

function ensureItem(id) {
  if (!state.items[id]) state.items[id] = { status: 'not-tested', notes: '' };
}

function setStatus(id, status) {
  ensureItem(id);
  state.items[id].status = status;
  persist();
  refreshItemCard(id);
  refreshProgress();
}

function setNotes(id, notes) {
  ensureItem(id);
  state.items[id].notes = notes;
  persist();
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
    </div>

    <header class="app-header">
      <a class="brand" href="#top" aria-label="Meridian smoke test home">
        <span class="brand-mark"><img src="/meridian-mark-192.png" alt="" /></span>
        <span>
          <span class="brand-name">Meridian</span>
          <span class="brand-subtitle">Hybrid Auto-Close Smoke Test</span>
        </span>
      </a>
      <div class="header-meta" aria-label="Trial context">
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
      </section>

      <div class="section-nav" id="section-nav" aria-label="Checklist sections"></div>
      <div id="section-container"></div>
    </main>

    <div class="toast" id="toast">Copied to clipboard</div>

    <footer class="bottom-bar">
      <span class="last-saved" id="last-saved">Not yet saved</span>
      <button class="btn btn-secondary" id="btn-reset" type="button">Reset</button>
      <button class="btn btn-primary" id="btn-export" type="button">Export Summary</button>
    </footer>
  `;
}

function renderSections() {
  const nav = document.getElementById('section-nav');
  const container = document.getElementById('section-container');

  nav.innerHTML = SECTIONS.map((section) => `
    <a class="section-link" href="#sec-${section.id}">
      <span>${section.num}</span>${esc(section.short)}
    </a>
  `).join('');

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
        <article class="${cardClass}" id="card-${item.id}">
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
    <section class="section decision-section" id="sec-s7">
      <div class="section-head">
        <div>
          <div class="section-number">Section 7</div>
          <h2>Final Decision</h2>
        </div>
      </div>
      <div class="decision-card">
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
}

function attachDecisionListeners() {
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

function refreshItemCard(id) {
  const status = getStatus(id);
  const card = document.getElementById(`card-${id}`);
  if (!card) return;

  card.className = `item-card${status !== 'not-tested' ? ` s-${status}` : ''}`;
  card.querySelectorAll('.status-btn').forEach((button) => {
    const isActive = button.dataset.status === status;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function refreshDecision() {
  document.querySelectorAll('.decision-option').forEach((button) => {
    const opt = DECISION_OPTS.find((item) => item.id === button.dataset.verdict);
    const selected = state.decision.verdict === button.dataset.verdict;
    button.className = `decision-option${selected && opt ? ` ${opt.cls}` : ''}`;
    button.setAttribute('aria-pressed', String(selected));
  });
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
}

function mkCountPill(cls, value, label) {
  return `
    <span class="count-pill count-${cls}">
      <span class="count-dot"></span>
      <span>${value} ${label}</span>
    </span>
  `;
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

function exportSummary() {
  const now = new Date().toISOString();
  const decision = state.decision || { verdict: null, notes: '' };
  const option = DECISION_OPTS.find((item) => item.id === decision.verdict);
  const count = totals();

  let md = '';
  md += '# Meridian - Hybrid Auto-Close Smoke Test - PR #7\n';
  md += `**Exported:** ${now}\n\n`;
  md += '## Context\n';
  md += '- HYBRID_AUTO_CLOSE_LIVE: true (PR #7)\n';
  md += '- PASSIVE_CLOSE_LIVE: false (must remain off)\n';
  md += '- Scope: Davis / trusted cohort only - Hapag-Lloyd IDT Export Rail\n\n';
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
        badItems.push({ section, item, status, notes: getNotes(item.id) });
      }
    });
  });

  md += '## Failed / Blocked Items\n\n';
  if (!badItems.length) {
    md += '_None. All tested items passed or are not yet tested._\n\n';
  } else {
    let lastSectionId = null;
    badItems.forEach(({ section, item, status, notes }) => {
      if (lastSectionId !== section.id) {
        md += `### ${section.num}. ${section.title}\n`;
        lastSectionId = section.id;
      }
      md += `- ${status.toUpperCase()} - ${item.text.replace(/`([^`]+)`/g, '$1')}\n`;
      md += notes?.trim()
        ? `  > ${notes.trim().replace(/\n/g, '\n  > ')}\n`
        : '  > _(no notes)_\n';
    });
    md += '\n';
  }

  md += '---\n';
  md += '*This checklist validates the scoped hybrid auto-close trial only.*\n';
  md += '*Do not use as proof of broad PASSIVE_CLOSE_LIVE readiness.*\n';

  copyToClipboard(md);
}

function copyToClipboard(text) {
  const showToast = () => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 2400);
  };

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(showToast).catch(() => fallbackCopy(text, showToast));
  } else {
    fallbackCopy(text, showToast);
  }
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

function resetAll() {
  const ok = window.confirm(
    'Reset all checklist state?\n\nThis clears every status, note, and final decision.'
  );
  if (!ok) return;
  state = defaultState();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
  renderSections();
  refreshProgress();
  refreshSavedTime();
}

function refreshSavedTime() {
  const saved = document.getElementById('last-saved');
  if (!saved) return;
  saved.textContent = state.savedAt
    ? `Saved ${new Date(state.savedAt).toLocaleTimeString()}`
    : 'Not yet saved';
}

function init() {
  renderShell();
  renderSections();
  refreshProgress();
  refreshSavedTime();

  document.getElementById('btn-reset')?.addEventListener('click', resetAll);
  document.getElementById('btn-export')?.addEventListener('click', exportSummary);
}

init();
