/**
 * M9 — Channel API Routes
 * CRUD + 控制（启动/停止/测试）+ 状态
 */
const engine = require('../services/channel-engine');
const { guardOwner, jsonRes, readBody } = require('../middleware/auth');

const _UNSAFE_IDS = ['__proto__', 'constructor', 'prototype'];

async function handle(req, res, urlPath) {
  if (urlPath === '/api/channels/presets' && req.method === 'GET') {
    if (!guardOwner(req, res)) return true;
    return jsonRes(res, 200, { presets: engine.getPresets() });
  }

  if (urlPath === '/api/channels' && req.method === 'GET') {
    if (!guardOwner(req, res)) return true;
    const channels = engine.getAllChannels().map(_sanitizeChannel);
    return jsonRes(res, 200, { channels });
  }

  if (urlPath === '/api/channels' && req.method === 'POST') {
    if (!guardOwner(req, res)) return true;
    const body = await readBody(req);
    if (!body.type && !body.name) return jsonRes(res, 400, { error: '缺少 type 或 name' });
    const ch = engine.createChannel({
      type: body.type || 'custom',
      name: body.name || '',
      preset: body.preset,
      config: body.config || {},
      mode: body.mode || 'webhook',
    });
    return jsonRes(res, 200, { ok: true, channel: _sanitizeChannel(ch) });
  }

  if (urlPath === '/api/channels/status' && req.method === 'GET') {
    if (!guardOwner(req, res)) return true;
    const channels = engine.getAllChannels();
    const status = {};
    for (const ch of channels) {
      status[ch.id] = {
        name: ch.name, type: ch.type,
        status: ch.status || 'idle',
        error: ch.error || null,
        running: engine.isRunning(ch.id),
        stats: ch.stats,
      };
    }
    return jsonRes(res, 200, { status });
  }

  const idMatch = urlPath.match(/^\/api\/channels\/([^/]+)$/);
  if (idMatch) {
    const id = idMatch[1];
    if (_UNSAFE_IDS.includes(id)) return jsonRes(res, 400, { error: 'invalid id' });

    if (req.method === 'GET') {
      if (!guardOwner(req, res)) return true;
      const ch = engine.getChannel(id);
      if (!ch) return jsonRes(res, 404, { error: 'not found' });
      return jsonRes(res, 200, { channel: _sanitizeChannel(ch) });
    }

    if (req.method === 'PUT') {
      if (!guardOwner(req, res)) return true;
      const body = await readBody(req);
      const ch = engine.updateChannel(id, body);
      if (!ch) return jsonRes(res, 404, { error: 'not found' });
      return jsonRes(res, 200, { ok: true, channel: _sanitizeChannel(ch) });
    }

    if (req.method === 'DELETE') {
      if (!guardOwner(req, res)) return true;
      engine.deleteChannel(id);
      return jsonRes(res, 200, { ok: true });
    }
  }

  const startMatch = urlPath.match(/^\/api\/channels\/([^/]+)\/start$/);
  if (startMatch && req.method === 'POST') {
    if (!guardOwner(req, res)) return true;
    const id = startMatch[1];
    if (_UNSAFE_IDS.includes(id)) return jsonRes(res, 400, { error: 'invalid id' });
    try {
      await engine.startInstance(id);
      return jsonRes(res, 200, { ok: true });
    } catch (e) {
      return jsonRes(res, 400, { error: e.message });
    }
  }

  const stopMatch = urlPath.match(/^\/api\/channels\/([^/]+)\/stop$/);
  if (stopMatch && req.method === 'POST') {
    if (!guardOwner(req, res)) return true;
    const id = stopMatch[1];
    if (_UNSAFE_IDS.includes(id)) return jsonRes(res, 400, { error: 'invalid id' });
    engine.stopInstance(id);
    return jsonRes(res, 200, { ok: true });
  }

  const sessMatch = urlPath.match(/^\/api\/channels\/([^/]+)\/sessions$/);
  if (sessMatch && req.method === 'GET') {
    if (!guardOwner(req, res)) return true;
    const sessions = engine.getSessionsByChannel(sessMatch[1]);
    return jsonRes(res, 200, { sessions });
  }

  const testMatch = urlPath.match(/^\/api\/channels\/([^/]+)\/test$/);
  if (testMatch && req.method === 'POST') {
    if (!guardOwner(req, res)) return true;
    const id = testMatch[1];
    if (_UNSAFE_IDS.includes(id)) return jsonRes(res, 400, { error: 'invalid id' });
    const ch = engine.getChannel(id);
    if (!ch) return jsonRes(res, 404, { error: 'not found' });

    const preset = engine.getPreset(ch.type);
    if (preset?.auth?.type === 'oauth-token') {
      try {
        const oauthMw = require('../services/channel-middleware/oauth-token');
        const mergedConfig = { ...preset, ...ch.preset, _userConfig: ch.config };
        const token = await oauthMw.getToken(mergedConfig, ch.config);
        if (token) return jsonRes(res, 200, { ok: true, message: '认证成功，Token 已获取' });
        return jsonRes(res, 400, { error: '获取 Token 失败，请检查配置' });
      } catch (e) {
        return jsonRes(res, 400, { error: e.message });
      }
    }
    return jsonRes(res, 200, { ok: true, message: 'Channel 配置有效' });
  }

  return false;
}

function _sanitizeChannel(ch) {
  if (!ch) return ch;
  const result = { ...ch };
  if (result.config) {
    const sanitized = { ...result.config };
    for (const key of Object.keys(sanitized)) {
      if (/secret|password|token|key/i.test(key) && typeof sanitized[key] === 'string') {
        sanitized[key] = sanitized[key] ? '***' : '';
      }
    }
    result.config = sanitized;
  }
  return result;
}

module.exports = { handle };
