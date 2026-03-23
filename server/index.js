#!/usr/bin/env node
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor < 22) {
  console.error(`\n[启动失败] 虾饺需要 Node.js 22 或更高版本（当前: v${process.versions.node}）\n请升级 Node.js 后重试: https://nodejs.org/\n`);
  process.exit(1);
}

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const WebSocket = require('ws');

const BOOT_VERSION = Date.now().toString(36);
const cfg = require('./config');
const { initDB } = require('./services/database');
initDB();
const store = require('./services/storage');
store.reloadStateFromDB();
const gw = require('./services/gateway');
const llm = require('./services/llm');
const rag = require('./services/rag');
const chat = require('./services/chat');
const workflow = require('./services/workflow');
const toolEvents = require('./services/tool-events');
const toolRegistry = require('./services/tool-registry');
const mcpManager = require('./services/mcp-manager');
const channelEngine = require('./services/channel-engine');
const { handleApi } = require('./router');
const { ROLES, jsonRes, readBody, checkOrigin } = require('./middleware/auth');
const { checkHttpRate, checkWsRate } = require('./middleware/rate-limit');
const { genReqId, createLogger, rootLogger } = require('./middleware/logger');
const log = rootLogger.child('server');

process.on('unhandledRejection', (reason) => {
  rootLogger.child('process').error('unhandled rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  rootLogger.child('process').error('uncaught exception:', err.message);
  if (err.code === 'ECONNRESET' || err.code === 'EPIPE') return;
  process.exit(1);
});

const clientSockets = new Set();
gw.setClientSockets(clientSockets);
const collabFlow = require('./services/collab-flow');
llm.setBroadcast(gw.broadcast);
llm.setEmitCommunityEvent(gw.emitCommunityEvent);
toolEvents.setBroadcast(gw.broadcast);
collabFlow.setBroadcast(gw.broadcast);

// M1.5 — 注册内置工具
const ragQueryTool = require('./services/tools/rag-query');
const webSearchTool = require('./services/tools/web-search');
const memoryWriteTool = require('./services/tools/memory-write');
const memorySearchTool = require('./services/tools/memory-search');
const callAgentTool = require('./services/tools/call-agent');
toolRegistry.registerTool('rag_query', ragQueryTool);
toolRegistry.registerTool('web_search', webSearchTool);
toolRegistry.registerTool('memory_write', memoryWriteTool);
toolRegistry.registerTool('memory_search', memorySearchTool);
toolRegistry.registerTool('call_agent', callAgentTool);
const manageChannelTool = require('./services/tools/manage-channel');
toolRegistry.registerTool('manage_channel', manageChannelTool);
const manageScheduleTool = require('./services/tools/manage-schedule');
toolRegistry.registerTool('manage_schedule', manageScheduleTool);
log.info(`tool registry: ${toolRegistry.getAllToolNames().join(', ')}`);

// M8 — 初始化 MCP Server 连接
(async () => {
  try {
    const mcpServers = store.imSettings.mcpServers || {};
    if (Object.keys(mcpServers).length) {
      await mcpManager.init(mcpServers);
      const count = mcpManager.getTotalToolCount();
      if (count > 0) log.info(`MCP tools bridged: ${count}`);
    }
  } catch (e) { log.warn('MCP init skipped:', e.message); }
})();


const llmMode = cfg.getLLMMode();

const sendFn = llmMode === 'gateway' ? gw.sendToGateway : llm.sendToLLM;
const cancelFn = llmMode === 'gateway' ? gw.cancelGwRun : llm.cancelRun;

chat.init({
  sendFn,
  getAgentsFn: () => gw.knownAgents.length ? gw.knownAgents : gw.refreshKnownAgents(),
  broadcastFn: gw.broadcast,
});

workflow.setBroadcast(gw.broadcast);
workflow.setSendFn(sendFn);
workflow.setCancelFn(cancelFn);

// M9 — 初始化 Channel Engine
channelEngine.setBroadcast(gw.broadcast);
channelEngine.setSendFn(sendFn);
(async () => {
  try {
    await channelEngine.init();
    const channels = channelEngine.getAllChannels().filter(c => c.enabled);
    if (channels.length) log.info(`channel engine: ${channels.length} channel(s)`);
  } catch (e) { log.warn('channel engine init:', e.message); }
})();

// ── Static file cache (pre-compressed at boot) ──

const _staticCache = new Map();
const _COMPRESSIBLE = new Set(['.js', '.css', '.json', '.svg']);

function _buildStaticCache(dir, base) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { _buildStaticCache(full, base); continue; }
    const ext = path.extname(e.name).toLowerCase();
    if (!_COMPRESSIBLE.has(ext)) continue;
    try {
      const raw = fs.readFileSync(full);
      const gz = zlib.gzipSync(raw);
      const key = '/' + path.relative(base, full).replace(/\\/g, '/');
      _staticCache.set(key, { raw, gz, mime: cfg.MIME[ext] || 'application/octet-stream' });
    } catch {}
  }
}
_buildStaticCache(cfg.PUBLIC_DIR, cfg.PUBLIC_DIR);
log.info(`preloaded ${_staticCache.size} static files (cache)`);

