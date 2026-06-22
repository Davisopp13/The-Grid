import { jsonResponse, methodNotAllowed } from './_utils.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') return methodNotAllowed(['GET']);

  return jsonResponse({
    status: 'ok',
    app: 'The Grid',
    version: '1.0.0',
    time: new Date().toISOString(),
  });
}
