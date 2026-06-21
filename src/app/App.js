import '../styles.css';
import { GRID_NAV_ITEMS } from '../grid/navigation/navigation.js';
import { PROJECT_REGISTRY, getActiveProject } from '../grid/projectRegistry/projectRegistry.js';
import { GRID_KEYS, GRID_STORAGE_KEYS, LEGACY_MERIDIAN_KEY } from '../grid/settings/storageKeys.js';
import { exportGridData, importGridData, clearGridLocalData } from '../grid/settings/gridData.js';
import { loadReports, clearReports } from '../grid/reports/reportsStorage.js';
import {
  clearAudioStore,
  deleteAudioBlob,
  getAudioBlob,
  loadInbox,
  persistInbox,
  putAudioBlob,
} from '../grid/inbox/audioStorage.js';
import {
  MERIDIAN_AUDIT_OPTS,
  MERIDIAN_DECISION_OPTS,
  MERIDIAN_SECTIONS,
} from '../ports/meridian/meridianChecklistData.js';
import { MERIDIAN_PROMPTS, finalFreshCloneAuditPrompt } from '../ports/meridian/meridianAuditPrompt.js';
import {
  clearMeridianExports,
  clearMeridianState,
  defaultMeridianState,
  getMeridianExports,
  loadMeridianState,
  persistMeridianState,
  saveMeridianExport,
} from '../ports/meridian/meridianStorage.js';
import { buildMeridianExport } from '../ports/meridian/meridianExport.js';
import {
  renderMeridianPortView as renderMeridianPortViewMarkup,
  renderMeridianSectionNav,
  renderMeridianSectionsMarkup,
} from '../ports/meridian/MeridianPort.js';
import { renderGridShell } from '../shell/GridShell.js';
import { esc, fmtText } from '../shared/components/text.js';

const DEFAULT_PORT = 'meridian-port';
const DEFAULT_VIEW = 'command';

let currentFilter = 'all';
let deferredInstallPrompt = null;
let activeView = localStorage.getItem(GRID_KEYS.activeView) || DEFAULT_VIEW;
let activePortId = localStorage.getItem(GRID_KEYS.activePort) || DEFAULT_PORT;
let meridianState = loadMeridianState();
let inboxItems = loadInbox();
let reports = loadReports();
const audioUrls = new Map();
let pwaEventsBound = false;

function setActiveView(view) {
  activeView = GRID_NAV_ITEMS.some((item) => item.id === view) ? view : DEFAULT_VIEW;
  localStorage.setItem(GRID_KEYS.activeView, activeView);
  renderApp();
}

function setActivePort(portId) {
  activePortId = PROJECT_REGISTRY.some((project) => project.id === portId) ? portId : DEFAULT_PORT;
  localStorage.setItem(GRID_KEYS.activePort, activePortId);
  renderApp();
}

function persistMeridian() {
  persistMeridianState(meridianState);
  refreshSavedTime();
}

function getStatus(id) {
  return meridianState.items[id]?.status || 'not-tested';
}

function getNotes(id) {
  return meridianState.items[id]?.notes || '';
}

function getItemField(id, key) {
  return meridianState.items[id]?.[key] || '';
}

