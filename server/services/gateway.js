const crypto = require('crypto');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const cfg = require('../config');
const store = require('./storage');
const imageGen = require('./image-gen');
const { emitToolEvent, makeCallId } = require('./tool-events');
const { createLogger } = require('../middleware/logger');
const log = createLogger('gw');

let clientSockets = new Set();
const users = new Map();
let knownAgents = [];

function setClientSockets(s) { clientSockets = s; }

function broadcast(msg, exclude) {
  const raw = typeof msg === 'string' ? msg : JSON.stringify(msg);
  for (const ws of clientSockets) {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) ws.send(raw);
  }
}

function refreshKnownAgents() {
  store.loadAgents();
  const DE = ['\u{1F916}','\u{1F4CB}','\u{270D}\uFE0F','\u{1F680}','\u{1F50D}','\u{1F4A1}','\u{1F4CA}','\u{1F3AF}'];
  const DC = ['#00d4ff','#ff8a00','#00f5a0','#8b5cf6','#ff3b5c','#0099cc','#e67e22','#2ecc71'];
  knownAgents = store.localAgents.map((a, i) => ({
    id: a.id, name: a.name, model: a.model || null,
    emoji: DE[i % DE.length], color: DC[i % DC.length],
  }));
  return knownAgents;
}

// ── Community Event Engine (mode-independent) ──

const SKIP_PHRASES = ['好的', '收到', '跳过', '了解', '明白', 'OK', 'ok', 'Ok', '是的', '没问题', '知道了'];

function shouldAutoPost(agentId, text) {
  const prof = store.profiles[agentId] || {};
  const ap = prof.autoPost || { mode: 'off' };
  if (ap.mode === 'off' || !ap.mode) return false;
  if (ap.mode === 'always') return true;
  const cooldownMs = (ap.cooldownMin || 60) * 60000;
  const recentPosts = store.getPostsByAuthor(agentId, 1);
  const lastPost = recentPosts[0];
  if (lastPost && Date.now() - lastPost.ts < cooldownMs) return false;
  if (ap.activeHours) {
    const parts = ap.activeHours.split('-').map(Number);
    if (parts.length === 2) { const hour = new Date().getHours(); if (hour < parts[0] || hour >= parts[1]) return false; }
  }
  if (text.length < (ap.minLength || 100)) return false;
  if (ap.mode === 'smart') {
    const trimmed = text.trim();
    if (SKIP_PHRASES.some(p => trimmed.startsWith(p) && trimmed.length < p.length + 20)) return false;
    return true;
  }
  if (ap.mode === 'keyword') {
    const keywords = ap.keywords || [];
    return keywords.length > 0 && keywords.some(kw => text.includes(kw));
  }
  return false;
}

function createPostInternal({ authorType, authorId, title, content, topic, type, tags }) {
  const post = {
    id: 'post-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    authorType: authorType || 'user', authorId: authorId || 'anon',
    title: title || '', content: content || '',
    topic: topic || 'daily', type: type || 'share', tags: tags || [],
    ts: Date.now(),
  };
  store.addPost(post);
  if (authorType === 'agent') store.bumpMetric(authorId, 'posts');
  return store.getPost(post.id) || post;
}

function emitCommunityEvent(eventType, data) {
  if (eventType === 'agent_task_complete') {
    const { agentId, text } = data;
    if (!shouldAutoPost(agentId, text)) return;
    const ag = knownAgents.find(a => a.id === agentId);
    if (!ag || !text) return;
    const post = createPostInternal({ authorType: 'agent', authorId: agentId, title: `${ag.name} 完成了一项任务`, content: text.length > 500 ? text.slice(0, 500) + '...' : text, topic: 'showcase', type: 'log', tags: ['自动'] });
    broadcast({ type: 'community_update', post });
  }
  if (eventType === 'agent_created') {
    const { id, name } = data;
    const post = createPostInternal({ authorType: 'system', authorId: 'system', title: `新成员加入：${name}`, content: `Agent "${name}" (${id}) 已加入团队，欢迎！`, topic: 'announce', type: 'announce', tags: ['系统'] });
    broadcast({ type: 'community_update', post });
  }
  if (eventType === 'agent_error') {
    const { agentId, error } = data;
    const ag = knownAgents.find(a => a.id === agentId);
    createPostInternal({ authorType: 'system', authorId: 'system', title: `异常告警：${ag?.name || agentId}`, content: `Agent ${ag?.name || agentId} 发生错误: ${error}`, topic: 'announce', type: 'announce', tags: ['告警'] });
  }
  if (eventType === 'meeting_summary') {
    const { title, content } = data;
    const post = createPostInternal({ authorType: 'system', authorId: 'system', title, content, topic: 'daily', type: 'log', tags: ['例会'] });
    broadcast({ type: 'community_update', post });
  }
}

