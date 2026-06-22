import {
  getAssetBucket,
  hasD1,
  d1SetupResponse,
  jsonResponse,
  methodNotAllowed,
  newId,
  normalizeReportPayload,
  readJson,
  requireIngestToken,
  unauthorized,
} from './_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'POST') return methodNotAllowed(['POST']);
  return createAudioReport(context);
}

async function createAudioReport({ request, env }) {
  if (!requireIngestToken(request, env)) return unauthorized();
  if (!hasD1(env)) return d1SetupResponse({ write: true });

  const bucket = getAssetBucket(env);
  if (!bucket?.put) {
    return jsonResponse({
      error: 'r2_unavailable',
      message: 'GRID_AUDIO or GRID_ASSETS R2 binding is required before audio can be stored.',
    }, { status: 503 });
  }

  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return jsonResponse({ error: 'bad_request', message: error.message }, { status: 400 });
  }

  const audioBase64 = String(body.audioBase64 || '').trim();
  if (!audioBase64) {
    return jsonResponse({ error: 'bad_request', message: 'audioBase64 is required.' }, { status: 400 });
  }

  let payload;
  try {
    payload = normalizeReportPayload({
      ...body,
      type: body.type || 'audio_report',
    });
  } catch (error) {
    return jsonResponse({ error: 'bad_request', message: error.message }, { status: 400 });
  }

  try {
    await env.GRID_DB.prepare('SELECT id FROM reports LIMIT 1').all();
  } catch {
    return d1SetupResponse({ write: true });
  }

  const id = newId('report');
  const createdAt = new Date().toISOString();
  const extension = extensionFromContentType(body.contentType) || cleanExtension(body.fileName) || 'bin';
  const assetKey = `audio/${payload.port}/${createdAt.slice(0, 10)}/${id}.${extension}`;
  const bytes = Uint8Array.from(atob(audioBase64), (char) => char.charCodeAt(0));

  await bucket.put(assetKey, bytes, {
    httpMetadata: {
      contentType: body.contentType || 'application/octet-stream',
    },
    customMetadata: {
      reportId: id,
      source: payload.source || 'unknown',
    },
  });

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
      assetKey,
      createdAt,
    ).run();

    await env.GRID_DB.prepare(`
      INSERT INTO ingest_events (id, event_type, source, status, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      newId('event'),
      'audio.created',
      payload.source,
      'stored',
      `Stored audio report ${id}`,
      createdAt,
    ).run();
  } catch {
    return d1SetupResponse({ write: true });
  }

  return jsonResponse({
    report: {
      id,
      port: payload.port,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      transcript: payload.transcript,
      source: payload.source,
      metadata: JSON.parse(payload.metadataJson),
      assetKey,
      createdAt,
    },
  }, { status: 201 });
}

function extensionFromContentType(contentType = '') {
  if (contentType.includes('mpeg')) return 'mp3';
  if (contentType.includes('wav')) return 'wav';
  if (contentType.includes('ogg')) return 'ogg';
  if (contentType.includes('mp4')) return 'm4a';
  if (contentType.includes('webm')) return 'webm';
  return '';
}

function cleanExtension(fileName = '') {
  const match = String(fileName).toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return match?.[1] || '';
}
