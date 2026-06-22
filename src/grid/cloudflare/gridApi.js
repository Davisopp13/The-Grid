const configuredBase = (import.meta.env.VITE_GRID_API_BASE || '').trim().replace(/\/$/, '');

export function isGridApiConfigured() {
  return Boolean(configuredBase);
}

export function gridApiBaseLabel() {
  return configuredBase || 'local-first';
}

export async function fetchGridReports() {
  if (!configuredBase) {
    return {
      reports: [],
      mode: 'local-first',
      message: 'VITE_GRID_API_BASE is not configured.',
    };
  }

  const response = await fetch(`${configuredBase}/reports`, {
    headers: { accept: 'application/json' },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Grid API returned HTTP ${response.status}`);
  }

  return {
    reports: Array.isArray(data.reports) ? data.reports : [],
    mode: data.mode || 'cloudflare',
    message: data.message || '',
  };
}