// ══════════════════════════════════════════════
// Gateway Mode (optional, only used when llmMode === 'gateway')
// ══════════════════════════════════════════════

let gatewayWs = null;
let gwConnected = false;
let gwReconnectTimer = null;
let gwReconnectDelay = 1000;
const pendingRequests = new Map();
const runIdChannelMap = new Map();
const activeGwRuns = new Map();
let configAppliedOnce = false;

function connectGateway() {
  if (cfg.getLLMMode() !== 'gateway') { log.info('skip — llmMode is not gateway'); return; }
  if (gatewayWs && (gatewayWs.readyState === WebSocket.OPEN || gatewayWs.readyState === WebSocket.CONNECTING)) return;
  clearTimeout(gwReconnectTimer);
  log.info(`connecting ${cfg.GATEWAY_WS} ...`);
  gatewayWs = new WebSocket(cfg.GATEWAY_WS, { headers: { 'Origin': cfg.GATEWAY_HTTP } });
  gatewayWs.on('open', () => log.info('ws open, waiting for challenge...'));
  gatewayWs.on('message', (raw) => { try { handleGatewayMessage(JSON.parse(raw.toString())); } catch {} });
  gatewayWs.on('close', (code, reason) => {
    log.info(`disconnected code=${code} reason=${reason}`);
    gatewayWs = null; gwConnected = false;
    for (const [id, pending] of pendingRequests) { clearTimeout(pending.timer); pending.reject(new Error('gateway disconnected')); }
    pendingRequests.clear();
    broadcast({ type: 'gateway_status', connected: false });
    if (cfg.getLLMMode() === 'gateway') scheduleGwReconnect();
  });
  gatewayWs.on('error', (err) => { log.error('error:', err.message); try { gatewayWs.close(); } catch {} });
}

function scheduleGwReconnect() {
  clearTimeout(gwReconnectTimer);
  gwReconnectTimer = setTimeout(() => { gwReconnectDelay = Math.min(gwReconnectDelay * 1.5, 30000); connectGateway(); }, gwReconnectDelay);
}

function gwSendReq(method, params) {
  if (!gatewayWs || gatewayWs.readyState !== WebSocket.OPEN) return Promise.reject(new Error('not connected'));
  const id = crypto.randomUUID();
  gatewayWs.send(JSON.stringify({ type: 'req', id, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pendingRequests.delete(id); reject(new Error('timeout')); }, 120000);
    pendingRequests.set(id, { resolve, reject, timer });
  });
}

function handleGatewayMessage(msg) {
  if (msg.type === 'event' && msg.event === 'connect.challenge') {
    gwSendReq('connect', {
      minProtocol: 3, maxProtocol: 3,
      client: { id: 'webchat', version: 'openclaw-im-server-5.0', platform: 'node', mode: 'webchat', instanceId: crypto.randomUUID() },
      role: 'operator', scopes: ['operator.admin'], caps: ['tool-events'],
      auth: { token: cfg.getGatewayToken() }, userAgent: 'OpenClaw-IM-Server/5.0', locale: 'zh-CN'
    }).then(result => {
      log.info('authenticated! server:', result?.server?.version);
      gwConnected = true; gwReconnectDelay = 1000;
      broadcast({ type: 'gateway_status', connected: true, agents: knownAgents });
      if (!configAppliedOnce) { configAppliedOnce = true; setTimeout(() => applyConfig(), 2000); }
    }).catch(err => log.error('auth failed:', err.message || err));
    return;
  }
  if (msg.type === 'res') {
    const pending = pendingRequests.get(msg.id);
    if (pending) { pendingRequests.delete(msg.id); clearTimeout(pending.timer); msg.ok ? pending.resolve(msg.payload) : pending.reject(msg.error || { message: 'unknown error' }); }
    return;
  }
  if (msg.type === 'event') handleGatewayEvent(msg);
}

function handleGatewayEvent(msg) {
  const { event, payload } = msg;
  if (event === 'health') {
    if (payload?.agents) {
      const configAgents = store.loadAgents();
      knownAgents = payload.agents.map(a => {
        const ca = configAgents.find(c => c.id === a.agentId);
        const m = ca?.model;
        return { id: a.agentId, name: a.name, isDefault: a.isDefault, model: typeof m === 'string' ? m : m?.primary || null };
      });
      broadcast({ type: 'agents_update', agents: knownAgents });
    }
    return;
  }
  if (event === 'agent') { handleAgentEvent(payload); return; }
  if (event === 'chat') { handleChatEvent(payload); return; }
}

