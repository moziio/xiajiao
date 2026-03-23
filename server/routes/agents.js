const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const cfg = require('../config');
const store = require('../services/storage');
const gw = require('../services/gateway');
const rag = require('../services/rag');
const toolRegistry = require('../services/tool-registry');
const memoryService = require('../services/memory');
const { guardOwner, jsonRes, readBody } = require('../middleware/auth');
const { createLogger } = require('../middleware/logger');
const log = createLogger('agents');

function getAvailableModels() {
  try {
    store.loadModels();
    return (store.localModels.models || []).map(m => ({
      id: m.id, name: m.name || m.id, provider: m.provider,
      reasoning: m.reasoning || false, input: m.input || ['text'],
      output: m.output || undefined, api: m.api || undefined,
      capabilities: m.capabilities || store.detectCapabilities(m),
      contextWindow: m.contextWindow, maxTokens: m.maxTokens
    }));
  } catch { return []; }
}

async function getAgentSoul(id) {
  store.loadAgents();
  const agent = store.localAgents.find(a => a.id === id);
  if (!agent) return { content: '' };
  const ws = agent.workspace || path.join(cfg.DATA_DIR, `workspace-${id}`);
  try { return { content: await fsp.readFile(path.join(ws, 'SOUL.md'), 'utf8') }; } catch { return { content: '' }; }
}

function setAgentSoul(id, content) {
  store.loadAgents();
  const agent = store.localAgents.find(a => a.id === id);
  if (!agent) throw new Error('agent not found');
  const ws = agent.workspace || path.join(cfg.DATA_DIR, `workspace-${id}`);
  fs.mkdirSync(ws, { recursive: true });
  fs.writeFileSync(path.join(ws, 'SOUL.md'), content || '');
  return { ok: true };
}

function getAgentConfig(id) {
  store.loadAgents();
  const agent = store.localAgents.find(a => a.id === id);
  return { model: agent?.model || '', tools: agent?.tools || {}, autoInjectMemory: agent?.autoInjectMemory !== false };
}

async function createAgent({ id, name, description, model }) {
  if (!id || !name) throw new Error('id and name required');
  id = id.replace(/[^a-zA-Z0-9_-]/g, ''); if (!id) throw new Error('invalid id');
  store.loadAgents();
  if (store.localAgents.some(a => a.id === id)) throw new Error('agent already exists');
  const workspace = path.join(cfg.DATA_DIR, `workspace-${id}`);
  fs.mkdirSync(workspace, { recursive: true });
  if (description) fs.writeFileSync(path.join(workspace, 'SOUL.md'), `# ${name}\n\n${description}\n`);
  const agentEntry = { id, name, model: model || '', workspace, createdAt: Date.now() };
  store.localAgents.push(agentEntry);
  store.saveAgents();
  gw.refreshKnownAgents();
  gw.broadcast({ type: 'agents_update', agents: gw.knownAgents });
  await gw.applyConfig();
  gw.emitCommunityEvent('agent_created', { id, name });
  return { ok: true, agent: { id, name, model: model || null } };
}

async function updateAgent(id, { name, description, model, tools, autoInjectMemory }) {
  store.loadAgents();
  const agent = store.localAgents.find(a => a.id === id);
  if (!agent) throw new Error('agent not found');
  if (name) agent.name = name;
  if (model !== undefined) agent.model = model || '';
  if (tools !== undefined) agent.tools = tools;
  if (autoInjectMemory !== undefined) agent.autoInjectMemory = autoInjectMemory;
  if (description !== undefined) {
    const ws = agent.workspace || path.join(cfg.DATA_DIR, `workspace-${id}`);
    fs.mkdirSync(ws, { recursive: true });
    fs.writeFileSync(path.join(ws, 'SOUL.md'), description || '');
  }
  store.saveAgents();
  gw.refreshKnownAgents();
  gw.broadcast({ type: 'agents_update', agents: gw.knownAgents });
  await gw.applyConfig();
  return { ok: true, agent: { id, name: agent.name, model: agent.model || null } };
}