// ── HTTP Server ──

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];
  const isApi = urlPath.startsWith('/api/') || urlPath === '/upload';
  if (isApi) {
    req.reqId = genReqId();
    req.log = createLogger('http', req.reqId);
    if (!checkHttpRate(req)) { res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' }); res.end('{"error":"请求过于频繁，请稍后再试"}'); return; }
    if (!checkOrigin(req)) { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end('{"error":"非法请求来源"}'); return; }
  }
  if (req.method === 'POST' && req.url === '/upload') return handleUpload(req, res);
  const kbUploadMatch = urlPath.match(/^\/api\/agents\/([^/]+)\/upload$/);
  if (req.method === 'POST' && kbUploadMatch) return handleKbUpload(req, res, kbUploadMatch[1]);
  const urlQuery = new URLSearchParams((req.url.split('?')[1]) || '');
  if (urlPath.startsWith('/api/')) return handleApi(req, res, urlPath, urlQuery);
  if (urlPath.startsWith('/channel/')) {
    let body;
    if (req.method === 'POST' || req.method === 'PUT') {
      body = await readBody(req).catch(() => ({}));
    } else {
      const qObj = {}; urlQuery.forEach((v, k) => { qObj[k] = v; });
      body = qObj;
    }
    const handled = channelEngine.handleChannelRoute(req.method, urlPath, req, res, body);
    if (handled) return;
  }
  let filePath = urlPath === '/' ? '/index.html' : urlPath;
  const fullPath = path.resolve(cfg.PUBLIC_DIR, '.' + filePath);
  const baseResolved = path.resolve(cfg.PUBLIC_DIR);
  if (!fullPath.startsWith(baseResolved + path.sep) && fullPath !== baseResolved) { res.writeHead(403); res.end(); return; }
  const ext = path.extname(fullPath).toLowerCase();

  // sw.js: inject BOOT_VERSION so browser detects SW change on restart
  if (filePath === '/sw.js') {
    let src;
    const swCached = _staticCache.get(filePath);
    if (swCached) { src = swCached.raw.toString(); }
    else { try { src = fs.readFileSync(fullPath, 'utf8'); } catch { src = ''; } }
    const versioned = src.replace('__SW_VERSION__', BOOT_VERSION);
    res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache' });
    res.end(versioned);
    return;
  }

  const cached = _staticCache.get(filePath);
  const _noLongCache = filePath === '/manifest.json' || filePath.startsWith('/favicon') || filePath === '/logo.png' || filePath.startsWith('/icons/');
  if (cached && ext !== '.html') {
    const headers = { 'Content-Type': cached.mime };
    if ((ext === '.js' || ext === '.css') && !_noLongCache) headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    else if (_noLongCache) headers['Cache-Control'] = 'no-cache';
    const acceptGzip = (req.headers['accept-encoding'] || '').includes('gzip');
    if (acceptGzip) {
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
      res.writeHead(200, headers);
      res.end(cached.gz);
    } else {
      res.writeHead(200, headers);
      res.end(cached.raw);
    }
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    const headers = { 'Content-Type': cfg.MIME[ext] || 'application/octet-stream' };
    const acceptGzip = _COMPRESSIBLE.has(ext) && (req.headers['accept-encoding'] || '').includes('gzip');
    if (ext === '.html') {
      const versioned = data.toString().replace(/(\.(?:js|css))(")/g, `$1?v=${BOOT_VERSION}$2`);
      headers['Cache-Control'] = 'no-cache';
      if (acceptGzip) {
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
        res.writeHead(200, headers);
        zlib.gzip(Buffer.from(versioned), (e, compressed) => res.end(e ? versioned : compressed));
      } else {
        res.writeHead(200, headers);
        res.end(versioned);
      }
    } else {
      if ((ext === '.js' || ext === '.css') && !_noLongCache) headers['Cache-Control'] = 'public, max-age=31536000, immutable';
      else if (_noLongCache) headers['Cache-Control'] = 'no-cache';
      res.writeHead(200, headers);
      res.end(data);
    }
  });
});