function resolveChannel(sessionKey, runId) {
  const tracked = runId ? runIdChannelMap.get(runId) : null;
  if (tracked) return { channel: tracked.channel, agentId: tracked.agentId };
  return { channel: sessionKeyToChannel(sessionKey), agentId: sessionKeyToAgentId(sessionKey) };
}

function handleAgentEvent(payload) {
  if (!payload) return;
  const { stream, data } = payload;
  const { channel, agentId } = resolveChannel(payload.sessionKey, payload.runId);
  if (stream === 'assistant' && data) {
    const run = activeGwRuns.get(channel);
    if (run) run.currentText = data.text || '';
    broadcast({ type: 'agent_stream', channel, agentId, runId: payload.runId || null, text: data.text || '', delta: data.delta || '' });
  }
  if (stream === 'lifecycle' && data) {
    broadcast({ type: 'agent_lifecycle', channel, agentId, runId: payload.runId || null, phase: data.phase });
  }
  if (stream === 'tool' && data) {
    _handleGatewayToolEvent(channel, agentId, payload.runId, data);
  }
}

/**
 * M1.4 — Gateway tool-events 透传
 * 将 Gateway 推送的工具事件转化为统一 Tool Event 协议
 * 通过 imSettings.gatewayToolEvents 控制开关（默认关闭）
 */
function _handleGatewayToolEvent(channel, agentId, runId, data) {
  if (!store.imSettings.gatewayToolEvents) return;

  const callId = data.callId || data.toolCallId || data.id || makeCallId();
  const toolName = data.name || data.tool || 'unknown';

  if (data.status === 'done' || data.status === 'error' || data.phase === 'end' || data.state === 'result') {
    const isError = data.status === 'error' || !!data.error;
    emitToolEvent({
      type: 'tool_call_end',
      channel, agentId, runId,
      callId, tool: toolName,
      result: isError ? null : (data.result || data.output || null),
      error: isError ? (data.error || data.errorMessage || 'Tool error') : null,
      durationMs: data.durationMs || data.duration || 0,
    });
  } else if (data.status === 'running' || data.phase === 'start' || data.state === 'calling') {
    emitToolEvent({
      type: 'tool_call_start',
      channel, agentId, runId,
      callId, tool: toolName,
      args: data.args || data.input || data.arguments || {},
    });
  }
}

function handleChatEvent(payload) {
  if (!payload) return;
  const { sessionKey, runId, state, message, errorMessage } = payload;
  const { channel, agentId } = resolveChannel(sessionKey, runId);
  if (state === 'final' && message) {
    let text = extractChatText(message);
    if (!text) return;

    if (imageGen.isEnabled() && imageGen.hasMarker(text)) {
      (async () => {
        try { text = await imageGen.processText(text); } catch (err) { log.error('image-gen: error:', err.message); }
        const entry = { id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), type: 'agent', agent: agentId, channel, text, ts: Date.now(), runId };
        store.addMessage(entry);
        broadcast({ type: 'message', message: entry });
        store.bumpMetric(agentId, 'messages'); store.bumpMetric(agentId, 'tasks');
        emitCommunityEvent('agent_task_complete', { agentId, text });
        if (runId) runIdChannelMap.delete(runId); activeGwRuns.delete(channel);
      })();
      return;
    }

    const entry = { id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), type: 'agent', agent: agentId, channel, text, ts: Date.now(), runId };
    store.addMessage(entry);
    broadcast({ type: 'message', message: entry });
    store.bumpMetric(agentId, 'messages'); store.bumpMetric(agentId, 'tasks');
    emitCommunityEvent('agent_task_complete', { agentId, text });
    if (runId) runIdChannelMap.delete(runId); activeGwRuns.delete(channel);
  }
  if (state === 'error') {
    broadcast({ type: 'agent_error', channel, error: errorMessage || 'Agent error' });
    emitCommunityEvent('agent_error', { agentId, error: errorMessage || 'unknown' });
    if (runId) runIdChannelMap.delete(runId); activeGwRuns.delete(channel);
  }
}

function extractChatText(message) {
  if (!message) return '';
  if (typeof message.text === 'string') return message.text;
  if (Array.isArray(message.content)) return message.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
  if (typeof message.content === 'string') return message.content;
  return '';
}

function sessionKeyToChannel(sk) {
  if (!sk || sk === 'main') return 'group';
  const m = sk.match(/^agent:([^:]+):(.+)$/);
  if (!m) return 'group';
  return m[2] === 'main' ? m[1] : m[2];
}
function sessionKeyToAgentId(sk) { if (!sk || sk === 'main') return 'main'; const m = sk.match(/^agent:([^:]+):/); return m ? m[1] : 'main'; }
function channelToSessionKey(channel, agentId) {
  if (channel === 'group') return 'main';
  const isGroup = store.groups.find(g => g.id === channel);
  if (isGroup) return `agent:${agentId}:${channel}`;
  return `agent:${agentId || channel}:main`;
}

