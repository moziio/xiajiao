/**
 * M9 — Generic Webhook Connector
 * 被动接收 HTTP 请求，支持 POST（消息接收）和 GET（验证）
 */
const { createLogger } = require('../../middleware/logger');

async function start(ctx, config) {
  const log = ctx.log || createLogger('webhook');
  const whCfg = config.webhook || {};
  const basePath = whCfg.path || `/channel/${ctx.channelId}/callback`;
  const routePath = basePath.replace(/\{\{channelId\}\}/g, ctx.channelId);

  ctx.mountRoute('POST', routePath, async (req, res, body) => {
    try {
      ctx._req = req;
      let processed = body;
      if (typeof processed === 'string') {
        try { processed = JSON.parse(processed); } catch {}
      }

      if (processed && processed.type === 'url_verification' && processed.challenge) {
        log.info('webhook POST verification challenge received');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ challenge: processed.challenge }));
        return;
      }

      for (const mw of ctx.middlewareChain) {
        if (typeof mw.process === 'function') {
          processed = mw.process(processed, ctx);
          if (processed === null) { res.writeHead(403, { 'Content-Type': 'text/plain' }); res.end('forbidden'); return; }
        }
      }

      ctx.onInbound(processed);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    } catch (e) {
      log.error('webhook inbound error:', e.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('error');
    }
  });

  if (whCfg.verifyMethod === 'GET') {
    ctx.mountRoute('GET', routePath, (req, res, query) => {
      const verifyField = whCfg.verifyResponse || 'echostr';
      const val = (query && query[verifyField]) || '';
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(String(val));
    });
  }

  ctx._webhookPath = routePath;
  ctx.updateStatus('connected');
  log.info(`webhook listening on ${routePath}`);

  ctx.abort.addEventListener('abort', () => {
    ctx.unmountRoute('POST', routePath);
    ctx.unmountRoute('GET', routePath);
    log.info(`webhook stopped: ${routePath}`);
  }, { once: true });
}

module.exports = { start };