async function handleUpload(req, res) {
  const { hasRole } = require('./middleware/auth');
  if (!hasRole(req, 'member')) return jsonRes(res, 403, { error: 'auth required' });
  const { IncomingForm } = require('formidable');
  const form = new IncomingForm({ uploadDir: cfg.UPLOADS_DIR, keepExtensions: true, maxFileSize: 20 * 1024 * 1024 });
  form.parse(req, (err, _fields, files) => {
    if (err) return jsonRes(res, 400, { error: err.message });
    const file = files.file?.[0] || files.file;
    if (!file) return jsonRes(res, 400, { error: 'No file' });
    const ext = path.extname(file.originalFilename || '');
    const newName = Date.now() + '-' + Math.random().toString(36).slice(2, 6) + ext;
    const newPath = path.join(cfg.UPLOADS_DIR, newName);
    fs.rename(file.filepath, newPath, (mvErr) => {
      if (mvErr) return jsonRes(res, 500, { error: 'Move failed' });
      jsonRes(res, 200, { url: `/uploads/${newName}`, name: file.originalFilename, size: file.size, type: file.mimetype });
    });
  });
}

async function handleKbUpload(req, res, agentId) {
  const { isOwnerReq } = require('./middleware/auth');
  if (!isOwnerReq(req)) return jsonRes(res, 403, { error: '需要主人权限' });
  const { IncomingForm } = require('formidable');
  const form = new IncomingForm({ keepExtensions: true, maxFileSize: 50 * 1024 * 1024 });
  form.parse(req, (err, _fields, files) => {
    if (err) return jsonRes(res, 400, { error: err.message });
    const file = files.file?.[0] || files.file;
    if (!file) return jsonRes(res, 400, { error: 'No file' });
    const filename = file.originalFilename || ('upload-' + Date.now());
    if (filename.includes('..') || path.isAbsolute(filename)) return jsonRes(res, 400, { error: 'invalid filename' });
    store.loadAgents();
    const agent = store.localAgents.find(a => a.id === agentId);
    if (!agent) return jsonRes(res, 404, { error: 'agent not found' });
    const ws = agent.workspace || path.join(cfg.DATA_DIR, `workspace-${agentId}`);
    fs.mkdirSync(ws, { recursive: true });
    const dest = path.join(ws, filename);
    fs.copyFile(file.filepath, dest, (cpErr) => {
      fs.unlink(file.filepath, () => {});
      if (cpErr) return jsonRes(res, 500, { error: 'Copy failed' });
      jsonRes(res, 200, { ok: true, name: filename, size: file.size });
      rag.indexFile(agentId, filename).catch(e => log.warn('upload index error:', e.message));
    });
  });
}

// ── WebSocket Server ──

const wss = new WebSocket.Server({ server, path: '/ws', maxPayload: 256 * 1024 });

const _HEARTBEAT_INTERVAL = 30000;
const _HEARTBEAT_TIMEOUT = 65000;