function ensureItem(id) {
  if (!meridianState.items[id]) {
    meridianState.items[id] = {
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
  meridianState.items[id].status = status;
  if (status !== 'not-tested' && !meridianState.items[id].testedAt) {
    meridianState.items[id].testedAt = new Date().toISOString();
  }
  persistMeridian();
  refreshItemCard(id);
  refreshProgress();
  refreshCommandCards();
}

function setNotes(id, notes) {
  ensureItem(id);
  meridianState.items[id].notes = notes;
  persistMeridian();
}

function setItemField(id, key, value) {
  ensureItem(id);
  meridianState.items[id][key] = value;
  persistMeridian();
}

function totals() {
  let total = 0;
  let pass = 0;
  let fail = 0;
  let blocked = 0;
  let nt = 0;

  MERIDIAN_SECTIONS.forEach((section) => {
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

function nextUncheckedItem() {
  for (const section of MERIDIAN_SECTIONS) {
    const item = section.items.find((entry) => getStatus(entry.id) === 'not-tested');
    if (item) return { section, item };
  }
  return null;
}

function activeAuditLabel() {
  return MERIDIAN_AUDIT_OPTS.find((opt) => opt.id === meridianState.audit?.verdict)?.label || 'Not run';
}

function activeDecisionLabel() {
  return MERIDIAN_DECISION_OPTS.find((opt) => opt.id === meridianState.decision?.verdict)?.label || 'Not yet recorded';
}

function inboxCountForPort(portId = activePortId) {
  return inboxItems.filter((item) => item.port === portId).length;
}

function renderApp() {
  const project = getActiveProject(activePortId);
  document.getElementById('app').innerHTML = renderGridShell({
    activePortId,
    activeView,
    content: renderActiveView(project),
    navItems: GRID_NAV_ITEMS,
    project,
    projects: PROJECT_REGISTRY,
  });

  attachShellListeners();
  setupPwaControls();
  refreshSavedTime();
}

function renderActiveView(project) {
  if (activeView === 'ports') return renderPortsView(project);
  if (activeView === 'audio') return renderAudioInboxView();
  if (activeView === 'reports') return renderReportsView();
  if (activeView === 'prompts') return renderPromptsView();
  if (activeView === 'settings') return renderSettingsView();
  if (activeView === 'command') return renderCommandView(project);
  return renderMeridianPortView();
}

function renderCommandView(project) {
  const count = totals();
  const next = nextUncheckedItem();
  const latestReport = reports[0] || getMeridianExports()[0];
  return `
    <section class="hero grid-command-hero" aria-labelledby="grid-title">
      <div class="hero-copy">
        <div class="eyebrow">Operations shell</div>
        <h1 id="grid-title">The Grid</h1>
        <p>Structured project operations for prompts, smoke evidence, reports, and audio. Telegram stays the fast command line; this is the current-state dashboard.</p>
      </div>
      <aside class="status-panel" aria-label="Active port">
        <div class="flag-row"><span>Active Port</span><strong>${esc(project.name)}</strong></div>
        <div class="flag-row critical"><span>Mode</span><strong>Local-first MVP</strong></div>
        <div class="flag-note">No Supabase writes, no Hermes API, no backend ingest.</div>
      </aside>
    </section>

    <section class="grid-card-grid" id="command-cards">
      ${renderCommandCards(count, next, latestReport)}
    </section>
  `;
}

function renderCommandCards(count = totals(), next = nextUncheckedItem(), latestReport = reports[0] || getMeridianExports()[0]) {
  return `
    <article class="grid-card">
      <div class="panel-label">Active Port</div>
      <h2>Meridian Port</h2>
      <p>Readiness, smoke tests, evidence, prompts, reports, and audio for Meridian PR #7.</p>
      <button class="btn btn-primary" type="button" data-grid-view="ports">Open Port</button>
    </article>
    <article class="grid-card">
      <div class="panel-label">Fresh Clone Audit Verdict</div>
      <h2>${esc(activeAuditLabel())}</h2>
      <p>Gate live smoke with source-of-truth PR evidence.</p>
    </article>
    <article class="grid-card">
      <div class="panel-label">Smoke Progress</div>
      <h2>${count.tested}/${count.total} tested</h2>
      <p>${count.pass} pass, ${count.fail} fail, ${count.blocked} blocked, ${count.nt} not tested.</p>
    </article>
    <article class="grid-card">
      <div class="panel-label">Next Unchecked Item</div>
      <h2>${next ? esc(`${next.section.num}.${next.section.items.indexOf(next.item) + 1}`) : 'Done'}</h2>
      <p>${next ? fmtText(next.item.text) : 'All smoke checklist items have a recorded status.'}</p>
    </article>
    <article class="grid-card">
      <div class="panel-label">Final Decision</div>
      <h2>${esc(activeDecisionLabel())}</h2>
      <p>Decision is kept inside Meridian Port so the port can spin off later.</p>
    </article>
    <article class="grid-card">
      <div class="panel-label">Latest Export</div>
      <h2>${latestReport?.createdAt ? new Date(latestReport.createdAt).toLocaleString() : 'None yet'}</h2>
      <p>Exports are saved locally under Grid report storage.</p>
    </article>
    <article class="grid-card">
      <div class="panel-label">Audio Inbox</div>
      <h2>${inboxCountForPort()} item${inboxCountForPort() === 1 ? '' : 's'}</h2>
      <p>Manual/local report inbox. No server ingress yet.</p>
      <button class="btn btn-secondary" type="button" data-grid-view="audio">Open Audio</button>
    </article>
  `;
}

function refreshCommandCards() {
  const container = document.getElementById('command-cards');
  if (container) container.innerHTML = renderCommandCards();
}

function renderPortsView(project) {
  return `
    <section class="hero" aria-labelledby="ports-title">
      <div class="hero-copy">
        <div class="eyebrow">Project ports</div>
        <h1 id="ports-title">Ports</h1>
        <p>Each project gets a maintenance surface with status, next action, evidence, prompts, reports, and inbox flow.</p>
      </div>
      <aside class="status-panel">
        <div class="flag-row"><span>Selected</span><strong>${esc(project.name)}</strong></div>
        <div class="flag-note">Meridian Port is isolated as the first module.</div>
      </aside>
    </section>
    <section class="grid-card-grid">
      ${PROJECT_REGISTRY.map((entry) => `
        <article class="grid-card port-card${entry.id === activePortId ? ' is-active' : ''}">
          <div class="panel-label">${esc(entry.status)}</div>
          <h2>${esc(entry.name)}</h2>
          <p>${esc(entry.summary)}</p>
          <div class="port-tags">
            ${entry.sections.map((section) => `<span>${esc(section)}</span>`).join('')}
          </div>
          <button class="btn btn-primary" type="button" data-port-id="${entry.id}">Open ${esc(entry.name)}</button>
        </article>
      `).join('')}
    </section>
    ${renderMeridianPortView()}
  `;
}

function renderMeridianPortView() {
  return renderMeridianPortViewMarkup({ state: meridianState, currentFilter });
}

function renderMeridianSections() {
  const nav = document.getElementById('section-nav');
  const container = document.getElementById('section-container');
  if (!nav || !container) return;

  nav.innerHTML = renderMeridianSectionNav();
  container.innerHTML = renderMeridianSectionsMarkup({ state: meridianState });
  MERIDIAN_SECTIONS.forEach((section) => section.items.forEach((item) => attachItemListeners(item.id)));
  attachDecisionListeners();
  refreshProgress();
}

function renderAudioInboxView() {
  return `
    <section class="hero" aria-labelledby="audio-title">
      <div class="hero-copy">
        <div class="eyebrow">Manual local inbox</div>
        <h1 id="audio-title">Audio Inbox</h1>
        <p>Store Tron reports, transcripts, pasted notes, and browser-playable audio without Telegram playback chaining. MVP is manual import only.</p>
      </div>
      <aside class="status-panel">
        <div class="flag-row"><span>Ingress</span><strong>Manual</strong></div>
        <div class="flag-row critical"><span>Backend</span><strong>None</strong></div>
        <div class="flag-note">Future versions can add webhook/API/local-folder ingress.</div>
      </aside>
    </section>
    ${renderInboxComposer()}
    <section class="section audio-inbox" id="audio-inbox" aria-labelledby="audio-inbox-title">
      <div class="section-head">
        <div>
          <div class="section-number">Audio Inbox</div>
          <h2 id="audio-inbox-title">Tron Audio Reports</h2>
        </div>
        <span class="section-tally">${inboxItems.length} item${inboxItems.length === 1 ? '' : 's'}</span>
      </div>
      <div class="audio-list">
        ${inboxItems.length ? inboxItems.map((item) => renderAudioItem(item)).join('') : '<div class="audio-empty">No reports yet. Add a manual entry to start the Grid inbox.</div>'}
      </div>
    </section>
  `;
}

function renderInboxComposer() {
  return `
    <section class="session-panel" aria-labelledby="inbox-compose-title">
      <div class="session-head">
        <div>
          <div class="panel-label">New Entry</div>
          <h2 id="inbox-compose-title">Add audio/report entry</h2>
        </div>
      </div>
      <div class="run-fields inbox-fields">
        <label class="run-field" for="inbox-title"><span>Title</span><input id="inbox-title" placeholder="Tron report title" /></label>
        <label class="run-field" for="inbox-port"><span>Port / project</span>
          <select id="inbox-port">
            ${PROJECT_REGISTRY.map((project) => `<option value="${project.id}" ${project.id === activePortId ? 'selected' : ''}>${esc(project.name)}</option>`).join('')}
          </select>
        </label>
        <label class="run-field" for="inbox-audio-url"><span>Audio URL</span><input id="inbox-audio-url" placeholder="Optional local/object/external URL" /></label>
        <label class="run-field audio-file-field" for="inbox-audio-file"><span>Upload audio</span><input id="inbox-audio-file" type="file" accept="audio/*" /></label>
      </div>
      <label class="audio-transcript-wrap" for="inbox-transcript">
        <span>Transcript / notes</span>
        <textarea id="inbox-transcript" class="audio-transcript" placeholder="Paste report text or transcript"></textarea>
      </label>
      <div class="composer-actions">
        <button class="btn btn-primary" id="btn-add-inbox" type="button">Add Entry</button>
        <button class="btn btn-secondary" id="btn-clear-inbox" type="button">Clear Inbox</button>
      </div>
    </section>
  `;
}

function renderAudioItem(item) {
  const src = audioUrls.get(item.id) || item.audioUrl || '';
  const project = getActiveProject(item.port);
  return `
    <article class="audio-card" data-audio-id="${esc(item.id)}">
      <div class="audio-card-head">
        <div>
          <div class="audio-name">${esc(item.title || item.name || 'Untitled report')}</div>
          <div class="audio-added">${esc(project.name)} - Added ${new Date(item.addedAt).toLocaleString()}</div>
        </div>
        <button class="btn btn-secondary btn-audio-remove" type="button" data-audio-remove="${esc(item.id)}">Remove</button>
      </div>
      ${src ? `
        <div class="audio-controls-row">
          <audio controls preload="metadata" src="${esc(src)}"></audio>
          <button class="btn btn-secondary btn-audio-stop" type="button" data-audio-stop="${esc(item.id)}">Stop</button>
        </div>
      ` : ''}
      <label class="audio-transcript-wrap" for="audio-transcript-${esc(item.id)}">
        <span>Transcript / notes</span>
        <textarea id="audio-transcript-${esc(item.id)}" class="audio-transcript" data-audio-transcript="${esc(item.id)}" placeholder="Paste or draft report transcript">${esc(item.transcript || '')}</textarea>
      </label>
    </article>
  `;
}

function renderReportsView() {
  const meridianExports = getMeridianExports();
  const reportMap = new Map();
  [...reports, ...meridianExports.map((entry) => ({
    ...entry,
    body: entry.markdown,
    title: entry.title || 'Meridian smoke export',
  }))].forEach((report) => reportMap.set(report.id, report));
  const allReports = Array.from(reportMap.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const latest = allReports[0];
  return `
    <section class="hero" aria-labelledby="reports-title">
      <div class="hero-copy">
        <div class="eyebrow">Local reports</div>
        <h1 id="reports-title">Reports</h1>
        <p>Saved/exported Meridian smoke summaries live here for copy, review, and download.</p>
      </div>
      <aside class="status-panel">
        <div class="flag-row"><span>Saved</span><strong>${allReports.length}</strong></div>
        <div class="flag-note">Reports are local browser data for MVP.</div>
      </aside>
    </section>
    <section class="section">
      <div class="section-head">
        <div>
          <div class="section-number">Latest Export</div>
          <h2>${latest ? esc(latest.title || 'Report') : 'No report saved yet'}</h2>
        </div>
        ${latest ? `<button class="btn btn-primary" data-copy-report="${esc(latest.id)}" type="button">Copy Latest</button>` : ''}
      </div>
      ${latest ? `<textarea class="report-preview" readonly>${esc(latest.body || latest.markdown || '')}</textarea>` : '<div class="audio-empty">Use Export Summary from Meridian Port to save the first report.</div>'}
    </section>
    <section class="grid-card-grid">
      ${allReports.map((report) => `
        <article class="grid-card">
          <div class="panel-label">${new Date(report.createdAt).toLocaleString()}</div>
          <h2>${esc(report.title || 'Report')}</h2>
          <p>${esc(getActiveProject(report.port || DEFAULT_PORT).name)}</p>
          <button class="btn btn-secondary" data-copy-report="${esc(report.id)}" type="button">Copy</button>
        </article>
      `).join('')}
    </section>
  `;
}

function renderPromptsView() {
  return `
    <section class="hero" aria-labelledby="prompts-title">
      <div class="hero-copy">
        <div class="eyebrow">Prompt library</div>
        <h1 id="prompts-title">Prompts</h1>
        <p>Reusable Meridian Port prompts. Source-code audit belongs here, not inside the live smoke checklist.</p>
      </div>
      <aside class="status-panel">
        <div class="flag-row"><span>Prompt Cards</span><strong>${MERIDIAN_PROMPTS.length}</strong></div>
        <div class="flag-note">Copy prompts into Telegram/Codex as needed.</div>
      </aside>
    </section>
    <section class="grid-card-grid">
      ${MERIDIAN_PROMPTS.map((prompt) => `
        <article class="grid-card prompt-card">
          <div class="panel-label">Meridian Port</div>
          <h2>${esc(prompt.title)}</h2>
          <p>${esc(prompt.description)}</p>
          <textarea class="prompt-preview" readonly>${esc(prompt.getText())}</textarea>
          <button class="btn btn-primary" data-copy-prompt="${esc(prompt.id)}" type="button">Copy Prompt</button>
        </article>
      `).join('')}
    </section>
  `;
}

function renderSettingsView() {
  return `
    <section class="hero" aria-labelledby="settings-title">
      <div class="hero-copy">
        <div class="eyebrow">Local-first controls</div>
        <h1 id="settings-title">Settings</h1>
        <p>Export/import Grid data, inspect namespace keys, and clear local MVP state. No backend is involved.</p>
      </div>
      <aside class="status-panel">
        <div class="flag-row"><span>Storage</span><strong>localStorage + IndexedDB</strong></div>
        <div class="flag-note">Static PWA cannot receive live Tron messages without future ingress.</div>
      </aside>
    </section>
    <section class="section">
      <div class="section-head">
        <div>
          <div class="section-number">Grid Data</div>
          <h2>Export / import / clear</h2>
        </div>
      </div>
      <div class="settings-actions">
        <button class="btn btn-primary" id="btn-grid-export-json" type="button">Export Grid JSON</button>
        <label class="audio-upload settings-import" for="grid-import-file">
          <span>Import Grid JSON</span>
          <input id="grid-import-file" type="file" accept="application/json,.json" />
        </label>
        <button class="btn btn-secondary" id="btn-grid-clear" type="button">Clear Local Grid Data</button>
      </div>
      <div class="settings-key-list">
        ${GRID_STORAGE_KEYS.map((key) => `<code>${esc(key)}</code>`).join('')}
      </div>
    </section>
  `;
}

function attachShellListeners() {
  document.querySelectorAll('[data-grid-view]').forEach((button) => {
    button.addEventListener('click', () => setActiveView(button.dataset.gridView));
  });
  document.querySelectorAll('[data-port-id]').forEach((button) => {
    button.addEventListener('click', () => {
      activeView = 'ports';
      localStorage.setItem(GRID_KEYS.activeView, activeView);
      setActivePort(button.dataset.portId);
    });
  });
  document.getElementById('port-switcher-select')?.addEventListener('change', (event) => {
    setActivePort(event.target.value);
  });

  document.getElementById('btn-reset')?.addEventListener('click', resetMeridianPort);
  document.getElementById('btn-export')?.addEventListener('click', exportSummary);
  document.getElementById('btn-audit-top')?.addEventListener('click', copyAuditPrompt);
  document.getElementById('btn-next-open')?.addEventListener('click', jumpToNextOpen);
  document.getElementById('btn-audit-session')?.addEventListener('click', copyAuditPrompt);
  document.getElementById('btn-add-inbox')?.addEventListener('click', addInboxEntry);
  document.getElementById('btn-clear-inbox')?.addEventListener('click', clearInbox);
  document.getElementById('btn-grid-export-json')?.addEventListener('click', exportGridJson);
  document.getElementById('grid-import-file')?.addEventListener('change', importGridJson);
  document.getElementById('btn-grid-clear')?.addEventListener('click', clearAllGridData);

  attachMeridianListeners();
  attachInboxListeners();
  attachReportListeners();
  attachPromptListeners();
}

function attachMeridianListeners() {
  document.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => setFilter(button.dataset.filter));
  });
  document.querySelectorAll('[data-run-field]').forEach((input) => {
    input.addEventListener('input', () => {
      meridianState.run[input.dataset.runField] = input.value;
      persistMeridian();
    });
  });
  document.querySelectorAll('[data-audit-verdict]').forEach((button) => {
    button.addEventListener('click', () => {
      meridianState.audit.verdict = button.dataset.auditVerdict;
      persistMeridian();
      refreshAuditVerdict();
      refreshProgress();
      refreshCommandCards();
    });
  });
  const auditNotes = document.getElementById('audit-notes');
  if (auditNotes) {
    auditNotes.addEventListener('input', () => {
      meridianState.audit.notes = auditNotes.value;
      persistMeridian();
      autoResize(auditNotes);
    });
    autoResize(auditNotes);
  }
  renderMeridianSections();
}

function attachItemListeners(id) {
  const card = document.getElementById(`card-${id}`);
  if (!card) return;
  card.querySelectorAll('.status-btn').forEach((button) => {
    button.addEventListener('click', () => setStatus(id, button.dataset.status));
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
    input.addEventListener('input', () => setItemField(id, input.dataset.itemField, input.value));
  });
}

function attachDecisionListeners() {
  document.getElementById('btn-audit-decision')?.addEventListener('click', copyAuditPrompt);
  document.querySelectorAll('.decision-option').forEach((button) => {
    button.addEventListener('click', () => {
      meridianState.decision.verdict = button.dataset.verdict;
      persistMeridian();
      refreshDecision();
      refreshCommandCards();
    });
  });
  const notes = document.getElementById('dec-notes');
  if (notes) {
    notes.addEventListener('input', () => {
      meridianState.decision.notes = notes.value;
      persistMeridian();
      autoResize(notes);
    });
    autoResize(notes);
  }
}

function attachInboxListeners() {
  document.querySelectorAll('[data-audio-transcript]').forEach((textarea) => {
    textarea.addEventListener('input', () => {
      const item = inboxItems.find((entry) => entry.id === textarea.dataset.audioTranscript);
      if (!item) return;
      item.transcript = textarea.value;
      persistInbox(inboxItems);
      autoResize(textarea);
    });
    autoResize(textarea);
  });
  document.querySelectorAll('[data-audio-stop]').forEach((button) => {
    button.addEventListener('click', () => {
      const audio = button.closest('.audio-card')?.querySelector('audio');
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    });
  });
  document.querySelectorAll('[data-audio-remove]').forEach((button) => {
    button.addEventListener('click', async () => removeInboxItem(button.dataset.audioRemove));
  });
}

function attachReportListeners() {
  document.querySelectorAll('[data-copy-report]').forEach((button) => {
    button.addEventListener('click', () => {
      const report = findReport(button.dataset.copyReport);
      if (report) copyToClipboard(report.body || report.markdown || '', 'Report copied');
    });
  });
}

function attachPromptListeners() {
  document.querySelectorAll('[data-copy-prompt]').forEach((button) => {
    button.addEventListener('click', () => {
      const prompt = MERIDIAN_PROMPTS.find((entry) => entry.id === button.dataset.copyPrompt);
      if (prompt) copyToClipboard(prompt.getText(), 'Prompt copied');
    });
  });
}

function findReport(id) {
  return reports.find((report) => report.id === id)
    || getMeridianExports().find((report) => report.id === id);
}

async function addInboxEntry() {
  const title = document.getElementById('inbox-title')?.value.trim() || 'Untitled report';
  const port = document.getElementById('inbox-port')?.value || activePortId;
  const transcript = document.getElementById('inbox-transcript')?.value || '';
  const audioUrl = document.getElementById('inbox-audio-url')?.value.trim() || '';
  const file = document.getElementById('inbox-audio-file')?.files?.[0] || null;
  const id = window.crypto?.randomUUID ? window.crypto.randomUUID() : `inbox-${Date.now()}`;
  let hasBlob = false;

  if (file) {
    try {
      await putAudioBlob(id, file);
      setAudioUrl(id, file);
      hasBlob = true;
    } catch {
      showToastMessage(`Could not save ${file.name}`);
    }
  }

  inboxItems = [{
    id,
    title,
    port,
    transcript,
    audioUrl,
    hasBlob,
    addedAt: new Date().toISOString(),
  }, ...inboxItems];
  persistInbox(inboxItems);
  showToastMessage('Inbox entry added');
  renderApp();
}

async function removeInboxItem(id) {
  revokeAudioUrl(id);
  inboxItems = inboxItems.filter((item) => item.id !== id);
  try {
    await deleteAudioBlob(id);
  } catch {
    // Metadata removal still wins; stale blobs can be cleared from Settings.
  }
  persistInbox(inboxItems);
  renderApp();
}

async function clearInbox() {
  if (!window.confirm('Clear all local Audio Inbox entries?')) return;
  revokeAllAudioUrls();
  inboxItems = [];
  persistInbox(inboxItems);
  try {
    await clearAudioStore();
  } catch {
    showToastMessage('Audio store could not be cleared');
  }
  renderApp();
}

function copyAuditPrompt() {
  copyToClipboard(finalFreshCloneAuditPrompt(), 'Audit prompt copied');
}

function setFilter(filter) {
  currentFilter = MERIDIAN_FILTERS.some((item) => item.id === filter) ? filter : 'all';
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

  MERIDIAN_SECTIONS.forEach((section) => {
    const sectionEl = document.getElementById(`sec-${section.id}`);
    if (!sectionEl) return;
    sectionEl.hidden = !Array.from(sectionEl.querySelectorAll('.item-card')).some((card) => !card.hidden);
  });

  const empty = document.getElementById('filter-empty');
  if (empty) empty.hidden = visibleCount > 0;
}

function jumpToNextOpen() {
  const next = nextUncheckedItem();
  if (!next) {
    showToastMessage('All items tested');
    return;
  }
  if (currentFilter !== 'all' && currentFilter !== 'open') setFilter('all');
  const card = document.getElementById(`card-${next.item.id}`);
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
    const opt = MERIDIAN_DECISION_OPTS.find((item) => item.id === button.dataset.verdict);
    const selected = meridianState.decision.verdict === button.dataset.verdict;
    button.className = `decision-option${selected && opt ? ` ${opt.cls}` : ''}`;
    button.setAttribute('aria-pressed', String(selected));
  });
}

function refreshAuditVerdict() {
  document.querySelectorAll('[data-audit-verdict]').forEach((button) => {
    const opt = MERIDIAN_AUDIT_OPTS.find((item) => item.id === button.dataset.auditVerdict);
    const selected = meridianState.audit.verdict === button.dataset.auditVerdict;
    button.className = `audit-option${selected && opt ? ` ${opt.cls}` : ''}`;
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
  updateReadinessSummary(count);

  MERIDIAN_SECTIONS.forEach((section) => {
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
    const warnings = [fail ? `${fail} fail` : '', blocked ? `${blocked} blocked` : ''].filter(Boolean);
    tally.textContent = `${tested}/${section.items.length}${warnings.length ? ` - ${warnings.join(', ')}` : ''}`;
  });
  applyFilter();
}

function mkCountPill(cls, value, label) {
  return `<span class="count-pill count-${cls}"><span class="count-dot"></span><span>${value} ${label}</span></span>`;
}

function updateReadinessSummary(count) {
  const summary = document.getElementById('readiness-summary');
  if (!summary) return;
  let tone = 'neutral';
  let text = `${count.nt} items remain unchecked.`;
  if (meridianState.audit?.verdict === 'hold') {
    tone = 'attention';
    text = 'Fresh clone audit is HOLD - BLOCKER FOUND. Do not start live smoke.';
  } else if (meridianState.audit?.verdict !== 'ready') {
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

function exportSummary() {
  const markdown = buildMeridianExport({ state: meridianState, totals: totals() });
  const meridianExport = saveMeridianExport(markdown);
  copyToClipboard(markdown, 'Summary copied and saved');
  showToastMessage(`Export saved ${new Date(meridianExport.createdAt).toLocaleTimeString()}`);
  refreshCommandCards();
}

function exportGridJson() {
  const data = JSON.stringify(exportGridData(), null, 2);
  copyToClipboard(data, 'Grid JSON copied');
}

function importGridJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      importGridData(JSON.parse(reader.result));
      meridianState = loadMeridianState();
      inboxItems = loadInbox();
      reports = loadReports();
      showToastMessage('Grid data imported');
      renderApp();
    } catch (error) {
      showToastMessage(error.message);
    }
  };
  reader.readAsText(file);
}

async function clearAllGridData() {
  if (!window.confirm('Clear all local Grid data, including inbox audio blobs?')) return;
  revokeAllAudioUrls();
  clearGridLocalData();
  clearReports();
  clearMeridianExports();
  clearMeridianState();
  localStorage.removeItem(LEGACY_MERIDIAN_KEY);
  try {
    await clearAudioStore();
  } catch {
    showToastMessage('Audio store could not be cleared');
  }
  activeView = DEFAULT_VIEW;
  activePortId = DEFAULT_PORT;
  meridianState = defaultMeridianState();
  inboxItems = [];
  reports = [];
  renderApp();
}

async function resetMeridianPort() {
  if (!window.confirm('Reset Meridian Port checklist state? Audio Inbox and Grid reports remain unless cleared in Settings.')) return;
  meridianState = defaultMeridianState();
  clearMeridianState();
  renderApp();
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

function refreshSavedTime() {
  const saved = document.getElementById('last-saved');
  if (!saved) return;
  saved.textContent = meridianState.savedAt
    ? `Saved ${new Date(meridianState.savedAt).toLocaleTimeString()}`
    : 'Not yet saved';
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

  if (deferredInstallPrompt && installButton) installButton.hidden = false;
  if (!pwaEventsBound) {
    pwaEventsBound = true;
    window.addEventListener('online', () => updatePwaState('Online'));
    window.addEventListener('offline', () => updatePwaState('Offline ready'));
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      const currentButton = document.getElementById('btn-install');
      if (currentButton) currentButton.hidden = false;
    });
    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      const currentButton = document.getElementById('btn-install');
      if (currentButton) currentButton.hidden = true;
      updatePwaState('Installed');
    });
  }
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

function makeAudioId() {
  return window.crypto?.randomUUID ? window.crypto.randomUUID() : `audio-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
  await Promise.all(inboxItems.map(async (item) => {
    if (!item.hasBlob) return;
    try {
      const blob = await getAudioBlob(item.id);
      if (blob) setAudioUrl(item.id, blob);
    } catch {
      // Missing blobs leave metadata visible for cleanup.
    }
  }));
}

async function init() {
  localStorage.setItem(GRID_KEYS.activePort, activePortId);
  localStorage.setItem(GRID_KEYS.activeView, activeView);
  await hydrateAudioUrls();
  renderApp();
  registerServiceWorker();
}

init();