async function deleteAgent(id, cascade) {
  store.loadAgents();
  const idx = store.localAgents.findIndex(a => a.id === id);
  const agent = idx >= 0 ? store.localAgents[idx] : null;
  const result = { ok: true, cascaded: {} };

  if (cascade) {
    const affectedGroups = store.groups.filter(g => (g.members || []).includes(id));
    if (affectedGroups.length) {
      for (const g of affectedGroups) g.members = g.members.filter(m => m !== id);
      store.saveGroups();
      result.cascaded.groups = affectedGroups.map(g => g.name || g.id);
    }

    result.cascaded.messagesRemoved = store.deleteMessagesByAgent(id);
    store.deletePostsByAuthor(id);

    if (store.profiles[id]) { delete store.profiles[id]; store.saveProfiles(); }
    store.deleteMetric(id);

    const affectedWfs = (store.workflows || []).filter(w => (w.steps || []).some(s => s.agent === id));
    if (affectedWfs.length) result.cascaded.workflows = affectedWfs.map(w => w.name || w.id);

    result.cascaded.memoriesRemoved = memoryService.deleteAgentMemories(id);
    rag.clearAgentIndex(id);

    const wsDir = (agent && agent.workspace) || path.join(cfg.DATA_DIR, `workspace-${id}`);
    try { if (fs.existsSync(wsDir)) fs.rmSync(wsDir, { recursive: true, force: true }); } catch {}
  }

  if (idx >= 0) {
    store.localAgents.splice(idx, 1);
    store.saveAgents();
  }
  gw.refreshKnownAgents();
  gw.broadcast({ type: 'agents_update', agents: gw.knownAgents });
  return result;
}

function resolveWorkspace(id) {
  store.loadAgents();
  const agent = store.localAgents.find(a => a.id === id);
  if (!agent) throw new Error('agent not found');
  return agent.workspace || path.join(cfg.DATA_DIR, `workspace-${id}`);
}

async function listWorkspaceFiles(id) {
  const ws = resolveWorkspace(id);
  try { await fsp.access(ws); } catch { return { files: [] }; }
  const entries = await fsp.readdir(ws, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (!e.isFile() || e.name.startsWith('.')) continue;
    const st = await fsp.stat(path.join(ws, e.name));
    files.push({ name: e.name, size: st.size, mtime: st.mtimeMs });
  }
  return { files, workspace: ws };
}

async function readWorkspaceFile(id, filename) {
  if (filename.includes('..') || path.isAbsolute(filename)) throw new Error('invalid filename');
  const ws = resolveWorkspace(id);
  const fp = path.join(ws, filename);
  try { await fsp.access(fp); } catch { throw new Error('file not found'); }
  return { name: filename, content: await fsp.readFile(fp, 'utf8') };
}

function writeWorkspaceFile(id, filename, content) {
  if (filename.includes('..') || path.isAbsolute(filename)) throw new Error('invalid filename');
  const ws = resolveWorkspace(id);
  fs.mkdirSync(ws, { recursive: true });

  const contentBuf = Buffer.from(content || '', 'utf8');
  const ext = path.extname(filename).toLowerCase();
  const maxSize = ext === '.pdf' ? rag.LIMITS.MAX_PDF_FILE_SIZE : rag.LIMITS.MAX_TEXT_FILE_SIZE;
  if (contentBuf.length > maxSize) {
    const limitMB = (maxSize / 1024 / 1024).toFixed(0);
    throw new Error(`文件过大（${(contentBuf.length / 1024 / 1024).toFixed(1)}MB），最大 ${limitMB}MB`);
  }

  const check = rag.shouldIndex(filename);
  if (!check.ok && check.reason && check.reason.startsWith('unsupported')) {
    throw new Error(check.reason === 'unsupported_office'
      ? '暂不支持 Office 文档，后续版本将支持'
      : check.reason === 'unsupported_image'
        ? '暂不支持图片 OCR，后续版本将支持'
        : '不支持此文件类型');
  }

  const entries = fs.existsSync(ws) ? fs.readdirSync(ws).filter(f => !f.startsWith('.') && rag.canIndex(f)) : [];
  if (!entries.includes(filename) && entries.length >= rag.LIMITS.MAX_FILES_PER_AGENT) {
    throw new Error(`文件数量已达上限（${rag.LIMITS.MAX_FILES_PER_AGENT} 个），请删除部分文件后再上传`);
  }

  fs.writeFileSync(path.join(ws, filename), content || '');
  rag.indexFile(id, filename).catch(e => log.warn('async index error:', e.message));
  return { ok: true };
}