const _heartbeatTimer = setInterval(() => {
  const now = Date.now();
  for (const ws of clientSockets) {
    if (now - (ws._lastPong || ws._connectedAt || 0) > _HEARTBEAT_TIMEOUT) {
      ws.terminate();
      continue;
    }
    try { ws.ping(); ws.send('{"type":"ping"}'); } catch {}
  }
}, _HEARTBEAT_INTERVAL);

wss.on('close', () => clearInterval(_heartbeatTimer));

wss.on('connection', (ws) => {
  let user = null;
  clientSockets.add(ws);
  ws._connectedAt = Date.now();
  ws._lastPong = Date.now();
  ws.on('pong', () => { ws._lastPong = Date.now(); });
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'pong') { ws._lastPong = Date.now(); return; }
      if (!checkWsRate(ws)) return;
      if (msg.type === 'join') {
        const { getRole: _getRole } = require('./middleware/auth');
        const fakeReq = { headers: { authorization: msg.token ? 'Bearer ' + msg.token : '' } };
        const role = _getRole(fakeReq);
        const isOwner = role === 'owner';
        const randomColor = () => ['#4F8EF7','#F75353','#2ECC71','#E67E22','#9B59B6','#1ABC9C','#E74C8B','#3498DB'][Math.floor(Math.random() * 8)];
        user = { id: msg.userId || 'u-' + Date.now(), name: msg.name || '匿名用户', color: msg.color || randomColor(), isOwner, role };
        gw.users.set(user.id, user);
        let agents = gw.knownAgents;
        if (!agents || agents.length === 0) agents = gw.refreshKnownAgents();
        const isConnected = llmMode === 'gateway' ? gw.gwConnected : true;
        const slimAgents = agents.map(a => ({ id: a.id, name: a.name, emoji: a.emoji, color: a.color, model: a.model || null }));
        const lastTs = typeof msg.lastTs === 'number' && msg.lastTs > 0 ? msg.lastTs : 0;
        const history = lastTs ? store.getMessagesSince(lastTs, 200) : store.getRecentMessages(100);
        const guestCanChat = store.imSettings.guestCanChat !== false;
        if (isOwner && user.id && user.name) {
          try {
            const { getDB } = require('./services/database');
            const db = getDB();
            db.prepare('UPDATE messages SET userId=? WHERE type=? AND userName=? AND userId!=?').run(user.id, 'user', user.name, user.id);
          } catch {}
        }
        let channelMap = {};
        try {
          const chEngine = require('./services/channel-engine');
          for (const ch of chEngine.getAllChannels()) {
            channelMap[ch.id] = { name: ch.name || ch.type || '', agentId: ch.config?.imAgentId || '' };
          }
        } catch {}
        ws.send(JSON.stringify({ type: 'joined', user, history, users: [...gw.users.values()], agents: slimAgents, groups: store.groups, gatewayConnected: isConnected, llmMode, isOwner, role, guestCanChat, incremental: !!lastTs, channelMap }));
        gw.broadcast({ type: 'user_joined', user }, ws);

        try {
          for (const [key, run] of llm.activeRuns.entries()) {
            const runChannel = key.includes(':') ? key.split(':')[0] : key;
            ws.send(JSON.stringify({ type: 'agent_lifecycle', channel: runChannel, agentId: run.agentId, runId: run.runId, phase: 'start', model: run._modelId || '' }));
            if (run.currentText) {
              const isImgProgress = /^⏳/.test(run.currentText);
              ws.send(JSON.stringify({ type: 'agent_stream', channel: runChannel, agentId: run.agentId, runId: run.runId, text: run.currentText, delta: '', ...(isImgProgress ? { _imageProgress: true } : {}) }));
            }
          }
        } catch (e) { log.error('resume active runs error:', e.message); }

        return;
      }
      if (!user) return;
      if (msg.type === 'chat') {
        if ((ROLES[user.role] || 0) < 1 && store.imSettings.guestCanChat === false) {
          ws.send(JSON.stringify({ type: 'error', error: '当前无发送权限' }));
          return;
        }
        const channel = msg.channel || 'group';
        const files = msg.files || (msg.file ? [msg.file] : []);
        const replyTo = (typeof msg.replyTo === 'string' && msg.replyTo.length <= 60) ? msg.replyTo : undefined;
        const _tempId = (typeof msg._tempId === 'string' && msg._tempId.length <= 30) ? msg._tempId : undefined;
        const entry = { id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), type: 'user', userId: user.id, userName: user.name, userColor: user.color, text: msg.text || '', file: files[0] || null, files: files.length ? files : undefined, mentions: msg.mentions || [], channel, ts: Date.now(), ...(replyTo ? { replyTo } : {}), ...(_tempId ? { _tempId } : {}) };
        store.addMessage(entry);
        gw.broadcast({ type: 'message', message: entry });
        if (!channel.startsWith('wf_')) {
          const fileDesc = files.length ? `[文件: ${files.map(f => f.name).join(', ')}] ` : '';
          const content = fileDesc + (msg.text || '');
          if (content.trim()) chat.routeGroupMessage(channel, msg.mentions || [], content);
        }
      }
      if (msg.type === 'stop') {
        const channel = msg.channel;
        if (channel) {
          if (channel.startsWith('wf_')) {
            if (user.role !== 'owner') return;
          } else if ((ROLES[user.role] || 0) < 1 && store.imSettings.guestCanChat === false) {
            return;
          }
          cancelFn(channel).then(r => { if (r.ok) log.info(`user stop channel=${channel}`); });
          if (channel.startsWith('wf_')) {
            const runs = workflow.getActiveRuns();
            const run = runs.find(r => r.channel === channel);
            if (run) workflow.controlRun(run.runId, 'stop');
          }
        }
      }
      if (msg.type === 'workflow_control') {
        if (user.role !== 'owner') return;
        const { runId, action } = msg;
        if (runId && action) workflow.controlRun(runId, action);
      }
      if (msg.type === 'collab_chain_continue') {
        if (user.role !== 'owner') return;
        const { channel, nextAgentId, previousText, previousAgentId } = msg;
        if (channel && nextAgentId) {
          const curAgent = store.localAgents.find(a => a.id === previousAgentId);
          const curName = curAgent ? curAgent.name : previousAgentId;
          const prompt = `[协作接力] 前一个Agent「${curName}」的输出：\n${previousText || ''}\n\n请基于以上内容继续完成你的任务。`;
          sendFn(channel, nextAgentId, prompt, { _calledBy: previousAgentId });
        }
      }
      if (msg.type === 'collab_flow_stop') {
        if (user.role !== 'owner') return;
        if (msg.channel) {
          cancelFn(msg.channel);
          collabFlow.stopFlow(msg.channel);
        }
      }
      if (msg.type === 'typing') gw.broadcast({ type: 'typing', userId: user.id, userName: user.name, channel: msg.channel || '' }, ws);
    } catch (e) { log.error('ws client message error:', e.message); }
  });
  ws.on('close', () => { clientSockets.delete(ws); if (user) { gw.users.delete(user.id); gw.broadcast({ type: 'user_left', userId: user.id, userName: user.name }); } });
});

