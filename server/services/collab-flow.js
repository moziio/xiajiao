/**
 * M5.1 — 协作流数据模型
 * 跟踪 Agent 间协作链的执行状态，广播实时更新，持久化已完成的流
 */
const { createLogger } = require('../middleware/logger');
const log = createLogger('collab-flow');
const store = require('./storage');

let broadcastFn = () => {};
function setBroadcast(fn) { broadcastFn = fn; }

const activeFlows = new Map();

function _makeFlowId() {
  return 'flow-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

function _buildFlowFromChain(channel, chain) {
  store.loadAgents();
  const agents = store.localAgents;
  const nodes = chain.map((n, i) => {
    const ag = agents.find(a => a.id === n.agentId);
    return {
      index: i,
      agentId: n.agentId,
      agentName: ag ? ag.name : n.agentId,
      agentEmoji: ag ? (ag.emoji || '\u{1F916}') : '\u{1F916}',
      role: n.role || '',
      autoTrigger: !!n.autoTrigger,
      status: 'waiting',
      startedAt: null,
      endedAt: null,
      durationMs: 0,
      toolCalls: 0,
    };
  });
  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ from: i, to: i + 1, status: 'pending' });
  }
  return {
    id: _makeFlowId(),
    channel,
    status: 'pending',
    startedAt: null,
    endedAt: null,
    durationMs: 0,
    nodes,
    edges,
    totalToolCalls: 0,
  };
}

function getActiveFlow(channel) {
  return activeFlows.get(channel) || null;
}

function startFlow(channel) {
  const grp = store.groups.find(g => g.id === channel);
  if (!grp || !grp.collabChain || !grp.collabChain.length) return null;

  let flow = activeFlows.get(channel);
  if (flow && flow.status === 'running') return flow;

  flow = _buildFlowFromChain(channel, grp.collabChain);
  flow.status = 'running';
  flow.startedAt = Date.now();
  activeFlows.set(channel, flow);
  _broadcast(flow);
  log.info(`flow started: ${flow.id} channel=${channel} nodes=${flow.nodes.length}`);
  return flow;
}

function onAgentStart(channel, agentId) {
  const flow = activeFlows.get(channel);
  if (!flow) return;

  const node = flow.nodes.find(n => n.agentId === agentId && (n.status === 'waiting' || n.status === 'waiting_approval'));
  if (!node) return;

  node.status = 'running';
  node.startedAt = Date.now();

  const edge = flow.edges.find(e => e.to === node.index);
  if (edge) edge.status = 'active';

  _broadcast(flow);
}

function onAgentEnd(channel, agentId, toolCallCount) {
  const flow = activeFlows.get(channel);
  if (!flow) return;

  const node = flow.nodes.find(n => n.agentId === agentId && n.status === 'running');
  if (!node) return;

  node.status = 'done';
  node.endedAt = Date.now();
  node.durationMs = node.startedAt ? (node.endedAt - node.startedAt) : 0;
  if (toolCallCount) {
    node.toolCalls = toolCallCount;
    flow.totalToolCalls += toolCallCount;
  }

  const edge = flow.edges.find(e => e.to === node.index);
  if (edge) edge.status = 'done';

  const allDone = flow.nodes.every(n => n.status === 'done' || n.status === 'error');
  if (allDone) {
    _completeFlow(flow);
  } else {
    _broadcast(flow);
  }
}

function onAgentError(channel, agentId) {
  const flow = activeFlows.get(channel);
  if (!flow) return;

  const node = flow.nodes.find(n => n.agentId === agentId && (n.status === 'running' || n.status === 'waiting' || n.status === 'waiting_approval'));
  if (!node) return;

  node.status = 'error';
  node.endedAt = Date.now();
  node.durationMs = node.startedAt ? (node.endedAt - node.startedAt) : 0;

  flow.status = 'failed';
  flow.endedAt = Date.now();
  flow.durationMs = flow.startedAt ? (flow.endedAt - flow.startedAt) : 0;

  _broadcast(flow);
  _persistFlow(flow);
  activeFlows.delete(channel);
  log.info(`flow failed: ${flow.id} at agent=${agentId}`);
}

function onChainWaiting(channel, nextAgentId) {
  const flow = activeFlows.get(channel);
  if (!flow) return;

  const node = flow.nodes.find(n => n.agentId === nextAgentId && n.status === 'waiting');
  if (node) node.status = 'waiting_approval';

  _broadcast(flow);
}

function stopFlow(channel) {
  const flow = activeFlows.get(channel);
  if (!flow) return;

  flow.status = 'failed';
  flow.endedAt = Date.now();
  flow.durationMs = flow.startedAt ? (flow.endedAt - flow.startedAt) : 0;

  for (const n of flow.nodes) {
    if (n.status === 'running' || n.status === 'waiting' || n.status === 'waiting_approval') {
      n.status = 'error';
      n.endedAt = Date.now();
    }
  }

  _broadcast(flow);
  _persistFlow(flow);
  activeFlows.delete(channel);
  log.info(`flow stopped: ${flow.id}`);
}

function _completeFlow(flow) {
  flow.status = 'completed';
  flow.endedAt = Date.now();
  flow.durationMs = flow.startedAt ? (flow.endedAt - flow.startedAt) : 0;

  _broadcast(flow);
  _persistFlow(flow);
  activeFlows.delete(flow.channel);
  log.info(`flow completed: ${flow.id} duration=${flow.durationMs}ms`);
}

function _broadcast(flow) {
  broadcastFn({ type: 'collab_flow_update', flow });
}

function _persistFlow(flow) {
  try {
    const database = require('./database');
    const db = database.getDB();
    if (!db) return;
    db.prepare(`
      INSERT OR REPLACE INTO collab_flows (id, channel, status, startedAt, endedAt, durationMs, nodes, edges, totalToolCalls)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      flow.id, flow.channel, flow.status,
      flow.startedAt, flow.endedAt, flow.durationMs,
      JSON.stringify(flow.nodes), JSON.stringify(flow.edges),
      flow.totalToolCalls || 0
    );
  } catch (err) {
    log.error('persist flow error:', err.message);
  }
}

function getFlowHistory(channel, limit) {
  try {
    const database = require('./database');
    const db = database.getDB();
    if (!db) return [];
    const rows = db.prepare(
      'SELECT * FROM collab_flows WHERE channel = ? ORDER BY endedAt DESC LIMIT ?'
    ).all(channel, limit || 20);
    return rows.map(r => {
      try { r.nodes = JSON.parse(r.nodes); } catch { r.nodes = []; }
      try { r.edges = JSON.parse(r.edges); } catch { r.edges = []; }
      return r;
    });
  } catch (err) {
    log.error('getFlowHistory error:', err.message);
    return [];
  }
}

function getAllFlowHistory(limit) {
  try {
    const database = require('./database');
    const db = database.getDB();
    if (!db) return [];
    const rows = db.prepare(
      'SELECT * FROM collab_flows ORDER BY endedAt DESC LIMIT ?'
    ).all(limit || 50);
    return rows.map(r => {
      try { r.nodes = JSON.parse(r.nodes); } catch { r.nodes = []; }
      try { r.edges = JSON.parse(r.edges); } catch { r.edges = []; }
      return r;
    });
  } catch (err) {
    log.error('getAllFlowHistory error:', err.message);
    return [];
  }
}

module.exports = {
  setBroadcast,
  getActiveFlow,
  startFlow,
  onAgentStart,
  onAgentEnd,
  onAgentError,
  onChainWaiting,
  stopFlow,
  getFlowHistory,
  getAllFlowHistory,
};
