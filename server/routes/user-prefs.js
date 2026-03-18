/**
 * 用户偏好 API — 置顶 & 收藏（服务端持久化）
 * 所有设备/浏览器共享同一份数据
 */
const { getDB } = require('../services/database');
const { hasRole, jsonRes, readBody } = require('../middleware/auth');

function getUserId(req) {
  return req._userId || req.headers['x-user-id'] || 'default';
}

async function handle(req, res, urlPath) {

  // ── Pinned Channels ──

  if (urlPath === '/api/user/pinned' && req.method === 'GET') {
    if (!hasRole(req, 'guest')) return jsonRes(res, 403, { error: 'auth required' });
    const uid = getUserId(req);
    const db = getDB();
    const rows = db.prepare('SELECT channel_id FROM user_pinned WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC').all(uid);
    return jsonRes(res, 200, { pinned: rows.map(r => r.channel_id) });
  }

  if (urlPath === '/api/user/pinned' && req.method === 'PUT') {
    if (!hasRole(req, 'guest')) return jsonRes(res, 403, { error: 'auth required' });
    const uid = getUserId(req);
    const body = await readBody(req);
    const pinned = Array.isArray(body.pinned) ? body.pinned : [];
    const db = getDB();
    const del = db.prepare('DELETE FROM user_pinned WHERE user_id = ?');
    const ins = db.prepare('INSERT OR REPLACE INTO user_pinned (user_id, channel_id, sort_order, created_at) VALUES (?, ?, ?, ?)');
    db.exec('BEGIN');
    try {
      del.run(uid);
      const now = Date.now();
      pinned.forEach((chId, i) => {
        if (typeof chId === 'string' && chId) ins.run(uid, chId, i, now);
      });
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      return jsonRes(res, 500, { error: e.message });
    }
    return jsonRes(res, 200, { ok: true });
  }

  // ── Favorites ──

  if (urlPath === '/api/user/favorites' && req.method === 'GET') {
    if (!hasRole(req, 'guest')) return jsonRes(res, 403, { error: 'auth required' });
    const uid = getUserId(req);
    const db = getDB();
    const rows = db.prepare('SELECT * FROM user_favorites WHERE user_id = ? ORDER BY saved_at DESC').all(uid);
    const favorites = rows.map(_rowToFav);
    return jsonRes(res, 200, { favorites });
  }

  if (urlPath === '/api/user/favorites' && req.method === 'PUT') {
    if (!hasRole(req, 'member')) return jsonRes(res, 403, { error: 'auth required' });
    const uid = getUserId(req);
    const body = await readBody(req);
    const favorites = Array.isArray(body.favorites) ? body.favorites : [];
    const db = getDB();
    const del = db.prepare('DELETE FROM user_favorites WHERE user_id = ?');
    const ins = db.prepare(`INSERT OR REPLACE INTO user_favorites
      (id, user_id, text, sender_name, sender_emoji, sender_color, is_agent, ts, channel, channel_name, files, saved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    db.exec('BEGIN');
    try {
      del.run(uid);
      for (const f of favorites) {
        if (!f.id) continue;
        ins.run(f.id, uid, f.text || '', f.senderName || '', f.senderEmoji || '', f.senderColor || '#00d4ff',
          f.isAgent ? 1 : 0, f.ts || 0, f.channel || '', f.channelName || '',
          JSON.stringify(f.files || (f.file ? [f.file] : [])), f.savedAt || Date.now());
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      return jsonRes(res, 500, { error: e.message });
    }
    return jsonRes(res, 200, { ok: true });
  }

  if (urlPath === '/api/user/favorites' && req.method === 'POST') {
    if (!hasRole(req, 'member')) return jsonRes(res, 403, { error: 'auth required' });
    const uid = getUserId(req);
    const body = await readBody(req);
    const f = body.favorite;
    if (!f || !f.id) return jsonRes(res, 400, { error: 'favorite.id required' });
    const db = getDB();
    db.prepare(`INSERT OR REPLACE INTO user_favorites
      (id, user_id, text, sender_name, sender_emoji, sender_color, is_agent, ts, channel, channel_name, files, saved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      f.id, uid, f.text || '', f.senderName || '', f.senderEmoji || '', f.senderColor || '#00d4ff',
      f.isAgent ? 1 : 0, f.ts || 0, f.channel || '', f.channelName || '',
      JSON.stringify(f.files || (f.file ? [f.file] : [])), f.savedAt || Date.now());
    return jsonRes(res, 200, { ok: true });
  }

  const favDelMatch = urlPath.match(/^\/api\/user\/favorites\/(.+)$/);
  if (favDelMatch && req.method === 'DELETE') {
    if (!hasRole(req, 'member')) return jsonRes(res, 403, { error: 'auth required' });
    const uid = getUserId(req);
    const favId = decodeURIComponent(favDelMatch[1]);
    const db = getDB();
    db.prepare('DELETE FROM user_favorites WHERE user_id = ? AND id = ?').run(uid, favId);
    return jsonRes(res, 200, { ok: true });
  }

  return false;
}

function _rowToFav(r) {
  let files = [];
  try { files = JSON.parse(r.files || '[]'); } catch {}
  return {
    id: r.id,
    text: r.text || '',
    senderName: r.sender_name || '',
    senderEmoji: r.sender_emoji || '',
    senderColor: r.sender_color || '#00d4ff',
    isAgent: !!r.is_agent,
    ts: r.ts,
    channel: r.channel || '',
    channelName: r.channel_name || '',
    file: files[0] || null,
    files: files.length ? files : undefined,
    savedAt: r.saved_at,
  };
}

module.exports = { handle };
