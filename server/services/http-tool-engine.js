/**
 * HTTP 工具引擎 — 将用户通过 UI 配置的 HTTP API 注册为 Agent 可调用的工具
 * 配置持久化在 data/http-tools.json
 */
const fs = require('fs');
const path = require('path');
const cfg = require('../config');
const toolRegistry = require('./tool-registry');
const { createLogger } = require('../middleware/logger');
const log = createLogger('http-tool');

const HTTP_TOOLS_FILE = path.join(cfg.DATA_DIR, 'http-tools.json');

let _configs = [];

function _load() {
  try {
    _configs = JSON.parse(fs.readFileSync(HTTP_TOOLS_FILE, 'utf8'));
    if (!Array.isArray(_configs)) _configs = [];
  } catch {
    _configs = [];
  }
}

function _save() {
  fs.mkdirSync(path.dirname(HTTP_TOOLS_FILE), { recursive: true });
  fs.writeFileSync(HTTP_TOOLS_FILE, JSON.stringify(_configs, null, 2), 'utf8');
}

function _interpolate(template, args) {
  if (!template) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = args[key];
    return val !== undefined ? String(val) : '';
  });
}

function _createHandler(config) {
  return async function httpToolHandler(args) {
    let url;
    try {
      url = new URL(_interpolate(config.url, args));
    } catch (e) {
      return { error: 'URL 不合法: ' + e.message };
    }

    if (config.queryParams) {
      for (const qp of config.queryParams) {
        const val = _interpolate(qp.value, args);
        if (val) url.searchParams.set(qp.key, val);
      }
    }

    const headers = {};
    if (config.headers) {
      for (const [k, v] of Object.entries(config.headers)) {
        headers[k] = _interpolate(v, args);
      }
    }

    const fetchOpts = { method: config.method || 'GET', headers };

    if (config.method && config.method !== 'GET' && config.method !== 'HEAD') {
      if (config.bodyTemplate) {
        const bodyStr = _interpolate(config.bodyTemplate, args);
        try {
          JSON.parse(bodyStr);
          headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        } catch {}
        fetchOpts.body = bodyStr;
      }
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.timeout || 30000);
    fetchOpts.signal = ctrl.signal;

    try {
      const resp = await fetch(url.toString(), fetchOpts);
      clearTimeout(timer);
      const contentType = resp.headers.get('content-type') || '';
      let body;
      if (contentType.includes('json')) {
        body = await resp.json();
      } else {
        body = await resp.text();
        if (typeof body === 'string' && body.length > 4000) body = body.slice(0, 4000) + '\n...(truncated)';
      }

      if (config.responseExtract && typeof body === 'object') {
        const parts = config.responseExtract.split('.');
        let val = body;
        for (const p of parts) {
          if (val == null) break;
          val = val[p];
        }
        if (val !== undefined) body = val;
      }

      if (!resp.ok) {
        return { error: `HTTP ${resp.status}`, body };
      }
      return { result: body };
    } catch (e) {
      clearTimeout(timer);
      return { error: e.name === 'AbortError' ? '请求超时' : e.message };
    }
  };
}

function _registerOne(config) {
  const toolName = config.name;
  try {
    toolRegistry.unregisterTool(toolName);
  } catch {}

  const parameters = config.parameters || { type: 'object', properties: {} };

  toolRegistry.registerTool(toolName, {
    schema: { description: config.description || '', parameters },
    handler: _createHandler(config),
    meta: {
      icon: '🌐',
      risk: 'low',
      category: 'http-tool',
      defaultDeny: false,
      httpToolId: config.id,
    },
  });
}

function init() {
  _load();
  let count = 0;
  for (const c of _configs) {
    try {
      _registerOne(c);
      count++;
    } catch (e) {
      log.warn(`skip http tool ${c.name}: ${e.message}`);
    }
  }
  if (count) log.info(`http tools registered: ${count}`);
  return count;
}

function list() {
  return _configs.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description || '',
    method: c.method || 'GET',
    url: c.url || '',
    parameters: c.parameters || {},
  }));
}

function getById(id) {
  return _configs.find(c => c.id === id) || null;
}

function create(config) {
  if (!config.name || !/^[a-z][a-z0-9_]{1,48}$/.test(config.name)) {
    throw new Error('工具名只能包含小写字母、数字、下划线，以字母开头，2-49 字符');
  }
  if (!config.url) throw new Error('URL 不能为空');
  if (_configs.some(c => c.name === config.name)) {
    throw new Error('工具名 ' + config.name + ' 已存在');
  }
  const existingMeta = toolRegistry.getMeta(config.name);
  if (existingMeta && existingMeta.category !== 'http-tool') {
    throw new Error('工具名 ' + config.name + ' 与内置或已注册工具冲突');
  }

  const entry = {
    id: 'ht_' + Date.now().toString(36),
    name: config.name,
    description: config.description || '',
    method: config.method || 'GET',
    url: config.url,
    headers: config.headers || {},
    queryParams: config.queryParams || [],
    bodyTemplate: config.bodyTemplate || '',
    parameters: config.parameters || { type: 'object', properties: {} },
    responseExtract: config.responseExtract || '',
    timeout: config.timeout || 30000,
    createdAt: Date.now(),
  };

  _configs.push(entry);
  _save();
  _registerOne(entry);
  return entry;
}

function update(id, patch) {
  const idx = _configs.findIndex(c => c.id === id);
  if (idx < 0) throw new Error('工具不存在');
  const old = _configs[idx];

  if (patch.name && patch.name !== old.name) {
    if (!/^[a-z][a-z0-9_]{1,48}$/.test(patch.name)) throw new Error('工具名格式不合法');
    if (_configs.some(c => c.name === patch.name && c.id !== id)) throw new Error('工具名已存在');
    toolRegistry.unregisterTool(old.name);
  }

  const updated = { ...old, ...patch, id: old.id, createdAt: old.createdAt, updatedAt: Date.now() };
  _configs[idx] = updated;
  _save();

  try { toolRegistry.unregisterTool(old.name); } catch {}
  _registerOne(updated);
  return updated;
}

function remove(id) {
  const idx = _configs.findIndex(c => c.id === id);
  if (idx < 0) return false;
  const old = _configs[idx];
  try { toolRegistry.unregisterTool(old.name); } catch {}
  _configs.splice(idx, 1);
  _save();
  return true;
}

module.exports = { init, list, getById, create, update, remove };
