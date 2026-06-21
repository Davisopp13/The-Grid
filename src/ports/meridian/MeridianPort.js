import {
  MERIDIAN_AUDIT_OPTS,
  MERIDIAN_DECISION_OPTS,
  MERIDIAN_FILTERS,
  MERIDIAN_ITEM_FIELD_DEFS,
  MERIDIAN_RUN_FIELDS,
  MERIDIAN_SECTIONS,
  MERIDIAN_SMOKE_RECORD_SECTIONS,
} from './meridianChecklistData.js';
import { defaultMeridianState } from './meridianStorage.js';
import { esc, fmtText } from '../../shared/components/text.js';

function stateStatus(state, id) {
  return state.items[id]?.status || 'not-tested';
}

function stateNotes(state, id) {
  return state.items[id]?.notes || '';
}

function stateItemField(state, id, key) {
  return state.items[id]?.[key] || '';
}

export function renderMeridianPortView({ state, currentFilter }) {
  return `
    <section class="meridian-port" aria-label="Meridian Port">
      <section class="scope-banner port-scope" role="status">
        <div class="scope-kicker">Meridian Port guardrail</div>
        <div>This port validates PR #7 only. Do not use it as broad <code>PASSIVE_CLOSE_LIVE</code> readiness evidence.</div>
        <button class="audit-copy-btn" id="btn-audit-top" type="button">Copy Final Fresh Clone Audit Prompt</button>
      </section>
      <section class="hero meridian-hero" aria-labelledby="page-title">
        <div class="hero-copy">
          <div class="eyebrow">Davis / trusted cohort only</div>
          <h1 id="page-title">Scoped hybrid auto-close validation</h1>
          <p>Hapag-Lloyd IDT Export Rail smoke checklist for confirming passive close behavior while keeping the broad passive close flag off.</p>
        </div>
        <aside class="status-panel" aria-label="Feature flags">
          <div class="flag-row"><span>HYBRID_AUTO_CLOSE_LIVE</span><strong>true</strong></div>
          <div class="flag-row critical"><span>PASSIVE_CLOSE_LIVE</span><strong>false</strong></div>
          <div class="flag-note">Must remain false through the entire trial.</div>
        </aside>
      </section>
      ${renderSmokeRecord()}
      ${renderSmokeSession({ state })}
      ${renderProgressPanel({ currentFilter })}
      <div class="section-nav" id="section-nav" aria-label="Meridian checklist sections"></div>
      <div class="filter-empty" id="filter-empty" hidden>No checklist items match the current view.</div>
      <div id="section-container"></div>
    </section>
  `;
}