async function sendToGateway(channel, agentId, text) {
  if (!gwConnected) return { ok: false, error: 'Gateway not connected' };
  const sessionKey = channelToSessionKey(channel, agentId);
  broadcast({ type: 'agent_lifecycle', channel, agentId, runId: null, phase: 'start' });
  try {
    const result = await gwSendReq('chat.send', { sessionKey, message: text, deliver: false, idempotencyKey: crypto.randomUUID() });
    const runId = result?.runId;
    if (runId) {
      runIdChannelMap.set(runId, { channel, agentId, ts: Date.now() });
      activeGwRuns.set(channel, { runId, sessionKey, agentId, ts: Date.now() });
      setTimeout(() => { runIdChannelMap.delete(runId); if (activeGwRuns.get(channel)?.runId === runId) activeGwRuns.delete(channel); }, 600000);
    }
    return { ok: true, runId, sessionKey };
  } catch (err) {
    broadcast({ type: 'agent_lifecycle', channel, agentId, runId: null, phase: 'end' });
    return { ok: false, error: err.message || String(err) };
  }
}

async function cancelGwRun(channel) {
  const run = activeGwRuns.get(channel);
  if (!run) return { ok: false, error: 'no active run' };
  const partialText = run.currentText;
  try { await gwSendReq('chat.cancel', { runId: run.runId, sessionKey: run.sessionKey }); } catch {}
  activeGwRuns.delete(channel);
  if (run.runId) runIdChannelMap.delete(run.runId);

  if (partialText && partialText.trim()) {
    const entry = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      type: 'agent', agent: run.agentId, channel,
      text: partialText, ts: Date.now(), runId: run.runId,
    };
    store.addMessage(entry);
    broadcast({ type: 'message', message: entry });
  }

  broadcast({ type: 'agent_lifecycle', channel, agentId: run.agentId, runId: run.runId, phase: 'end' });
  return { ok: true };
}

async function applyConfig() {
  try {
    if (!gwConnected) return;
    store.loadAgents(); store.loadModels();
    const agentIds = store.localAgents.map(a => a.id);
    const providers = {};
    for (const [pid, prov] of Object.entries(store.localModels.providers || {})) {
      const provModels = (store.localModels.models || []).filter(m => m.provider === pid);
      providers[pid] = {
        baseUrl: prov.baseUrl, apiKey: prov.apiKey, api: prov.api || 'openai-completions',
        models: provModels.map(m => ({ id: m.id.split('/')[1] || m.id, name: m.name, reasoning: m.reasoning, input: m.input, contextWindow: m.contextWindow, maxTokens: m.maxTokens }))
      };
    }
    const defaultModel = store.imSettings.defaultModel || store.getFirstAvailableModel() || 'bailian/qwen3.5-plus';
    const config = {
      models: { mode: 'merge', providers },
      agents: {
        defaults: { model: { primary: defaultModel }, workspace: path.join(cfg.DATA_DIR, 'workspace') },
        list: store.localAgents.map(a => ({ id: a.id, name: a.name, workspace: a.workspace || path.join(cfg.DATA_DIR, `workspace-${a.id}`), ...(a.model ? { model: { primary: a.model } } : {}) }))
      },
      tools: { profile: 'full', agentToAgent: { enabled: true, allow: agentIds } },
      messages: { groupChat: { mentionPatterns: agentIds.map(id => `@${id}`) } },
      commands: { native: 'auto', nativeSkills: 'auto', restart: true, ownerDisplay: 'raw' },
      session: { dmScope: 'per-channel-peer' },
      gateway: { mode: 'local' }
    };
    try { const ocj = JSON.parse(fs.readFileSync(cfg.OPENCLAW_JSON, 'utf8')); if (ocj.gateway) config.gateway = ocj.gateway; if (ocj.channels) config.channels = ocj.channels; if (ocj.plugins) config.plugins = ocj.plugins; } catch {}
    const raw = JSON.stringify(config, null, 2);
    const getResult = await gwSendReq('config.get', {});
    if (getResult?.hash) { await gwSendReq('config.apply', { raw, baseHash: getResult.hash, sessionKey: 'main' }); log.info('config: applied successfully'); }
  } catch (e) { log.error('config: apply failed:', e.message); }
}

module.exports = {
  get clientSockets() { return clientSockets; },
  get users() { return users; },
  get knownAgents() { return knownAgents; },
  get gwConnected() { return gwConnected; },
  setClientSockets, broadcast, refreshKnownAgents,
  connectGateway, gwSendReq, sendToGateway, cancelGwRun, applyConfig,
  emitCommunityEvent, createPostInternal,
};
