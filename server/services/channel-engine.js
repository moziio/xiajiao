/**
 * M9 — Channel Engine
 * 协议驱动的外部平台对接核心引擎
 * 三层架构：协议连接层 → 消息映射层 → 中间件层
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDB } = require('./database');
const store = require('./storage');
const { createLogger } = require('../middleware/logger');
const log = createLogger('channel');

const _presets = new Map();
const _instances = new Map();
const _connectors = {};
const _middleware = {};
const _channelRoutes = new Map();

let _sendFn = null;
let _broadcastFn = null;

function setSendFn(fn) { _sendFn = fn; }
function setBroadcast(fn) { _broadcastFn = fn; }

// ── Template Rendering ──

function renderTemplate(tpl, vars) {
  if (typeof tpl === 'string') {
    return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const v = vars[key];
      return v !== undefined && v !== null ? String(v) : '';
    });
  }
  if (Array.isArray(tpl)) return tpl.map(item => renderTemplate(item, vars));
  if (tpl && typeof tpl === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(tpl)) {
      out[k] = renderTemplate(v, vars);
    }
    return out;
  }
  return tpl;
}

// ── JSONPath-like field accessor ──

function getByPath(obj, dotPath) {
  if (!obj || !dotPath) return undefined;
  const parts = dotPath.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

// ── Preset Loading ──

function loadPresets() {
  const presetsDir = path.join(__dirname, '..', '..', 'data', 'channel-presets');
  if (!fs.existsSync(presetsDir)) return;
  let files;
  try { files = fs.readdirSync(presetsDir).filter(f => f.endsWith('.json')); } catch { return; }
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(presetsDir, file), 'utf8'));
      if (data.id) {
        _presets.set(data.id, data);
        log.info(`preset loaded: ${data.id} (${data.name || file})`);
      }
    } catch (e) { log.warn(`preset ${file} load failed:`, e.message); }
  }
}

function getPresets() {
  return [..._presets.values()].map(p => ({
    id: p.id, name: p.name, icon: p.icon || '🔗',
    protocol: p.protocol, modes: p.modes,
    configFields: p.configFields || [],
    guide: p.guide || null,
  }));
}

function getPreset(id) { return _presets.get(id) || null; }

// ── Connector / Middleware Registration ──

function registerConnector(name, connector) {
  _connectors[name] = connector;
  log.info(`connector registered: ${name}`);
}

function registerMiddleware(name, mw) {
  _middleware[name] = mw;
  log.info(`middleware registered: ${name}`);
}

// ── Channel CRUD (DB) ──

function _genId() { return 'ch-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex'); }

function getAllChannels() {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM channels ORDER BY created DESC').all();
  return rows.map(_parseRow);
}

function getChannel(id) {
  const db = getDB();
  const row = db.prepare('SELECT * FROM channels WHERE id=?').get(id);
  return row ? _parseRow(row) : null;
}

function createChannel({ type, name, preset, config, mode }) {
  const db = getDB();
  const id = _genId();
  const now = Date.now();
  const deviceId = 'dev-' + crypto.randomBytes(8).toString('hex');
  db.prepare(`INSERT INTO channels (id, type, name, preset, config, mode, enabled, status, device_id, stats, created)
    VALUES (?,?,?,?,?,?,1,'idle',?,?,?)`).run(
    id, type || 'custom', name || '', JSON.stringify(preset || {}),
    JSON.stringify(config || {}), mode || 'webhook', deviceId, '{}', now
  );
  return getChannel(id);
}

function updateChannel(id, updates) {
  const db = getDB();
  const ch = getChannel(id);
  if (!ch) return null;
  const fields = [];
  const values = [];
  if (updates.name !== undefined) { fields.push('name=?'); values.push(updates.name); }
  if (updates.config !== undefined) { fields.push('config=?'); values.push(JSON.stringify(updates.config)); }
  if (updates.preset !== undefined) { fields.push('preset=?'); values.push(JSON.stringify(updates.preset)); }
  if (updates.mode !== undefined) { fields.push('mode=?'); values.push(updates.mode); }
  if (updates.enabled !== undefined) { fields.push('enabled=?'); values.push(updates.enabled ? 1 : 0); }
  if (updates.status !== undefined) { fields.push('status=?'); values.push(updates.status); }
  if (updates.error !== undefined) { fields.push('error=?'); values.push(updates.error); }
  if (updates.stats !== undefined) { fields.push('stats=?'); values.push(JSON.stringify(updates.stats)); }
  if (!fields.length) return ch;
  values.push(id);
  db.prepare(`UPDATE channels SET ${fields.join(',')} WHERE id=?`).run(...values);
  return getChannel(id);
}

function deleteChannel(id) {
  const db = getDB();
  stopInstance(id);
  db.prepare('DELETE FROM channel_sessions WHERE channel_id=?').run(id);
  db.prepare('DELETE FROM channels WHERE id=?').run(id);
}

function _parseRow(row) {
  return {
    ...row,
    enabled: !!row.enabled,
    preset: _safeJSON(row.preset, {}),
    config: _safeJSON(row.config, {}),
    stats: _safeJSON(row.stats, {}),
  };
}

function _safeJSON(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

// ── Channel Sessions ──

function getOrCreateSession(channelId, externalUserId, externalName) {
  const db = getDB();
  let session = db.prepare('SELECT * FROM channel_sessions WHERE channel_id=? AND external_user_id=?')
    .get(channelId, externalUserId);
  if (session) {
    db.prepare('UPDATE channel_sessions SET last_active=? WHERE id=?').run(Date.now(), session.id);
    return _parseSession(session);
  }
  const ch = getChannel(channelId);
  if (!ch) return null;
  const agentId = ch.config.imAgentId || ch.config.agentId || store.localAgents[0]?.id || 'main';
  const imChannel = `ext-${channelId}-${externalUserId}`;
  const id = 'cs-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
  db.prepare(`INSERT INTO channel_sessions (id, channel_id, external_user_id, external_name, agent_id, im_channel, last_active, metadata)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, channelId, externalUserId, externalName || '', agentId, imChannel, Date.now(), '{}');
  return { id, channel_id: channelId, external_user_id: externalUserId, external_name: externalName || '', agent_id: agentId, im_channel: imChannel, last_active: Date.now(), metadata: {} };
}

function getSessionsByChannel(channelId) {
  const db = getDB();
  return db.prepare('SELECT * FROM channel_sessions WHERE channel_id=? ORDER BY last_active DESC').all(channelId).map(_parseSession);
}

function _parseSession(row) {
  return { ...row, metadata: _safeJSON(row.metadata, {}) };
}

// ── Instance Lifecycle ──

const _starting = new Set();

async function startInstance(channelId) {
  if (_starting.has(channelId)) throw new Error('channel is already starting');
  _starting.add(channelId);

  try {
    return await _doStartInstance(channelId);
  } finally {
    _starting.delete(channelId);
  }
}

async function _doStartInstance(channelId) {
  const ch = getChannel(channelId);
  if (!ch) throw new Error('channel not found: ' + channelId);
  if (!ch.enabled) throw new Error('channel is disabled');

  if (_instances.has(channelId)) {
    stopInstance(channelId);
  }

  const presetData = ch.type !== 'custom' ? (_presets.get(ch.type) || {}) : {};
  const mergedConfig = { ...presetData, ...ch.preset, _userConfig: ch.config };

  const protocol = mergedConfig.protocol || ch.mode || 'webhook';
  const connector = _connectors[protocol];
  if (!connector) throw new Error(`connector "${protocol}" not registered`);

  const mwNames = mergedConfig.webhook?.middleware || mergedConfig.middleware || [];
  const mwChain = mwNames.map(n => _middleware[n]).filter(Boolean);

  const abort = new AbortController();

  const ctx = {
    channelId,
    channel: ch,
    config: ch.config,
    deviceId: ch.device_id,
    abort: abort.signal,
    abortCtrl: abort,
    middlewareChain: mwChain,

    log: createLogger(`ch:${ch.name || channelId}`),

    getToken: async () => {
      if (!mergedConfig.auth || mergedConfig.auth.type !== 'oauth-token') return null;
      const oauthMw = _middleware['oauth-token'];
      if (!oauthMw) return null;
      return oauthMw.getToken(mergedConfig, ch.config);
    },

    onInbound: (rawMessage) => _handleInbound(ch, mergedConfig, rawMessage, ctx),

    updateStatus: (status, error) => {
      updateChannel(channelId, { status, error: error || null });
      if (_broadcastFn) _broadcastFn({ type: 'channel_status', channelId, status, error });
    },

    mountRoute: (method, routePath, handler) => {
      const key = `${method}:${routePath}`;
      _channelRoutes.set(key, handler);
      ctx.log.info(`mounted route: ${method} ${routePath}`);
    },

    unmountRoute: (method, routePath) => {
      _channelRoutes.delete(`${method}:${routePath}`);
    },

    heartbeat: {
      _timer: null,
      start(fn, intervalMs) {
        this.stop();
        this._timer = setInterval(fn, intervalMs || 30000);
      },
      stop() {
        if (this._timer) { clearInterval(this._timer); this._timer = null; }
      },
    },

    scheduleReconnect: (fn) => {
      const reconnCfg = mergedConfig.reconnect || {};
      const baseMs = reconnCfg.intervalMs || 20000;
      const maxMs = reconnCfg.maxWindowMs || 600000;
      let attempt = ctx._reconnectAttempt || 0;
      attempt++;
      ctx._reconnectAttempt = attempt;
      const delay = reconnCfg.backoff ? Math.min(baseMs * Math.pow(1.5, attempt - 1), maxMs) : baseMs;
      ctx.log.info(`reconnect in ${Math.round(delay / 1000)}s (attempt ${attempt})`);
      ctx._reconnectTimer = setTimeout(() => {
        if (abort.signal.aborted) return;
        fn().catch(e => ctx.log.error('reconnect failed:', e.message));
      }, delay);
    },

    _reconnectAttempt: 0,
    _reconnectTimer: null,
  };

  updateChannel(channelId, { status: 'connecting' });

  try {
    await connector.start(ctx, mergedConfig);
    _instances.set(channelId, { ctx, connector, config: mergedConfig });
    log.info(`channel "${ch.name || channelId}" started (${protocol})`);
  } catch (e) {
    abort.abort();
    ctx.heartbeat.stop();
    updateChannel(channelId, { status: 'error', error: e.message });
    throw e;
  }
}

function stopInstance(channelId) {
  const inst = _instances.get(channelId);
  if (!inst) return;
  const { ctx } = inst;
  ctx.heartbeat.stop();
  if (ctx._reconnectTimer) clearTimeout(ctx._reconnectTimer);
  ctx.abortCtrl.abort();
  _instances.delete(channelId);
  updateChannel(channelId, { status: 'idle' });
  log.info(`channel "${channelId}" stopped`);
}

function getInstanceStatus() {
  const result = {};
  for (const [id, inst] of _instances) {
    result[id] = { status: inst.ctx.channel?.status || 'unknown' };
  }
  return result;
}

function isRunning(channelId) { return _instances.has(channelId); }

// ── Inbound Message Handling ──

function _handleInbound(channel, config, rawMessage, ctx) {
  const inCfg = config.inbound || {};

  let processed = rawMessage;
  for (const mw of ctx.middlewareChain) {
    if (typeof mw.process === 'function') {
      processed = mw.process(processed, ctx);
    }
  }

  const userId = getByPath(processed, inCfg.userIdPath);
  let text = getByPath(processed, inCfg.textPath);
  const msgId = getByPath(processed, inCfg.msgIdPath);
  const userName = getByPath(processed, inCfg.userNamePath) || userId;

  if (typeof text === 'string' && text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed.text) text = parsed.text;
    } catch {}
  }

  if (!userId || !text) {
    ctx.log.warn('inbound skipped: missing userId or text');
    return;
  }

  if (inCfg.typeFilter) {
    const msgType = getByPath(processed, inCfg.typeFilter.field);
    if (msgType && inCfg.typeFilter.accept && !inCfg.typeFilter.accept.includes(msgType)) {
      return;
    }
  }

  const safeText = String(text).slice(0, 10000);

  _routeToAgent(channel, { userId: String(userId), userName: String(userName || ''), text: safeText, msgId }, ctx);
}

// ── Route to Agent ──

async function _routeToAgent(channel, msg, ctx) {
  if (!_sendFn) { ctx.log.error('sendFn not set'); return; }

  const session = getOrCreateSession(channel.id, msg.userId, msg.userName);
  if (!session) { ctx.log.error('failed to create session'); return; }

  const agentId = session.agent_id;
  const imChannel = session.im_channel;

  ctx.log.info(`inbound: user=${msg.userId} → agent=${agentId} text="${msg.text.slice(0, 50)}"`);

  const chatMsg = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    type: 'user', userId: 'ext:' + msg.userId, userName: msg.userName,
    text: msg.text, channel: imChannel, ts: Date.now(),
    _channelId: channel.id, _channelName: channel.name || channel.type || '', _external: true,
  };
  store.addMessage(chatMsg);
  if (_broadcastFn) _broadcastFn({ type: 'message', message: chatMsg });

  _updateStats(channel.id, 'received');

  const replyCollector = _createReplyCollector(channel, msg.userId, ctx);

  try {
    await _sendFn(imChannel, agentId, msg.text, {
      _isChannel: true,
      _channelReply: (text) => replyCollector.collect(text),
    });
  } catch (e) {
    ctx.log.error('agent call failed:', e.message);
  }
}

// ── Outbound Reply ──

function _createReplyCollector(channel, externalUserId, ctx) {
  let _pending = '';
  let _timer = null;
  const DEBOUNCE = 500;

  return {
    collect(text) {
      _pending += text;
      if (_timer) clearTimeout(_timer);
      _timer = setTimeout(() => {
        if (_pending) {
          _sendOutbound(channel, externalUserId, _pending, ctx).catch(e =>
            ctx.log.error('outbound failed:', e.message)
          );
          _pending = '';
        }
      }, DEBOUNCE);
    },
  };
}

async function _sendOutbound(channel, externalUserId, text, ctx) {
  const chData = getChannel(channel.id);
  if (!chData) return;

  const inst = _instances.get(channel.id);
  if (inst && inst.connector && typeof inst.connector.sendReply === 'function') {
    try {
      await inst.connector.sendReply(inst.ctx, externalUserId, text);
      _updateStats(channel.id, 'sent');
      return;
    } catch (e) {
      ctx.log.error('connector sendReply error:', e.message);
    }
  }

  const presetData = chData.type !== 'custom' ? (_presets.get(chData.type) || {}) : {};
  const mergedConfig = { ...presetData, ...chData.preset, _userConfig: chData.config };
  const outCfg = mergedConfig.outbound;
  if (!outCfg || !outCfg.url) {
    ctx.log.warn('no outbound config, reply stays in IM only');
    return;
  }

  const token = await ctx.getToken();
  const vars = { ...chData.config, userId: externalUserId, text, accessToken: token || '' };

  const url = renderTemplate(outCfg.url, vars);
  const bodyStr = JSON.stringify(renderTemplate(outCfg.bodyTemplate || {}, vars));
  const headers = renderTemplate({ 'Content-Type': 'application/json', ...(outCfg.headers || {}) }, vars);

  try {
    const res = await fetch(url, {
      method: outCfg.method || 'POST',
      headers,
      body: bodyStr,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      ctx.log.warn(`outbound HTTP ${res.status}: ${errText.slice(0, 200)}`);
    } else {
      _updateStats(channel.id, 'sent');
    }
  } catch (e) {
    ctx.log.error('outbound fetch error:', e.message);
  }
}

// ── Stats ──

function _updateStats(channelId, type) {
  const db = getDB();
  try {
    const row = db.prepare('SELECT stats FROM channels WHERE id=?').get(channelId);
    const stats = _safeJSON(row?.stats, {});
    const today = new Date().toISOString().slice(0, 10);
    if (!stats[today]) stats[today] = { received: 0, sent: 0 };
    stats[today][type] = (stats[today][type] || 0) + 1;
    const keys = Object.keys(stats).sort().slice(-7);
    const trimmed = {};
    for (const k of keys) trimmed[k] = stats[k];
    db.prepare('UPDATE channels SET stats=? WHERE id=?').run(JSON.stringify(trimmed), channelId);
  } catch {}
}

// ── Webhook Route Handler (used by HTTP server) ──

function handleChannelRoute(method, urlPath, req, res, body) {
  const key = `${method}:${urlPath}`;
  const handler = _channelRoutes.get(key);
  if (handler) {
    handler(req, res, body);
    return true;
  }
  for (const [routeKey, routeHandler] of _channelRoutes) {
    const [rMethod, rPath] = routeKey.split(':');
    if (rMethod !== method) continue;
    if (_matchRoute(rPath, urlPath)) {
      routeHandler(req, res, body);
      return true;
    }
  }
  return false;
}

function _matchRoute(pattern, actual) {
  if (pattern === actual) return true;
  const pParts = pattern.split('/');
  const aParts = actual.split('/');
  if (pParts.length !== aParts.length) return false;
  return pParts.every((p, i) => p.startsWith('{{') || p === aParts[i]);
}

// ── Init ──

function _autoLoadModules(dir, registerFn, label) {
  if (!fs.existsSync(dir)) return;
  let files;
  try { files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('_')); } catch { return; }
  for (const file of files) {
    const name = file.replace('.js', '');
    try {
      const mod = require(path.join(dir, file));
      registerFn(name, mod);
    } catch (e) { log.warn(`${label} ${name} not loaded: ${e.message}`); }
  }
}

async function init() {
  loadPresets();

  _autoLoadModules(path.join(__dirname, 'connectors'), registerConnector, 'connector');
  _autoLoadModules(path.join(__dirname, 'channel-middleware'), registerMiddleware, 'middleware');

  const channels = getAllChannels().filter(ch => ch.enabled);
  if (channels.length) {
    log.info(`starting ${channels.length} channel(s)...`);
    for (const ch of channels) {
      try { await startInstance(ch.id); } catch (e) { log.warn(`channel "${ch.name || ch.id}" start failed:`, e.message); }
    }
  }
}

module.exports = {
  init, setSendFn, setBroadcast,
  loadPresets, getPresets, getPreset,
  registerConnector, registerMiddleware,
  getAllChannels, getChannel, createChannel, updateChannel, deleteChannel,
  startInstance, stopInstance, getInstanceStatus, isRunning,
  getSessionsByChannel, getOrCreateSession,
  handleChannelRoute, renderTemplate, getByPath,
};