// ── Exports for scheduler ──
module.exports = {
  sendFn,
  gwSendReq: gw.gwSendReq,
  sendToGateway: gw.sendToGateway,
  sendToLLM: llm.sendToLLM,
  knownAgents: () => gw.knownAgents.length ? gw.knownAgents : gw.refreshKnownAgents(),
  emitCommunityEvent: gw.emitCommunityEvent,
  createPostInternal: gw.createPostInternal,
  broadcast: gw.broadcast,
  schedules: () => store.schedules,
  saveSchedules: () => store.saveSchedules(),
  getProfiles: () => store.profiles,
  getMetrics: () => store.metrics,
};

// ── Port Reclaim & Start ──

fs.mkdirSync(cfg.UPLOADS_DIR, { recursive: true });
store.saveTopics();

function ensureDesktopShortcut(url) {
  if (process.platform !== 'win32') return;
  try {
    const desktopDir = path.join(require('os').homedir(), 'Desktop');
    const urlFile = path.join(desktopDir, '虾饺.url');
    const batFile = path.join(desktopDir, '虾饺.bat');
    if (fs.existsSync(urlFile) || fs.existsSync(batFile)) return;
    fs.writeFileSync(urlFile, `[InternetShortcut]\nURL=${url}\nIconIndex=0\n`);
    log.info('desktop shortcut created: 虾饺.url');
  } catch (err) {
    log.info('skip desktop shortcut:', err.message);
  }
}

