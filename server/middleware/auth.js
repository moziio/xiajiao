const zlib = require('zlib');
const cfg = require('../config');
const store = require('../services/storage');

const ROLES = { owner: 3, admin: 2, member: 1, guest: 0 };

const _SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const ownerSessions = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [token, sess] of ownerSessions) {
    const ts = typeof sess === 'number' ? sess : sess.ts;
    if (now - ts > _SESSION_TTL) ownerSessions.delete(token);
  }
}, 3600000);

function _getSession(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  let sess = ownerSessions.get(token);
  if (!sess) return null;
  if (typeof sess === 'number') { sess = { ts: sess, role: 'owner' }; ownerSessions.set(token, sess); }
  if (Date.now() - sess.ts > _SESSION_TTL) { ownerSessions.delete(token); return null; }
  return sess;
}

function getRole(req) {
  const sess = _getSession(req);
  return sess ? (sess.role || 'owner') : 'guest';
}

function hasRole(req, minRole) {
  return (ROLES[getRole(req)] || 0) >= (ROLES[minRole] || 0);
}

function isOwnerReq(req) { return hasRole(req, 'owner'); }

function guardOwner(req, res) {
  if (isOwnerReq(req)) return true;
  jsonRes(res, 403, { error: '需要主人权限' });
  return false;
}

function guardRole(minRole) {
  return function (req, res) {
    if (hasRole(req, minRole)) return true;
    jsonRes(res, 403, { error: '权限不足' });
    return false;
  };
}

function jsonRes(res, code, data) {
  const json = JSON.stringify(data);
  const req = res.req;
  const acceptGzip = req && (req.headers['accept-encoding'] || '').includes('gzip');
  if (acceptGzip && json.length > 1024) {
    zlib.gzip(Buffer.from(json), (err, compressed) => {
      if (res.destroyed || res.writableEnded) return;
      if (err) {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(json);
      } else {
        res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip', 'Vary': 'Accept-Encoding' });
        res.end(compressed);
      }
    });
  } else {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(json);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) reject(new Error('too large')); });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('invalid json')); } });
  });
}

function checkOrigin(req) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return true;
  const origin = req.headers['origin'];
  const referer = req.headers['referer'];
  if (!origin && !referer) return true;
  const host = req.headers['host'];
  if (!host) return false;
  if (origin) {
    try { return new URL(origin).host === host; } catch { return false; }
  }
  if (referer) {
    try { return new URL(referer).host === host; } catch { return false; }
  }
  return false;
}

module.exports = { ROLES, ownerSessions, isOwnerReq, getRole, hasRole, guardOwner, guardRole, jsonRes, readBody, checkOrigin };
