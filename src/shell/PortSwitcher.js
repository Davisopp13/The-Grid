import { esc } from '../shared/components/text.js';

export function renderPortSwitcher({ projects, activePortId }) {
  const activeProject = projects.find((project) => project.id === activePortId) || projects[0];

  return `
    <section class="port-switcher" aria-label="Port selector">
      <div class="port-switcher-active">
        <span class="port-switcher-icon" aria-hidden="true">
          <img src="${esc(activeProject.icon || '/meridian-checklist-icon.svg')}" alt="" />
        </span>
        <span>
          <span class="port-switcher-label">Active Port</span>
          <strong>${esc(activeProject.name)}</strong>
        </span>
      </div>
      <label class="port-switcher-control" for="port-switcher-select">
        <span>Port selector</span>
        <select id="port-switcher-select">
          ${projects.map((project) => `
            <option value="${esc(project.id)}" ${project.id === activePortId ? 'selected' : ''}>
              ${esc(project.name)}
            </option>
          `).join('')}
        </select>
      </label>
      <div class="port-switcher-meta">
        <span>${esc(activeProject.status)}</span>
        <span>${esc(activeProject.summary)}</span>
      </div>
    </section>
  `;
}
