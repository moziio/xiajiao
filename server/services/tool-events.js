/**
 * M1.1 — 统一 Tool Event 协议
 * 无论 Direct / Gateway 模式，前端收到的工具事件格式一致
 */
const { createLogger } = require('../middleware/logger');
const log = createLogger('tool-events');

let broadcastFn = () => {};

function setBroadcast(fn) { broadcastFn = fn; }

function emitToolEvent(evt) {
  const payload = {
    type: evt.type,
    channel: evt.channel,
    agentId: evt.agentId,
    runId: evt.runId,
    callId: evt.callId,
    tool: evt.tool,
    ts: Date.now(),
  };

  if (evt.type === 'tool_call_start') {
    payload.args = evt.args || {};
    payload.status = 'running';
  } else if (evt.type === 'tool_call_end') {
    payload.status = evt.error ? 'error' : 'success';
    payload.result = evt.result;
    payload.error = evt.error || null;
    payload.durationMs = evt.durationMs || 0;
  } else if (evt.type === 'tool_approval_required') {
    payload.args = evt.args || {};
    payload.status = 'pending_approval';
    payload.riskLevel = evt.riskLevel || 'medium';
  }

  broadcastFn(payload);

  log.info(`[${evt.type}] tool=${evt.tool} channel=${evt.channel} callId=${evt.callId}${evt.durationMs ? ` ${evt.durationMs}ms` : ''}`);
}

function makeCallId() {
  return 'tc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

module.exports = { setBroadcast, emitToolEvent, makeCallId };
