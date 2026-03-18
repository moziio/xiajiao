const store = require('../services/storage');
const { guardRole, jsonRes, readBody } = require('../middleware/auth');
const guardAdmin = guardRole('admin');

async function handle(req, res, urlPath, query) {
  if (urlPath === '/api/messages' && req.method === 'GET') {
    if (!guardAdmin(req, res)) return;

    const channel = query.get('channel');
    const before = query.get('before') ? (parseInt(query.get('before'), 10) || undefined) : undefined;
    const limit = Math.min(parseInt(query.get('limit'), 10) || 30, 100);

    if (!channel) {
      return jsonRes(res, 400, { error: 'channel required' });
    }

    const result = store.queryMessages({ channel, before, limit });
    return jsonRes(res, 200, result);
  }

  if (urlPath === '/api/messages/batch-delete' && req.method === 'POST') {
    if (!guardAdmin(req, res)) return;
    const body = await readBody(req);
    const ids = body.ids;
    if (!Array.isArray(ids) || !ids.length) return jsonRes(res, 400, { error: 'ids required' });
    if (ids.length > 500) return jsonRes(res, 400, { error: 'too many ids (max 500)' });
    const removed = store.deleteMessages(ids);
    return jsonRes(res, 200, { ok: true, removed });
  }

  const chDeleteMatch = urlPath.match(/^\/api\/messages\/channel\/([^/]+)$/);
  if (chDeleteMatch && req.method === 'DELETE') {
    if (!guardAdmin(req, res)) return;
    const channel = decodeURIComponent(chDeleteMatch[1]);
    const removed = store.deleteMessagesByChannel(channel);
    return jsonRes(res, 200, { ok: true, removed });
  }

  const msgDeleteMatch = urlPath.match(/^\/api\/messages\/([^/]+)$/);
  if (msgDeleteMatch && req.method === 'DELETE') {
    if (!guardAdmin(req, res)) return;
    const msgId = decodeURIComponent(msgDeleteMatch[1]);
    const result = store.deleteMessage(msgId);
    if (!result.changes) return jsonRes(res, 404, { error: 'message not found' });
    return jsonRes(res, 200, { ok: true, message: result.message });
  }

  if (urlPath === '/api/messages/search' && req.method === 'GET') {
    if (!guardAdmin(req, res)) return;

    const keyword = query.get('q') || '';
    const channel = query.get('channel') || undefined;
    const limit = Math.min(parseInt(query.get('limit'), 10) || 20, 50);

    if (!keyword.trim()) {
      return jsonRes(res, 400, { error: 'search keyword required' });
    }

    const result = store.searchMessages(keyword, { channel, limit });
    return jsonRes(res, 200, result);
  }

  return false;
}

module.exports = { handle };