export function renderSmokeRecord() {
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
        ${MERIDIAN_SMOKE_RECORD_SECTIONS.map((section) => `
          <article class="record-group">
            <h3>${esc(section.title)}</h3>
            <ol>${section.items.map((item) => `<li>${fmtText(item)}</li>`).join('')}</ol>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

export function renderSmokeSession({ state }) {
  const audit = state.audit || defaultMeridianState().audit;
  const run = state.run || defaultMeridianState().run;
  return `
    <section class="session-panel" aria-labelledby="session-title">
      <div class="session-head">
        <div>
          <div class="panel-label">Smoke Session</div>
          <h2 id="session-title">Fresh clone gate and run metadata</h2>
        </div>
        <button class="btn btn-audit" id="btn-audit-session" type="button">Copy Final Fresh Clone Audit Prompt</button>
      </div>
      <div class="run-fields">
        ${MERIDIAN_RUN_FIELDS.map((field) => `
          <label class="run-field" for="run-${field.key}">
            <span>${esc(field.label)}</span>
            <input id="run-${field.key}" data-run-field="${field.key}" value="${esc(run[field.key] || '')}" placeholder="${esc(field.placeholder)}" />
          </label>
        `).join('')}
      </div>
      <div class="audit-verdict-group" role="group" aria-label="Fresh clone audit verdict">
        ${MERIDIAN_AUDIT_OPTS.map((opt) => {
          const selected = audit.verdict === opt.id;
          return `
            <button class="audit-option${selected ? ` ${opt.cls}` : ''}" type="button" data-audit-verdict="${opt.id}" aria-pressed="${selected}">
              <span>${esc(opt.label)}</span>
              <small>${esc(opt.desc)}</small>
            </button>
          `;
        }).join('')}
      </div>
      <label class="audit-notes-label" for="audit-notes">Fresh clone audit notes</label>
      <textarea class="audit-notes" id="audit-notes" placeholder="Paste audit verdict, blocker summary, or cited evidence links">${esc(audit.notes || '')}</textarea>
    </section>
  `;
}

export function renderProgressPanel({ currentFilter }) {
  return `
    <section class="progress-panel" aria-label="Smoke test progress">
      <div class="progress-head">
        <div>
          <div class="panel-label">Smoke Test Progress</div>
          <div class="progress-title" id="progress-title">0 of 0 tested</div>
        </div>
        <div class="progress-percent" id="progress-percent">0%</div>
      </div>
      <div class="progress-track" aria-hidden="true"><div class="progress-fill" id="progress-fill"></div></div>
      <div class="progress-counts" id="progress-counts"></div>
      <div class="progress-actions" aria-label="Checklist view controls">
        <div class="filter-group" role="group" aria-label="Filter checklist items">
          ${MERIDIAN_FILTERS.map((filter) => `
            <button class="filter-btn${filter.id === currentFilter ? ' is-active' : ''}" type="button" data-filter="${filter.id}" aria-pressed="${filter.id === currentFilter}">${esc(filter.label)}</button>
          `).join('')}
        </div>
        <button class="btn btn-secondary btn-next" id="btn-next-open" type="button">Next unchecked</button>
      </div>
      <div class="readiness-summary" id="readiness-summary"></div>
    </section>
  `;
}

export function renderMeridianSectionNav() {
  return MERIDIAN_SECTIONS.map((section) => `
    <a class="section-link" href="#sec-${section.id}"><span>${section.num}</span>${esc(section.short)}</a>
  `).join('');
}

export function renderMeridianSectionsMarkup({ state }) {
  let html = '';

  MERIDIAN_SECTIONS.forEach((section) => {
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
      const status = stateStatus(state, item.id);
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
            <textarea class="notes-input" id="ta-${item.id}" placeholder="Notes" rows="1">${esc(stateNotes(state, item.id))}</textarea>
          </label>
          <div class="evidence-grid" aria-label="Evidence for item ${idx + 1}">
            ${MERIDIAN_ITEM_FIELD_DEFS.map((field) => `
              <label class="evidence-field" for="${field.key}-${item.id}">
                <span>${esc(field.label)}</span>
                <input id="${field.key}-${item.id}" data-item-field="${field.key}" data-item-id="${item.id}" value="${esc(stateItemField(state, item.id, field.key))}" placeholder="${esc(field.placeholder)}" />
              </label>
            `).join('')}
          </div>
        </article>
      `;
    });

    html += '</div></section>';
  });

  return `${html}${renderDecision({ state })}`;
}

export function renderDecision({ state }) {
  const decision = state.decision || { verdict: null, notes: '' };
  return `
    <section class="section decision-section" id="sec-final">
      <div class="section-head">
        <div>
          <div class="section-number">Section ${MERIDIAN_SECTIONS.length + 1}</div>
          <h2>Final Decision</h2>
        </div>
      </div>
      <div class="decision-card">
        <div class="audit-gate">
          <div>
            <div class="audit-gate-label">Fresh clone gate</div>
            <p>Copy a focused prompt that forces PR #7 readiness evidence from GitHub source of truth before any live smoke.</p>
          </div>
          <button class="btn btn-audit" id="btn-audit-decision" type="button">Copy Final Fresh Clone Audit Prompt</button>
        </div>
        <div class="decision-options">
          ${MERIDIAN_DECISION_OPTS.map((opt) => {
            const selected = decision.verdict === opt.id;
            return `
              <button class="decision-option${selected ? ` ${opt.cls}` : ''}" type="button" id="decopt-${opt.id}" data-verdict="${opt.id}" aria-pressed="${selected}">
                <span class="decision-label">${esc(opt.label)}</span>
                <span class="decision-desc">${esc(opt.desc)}</span>
              </button>
            `;
          }).join('')}
        </div>
        <label class="decision-notes-label" for="dec-notes">Notes / evidence links</label>
        <textarea class="decision-notes" id="dec-notes" placeholder="Paste links, describe failures, record evidence">${esc(decision.notes || '')}</textarea>
      </div>
    </section>
  `;
}

function mkStatusButton(itemId, status, label, current) {
  const active = current === status ? ' is-active' : '';
  return `<button class="status-btn status-${status}${active}" type="button" data-id="${itemId}" data-status="${status}" aria-pressed="${current === status}">${label}</button>`;
}