function deleteWorkspaceFile(id, filename) {
  if (filename.includes('..') || path.isAbsolute(filename)) throw new Error('invalid filename');
  const ws = resolveWorkspace(id);
  const fp = path.join(ws, filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  rag.removeFile(id, filename);
  return { ok: true };
}

function getAgentWorkspace(id) {
  store.loadAgents();
  const agent = store.localAgents.find(a => a.id === id);
  if (!agent) throw new Error('agent not found');
  return { workspace: agent.workspace || path.join(cfg.DATA_DIR, `workspace-${id}`) };
}

function setAgentWorkspace(id, wsPath) {
  if (!wsPath) throw new Error('path required');
  store.loadAgents();
  const agent = store.localAgents.find(a => a.id === id);
  if (!agent) throw new Error('agent not found');
  agent.workspace = wsPath;
  store.saveAgents();
  return { ok: true, workspace: wsPath };
}

async function handle(req, res, urlPath) {
  if (urlPath === '/api/models' && req.method === 'GET') return jsonRes(res, 200, { models: getAvailableModels() });
  if (urlPath === '/api/agents' && req.method === 'GET') {
    const agents = gw.refreshKnownAgents();
    return jsonRes(res, 200, { agents });
  }
  if (urlPath === '/api/agents' && req.method === 'POST') { if (!guardOwner(req, res)) return; return jsonRes(res, 200, await createAgent(await readBody(req))); }

  if (urlPath === '/api/agents/descriptions' && req.method === 'GET') {
    store.loadAgents();
    const result = {};
    await Promise.all(store.localAgents.map(async (a) => {
      const ws = a.workspace || path.join(cfg.DATA_DIR, `workspace-${a.id}`);
      try { result[a.id] = await fsp.readFile(path.join(ws, 'SOUL.md'), 'utf8'); } catch { result[a.id] = ''; }
    }));
    return jsonRes(res, 200, result);
  }

  // ── Memory API ──
  const memListMatch = urlPath.match(/^\/api\/agents\/([^/]+)\/memories$/);
  if (memListMatch && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    const aid = memListMatch[1];
    const url = new URL(req.url, 'http://localhost');
    const type = url.searchParams.get('type') || undefined;
    const importance = url.searchParams.get('importance') || undefined;
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    const memories = memoryService.getMemories(aid, { type, importance, limit, offset });
    const stats = memoryService.getStats(aid);
    return jsonRes(res, 200, { memories, stats });
  }
  const memItemMatch = urlPath.match(/^\/api\/agents\/([^/]+)\/memories\/([^/]+)$/);
  if (memItemMatch && req.method === 'DELETE') {
    if (!guardOwner(req, res)) return;
    const ok = memoryService.deleteMemory(memItemMatch[2], memItemMatch[1]);
    return jsonRes(res, 200, { ok });
  }

  const soulMatch = urlPath.match(/^\/api\/agents\/([^/]+)\/soul$/);
  if (soulMatch && req.method === 'GET') return jsonRes(res, 200, await getAgentSoul(soulMatch[1]));
  if (soulMatch && req.method === 'PUT') { if (!guardOwner(req, res)) return; const b = await readBody(req); return jsonRes(res, 200, setAgentSoul(soulMatch[1], b.content)); }

  const configMatch = urlPath.match(/^\/api\/agents\/([^/]+)\/config$/);
  if (configMatch && req.method === 'GET') return jsonRes(res, 200, getAgentConfig(configMatch[1]));

  const impactMatch = urlPath.match(/^\/api\/agents\/([^/]+)\/delete-impact$/);
  if (impactMatch && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    const aid = impactMatch[1];
    const groups = store.groups.filter(g => (g.members || []).includes(aid)).map(g => ({ id: g.id, name: g.name }));
    const wfs = (store.workflows || []).filter(w => (w.steps || []).some(s => s.agent === aid)).map(w => ({ id: w.id, name: w.name }));
    const msgCount = store.countMessagesByAgent(aid);
    return jsonRes(res, 200, { groups, workflows: wfs, messageCount: msgCount });
  }

  const agentMatch = urlPath.match(/^\/api\/agents\/([^/]+)$/);
  if (agentMatch && req.method === 'PUT') { if (!guardOwner(req, res)) return; return jsonRes(res, 200, await updateAgent(agentMatch[1], await readBody(req))); }
  if (agentMatch && req.method === 'DELETE') { if (!guardOwner(req, res)) return; const q = new URL(req.url, 'http://x').searchParams; return jsonRes(res, 200, await deleteAgent(agentMatch[1], q.get('cascade') === '1')); }

  const filesMatch = urlPath.match(/^\/api\/agents\/([^/]+)\/files$/);
  if (filesMatch && req.method === 'GET') { if (!guardOwner(req, res)) return; return jsonRes(res, 200, await listWorkspaceFiles(filesMatch[1])); }

  const fileMatch = urlPath.match(/^\/api\/agents\/([^/]+)\/files\/(.+)$/);
  if (fileMatch && req.method === 'GET') { if (!guardOwner(req, res)) return; return jsonRes(res, 200, await readWorkspaceFile(fileMatch[1], decodeURIComponent(fileMatch[2]))); }
  if (fileMatch && req.method === 'PUT') { if (!guardOwner(req, res)) return; const b = await readBody(req); return jsonRes(res, 200, writeWorkspaceFile(fileMatch[1], decodeURIComponent(fileMatch[2]), b.content)); }
  if (fileMatch && req.method === 'DELETE') { if (!guardOwner(req, res)) return; return jsonRes(res, 200, deleteWorkspaceFile(fileMatch[1], decodeURIComponent(fileMatch[2]))); }

  const wsPathMatch = urlPath.match(/^\/api\/agents\/([^/]+)\/workspace$/);
  if (wsPathMatch && req.method === 'PUT') { if (!guardOwner(req, res)) return; const b = await readBody(req); return jsonRes(res, 200, setAgentWorkspace(wsPathMatch[1], b.path)); }
  if (wsPathMatch && req.method === 'GET') { if (!guardOwner(req, res)) return; return jsonRes(res, 200, getAgentWorkspace(wsPathMatch[1])); }

  const ragStatusMatch = urlPath.match(/^\/api\/agents\/([^/]+)\/rag\/status$/);
  if (ragStatusMatch && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    return jsonRes(res, 200, rag.getIndexStatus(ragStatusMatch[1]));
  }

  const ragReindexMatch = urlPath.match(/^\/api\/agents\/([^/]+)\/rag\/reindex$/);
  if (ragReindexMatch && req.method === 'POST') {
    if (!guardOwner(req, res)) return;
    const agentId = ragReindexMatch[1];
    const status = rag.getIndexStatus(agentId);
    if (status.indexing && status.indexing.status === 'indexing') {
      return jsonRes(res, 200, { ok: true, already: true, indexing: status.indexing });
    }
    const ragCfg = rag.getRAGConfig();
    if (!ragCfg.enabled) return jsonRes(res, 200, { ok: false, reason: 'RAG disabled' });
    rag.indexAgent(agentId).then(result => {
      if (result.reason === 'no indexable files') {
        log.info(`agent=${agentId}: no indexable files`);
      }
    }).catch(e => log.error('reindex error:', e.message));
    await new Promise(r => setTimeout(r, 100));
    const updated = rag.getIndexStatus(agentId);
    if (!updated.indexing) {
      return jsonRes(res, 200, { ok: true, noFiles: true });
    }
    return jsonRes(res, 200, { ok: true, started: true, indexing: updated.indexing });
  }

  if (urlPath === '/api/tools' && req.method === 'GET') {
    if (!guardOwner(req, res)) return;
    const names = toolRegistry.getAllToolNames();
    const searchCfg = _getWebSearchConfig();
    const tools = names.map(name => {
      const meta = toolRegistry.getMeta(name) || {};
      const schema = toolRegistry._getSchema(name);
      const status = _getToolStatus(name, searchCfg);
      return { name, description: schema?.description || '', icon: meta.icon || '🔧', risk: meta.risk || 'low', category: meta.category || 'general', requireApproval: !!meta.requireApproval, defaultDeny: !!meta.defaultDeny, status };
    });
    return jsonRes(res, 200, { tools });
  }

  if (urlPath === '/api/mermaid/beautify' && req.method === 'POST') {
    if (!guardOwner(req, res)) return;
    const body = await readBody(req);
    if (!body.source) return jsonRes(res, 400, { error: 'source required' });
    try {
      const styled = await beautifyMermaid(body.source);
      return jsonRes(res, 200, { ok: true, styled });
    } catch (e) {
      return jsonRes(res, 200, { ok: false, error: e.message });
    }
  }

  return false;
}

const _mermaidCache = new Map();

async function beautifyMermaid(source) {
  const hash = source.trim().replace(/\s+/g, ' ');
  if (_mermaidCache.has(hash)) return _mermaidCache.get(hash);

  store.loadModels();
  const models = store.localModels.models || [];
  const providers = store.localModels.providers || {};
  let model = models.find(m => /qwen.*plus|qwen.*turbo/i.test(m.name || m.id));
  if (!model) model = models.find(m => providers[m.provider]?.api !== 'anthropic-messages');
  if (!model) model = models[0];
  if (!model) throw new Error('no model available');

  const provider = providers[model.provider];
  if (!provider) throw new Error('provider not found');

  const baseUrl = provider.baseUrl.replace(/\/+$/, '');
  const modelName = model.id.includes('/') ? model.id.split('/').slice(1).join('/') : model.id;
  const apiType = model.api || provider.api || 'openai-completions';

  const systemPrompt = `你是 Mermaid 图表美化专家。用户给你一段纯 Mermaid 代码，你为它添加视觉样式让图表更美观。

规则：
1. 根据节点在图中的语义角色自动分配颜色（暗色主题，背景深色，边框亮色）
2. 用 classDef 定义角色样式，用 :::className 标注到每个节点
3. 合理使用 subgraph 分区，并用 style 设置区域背景色
4. 入口/起点用圆角，决策判断用菱形，数据存储用圆柱
5. 不要改变原始的逻辑关系和节点文字
6. 只返回完整 Mermaid 代码，不要任何解释、不要 \`\`\`mermaid 包裹

调色板（暗色主题）：
- 入口/用户：fill:#0d3b66,stroke:#00d4ff,color:#e0e6ed,stroke-width:2px
- 规划/决策：fill:#1a1a3a,stroke:#8b5cf6,color:#e0e6ed
- 核心/引擎/枢纽：fill:#0d2a2a,stroke:#00f5a0,color:#e0e6ed,stroke-width:2px
- 工具/执行/操作：fill:#2a1f0d,stroke:#ff8a00,color:#ffe0b0
- 反馈/错误/循环：fill:#3a0d1a,stroke:#ff3b5c,color:#ffc0c0
- 数据/存储/输出：fill:#0d2a1a,stroke:#2ecc71,color:#c0ffd0
- 普通中间节点：fill:#1a2a3a,stroke:#4a8ab5,color:#c0d0e0`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: source },
  ];

  let endpoint, reqBody, headers;

  if (apiType === 'anthropic-messages') {
    endpoint = `${baseUrl}/messages`;
    reqBody = { model: modelName, max_tokens: 2000, system: systemPrompt, messages: [{ role: 'user', content: source }] };
    headers = { 'Content-Type': 'application/json', 'x-api-key': provider.apiKey, 'anthropic-version': '2023-06-01' };
  } else {
    endpoint = `${baseUrl}/chat/completions`;
    reqBody = { model: modelName, messages, max_tokens: 2000, temperature: 0.3 };
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const resp = await fetch(endpoint, {
      method: 'POST', headers, body: JSON.stringify(reqBody), signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`LLM ${resp.status}: ${errText.slice(0, 200)}`);
    }
    const data = await resp.json();
    let result;
    if (apiType === 'anthropic-messages') {
      result = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    } else {
      result = data.choices?.[0]?.message?.content || '';
    }
    result = result.replace(/^```(?:mermaid)?\s*/i, '').replace(/```\s*$/, '').trim();
    if (!result) throw new Error('empty response');

    _mermaidCache.set(hash, result);
    if (_mermaidCache.size > 100) {
      const firstKey = _mermaidCache.keys().next().value;
      _mermaidCache.delete(firstKey);
    }
    return result;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

function _getWebSearchConfig() {
  try {
    const s = JSON.parse(fs.readFileSync(cfg.SETTINGS_FILE, 'utf8'));
    return s.tools?.webSearch || {};
  } catch { return {}; }
}

function _getToolStatus(name, searchCfg) {
  if (name === 'web_search') {
    const provider = searchCfg.provider || 'auto';
    if (provider === 'auto' || provider === 'duckduckgo') return 'ready';
    return searchCfg.apiKey ? 'ready' : 'needs_config';
  }
  if (name.startsWith('mcp:')) return 'ready';
  return 'ready';
}

module.exports = { handle };
