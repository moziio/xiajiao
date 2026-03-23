/**
 * M12 — Generic Polling Connector
 * 定时拉取外部平台消息（适用于 Telegram 等）
 */
const { createLogger } = require('../../middleware/logger');

async function start(ctx, config) {
  const log = ctx.log || createLogger('polling');
  const { renderTemplate, getByPath } = require('../channel-engine');
  const pollCfg = config.polling || {};

  if (!pollCfg.url) {
    throw new Error('Polling connector requires polling.url');
  }

  const intervalMs = pollCfg.intervalMs || 5000;
  let offset = 0;
  let consecutiveErrors = 0;
  const MAX_ERRORS = 10;
  let timer = null;

  const stopPolling = () => { if (timer) { clearInterval(timer); timer = null; } };

  const poll = async () => {
    if (ctx.abort.aborted) { stopPolling(); return; }
    try {
      const token = await ctx.getToken();
      const vars = { ...ctx.config, offset, accessToken: token || '', botToken: ctx.config.botToken || '' };
      const url = renderTemplate(pollCfg.url, vars);

      const res = await fetch(url, { signal: AbortSignal.timeout(35000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const messages = getByPath(data, pollCfg.messagesPath) || [];

      for (const msg of messages) {
        ctx.onInbound(msg);
        const id = getByPath(msg, pollCfg.updateIdPath);
        if (typeof id === 'number') offset = id + 1;
      }

      consecutiveErrors = 0;
      ctx.updateStatus('connected');
    } catch (err) {
      if (ctx.abort.aborted) { stopPolling(); return; }
      consecutiveErrors++;
      log.error(`poll error (${consecutiveErrors}/${MAX_ERRORS}):`, err.message);
      if (consecutiveErrors >= MAX_ERRORS) {
        stopPolling();
        ctx.updateStatus('error', `连续 ${MAX_ERRORS} 次轮询失败: ${err.message}`);
        return;
      }
      ctx.updateStatus('error', err.message);
    }
  };

  ctx.updateStatus('connected');
  log.info(`polling started (interval=${intervalMs}ms)`);
  await poll();

  timer = setInterval(poll, intervalMs);

  ctx.abort.addEventListener('abort', () => {
    stopPolling();
    log.info('polling stopped');
  }, { once: true });
}

module.exports = { start };
