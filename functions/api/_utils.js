const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...(init.headers || {}),
    },
  });
}

export function methodNotAllowed(allowed) {
  return jsonResponse({ error: 'method_not_allowed', allowed }, {
    status: 405,
    headers: { allow: allowed.join(', ') },
  });
}

export function unauthorized() {
  return jsonResponse({ error: 'unauthorized', message: 'Bearer ingestion token is required.' }, { status: 401 });
}

export function requireIngestToken(request, env) {
  const expected = env.GRID_INGEST_TOKEN;
  if (!expected) return false;
  const header = request.headers.get('authorization') || '';
  const [scheme, token] = header.split(/\s+/, 2);
  return scheme?.toLowerCase() === 'bearer' && token === expected;
}

export function hasD1(env) {
  return Boolean(env.GRID_DB?.prepare);
}

export function d1SetupResponse({ write = false } = {}) {
  return jsonResponse({
    ...(write ? { error: 'd1_unavailable' } : { reports: [] }),
    mode: 'd1-unavailable',
    message: 'GRID_DB is not configured or cloudflare/schema.sql has not been applied.',
  }, { status: write ? 503 : 200 });
}

export function getAssetBucket(env) {
  return env.GRID_AUDIO || env.GRID_ASSETS || null;
}

export function newId(prefix) {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function readJson(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Expected application/json request body.');
  }
  return request.json();
}

export function normalizeReportPayload(payload) {
  const allowedTypes = new Set(['audit', 'smoke', 'audio_report', 'general']);
  const port = String(payload.port || '').trim();
  const type = String(payload.type || '').trim();
  const title = String(payload.title || '').trim();

  if (!port) throw new Error('Report port is required.');
  if (!allowedTypes.has(type)) throw new Error('Report type must be audit, smoke, audio_report, or general.');
  if (!title) throw new Error('Report title is required.');

  return {
    port,
    type,
    title,
    body: payload.body == null ? '' : String(payload.body),
    transcript: payload.transcript == null ? '' : String(payload.transcript),
    source: payload.source == null ? '' : String(payload.source),
    metadataJson: JSON.stringify(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}),
  };
}

export function reportRowToJson(row) {
  return {
    id: row.id,
    port: row.port,
    type: row.type,
    title: row.title,
    body: row.body || '',
    transcript: row.transcript || '',
    source: row.source || '',
    metadata: safeParseJson(row.metadata_json),
    assetKey: row.asset_key || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function safeParseJson(value) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
