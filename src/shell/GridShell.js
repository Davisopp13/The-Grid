import { renderGridNav } from './GridNav.js';
import { renderPortSwitcher } from './PortSwitcher.js';
import { esc } from '../shared/components/text.js';

export function renderGridShell({
  activePortId,
  activeView,
  content,
  navItems,
  project,
  projects,
}) {
  return `
    <div class="grid-shell">
      <header class="grid-header">
        <a class="brand grid-brand" href="#top" aria-label="The Grid command home">
          <span class="grid-brand-glyph" aria-hidden="true"></span>
          <span>
            <span class="brand-name">The Grid</span>
            <span class="brand-subtitle">Human command surface / ${esc(project.name)}</span>
          </span>
        </a>
        <div class="header-meta" aria-label="Grid status">
          <button class="install-btn" id="btn-install" type="button" hidden>Install</button>
          <span class="meta-pill pwa-state" id="pwa-state">Online</span>
          <span class="meta-pill">Command shell</span>
          <span class="meta-pill">Local-first</span>
          <span class="meta-pill muted">Hermes remains runtime</span>
        </div>
      </header>

      ${renderGridNav({ items: navItems, activeView })}
      ${renderPortSwitcher({ projects, activePortId })}

      <main class="layout grid-layout" id="top">
        ${content}
      </main>

      <div class="toast" id="toast">Copied to clipboard</div>

      <footer class="bottom-bar">
        <span class="last-saved" id="last-saved">Not yet saved</span>
        <button class="btn btn-secondary" id="btn-reset" type="button">Reset Meridian Port</button>
        <button class="btn btn-primary" id="btn-export" type="button">Export Summary</button>
      </footer>
    </div>
  `;
}