function killPortHolder(port) {
  if (process.platform !== 'win32') {
    try { require('child_process').execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' }); } catch {}
    return;
  }
  try {
    const out = require('child_process').execSync(
      `netstat -ano | findstr ":${port}" | findstr "LISTENING"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    const pids = new Set();
    for (const line of out.split('\n')) {
      const m = line.trim().match(/\s(\d+)\s*$/);
      if (m && m[1] !== '0' && m[1] !== String(process.pid)) pids.add(m[1]);
    }
    for (const pid of pids) {
      try { require('child_process').execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' }); log.info(`killed old process PID=${pid} on port ${port}`); } catch {}
    }
    if (pids.size > 0) {
      require('child_process').spawnSync('node', ['-e', 'setTimeout(()=>{},800)'], { timeout: 1000 });
    }
  } catch {}
}

function onListening() {
  const url = `http://127.0.0.1:${cfg.PORT}`;
  log.info(`虾饺 v1.0 — LLM Mode: ${llmMode}`);
  log.info(`HTTP ${url}  WS ws://127.0.0.1:${cfg.PORT}/ws`);

  if (!process.env.IM_NO_OPEN) {
    const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'rundll32 url.dll,FileProtocolHandler' : 'xdg-open';
    require('child_process').exec(`${openCmd} ${url}`, () => {});
  }

  ensureDesktopShortcut(url);

  gw.refreshKnownAgents();

  if (llmMode === 'gateway') {
    gw.connectGateway();
  } else {
    log.info('direct mode — no Gateway needed');
    gw.broadcast({ type: 'gateway_status', connected: true });
  }

  try {
    const Scheduler = require('../scheduler');
    global.scheduler = new Scheduler({
      getSchedules: () => store.schedules,
      saveSchedules: () => store.saveSchedules(),
      getAgents: () => gw.knownAgents.length ? gw.knownAgents : gw.refreshKnownAgents(),
      sendToLLM: sendFn,
      sendToGateway: sendFn,
      gwSendReq: gw.gwSendReq,
      emitCommunityEvent: gw.emitCommunityEvent,
      createPost: gw.createPostInternal,
      broadcast: gw.broadcast,
      isGwConnected: () => llmMode === 'gateway' ? gw.gwConnected : true,
      getProfiles: () => store.profiles,
      getMetrics: () => store.metrics,
      getSettings: () => store.imSettings,
      getGroups: () => store.groups,
    });
    global.scheduler.start();
    log.info('scheduler started');
  } catch (e) { log.error('scheduler failed to start:', e.message); }

  try {
    const TaskScheduler = require('./services/task-scheduler');
    global.taskScheduler = new TaskScheduler({
      sendFn,
      broadcast: gw.broadcast,
      getAgents: () => gw.knownAgents.length ? gw.knownAgents : gw.refreshKnownAgents(),
      getGroups: () => store.groups,
      isGwConnected: () => llmMode === 'gateway' ? gw.gwConnected : true,
    });
    global.taskScheduler.migrateOldSchedules(store.schedules);
    global.taskScheduler.start();
    log.info('task-scheduler started');
  } catch (e) { log.error('task-scheduler failed to start:', e.message); }
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    log.error(`port ${cfg.PORT} still occupied after reclaim. Exiting.`);
  } else {
    log.error('server error:', err.message);
  }
  process.exit(1);
});

server.on('listening', onListening);

killPortHolder(cfg.PORT);
server.listen(cfg.PORT, '0.0.0.0');
