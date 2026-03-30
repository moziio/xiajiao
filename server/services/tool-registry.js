/**
 * M1.2 — ToolRegistry 注册机制
 * 全局工具注册表，管理 schema / handler / meta
 */
const store = require('./storage');
const { createLogger } = require('../middleware/logger');
const log = createLogger('tool-registry');

const _tools = new Map();

function registerTool(name, { schema, handler, meta }) {
  if (!schema || !handler) throw new Error(`registerTool(${name}): schema & handler required`);
  _tools.set(name, {
    schema: { type: 'function', function: { name, description: schema.description || '', parameters: schema.parameters || { type: 'object', properties: {} } } },
    handler,
    meta: { icon: '🔧', risk: 'low', category: 'general', requireApproval: false, ...meta },
  });
  log.info(`registered tool: ${name} (risk=${meta?.risk || 'low'})`);
}

function unregisterTool(name) {
  _tools.delete(name);
}

function getToolsForAgent(agentId) {
  store.loadAgents();
  const agent = store.localAgents.find(a => a.id === agentId);
  const toolsCfg = agent?.tools || {};
  const allow = toolsCfg.allow;
  const deny = new Set(toolsCfg.deny || []);

  const result = [];
  for (const [name, entry] of _tools) {
    if (deny.has(name)) continue;
    if (entry.meta?.defaultDeny) {
      if (!allow || !allow.includes(name)) continue;
    } else {
      if (allow && !allow.includes(name)) continue;
    }
    result.push(entry);
  }
  return result;
}

function getHandler(name) {
  const entry = _tools.get(name);
  return entry ? entry.handler : null;
}

function getMeta(name) {
  const entry = _tools.get(name);
  return entry ? entry.meta : null;
}

function getAllToolNames() {
  return [..._tools.keys()];
}

/**
 * 转换为 OpenAI tools 格式
 */
function toOpenAITools(entries) {
  return entries.map(e => e.schema);
}

/**
 * 转换为 Anthropic tools 格式
 */
function toAnthropicTools(entries) {
  return entries.map(e => ({
    name: e.schema.function.name,
    description: e.schema.function.description,
    input_schema: e.schema.function.parameters,
  }));
}

/**
 * 转换为 Google/Gemini tools 格式
 */
function toGoogleTools(entries) {
  return [{
    function_declarations: entries.map(e => ({
      name: e.schema.function.name,
      description: e.schema.function.description,
      parameters: e.schema.function.parameters,
    })),
  }];
}

function _getSchema(name) {
  const entry = _tools.get(name);
  if (!entry) return null;
  return entry.schema?.function || null;
}

function autoRegisterTools() {
  const path = require('path');
  const fs = require('fs');
  const dirs = [
    path.join(__dirname, 'tools'),
    path.join(__dirname, '..', '..', 'data', 'custom-tools'),
  ];
  let count = 0;
  for (const dir of dirs) {
    let files;
    try { files = fs.readdirSync(dir); } catch { continue; }
    for (const file of files) {
      if (!file.endsWith('.js') || file.startsWith('_')) continue;
      const toolName = file.replace(/\.js$/, '').replace(/-/g, '_');
      if (_tools.has(toolName)) continue;
      try {
        const mod = require(path.join(dir, file));
        if (mod && mod.schema && typeof mod.handler === 'function') {
          registerTool(toolName, mod);
          count++;
        }
      } catch (e) {
        log.warn(`skip tool ${file}: ${e.message}`);
      }
    }
  }
  return count;
}

module.exports = {
  registerTool, unregisterTool, autoRegisterTools,
  getToolsForAgent, getHandler, getMeta, getAllToolNames,
  toOpenAITools, toAnthropicTools, toGoogleTools,
  _getSchema,
};
