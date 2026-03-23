/**
 * M8 — MCP Client Manager
 * 管理多个 MCP Server 连接，将外部工具桥接到 ToolRegistry
 */
const toolRegistry = require('./tool-registry');
const { createLogger } = require('../middleware/logger');
const log = createLogger('mcp');

let Client, StdioClientTransport, StreamableHTTPClientTransport;
let _sdkLoaded = false;

const _clients = new Map();
const _toolMap = new Map();
const _connecting = new Set();

async function _loadSdk() {
  if (_sdkLoaded) return;
  try {
    const sdk = await import('@modelcontextprotocol/sdk/client/index.js');
    Client = sdk.Client;
    const stdioMod = await import('@modelcontextprotocol/sdk/client/stdio.js');
    StdioClientTransport = stdioMod.StdioClientTransport;
    try {
      const httpMod = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
      StreamableHTTPClientTransport = httpMod.StreamableHTTPClientTransport;
    } catch {
      log.warn('StreamableHTTPClientTransport not available, HTTP transport disabled');
    }
    _sdkLoaded = true;
    log.info('MCP SDK loaded');
  } catch (e) {
    log.error('MCP SDK load failed — run: npm install @modelcontextprotocol/sdk');
    throw new Error('MCP SDK not available: ' + e.message);
  }
}

async function init(mcpServers) {
  if (!mcpServers || !Object.keys(mcpServers).length) {
    log.info('no MCP servers configured');
    return;
  }
  await _loadSdk();
  const ids = Object.keys(mcpServers);
  log.info(`initializing ${ids.length} MCP server(s): ${ids.join(', ')}`);
  for (const [id, config] of Object.entries(mcpServers)) {
    if (config.enabled === false) {
      log.info(`MCP server "${id}" is disabled, skipping`);
      continue;
    }
    try {
      await connect(id, config);
    } catch (e) {
      log.error(`MCP server "${id}" failed:`, e.message);
      _clients.set(id, { client: null, transport: null, tools: [], status: 'error', error: e.message });
    }
  }
}

async function connect(serverId, config) {
  await _loadSdk();

  if (_connecting.has(serverId)) {
    throw new Error(`MCP "${serverId}" is already connecting, please wait`);
  }
  _connecting.add(serverId);

  try {
    return await _doConnect(serverId, config);
  } finally {
    _connecting.delete(serverId);
  }
}

async function _doConnect(serverId, config) {
  if (_clients.has(serverId)) {
    await disconnect(serverId);
  }

  _clients.set(serverId, { client: null, transport: null, tools: [], status: 'connecting' });

  const isHttp = config.transport === 'http' || (!config.transport && !!config.url);
  let transport;
  if (isHttp && config.url) {
    if (!StreamableHTTPClientTransport) throw new Error('HTTP transport not available in this SDK version');
    const opts = {};
    if (config.headers && Object.keys(config.headers).length) {
      opts.requestInit = { headers: config.headers };
    }
    transport = new StreamableHTTPClientTransport(new URL(config.url), opts);
  } else {
    if (!config.command) throw new Error('stdio transport requires "command" field');
    transport = new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env: { ...process.env, ...(config.env || {}) },
    });
  }

  const client = new Client({ name: 'xiajiao-im', version: '1.0.0' });

  try {
    await Promise.race([
      client.connect(transport),
      new Promise((_, reject) => setTimeout(() => reject(new Error('connection timeout (30s)')), 30000)),
    ]);
  } catch (e) {
    try { await client.close(); } catch {}
    try { if (transport.close) await transport.close(); } catch {}
    _clients.set(serverId, { client: null, transport: null, tools: [], status: 'error', error: e.message });
    throw e;
  }

  const allTools = [];
  try {
    let cursor;
    do {
      const listOpts = cursor ? { cursor } : {};
      const result = await Promise.race([
        client.listTools(listOpts),
        new Promise((_, rej) => setTimeout(() => rej(new Error('listTools timeout (15s)')), 15000)),
      ]);
      allTools.push(...(result.tools || []));
      cursor = result.nextCursor;
    } while (cursor);
  } catch (e) {
    log.warn(`MCP server "${serverId}" listTools failed:`, e.message);
  }

  for (const tool of allTools) {
    const bridgeName = `mcp:${serverId}:${tool.name}`;
    toolRegistry.registerTool(bridgeName, {
      schema: {
        description: `[MCP·${serverId}] ${tool.description || tool.name}`,
        parameters: tool.inputSchema || { type: 'object', properties: {} },
      },
      handler: _createToolHandler(client, serverId, tool.name),
      meta: {
        icon: '🔌',
        risk: 'medium',
        category: `mcp:${serverId}`,
        isMcp: true,
        mcpServer: serverId,
      },
    });
    _toolMap.set(bridgeName, serverId);
  }

  log.info(`MCP "${serverId}" connected — ${allTools.length} tool(s): ${allTools.map(t => t.name).join(', ')}`);
  _clients.set(serverId, { client, transport, tools: allTools, status: 'connected' });
  return { toolCount: allTools.length, tools: allTools.map(t => t.name) };
}

const TOOL_CALL_TIMEOUT = 120000;

function _createToolHandler(client, serverId, toolName) {
  return async (args) => {
    try {
      const result = await Promise.race([
        client.callTool({ name: toolName, arguments: args || {} }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('tool call timeout (120s)')), TOOL_CALL_TIMEOUT)),
      ]);
      const textParts = (result.content || []).filter(c => c.type === 'text').map(c => c.text);
      const text = textParts.join('\n');
      if (result.isError) return { error: text || 'MCP tool returned error' };
      if (result.structuredContent) {
        return { result: text || JSON.stringify(result.structuredContent) };
      }
      if (text) return { result: text };
      return { result: JSON.stringify(result.content || 'done') };
    } catch (e) {
      log.error(`MCP tool ${serverId}:${toolName} call failed:`, e.message);
      return { error: `MCP tool error: ${e.message}` };
    }
  };
}

async function disconnect(serverId) {
  const entry = _clients.get(serverId);
  if (!entry) return;

  for (const tool of (entry.tools || [])) {
    const bridgeName = `mcp:${serverId}:${tool.name}`;
    try { toolRegistry.unregisterTool(bridgeName); } catch {}
    _toolMap.delete(bridgeName);
  }

  try {
    if (entry.client) await entry.client.close();
  } catch (e) {
    log.warn(`MCP "${serverId}" close error:`, e.message);
  }

  _clients.delete(serverId);
  log.info(`MCP "${serverId}" disconnected`);
}

async function reconnect(serverId, config) {
  await disconnect(serverId);
  return connect(serverId, config);
}

function getStatus() {
  const result = {};
  for (const [id, entry] of _clients) {
    result[id] = {
      status: entry.status,
      error: entry.error || undefined,
      toolCount: (entry.tools || []).length,
      tools: (entry.tools || []).map(t => ({ name: t.name, description: t.description || '' })),
    };
  }
  return result;
}

function getConnectedCount() {
  let n = 0;
  for (const entry of _clients.values()) {
    if (entry.status === 'connected') n++;
  }
  return n;
}

function getTotalToolCount() {
  let n = 0;
  for (const entry of _clients.values()) {
    if (entry.status === 'connected') n += (entry.tools || []).length;
  }
  return n;
}

module.exports = { init, connect, disconnect, reconnect, getStatus, getConnectedCount, getTotalToolCount };
