import {
  hasD1,
  d1SetupResponse,
  jsonResponse,
  methodNotAllowed,
  newId,
  normalizeReportPayload,
  readJson,
  reportRowToJson,
  requireIngestToken,
  unauthorized,
} from './_utils.js';

export async function onRequest(context) {
  if (context.request.method === 'GET') return listReports(context);
  if (context.request.method === 'POST') return createReport(context);
  return methodNotAllowed(['GET', 'POST']);
}

async function listReports({ env }) {
  if (!hasD1(env)) {
    return d1SetupResponse();
  }

  let result;
  try {
    result = await env.GRID_DB.prepare(`
      SELECT id, port, type, title, body, transcript, source, metadata_json, asset_key, created_at
      FROM reports
      ORDER BY created_at DESC
      LIMIT 50
    `).all();
  } catch {
    return d1SetupResponse();
  }

  return jsonResponse({
    reports: (result.results || []).map(reportRowToJson),
    mode: 'd1',
  });
}

async function createReport({ request, env }) {
  if (!requireIngestToken(request, env)) return unauthorized();
  if (!hasD1(env)) return d1SetupResponse({ write: true });

  let payload;
  try {
    payload = normalizeReportPayload(await readJson(request));
  } catch (error) {
    return jsonResponse({ error: 'bad_request', message: error.message }, { status: 400 });
  }

  const id = newId('report');
  const createdAt = new Date().toISOString();

  try {
    await env.GRID_DB.prepare(`
      INSERT INTO reports (
        id, port, type, title, body, transcript, source, metadata_json, asset_key, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      payload.port,
      payload.type,
      payload.title,
      payload.body,
      payload.transcript,
      payload.source,
      payload.metadataJson,
      '',
      createdAt,
    ).run();

    await env.GRID_DB.prepare(`
      INSERT INTO ingest_events (id, event_type, source, status, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      newId('event'),
      'report.created',
      payload.source,
      'stored',
      `Stored report ${id}`,
      createdAt,
    ).run();
  } catch {
    return d1SetupResponse({ write: true });
  }

  return jsonResponse({
    report: {
      id,
      ...payload,
      metadata: JSON.parse(payload.metadataJson),
      metadataJson: undefined,
      assetKey: '',
      createdAt,
    },
  }, { status: 201 });
}
