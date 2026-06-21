import {
  MERIDIAN_DECISION_OPTS,
  MERIDIAN_FILTERS,
  MERIDIAN_ITEM_FIELD_DEFS,
  MERIDIAN_SECTIONS,
} from './meridianChecklistData.js';
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

export function renderProgressPanel({ currentFilter }) {
  return `
    <section class="progress-panel meridian-progress-panel" aria-label="Smoke test progress">
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

export function renderMeridianSectionNav(activeSectionId) {
  return MERIDIAN_SECTIONS.map((section) => `
    <a class="section-link${section.id === activeSectionId ? ' is-active' : ''}" href="#sec-${section.id}" data-section-link="${section.id}" ${section.id === activeSectionId ? 'aria-current="true"' : ''}><span>${section.num}</span>${esc(section.short)}</a>
  `).join('');
}

export function renderMeridianSectionsMarkup({ state, activeSectionId }) {
  let html = '';

  MERIDIAN_SECTIONS.forEach((section) => {
    const expanded = section.id === activeSectionId;
    html += `
      <section class="section checklist-section${expanded ? ' is-expanded' : ' is-collapsed'}" id="sec-${section.id}" data-section-id="${section.id}">
        <div class="section-head">
          <div>
            <div class="section-number">Section ${section.num}</div>
            <h2>${esc(section.title)}</h2>
          </div>
          <div class="section-head-actions">
            <span class="section-tally" id="tally-${section.id}">0/${section.items.length}</span>
            <button class="section-toggle" type="button" data-section-toggle="${section.id}" aria-expanded="${expanded}" aria-controls="panel-${section.id}">
              <span class="section-toggle-text">${expanded ? 'Collapse' : 'Expand'}</span>
              <span class="section-toggle-icon" aria-hidden="true"></span>
            </button>
          </div>
        </div>
        <div class="items" id="panel-${section.id}" ${expanded ? '' : 'hidden'}>
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

  return `${html}${renderDecision({ state, expanded: activeSectionId === 'final' })}`;
}

export function renderDecision({ state, expanded = true }) {
  const decision = state.decision || { verdict: null, notes: '' };
  return `
    <section class="section decision-section checklist-section${expanded ? ' is-expanded' : ' is-collapsed'}" id="sec-final" data-section-id="final">
      <div class="section-head">
        <div>
          <div class="section-number">Section ${MERIDIAN_SECTIONS.length + 1}</div>
          <h2>Final Decision</h2>
        </div>
        <button class="section-toggle" type="button" data-section-toggle="final" aria-expanded="${expanded}" aria-controls="panel-final">
          <span class="section-toggle-text">${expanded ? 'Collapse' : 'Expand'}</span>
          <span class="section-toggle-icon" aria-hidden="true"></span>
        </button>
      </div>
      <div class="decision-card" id="panel-final" ${expanded ? '' : 'hidden'}>
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
