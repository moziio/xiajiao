const { jsonRes, isOwnerReq, readBody } = require('../middleware/auth');
const wf = require('../services/workflow');

async function handle(req, res, urlPath) {
  if (!urlPath.startsWith('/api/workflows')) return false;

  if (urlPath === '/api/workflows' && req.method === 'GET') {
    return jsonRes(res, 200, { ok: true, workflows: wf.getAll(), runs: wf.getActiveRuns() });
  }

  if (urlPath === '/api/workflows' && req.method === 'POST') {
    if (!isOwnerReq(req)) return jsonRes(res, 403, { error: 'owner only' });
    const body = await readBody(req);
    return jsonRes(res, 200, { ok: true, workflow: wf.create(body) });
  }

  const ctrlMatch = urlPath.match(/^\/api\/workflows\/([^/]+)\/runs\/([^/]+)\/(continue|skip|stop)$/);
  if (ctrlMatch && req.method === 'POST') {
    if (!isOwnerReq(req)) return jsonRes(res, 403, { error: 'owner only' });
    const result = wf.controlRun(ctrlMatch[2], ctrlMatch[3]);
    return jsonRes(res, result.ok ? 200 : 400, result);
  }

  const runMatch = urlPath.match(/^\/api\/workflows\/([^/]+)\/run$/);
  if (runMatch && req.method === 'POST') {
    if (!isOwnerReq(req)) return jsonRes(res, 403, { error: 'owner only' });
    const body = await readBody(req);
    try {
      const result = await wf.run(runMatch[1], body.input || '');
      return jsonRes(res, 200, { ok: true, ...result });
    } catch (e) {
      return jsonRes(res, 400, { ok: false, error: e.message });
    }
  }

  const idMatch = urlPath.match(/^\/api\/workflows\/([^/]+)$/);
  if (!idMatch) return false;
  const id = idMatch[1];

  if (req.method === 'GET') {
    const w = wf.getById(id);
    if (!w) return jsonRes(res, 404, { error: 'not found' });
    return jsonRes(res, 200, { ok: true, workflow: w });
  }

  if (req.method === 'PUT') {
    if (!isOwnerReq(req)) return jsonRes(res, 403, { error: 'owner only' });
    const body = await readBody(req);
    const updated = wf.update(id, body);
    if (!updated) return jsonRes(res, 404, { error: 'not found' });
    return jsonRes(res, 200, { ok: true, workflow: updated });
  }

  if (req.method === 'DELETE') {
    if (!isOwnerReq(req)) return jsonRes(res, 403, { error: 'owner only' });
    if (!wf.remove(id)) return jsonRes(res, 404, { error: 'not found' });
    return jsonRes(res, 200, { ok: true });
  }

  return false;
}

module.exports = { handle };
