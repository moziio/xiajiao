const fs = require('fs');
const path = require('path');
const cfg = require('../config');
const store = require('../services/storage');
const gw = require('../services/gateway');
const rag = require('../services/rag');
const { guardOwner, isOwnerReq, jsonRes, readBody } = require('../middleware/auth');

function _cleanOrphanedAgentModels(removedIds) {
  store.loadAgents();
  let dirty = false;
  for (const ag of store.localAgents) {
    if (ag.model && removedIds.has(ag.model)) { ag.model = ''; dirty = true; }
  }
  if (dirty) {
    store.saveAgents();
    gw.refreshKnownAgents();
    gw.broadcast({ type: 'agents_update', agents: gw.knownAgents });
  }
}

async function handle(req, res, urlPath) {
  if (urlPath === '/api/settings' && req.method === 'GET') {
    if (!guardOwner(req, res)) return true;
    const s = { ...store.imSettings };
    delete s.ownerKey;
    delete s.adminKey;
    delete s.memberKey;
    s.hasAdminKey = !!store.imSettings.adminKey;
    s.hasMemberKey = !!store.imSettings.memberKey;
    return jsonRes(res, 200, s);
  }
  if (urlPath === '/api/settings' && req.method === 'PUT') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    if (body.supervisionCron !== undefined) {
      store.imSettings.supervisionCron = body.supervisionCron;
      if (global.scheduler) global.scheduler.reloadSupervision();
    }
    if (body.appName !== undefined) store.imSettings.appName = body.appName;
    if (body.defaultModel !== undefined) store.imSettings.defaultModel = body.defaultModel;
    if (body.guestCanChat !== undefined) {
      store.imSettings.guestCanChat = body.guestCanChat;
      try { gw.broadcast({ type: 'guest_chat_toggle', guestCanChat: !!body.guestCanChat }); } catch {}
    }
    if (body.gatewayWs !== undefined) store.imSettings.gatewayWs = body.gatewayWs;
    if (body.gatewayHttp !== undefined) store.imSettings.gatewayHttp = body.gatewayHttp;
    if (body.gatewayToken !== undefined) store.imSettings.gatewayToken = body.gatewayToken;
    if (body.llmMode !== undefined) store.imSettings.llmMode = body.llmMode;
    if (body.port !== undefined) store.imSettings.port = parseInt(body.port, 10) || 18800;
    if (body.gatewayToolEvents !== undefined) store.imSettings.gatewayToolEvents = !!body.gatewayToolEvents;
    store.saveSettings();
    return jsonRes(res, 200, { ok: true });
  }

  // ── Providers ──
  if (urlPath === '/api/settings/providers' && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    store.loadModels(true);
    return jsonRes(res, 200, { providers: store.localModels.providers || {}, models: store.localModels.models || [] });
  }
  if (urlPath === '/api/settings/providers' && req.method === 'POST') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    if (!body.id || !body.baseUrl) throw new Error('id and baseUrl required');
    if (['__proto__', 'constructor', 'prototype'].includes(body.id)) throw new Error('invalid provider id');
    store.loadModels(true);
    store.localModels.providers[body.id] = { baseUrl: body.baseUrl, apiKey: body.apiKey || '', api: body.api || 'openai-completions' };
    store.saveModels();
    return jsonRes(res, 200, { ok: true });
  }
  if (urlPath === '/api/settings/providers/discover' && req.method === 'POST') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    if (!body.baseUrl) throw new Error('baseUrl required');
    const baseUrl = body.baseUrl.replace(/\/+$/, '');
    const apiType = body.api || 'openai-completions';

    const AUTH_HEADERS = {
      'anthropic-messages': (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
      _default: (key) => ({ 'Authorization': 'Bearer ' + key }),
    };
    const makeHeaders = () => {
      const h = { 'Content-Type': 'application/json' };
      if (body.apiKey) Object.assign(h, (AUTH_HEADERS[apiType] || AUTH_HEADERS._default)(body.apiKey));
      return h;
    };

    const tryDiscover = async (url) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      try {
        const resp = await fetch(url, { headers: makeHeaders(), signal: ctrl.signal });
        clearTimeout(timer);
        if (!resp.ok) {
          const status = resp.status;
          let msg = 'HTTP ' + status;
          if (status === 401 || status === 403) msg = 'auth_failed';
          else if (status === 404) msg = 'endpoint_not_found';
          else if (status >= 500) msg = 'server_error';
          throw new Error(msg);
        }
        const json = await resp.json();
        return (json.data || json.models || []).map(m => ({
          id: typeof m === 'string' ? m : (m.id || m.name || ''),
          name: typeof m === 'string' ? m : (m.name || m.id || ''),
          contextWindow: m.context_window || m.contextWindow || m.context_length || 128000,
          maxTokens: m.max_tokens || m.maxTokens || m.max_output_tokens || 8192,
        })).filter(m => m.id);
      } catch (e) { clearTimeout(timer); throw e; }
    };

    const candidates = [baseUrl + '/models'];
    if (!baseUrl.endsWith('/v1')) candidates.push(baseUrl + '/v1/models');
    if (baseUrl.includes('dashscope.aliyuncs.com') && !baseUrl.includes('compatible-mode'))
      candidates.push('https://dashscope.aliyuncs.com/compatible-mode/v1/models');
    if (baseUrl.includes('coding.dashscope.aliyuncs.com'))
      candidates.push('https://dashscope.aliyuncs.com/compatible-mode/v1/models');

    let lastError = null;
    for (const url of candidates) {
      try {
        const models = await tryDiscover(url);
        if (models.length) return jsonRes(res, 200, { ok: true, models });
      } catch (e) { lastError = e; }
    }
    return jsonRes(res, 200, { ok: true, models: [], noDiscover: true, error: lastError?.message || '' });
  }

  const provMatch = urlPath.match(/^\/api\/settings\/providers\/([^/]+)$/);
  if (provMatch && req.method === 'PUT') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    store.loadModels();
    const pid = decodeURIComponent(provMatch[1]);
    if (!store.localModels.providers[pid]) throw new Error('provider not found');
    if (body.baseUrl !== undefined) store.localModels.providers[pid].baseUrl = body.baseUrl;
    if (body.apiKey !== undefined) store.localModels.providers[pid].apiKey = body.apiKey;
    if (body.api !== undefined) store.localModels.providers[pid].api = body.api;
    store.saveModels();
    return jsonRes(res, 200, { ok: true });
  }
  if (provMatch && req.method === 'DELETE') {
    if (!guardOwner(req, res)) return;
    store.loadModels(true);
    const pid = decodeURIComponent(provMatch[1]);
    const removedModelIds = new Set((store.localModels.models || []).filter(m => m.provider === pid).map(m => m.id));
    delete store.localModels.providers[pid];
    store.localModels.models = (store.localModels.models || []).filter(m => m.provider !== pid);
    store.saveModels();
    if (removedModelIds.size) _cleanOrphanedAgentModels(removedModelIds);
    return jsonRes(res, 200, { ok: true });
  }

  // ── Models CRUD ──
  if (urlPath === '/api/settings/models/batch' && req.method === 'POST') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    const items = body.models;
    if (!Array.isArray(items) || !items.length) throw new Error('models array required');
    store.loadModels();
    const existing = new Set((store.localModels.models || []).map(m => m.id));
    let added = 0, skipped = 0;
    for (const b of items) {
      if (!b.id || !b.provider) { skipped++; continue; }
      if (existing.has(b.id)) { skipped++; continue; }
      const entry = { id: b.id, name: b.name || b.id, provider: b.provider, reasoning: b.reasoning || false, input: b.input || ['text'], contextWindow: b.contextWindow || 128000, maxTokens: b.maxTokens || 4096 };
      if (b.output) entry.output = b.output;
      if (b.api) entry.api = b.api;
      entry.capabilities = b.capabilities || store.detectCapabilities(entry);
      store.localModels.models.push(entry);
      existing.add(b.id);
      added++;
    }
    store.saveModels();
    return jsonRes(res, 200, { ok: true, added, skipped });
  }
  if (urlPath === '/api/settings/models' && req.method === 'POST') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    if (!body.id || !body.provider) throw new Error('id and provider required');
    store.loadModels();
    if ((store.localModels.models || []).some(m => m.id === body.id)) throw new Error('model already exists');
    const modelEntry = { id: body.id, name: body.name || body.id, provider: body.provider, reasoning: body.reasoning || false, input: body.input || ['text'], contextWindow: body.contextWindow || 128000, maxTokens: body.maxTokens || 4096 };
    if (body.output) modelEntry.output = body.output;
    if (body.api) modelEntry.api = body.api;
    modelEntry.capabilities = body.capabilities || store.detectCapabilities(modelEntry);
    store.localModels.models.push(modelEntry);
    store.saveModels();
    return jsonRes(res, 200, { ok: true, capabilities: modelEntry.capabilities });
  }
  const modelSettMatch = urlPath.match(/^\/api\/settings\/models\/(.+)$/);
  if (modelSettMatch && req.method === 'PUT') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    store.loadModels();
    const mid = decodeURIComponent(modelSettMatch[1]);
    const model = (store.localModels.models || []).find(m => m.id === mid);
    if (!model) throw new Error('model not found');
    if (body.name !== undefined) model.name = body.name;
    if (body.capabilities !== undefined) model.capabilities = body.capabilities;
    if (body.input !== undefined) model.input = body.input;
    if (body.output !== undefined) model.output = body.output;
    if (body.contextWindow !== undefined) model.contextWindow = body.contextWindow;
    if (body.maxTokens !== undefined) model.maxTokens = body.maxTokens;
    store.saveModels();
    return jsonRes(res, 200, { ok: true });
  }
  if (modelSettMatch && req.method === 'DELETE') {
    if (!guardOwner(req, res)) return;
    store.loadModels();
    const mid = decodeURIComponent(modelSettMatch[1]);
    store.localModels.models = (store.localModels.models || []).filter(m => m.id !== mid);
    store.saveModels();
    _cleanOrphanedAgentModels(new Set([mid]));
    return jsonRes(res, 200, { ok: true });
  }

  // toolModels API removed — unified into capabilityRouting via /api/settings/routing

  // ── Capability Routing (new unified approach) ──
  if (urlPath === '/api/settings/routing' && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    const routing = store.getCapabilityRouting();
    return jsonRes(res, 200, { routing, capabilities: store.ALL_CAPABILITIES });
  }
  if (urlPath === '/api/settings/routing' && req.method === 'PUT') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    const safeRouting = {};
    for (const cap of store.ALL_CAPABILITIES) {
      if (body[cap] !== undefined) safeRouting[cap] = body[cap];
    }
    if (body.strategy !== undefined) safeRouting.strategy = body.strategy;
    store.setCapabilityRouting(safeRouting);
    return jsonRes(res, 200, { ok: true });
  }

  // ── Agent Capabilities Resolution ──
  const agentCapsMatch = urlPath.match(/^\/api\/settings\/agent-capabilities\/([^/]+)$/);
  if (agentCapsMatch && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    store.loadAgents();
    const agentId = decodeURIComponent(agentCapsMatch[1]);
    const agent = store.localAgents.find(a => a.id === agentId);
    if (!agent) return jsonRes(res, 404, { error: 'agent not found' });
    const resolved = store.resolveAgentCapabilities(agent);
    return jsonRes(res, 200, { agentId, capabilities: resolved });
  }

  // ── RAG Settings ──
  if (urlPath === '/api/settings/rag' && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    const rag = store.imSettings.rag || {};
    return jsonRes(res, 200, {
      enabled: rag.enabled === true,
      topK: rag.topK || 3,
      chunkSize: rag.chunkSize || 500,
      chunkOverlap: rag.chunkOverlap || 50,
    });
  }
  if (urlPath === '/api/settings/rag' && req.method === 'PUT') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    if (!store.imSettings.rag) store.imSettings.rag = {};
    const rag = store.imSettings.rag;
    if (body.enabled !== undefined) rag.enabled = !!body.enabled;
    if (body.topK !== undefined) rag.topK = parseInt(body.topK, 10) || 3;
    if (body.chunkSize !== undefined) rag.chunkSize = parseInt(body.chunkSize, 10) || 500;
    if (body.chunkOverlap !== undefined) rag.chunkOverlap = parseInt(body.chunkOverlap, 10) || 50;
    store.saveSettings();
    return jsonRes(res, 200, { ok: true });
  }
  if (urlPath === '/api/settings/rag/test' && req.method === 'POST') {
    if (!guardOwner(req, res)) return;
    try {
      const start = Date.now();
      const vectors = await rag.testEmbedding();
      const latency = Date.now() - start;
      return jsonRes(res, 200, { ok: true, dimension: vectors[0]?.length || 0, latency });
    } catch (e) {
      return jsonRes(res, 200, { ok: false, error: e.message });
    }
  }

  // ── Web Search ──
  if (urlPath === '/api/settings/web-search' && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    const ws = store.imSettings.tools?.webSearch || {};
    let prov = ws.provider || 'auto';
    if (prov === 'tavily' || prov === 'serpapi') prov = 'auto';
    return jsonRes(res, 200, {
      provider: prov,
      apiKey: ws.apiKey ? '***' + ws.apiKey.slice(-6) : '',
      hasKey: !!ws.apiKey,
      baseUrl: ws.baseUrl || '',
      braveMode: ws.braveMode || 'web',
    });
  }
  if (urlPath === '/api/settings/web-search' && req.method === 'PUT') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    if (!store.imSettings.tools) store.imSettings.tools = {};
    if (!store.imSettings.tools.webSearch) store.imSettings.tools.webSearch = {};
    const ws = store.imSettings.tools.webSearch;
    if (body.provider !== undefined) ws.provider = body.provider;
    if (body.apiKey !== undefined) ws.apiKey = body.apiKey;
    if (body.baseUrl !== undefined) ws.baseUrl = body.baseUrl;
    if (body.braveMode !== undefined) ws.braveMode = body.braveMode;
    store.saveSettings();
    return jsonRes(res, 200, { ok: true });
  }

  // ── MCP Servers ──
  if (urlPath === '/api/settings/mcp' && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    const mcpServers = store.imSettings.mcpServers || {};
    const mcpManager = require('../services/mcp-manager');
    const status = mcpManager.getStatus();
    const sanitized = {};
    for (const [id, cfg] of Object.entries(mcpServers)) {
      sanitized[id] = {
        command: cfg.command || '',
        args: cfg.args || [],
        url: cfg.url || '',
        transport: cfg.transport || 'stdio',
        enabled: cfg.enabled !== false,
        hasEnv: !!(cfg.env && Object.keys(cfg.env).length),
        hasHeaders: !!(cfg.headers && Object.keys(cfg.headers).length),
        ...(status[id] || { status: cfg.enabled === false ? 'disabled' : 'disconnected', toolCount: 0, tools: [] }),
      };
    }
    return jsonRes(res, 200, { servers: sanitized });
  }
  if (urlPath === '/api/settings/mcp' && req.method === 'PUT') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    if (!body.id) return jsonRes(res, 400, { error: 'id required' });
    if (['__proto__', 'constructor', 'prototype'].includes(body.id)) return jsonRes(res, 400, { error: 'invalid id' });
    const transport = body.transport || (body.url ? 'http' : 'stdio');
    if (transport !== 'stdio' && transport !== 'http') return jsonRes(res, 400, { error: 'transport must be stdio or http' });
    if (!store.imSettings.mcpServers) store.imSettings.mcpServers = {};
    const existing = store.imSettings.mcpServers[body.id] || {};
    const entry = {
      transport: transport || existing.transport || 'stdio',
      enabled: body.enabled !== undefined ? body.enabled : (existing.enabled !== false),
    };
    if (entry.transport === 'http') {
      entry.url = body.url || existing.url || '';
      if (body.headers !== undefined) entry.headers = body.headers;
      else if (existing.headers) entry.headers = existing.headers;
    } else {
      entry.command = body.command || existing.command || '';
      entry.args = body.args !== undefined ? body.args : (existing.args || []);
      if (body.env !== undefined) entry.env = body.env;
      else if (existing.env) entry.env = existing.env;
    }
    store.imSettings.mcpServers[body.id] = entry;
    store.saveSettings();
    return jsonRes(res, 200, { ok: true });
  }
  if (urlPath === '/api/settings/mcp/status' && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    const mcpManager = require('../services/mcp-manager');
    return jsonRes(res, 200, { status: mcpManager.getStatus(), connectedCount: mcpManager.getConnectedCount(), totalTools: mcpManager.getTotalToolCount() });
  }
  const _MCP_UNSAFE_IDS = ['__proto__', 'constructor', 'prototype'];
  const mcpConnMatch = urlPath.match(/^\/api\/settings\/mcp\/([^/]+)\/connect$/);
  if (mcpConnMatch && req.method === 'POST') {
    if (!guardOwner(req, res)) return;
    const sid = decodeURIComponent(mcpConnMatch[1]);
    if (_MCP_UNSAFE_IDS.includes(sid)) return jsonRes(res, 400, { error: 'invalid id' });
    const cfg_entry = store.imSettings.mcpServers?.[sid];
    if (!cfg_entry) return jsonRes(res, 404, { error: 'server not found' });
    const mcpManager = require('../services/mcp-manager');
    try {
      const result = await mcpManager.reconnect(sid, cfg_entry);
      return jsonRes(res, 200, { ok: true, ...result });
    } catch (e) {
      return jsonRes(res, 200, { ok: false, error: e.message });
    }
  }
  const mcpDiscMatch = urlPath.match(/^\/api\/settings\/mcp\/([^/]+)\/disconnect$/);
  if (mcpDiscMatch && req.method === 'POST') {
    if (!guardOwner(req, res)) return;
    const sid = decodeURIComponent(mcpDiscMatch[1]);
    if (_MCP_UNSAFE_IDS.includes(sid)) return jsonRes(res, 400, { error: 'invalid id' });
    const mcpManager = require('../services/mcp-manager');
    try { await mcpManager.disconnect(sid); } catch {}
    return jsonRes(res, 200, { ok: true });
  }
  const mcpIdMatch = urlPath.match(/^\/api\/settings\/mcp\/([^/]+)$/);
  if (mcpIdMatch && req.method === 'DELETE') {
    if (!guardOwner(req, res)) return;
    const sid = decodeURIComponent(mcpIdMatch[1]);
    if (_MCP_UNSAFE_IDS.includes(sid)) return jsonRes(res, 400, { error: 'invalid id' });
    if (!store.imSettings.mcpServers?.[sid]) return jsonRes(res, 404, { error: 'server not found' });
    const mcpManager = require('../services/mcp-manager');
    try { await mcpManager.disconnect(sid); } catch {}
    delete store.imSettings.mcpServers[sid];
    store.saveSettings();
    return jsonRes(res, 200, { ok: true });
  }

  // ── HTTP Tools ──
  if (urlPath === '/api/settings/http-tools' && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    const engine = require('../services/http-tool-engine');
    return jsonRes(res, 200, { tools: engine.list() });
  }
  if (urlPath === '/api/settings/http-tools' && req.method === 'POST') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    const engine = require('../services/http-tool-engine');
    try {
      const entry = engine.create(body);
      return jsonRes(res, 200, { ok: true, tool: entry });
    } catch (e) { return jsonRes(res, 400, { error: e.message }); }
  }
  const htMatch = urlPath.match(/^\/api\/settings\/http-tools\/([^/]+)$/);
  if (htMatch && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    const engine = require('../services/http-tool-engine');
    const tool = engine.getById(decodeURIComponent(htMatch[1]));
    if (!tool) return jsonRes(res, 404, { error: 'not found' });
    return jsonRes(res, 200, { tool });
  }
  if (htMatch && req.method === 'PUT') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    const engine = require('../services/http-tool-engine');
    try {
      const updated = engine.update(decodeURIComponent(htMatch[1]), body);
      return jsonRes(res, 200, { ok: true, tool: updated });
    } catch (e) { return jsonRes(res, 400, { error: e.message }); }
  }
  if (htMatch && req.method === 'DELETE') {
    if (!guardOwner(req, res)) return;
    const engine = require('../services/http-tool-engine');
    engine.remove(decodeURIComponent(htMatch[1]));
    return jsonRes(res, 200, { ok: true });
  }
  const htTestMatch = urlPath.match(/^\/api\/settings\/http-tools\/([^/]+)\/test$/);
  if (htTestMatch && req.method === 'POST') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    const engine = require('../services/http-tool-engine');
    const tool = engine.getById(decodeURIComponent(htTestMatch[1]));
    if (!tool) return jsonRes(res, 404, { error: 'not found' });
    const toolRegistry = require('../services/tool-registry');
    const handler = toolRegistry.getHandler(tool.name);
    if (!handler) return jsonRes(res, 404, { error: 'tool not registered' });
    try {
      const result = await handler(body.args || {});
      return jsonRes(res, 200, { ok: true, result });
    } catch (e) {
      return jsonRes(res, 200, { ok: false, error: e.message });
    }
  }

  // ── Gateway ──
  if (urlPath === '/api/settings/gateway/reconnect' && req.method === 'POST') {
    if (!guardOwner(req, res)) return;
    gw.connectGateway();
    return jsonRes(res, 200, { ok: true });
  }
  if (urlPath === '/api/settings/gateway/status' && req.method === 'GET') {
    const llmMode = cfg.getLLMMode();
    return jsonRes(res, 200, { connected: llmMode === 'gateway' ? gw.gwConnected : true, llmMode, ws: cfg.GATEWAY_WS, http: cfg.GATEWAY_HTTP });
  }

  // ── Change Owner Key ──
  if (urlPath === '/api/settings/change-key' && req.method === 'POST') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    if (!body.newKey || body.newKey.length < 4) return jsonRes(res, 400, { error: '密钥至少 4 位' });
    if (store.imSettings.adminKey && body.newKey === store.imSettings.adminKey) return jsonRes(res, 400, { error: '主人密钥不能与管理员密钥相同' });
    if (store.imSettings.memberKey && body.newKey === store.imSettings.memberKey) return jsonRes(res, 400, { error: '主人密钥不能与成员密钥相同' });
    store.imSettings.ownerKey = body.newKey;
    store.saveSettings();
    return jsonRes(res, 200, { ok: true });
  }

  // ── Role Keys (admin / member) ──
  if (urlPath === '/api/settings/role-keys' && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    return jsonRes(res, 200, { hasAdminKey: !!store.imSettings.adminKey, hasMemberKey: !!store.imSettings.memberKey });
  }
  if (urlPath === '/api/settings/role-keys' && req.method === 'PUT') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    const ownerKey = store.imSettings.ownerKey || cfg.OWNER_KEY;
    const pendingAdmin = body.adminKey !== undefined ? body.adminKey : (store.imSettings.adminKey || '');
    const pendingMember = body.memberKey !== undefined ? body.memberKey : (store.imSettings.memberKey || '');
    if (pendingAdmin && pendingAdmin === ownerKey) return jsonRes(res, 400, { error: '管理员密钥不能与主人密钥相同' });
    if (pendingMember && pendingMember === ownerKey) return jsonRes(res, 400, { error: '成员密钥不能与主人密钥相同' });
    if (pendingAdmin && pendingMember && pendingAdmin === pendingMember) return jsonRes(res, 400, { error: '管理员密钥和成员密钥不能相同' });
    if (body.adminKey !== undefined) {
      if (body.adminKey === '') delete store.imSettings.adminKey;
      else if (body.adminKey.length < 4) return jsonRes(res, 400, { error: '密钥至少 4 位' });
      else store.imSettings.adminKey = body.adminKey;
    }
    if (body.memberKey !== undefined) {
      if (body.memberKey === '') delete store.imSettings.memberKey;
      else if (body.memberKey.length < 4) return jsonRes(res, 400, { error: '密钥至少 4 位' });
      else store.imSettings.memberKey = body.memberKey;
    }
    store.saveSettings();
    return jsonRes(res, 200, { ok: true, hasAdminKey: !!store.imSettings.adminKey, hasMemberKey: !!store.imSettings.memberKey });
  }

  // ── Usage Stats ──
  if (urlPath === '/api/settings/usage' && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    store.loadAgents();
    const totalMessages = store.totalMessageCount();
    const agentCount = store.localAgents.length;
    const groupCount = store.groups.length;
    const modelCount = (store.localModels.models || []).length;
    const postCount = store.postCount();
    const agentStats = {};
    const allMetrics = store.getAllMetrics();
    for (const [aid, m] of Object.entries(allMetrics)) {
      if (m.messages) agentStats[aid] = m.messages;
    }
    let kbFileCount = 0;
    for (const a of store.localAgents) {
      try { const ws = a.workspace || path.join(cfg.DATA_DIR, `workspace-${a.id}`); if (fs.existsSync(ws)) kbFileCount += fs.readdirSync(ws).length; } catch {}
    }
    return jsonRes(res, 200, { totalMessages, agentCount, groupCount, modelCount, postCount, kbFileCount, agentStats, metrics: allMetrics });
  }

  // ── About ──
  if (urlPath === '/api/settings/about' && req.method === 'GET') {
    const llmMode = cfg.getLLMMode();
    return jsonRes(res, 200, {
      version: '1.0.0',
      appName: store.imSettings.appName || '虾饺',
      port: cfg.PORT,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      dataDir: cfg.DATA_DIR,
      agentCount: store.localAgents.length,
      groupCount: store.groups.length,
      modelCount: (store.localModels.models || []).length,
      llmMode,
      gatewayConnected: llmMode === 'gateway' ? gw.gwConnected : true,
      uptime: process.uptime()
    });
  }

  return false;
}

module.exports = { handle };
