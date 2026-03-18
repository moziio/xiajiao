const fs = require('fs');
const path = require('path');
const cfg = require('../config');
const store = require('../services/storage');
const gw = require('../services/gateway');
const rag = require('../services/rag');
const { guardOwner, isOwnerReq, jsonRes, readBody } = require('../middleware/auth');

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
    if (body.toolModels !== undefined) store.imSettings.toolModels = body.toolModels;
    if (body.gatewayToolEvents !== undefined) store.imSettings.gatewayToolEvents = !!body.gatewayToolEvents;
    store.saveSettings();
    return jsonRes(res, 200, { ok: true });
  }

  // ── Providers ──
  if (urlPath === '/api/settings/providers' && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    store.loadModels();
    return jsonRes(res, 200, { providers: store.localModels.providers || {}, models: store.localModels.models || [] });
  }
  if (urlPath === '/api/settings/providers' && req.method === 'POST') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    if (!body.id || !body.baseUrl) throw new Error('id and baseUrl required');
    if (['__proto__', 'constructor', 'prototype'].includes(body.id)) throw new Error('invalid provider id');
    store.loadModels();
    store.localModels.providers[body.id] = { baseUrl: body.baseUrl, apiKey: body.apiKey || '', api: body.api || 'openai-completions' };
    store.saveModels();
    return jsonRes(res, 200, { ok: true });
  }
  if (urlPath === '/api/settings/providers/discover' && req.method === 'POST') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    if (!body.baseUrl) throw new Error('baseUrl required');
    const baseUrl = body.baseUrl.replace(/\/+$/, '');
    const headers = { 'Content-Type': 'application/json' };
    if (body.apiKey) headers['Authorization'] = 'Bearer ' + body.apiKey;

    const tryDiscover = async (url) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        const resp = await fetch(url, { headers, signal: ctrl.signal });
        clearTimeout(timer);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const json = await resp.json();
        return (json.data || json.models || []).map(m => ({
          id: typeof m === 'string' ? m : (m.id || m.name || ''),
          name: typeof m === 'string' ? m : (m.name || m.id || ''),
          contextWindow: m.context_window || m.contextWindow || m.context_length || 128000,
          maxTokens: m.max_tokens || m.maxTokens || m.max_output_tokens || 8192,
        })).filter(m => m.id);
      } catch (e) { clearTimeout(timer); throw e; }
    };

    try {
      const models = await tryDiscover(baseUrl + '/models');
      return jsonRes(res, 200, { ok: true, models });
    } catch (primaryErr) {
      if (baseUrl.includes('dashscope.aliyuncs.com') && !baseUrl.includes('compatible-mode')) {
        try {
          const fallbackUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/models';
          const models = await tryDiscover(fallbackUrl);
          return jsonRes(res, 200, { ok: true, models });
        } catch {}
        return jsonRes(res, 400, { error: 'Failed to discover models: ' + primaryErr.message + '. 该 DashScope 端点不支持模型列表接口，请尝试使用 https://dashscope.aliyuncs.com/compatible-mode/v1 或手动添加模型' });
      }
      return jsonRes(res, 400, { error: 'Failed to discover models: ' + (primaryErr.message || primaryErr) });
    }
  }

  const provMatch = urlPath.match(/^\/api\/settings\/providers\/([^/]+)$/);
  if (provMatch && req.method === 'PUT') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    store.loadModels();
    const pid = provMatch[1];
    if (!store.localModels.providers[pid]) throw new Error('provider not found');
    if (body.baseUrl !== undefined) store.localModels.providers[pid].baseUrl = body.baseUrl;
    if (body.apiKey !== undefined) store.localModels.providers[pid].apiKey = body.apiKey;
    if (body.api !== undefined) store.localModels.providers[pid].api = body.api;
    store.saveModels();
    return jsonRes(res, 200, { ok: true });
  }
  if (provMatch && req.method === 'DELETE') {
    if (!guardOwner(req, res)) return;
    store.loadModels();
    const pid = provMatch[1];
    delete store.localModels.providers[pid];
    store.localModels.models = (store.localModels.models || []).filter(m => m.provider !== pid);
    store.saveModels();
    return jsonRes(res, 200, { ok: true });
  }

  // ── Models CRUD ──
  if (urlPath === '/api/settings/models' && req.method === 'POST') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    if (!body.id || !body.provider) throw new Error('id and provider required');
    store.loadModels();
    if ((store.localModels.models || []).some(m => m.id === body.id)) throw new Error('model already exists');
    const modelEntry = { id: body.id, name: body.name || body.id, provider: body.provider, reasoning: body.reasoning || false, input: body.input || ['text'], contextWindow: body.contextWindow || 128000, maxTokens: body.maxTokens || 4096 };
    if (body.output) modelEntry.output = body.output;
    if (body.api) modelEntry.api = body.api;
    store.localModels.models.push(modelEntry);
    store.saveModels();
    return jsonRes(res, 200, { ok: true });
  }
  const modelSettMatch = urlPath.match(/^\/api\/settings\/models\/(.+)$/);
  if (modelSettMatch && req.method === 'DELETE') {
    if (!guardOwner(req, res)) return;
    store.loadModels();
    const mid = decodeURIComponent(modelSettMatch[1]);
    store.localModels.models = (store.localModels.models || []).filter(m => m.id !== mid);
    store.saveModels();
    return jsonRes(res, 200, { ok: true });
  }

  // ── Tool Models ──
  if (urlPath === '/api/settings/tool-models' && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    return jsonRes(res, 200, { toolModels: store.imSettings.toolModels || {} });
  }
  if (urlPath === '/api/settings/tool-models' && req.method === 'PUT') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    const safeBody = {}; for (const k of Object.keys(body)) { if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') safeBody[k] = body[k]; }
    store.imSettings.toolModels = Object.assign(store.imSettings.toolModels || {}, safeBody);
    store.saveSettings();
    return jsonRes(res, 200, { ok: true });
  }

  // ── RAG Settings ──
  if (urlPath === '/api/settings/rag' && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    const rag = store.imSettings.rag || {};
    return jsonRes(res, 200, {
      enabled: rag.enabled !== false,
      embeddingModel: rag.embeddingModel || 'text-embedding-v3',
      embeddingProvider: rag.embeddingProvider || '',
      embeddingApiKey: rag.embeddingApiKey ? '***' + rag.embeddingApiKey.slice(-6) : '',
      embeddingBaseUrl: rag.embeddingBaseUrl || '',
      topK: rag.topK || 5,
      chunkSize: rag.chunkSize || 500,
      chunkOverlap: rag.chunkOverlap || 50,
      hasCustomKey: !!rag.embeddingApiKey,
    });
  }
  if (urlPath === '/api/settings/rag' && req.method === 'PUT') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    if (!store.imSettings.rag) store.imSettings.rag = {};
    const rag = store.imSettings.rag;
    if (body.enabled !== undefined) rag.enabled = !!body.enabled;
    if (body.embeddingModel !== undefined) rag.embeddingModel = body.embeddingModel;
    if (body.embeddingProvider !== undefined) rag.embeddingProvider = body.embeddingProvider;
    if (body.embeddingApiKey !== undefined) rag.embeddingApiKey = body.embeddingApiKey;
    if (body.embeddingBaseUrl !== undefined) rag.embeddingBaseUrl = body.embeddingBaseUrl;
    if (body.topK !== undefined) rag.topK = parseInt(body.topK, 10) || 5;
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
