/**
 * M10 — Generic WebSocket Connector
 * 主动连接外部 WebSocket，支持心跳、自动重连、设备注册
 * 借鉴 OpenClaw: startAccount → sendInit → heartbeat → reconnect
 */
const WebSocket = require('ws');
const { createLogger } = require('../../middleware/logger');

async function start(ctx, config) {
  const log = ctx.log || createLogger('ws-connector');
  const connectCfg = config.connect || {};
  const heartbeatCfg = config.heartbeat || {};
  const { renderTemplate } = require('../channel-engine');

  if (!connectCfg.urlTemplate) {
    throw new Error('WebSocket connector requires connect.urlTemplate');
  }

  const token = await ctx.getToken();
  const vars = { ...ctx.config, deviceId: ctx.deviceId, accessToken: token || '' };
  const url = renderTemplate(connectCfg.urlTemplate, vars);

  log.info(`connecting to ${url.replace(/token=[^&]+/, 'token=***')}`);

  let ws;
  try {
    ws = new WebSocket(url);
  } catch (e) {
    ctx.updateStatus('error', e.message);
    throw e;
  }

  const connectTimeout = setTimeout(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      log.warn('connection timeout (30s)');
      ws.terminate();
    }
  }, 30000);

  ws.on('open', () => {
    clearTimeout(connectTimeout);
    log.info('WebSocket connected');
    ctx._reconnectAttempt = 0;

    if (connectCfg.initPayload) {
      const payload = renderTemplate(connectCfg.initPayload, vars);
      ws.send(JSON.stringify(payload));
      log.info('init payload sent');
    }

    if (heartbeatCfg.payload) {
      const intervalMs = heartbeatCfg.intervalMs || 30000;
      ctx.heartbeat.start(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const ping = renderTemplate(heartbeatCfg.payload, vars);
          ws.send(JSON.stringify(ping));
        }
      }, intervalMs);
    }

    ctx.updateStatus('connected');
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (_isHeartbeatResponse(msg, config)) return;
      ctx.onInbound(msg);
    } catch (e) {
      log.warn('message parse error:', e.message);
    }
  });

  ws.on('close', (code, reason) => {
    clearTimeout(connectTimeout);
    ctx.heartbeat.stop();
    log.info(`WebSocket closed: code=${code}`);

    if (!ctx.abort.aborted) {
      ctx.updateStatus('disconnected');
      ctx.scheduleReconnect(() => start(ctx, config));
    }
  });

  ws.on('error', (err) => {
    clearTimeout(connectTimeout);
    log.error('WebSocket error:', err.message);
  });

  ctx._ws = ws;
  ctx.abort.addEventListener('abort', () => {
    clearTimeout(connectTimeout);
    ctx.heartbeat.stop();
    try { ws.close(1000, 'channel stopped'); } catch {}
  }, { once: true });
}

function _isHeartbeatResponse(msg, config) {
  const hbCfg = config.heartbeat || {};
  if (hbCfg.responseType && msg.type === hbCfg.responseType) return true;
  if (msg.type === 'pong' || msg.type === 'heartbeat') return true;
  return false;
}

module.exports = { start };
