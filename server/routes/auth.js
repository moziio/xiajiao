const crypto = require('crypto');
const cfg = require('../config');
const store = require('../services/storage');
const { ownerSessions, isOwnerReq, getRole, jsonRes, readBody } = require('../middleware/auth');
const { createLogger } = require('../middleware/logger');
const log = createLogger('auth');

function _matchRole(key) {
  const ownerKey = store.imSettings.ownerKey || cfg.OWNER_KEY;
  if (key === ownerKey) return 'owner';
  const adminKey = store.imSettings.adminKey;
  if (adminKey && key === adminKey) return 'admin';
  const memberKey = store.imSettings.memberKey;
  if (memberKey && key === memberKey) return 'member';
  return null;
}

async function handle(req, res, urlPath) {
  if (urlPath === '/api/auth' && req.method === 'POST') {
    const body = await readBody(req);
    const role = _matchRole(body.key);
    if (!role) return jsonRes(res, 401, { error: '密钥错误' });
    const token = crypto.randomUUID();
    ownerSessions.set(token, { ts: Date.now(), role });
    (req.log || log).info(`${role} session created`);
    return jsonRes(res, 200, { ok: true, token, role });
  }
  if (urlPath === '/api/auth' && req.method === 'DELETE') {
    const auth = req.headers['authorization'];
    if (auth?.startsWith('Bearer ')) ownerSessions.delete(auth.slice(7));
    return jsonRes(res, 200, { ok: true });
  }
  if (urlPath === '/api/auth/all' && req.method === 'DELETE') {
    if (!isOwnerReq(req)) return jsonRes(res, 403, { error: '需要主人权限' });
    const currentToken = (req.headers['authorization'] || '').slice(7);
    let currentSess = ownerSessions.get(currentToken);
    if (typeof currentSess === 'number') currentSess = { ts: currentSess, role: 'owner' };
    const count = ownerSessions.size;
    ownerSessions.clear();
    if (currentToken && currentSess) ownerSessions.set(currentToken, { ts: Date.now(), role: currentSess.role || 'owner' });
    (req.log || log).info(`revoked all sessions, cleared ${count - 1} tokens (kept current)`);
    return jsonRes(res, 200, { ok: true, revoked: Math.max(0, count - 1) });
  }
  if (urlPath === '/api/auth/sessions' && req.method === 'GET') {
    if (!isOwnerReq(req)) return jsonRes(res, 403, { error: '需要主人权限' });
    return jsonRes(res, 200, { count: ownerSessions.size });
  }
  if (urlPath === '/api/auth/verify' && req.method === 'GET') {
    const role = getRole(req);
    return jsonRes(res, 200, { isOwner: role === 'owner', role });
  }
  return false;
}

module.exports = { handle };
